import { api } from './client'

export const apiKeysApi = {
  list:   ()             => api.get('/me/api-keys'),
  create: (name)         => api.post('/me/api-keys', { name }),
  remove: (id)           => api.delete(`/me/api-keys/${id}`),
}
