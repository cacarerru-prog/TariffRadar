import { api, downloadFile } from './client'

export const dealsApi = {
  list: (params = {}) => {
    const q = new URLSearchParams()
    if (params.from)     q.set('from', params.from)
    if (params.to)       q.set('to', params.to)
    if (params.type)     q.set('type', params.type)
    if (params.period)   q.set('period', params.period)
    if (params.page)     q.set('page', params.page)
    if (params.per_page) q.set('per_page', params.per_page)
    return api.get(`/deals?${q}`)
  },
  create:  (data)      => api.post('/deals', data),
  update:  (id, data)  => api.patch(`/deals/${id}`, data),
  remove:  (id)        => api.delete(`/deals/${id}`),
  exportCsv:  (params = {}) => downloadFile(`/export/deals?format=csv&${new URLSearchParams(params)}`),
  exportXlsx: (params = {}) => downloadFile(`/export/deals?format=xlsx&${new URLSearchParams(params)}`),
}
