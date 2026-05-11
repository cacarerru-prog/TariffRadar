import { api } from './client'

export const authApi = {
  login:    (email, password)             => api.post('/auth/login', { email, password }),
  register: (email, password, name, company) => api.post('/auth/register', { email, password, name, company }),
  me:       ()                            => api.get('/me'),
  patchMe:  (data)                        => api.patch('/me', data),
  patchPassword: (current_password, new_password) =>
    api.patch('/me/password', { current_password, new_password }),

  logout:                  ()             => api.post('/auth/logout', {}),
  verifyEmail:             (token)        => api.post('/auth/verify-email', { token }),
  resendVerification:      ()             => api.post('/auth/resend-verification', {}),
  passwordResetRequest:    (email)        => api.post('/auth/password-reset/request', { email }),
  passwordResetConfirm:    (token, new_password) =>
    api.post('/auth/password-reset/confirm', { token, new_password }),
}
