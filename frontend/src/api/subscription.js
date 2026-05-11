import { api } from './client'

export const subscriptionApi = {
  listPlans: () => api.get('/plans'),
  getMyPlan: () => api.get('/me/plan'),
}
