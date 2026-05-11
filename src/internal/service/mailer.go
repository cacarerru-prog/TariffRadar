// internal/service/mailer.go — отправка email через SMTP или stdout (для dev).
//
// Драйверы:
//   - "stdout" (по умолчанию для dev): печатает письмо в лог, ничего не отправляет.
//   - "smtp":   реальная отправка через SMTP-сервер (Resend, Mailgun и т.п.).
//
// Конфигурация через env: MAIL_DRIVER, SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD, MAIL_FROM.
package service

import (
	"fmt"
	"log"
	"net/smtp"
	"strings"
)

// Mailer — интерфейс отправщика писем.
type Mailer interface {
	Send(to, subject, htmlBody string) error
}

// stdoutMailer — печатает письмо в stderr (для разработки/тестов).
type stdoutMailer struct {
	from string
}

func (m *stdoutMailer) Send(to, subject, htmlBody string) error {
	log.Printf("[mail:stdout] From=%s To=%s\n  Subject: %s\n  Body:\n%s\n",
		m.from, to, subject, indent(htmlBody, "    "))
	return nil
}

// smtpMailer — простой SMTP-отправщик (без TLS handshake тонкостей; для Resend/Mailgun достаточно).
type smtpMailer struct {
	host, port string
	user, pass string
	from       string
}

func (m *smtpMailer) Send(to, subject, htmlBody string) error {
	auth := smtp.PlainAuth("", m.user, m.pass, m.host)
	msg := buildMessage(m.from, to, subject, htmlBody)
	addr := m.host + ":" + m.port
	if err := smtp.SendMail(addr, auth, m.from, []string{to}, []byte(msg)); err != nil {
		return fmt.Errorf("smtp send: %w", err)
	}
	return nil
}

// NewMailer — фабрика, возвращает реализацию по конфигу.
func NewMailer(driver, host, port, user, pass, from string) Mailer {
	if from == "" {
		from = "TariffRadar <noreply@tariffradar.local>"
	}
	if driver == "smtp" && host != "" {
		return &smtpMailer{host: host, port: port, user: user, pass: pass, from: from}
	}
	return &stdoutMailer{from: from}
}

// buildMessage — формирует RFC 5322 message с HTML-телом.
func buildMessage(from, to, subject, htmlBody string) string {
	var b strings.Builder
	b.WriteString("From: " + from + "\r\n")
	b.WriteString("To: " + to + "\r\n")
	b.WriteString("Subject: " + subject + "\r\n")
	b.WriteString("MIME-Version: 1.0\r\n")
	b.WriteString("Content-Type: text/html; charset=UTF-8\r\n")
	b.WriteString("\r\n")
	b.WriteString(htmlBody)
	return b.String()
}

// indent — добавляет prefix к каждой строке (для красивого лога stdoutMailer).
func indent(s, prefix string) string {
	lines := strings.Split(s, "\n")
	for i, l := range lines {
		lines[i] = prefix + l
	}
	return strings.Join(lines, "\n")
}
