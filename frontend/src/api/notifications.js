import { api } from './client'

export const notificationsApi = {
  get:    ()      => api.get('/me/notifications'),
  update: (data)  => api.patch('/me/notifications', data),
}
