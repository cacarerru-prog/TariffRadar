import { api } from './client'

export const benchmarkApi = {
  calculate: (from, to, type, user_rate, currency = 'EUR', period = '30D') =>
    api.post('/benchmark', { from, to, type, user_rate, currency, period }),
}
