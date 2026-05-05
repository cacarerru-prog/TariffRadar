import { api } from './client'

export const insightsApi = {
  trends:      (period = '30D', limit = 5) =>
    api.get(`/insights/trends?period=${period}&limit=${limit}`),
  seasonality: (from, to, type = 'FTL') =>
    api.get(`/insights/seasonality?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&type=${type}`),
  byCargo:     (from, to, type = 'FTL', period = '30D') =>
    api.get(`/insights/by-cargo?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&type=${type}&period=${period}`),
}
