import { api } from './client'

const MY_LOADS_KEY = 'tr_my_load_ids'

export function getMyLoadIds() {
  try { return JSON.parse(localStorage.getItem(MY_LOADS_KEY)) || [] }
  catch { return [] }
}

function saveMyLoadId(id) {
  const ids = getMyLoadIds()
  if (!ids.includes(id)) {
    localStorage.setItem(MY_LOADS_KEY, JSON.stringify([...ids, id]))
  }
}

export const marketplaceApi = {
  list: (params = {}) => {
    const q = new URLSearchParams()
    if (params.from)   q.set('from',     params.from)
    if (params.to)     q.set('to',       params.to)
    if (params.type)   q.set('type',     params.type)
    if (params.status) q.set('status',   params.status)
    if (params.page)   q.set('page',     params.page)
    return api.get(`/marketplace/loads?${q}`)
  },

  create: async (data) => {
    const load = await api.post('/marketplace/loads', data)
    saveMyLoadId(load.id)
    return load
  },

  updateStatus: (id, status) => api.patch(`/marketplace/loads/${id}`, { status }),

  remove: (id) => api.delete(`/marketplace/loads/${id}`),
}
