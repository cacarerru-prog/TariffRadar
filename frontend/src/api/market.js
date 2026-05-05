import { api } from './client'

export const marketApi = {
  stats: (from, to, type = 'FTL', period = '30D') =>
    api.get(`/market/stats?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&type=${type}&period=${period}`),
}
