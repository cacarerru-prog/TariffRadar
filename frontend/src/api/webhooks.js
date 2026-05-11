import { api } from './client'

export const webhooksApi = {
  list:       ()                  => api.get('/webhooks'),
  create:     ({ url, events, filters }) => api.post('/webhooks', { url, events, filters }),
  remove:     (id)                => api.delete(`/webhooks/${id}`),
  deliveries: (id)                => api.get(`/webhooks/${id}/deliveries`),
}
