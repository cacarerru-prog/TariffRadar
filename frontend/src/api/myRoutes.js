import { api } from './client'

export const myRoutesApi = {
  list:   ()           => api.get('/my/routes'),
  add:    (data)       => api.post('/my/routes', data),
  remove: (id)         => api.delete(`/my/routes/${id}`),
}
