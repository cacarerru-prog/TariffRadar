// internal/service/dispatcher.go — отправка webhook-уведомлений подписчикам.
//
// Архитектура:
//   - DispatchDealCreated вызывается из handler'а после создания сделки.
//   - Находим все активные webhooks для события "deal.created".
//   - Фильтруем по полям from/to/type из настроек каждого webhook'а.
//   - Каждый HTTP POST выполняется в отдельной goroutine (fire-and-forget),
//     чтобы не задерживать HTTP-ответ клиенту.
//   - Payload подписывается HMAC-SHA256 (как у GitHub webhooks):
//     заголовок X-TariffRadar-Signature: sha256=<hex>.
//   - Результат каждой попытки сохраняется в webhook_deliveries.
package service

import (
	"bytes"
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"log"
	"net/http"
	"strings"
	"time"

	"github.com/google/uuid"

	"tariffradar/internal/repository"
)

// Dispatcher — сервис рассылки webhook-уведомлений.
type Dispatcher struct {
	webhooks *repository.WebhookRepo
	client   *http.Client
}

// NewDispatcher — конструктор. client с таймаутом передаётся снаружи для тестируемости.
func NewDispatcher(webhooks *repository.WebhookRepo) *Dispatcher {
	return &Dispatcher{
		webhooks: webhooks,
		client:   &http.Client{Timeout: 10 * time.Second},
	}
}

// DealEvent — данные о сделке, которые уходят в payload webhook'а.
type DealEvent struct {
	Route    string  `json:"route"`    // "Минск → Москва"
	Type     string  `json:"type"`     // "FTL" | "LTL"
	Price    float64 `json:"price"`
	Currency string  `json:"currency"` // "EUR" и т.д.
	Cargo    string  `json:"cargo"`
	Truck    string  `json:"truck"`

	// Поля для фильтрации — не уходят в JSON-payload.
	FromCity string `json:"-"`
	ToCity   string `json:"-"`
}

// webhookPayload — тело HTTP POST, отправляемого подписчику.
type webhookPayload struct {
	Event      string    `json:"event"`
	OccurredAt time.Time `json:"occurred_at"`
	Data       DealEvent `json:"data"`
}

// DispatchDealCreated — рассылает событие deal.created всем подходящим подписчикам.
// Запрашивает список хуков синхронно (ошибка запроса к БД → только лог),
// затем каждую доставку запускает в отдельной goroutine.
func (d *Dispatcher) DispatchDealCreated(ctx context.Context, ev DealEvent) {
	hooks, err := d.webhooks.ListActiveByEvent(ctx, "deal.created")
	if err != nil {
		log.Printf("[webhook] ListActiveByEvent: %v", err)
		return
	}
	if len(hooks) == 0 {
		return
	}

	body, err := json.Marshal(webhookPayload{
		Event:      "deal.created",
		OccurredAt: time.Now().UTC(),
		Data:       ev,
	})
	if err != nil {
		log.Printf("[webhook] marshal payload: %v", err)
		return
	}

	for _, hook := range hooks {
		if !matchesFilter(hook.Filters, ev) {
			continue
		}
		hook := hook // локальная копия для goroutine
		go d.send(hook, body)
	}
}

// matchesFilter — проверяет, соответствует ли событие фильтрам хука.
// Если фильтр не задан (пустая строка) — условие считается выполненным.
func matchesFilter(filters map[string]any, ev DealEvent) bool {
	if from, _ := filters["from"].(string); from != "" {
		if !strings.EqualFold(ev.FromCity, from) {
			return false
		}
	}
	if to, _ := filters["to"].(string); to != "" {
		if !strings.EqualFold(ev.ToCity, to) {
			return false
		}
	}
	if t, _ := filters["type"].(string); t != "" {
		if !strings.EqualFold(ev.Type, t) {
			return false
		}
	}
	return true
}

// send — HTTP POST с HMAC-подписью + запись результата в БД.
// Выполняется в отдельной goroutine.
func (d *Dispatcher) send(hook repository.Webhook, body []byte) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, hook.URL, bytes.NewReader(body))
	if err != nil {
		log.Printf("[webhook] build request for %s: %v", hook.URL, err)
		d.logDelivery(hook.ID, body, 0)
		return
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-TariffRadar-Event", "deal.created")
	req.Header.Set("X-TariffRadar-Signature", hmacSign(body, hook.Secret))

	resp, err := d.client.Do(req)
	status := 0
	if err != nil {
		log.Printf("[webhook] POST %s error: %v", hook.URL, err)
	} else {
		status = resp.StatusCode
		resp.Body.Close()
		log.Printf("[webhook] delivered to %s → HTTP %d", hook.URL, status)
	}

	d.logDelivery(hook.ID, body, status)
}

// hmacSign — HMAC-SHA256 подпись тела (формат совместим с GitHub webhooks).
func hmacSign(body []byte, secret string) string {
	mac := hmac.New(sha256.New, []byte(secret))
	mac.Write(body)
	return "sha256=" + hex.EncodeToString(mac.Sum(nil))
}

// logDelivery — записывает результат доставки в webhook_deliveries.
func (d *Dispatcher) logDelivery(hookID uuid.UUID, payload []byte, status int) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	if err := d.webhooks.SaveDelivery(ctx, hookID, payload, status); err != nil {
		log.Printf("[webhook] SaveDelivery: %v", err)
	}
}
