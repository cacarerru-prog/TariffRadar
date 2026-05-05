import { api } from './client'

export const authApi = {
  login:    (email, password)             => api.post('/auth/login', { email, password }),
  register: (email, password, name, company) => api.post('/auth/register', { email, password, name, company }),
  me:       ()                            => api.get('/me'),
  patchMe:  (data)                        => api.patch('/me', data),
  patchPassword: (current_password, new_password) =>
    api.patch('/me/password', { current_password, new_password }),
}
