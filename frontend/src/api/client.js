// api/client.js — базовый HTTP-клиент с JWT и обработкой ошибок.

const BASE = '/api/v1'

async function request(method, path, body, signal) {
  const token = localStorage.getItem('token')
  const headers = { 'Content-Type': 'application/json' }
  if (token) headers['Authorization'] = `Bearer ${token}`

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
    signal,
  })

  if (res.status === 401) {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    window.location.href = '/login'
    throw new Error('unauthorized')
  }

  if (res.status === 429) {
    throw new Error('Слишком много запросов — подождите минуту')
  }

  if (!res.ok) {
    let msg = `HTTP ${res.status}`
    try {
      const data = await res.json()
      msg = data?.error?.message || msg
    } catch {}
    throw new Error(msg)
  }

  if (res.status === 204) return null
  return res.json()
}

export const api = {
  get:    (path, signal)       => request('GET',    path, null, signal),
  post:   (path, body)         => request('POST',   path, body),
  patch:  (path, body)         => request('PATCH',  path, body),
  delete: (path)               => request('DELETE', path),
}

// Для скачивания файлов (экспорт CSV/Excel).
export async function downloadFile(path) {
  const token = localStorage.getItem('token')
  const headers = {}
  if (token) headers['Authorization'] = `Bearer ${token}`

  const res = await fetch(`${BASE}${path}`, { headers })
  if (!res.ok) throw new Error('Ошибка экспорта')

  const blob = await res.blob()
  const disposition = res.headers.get('Content-Disposition') || ''
  const match = disposition.match(/filename="?([^"]+)"?/)
  const filename = match ? match[1] : 'export'

  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
