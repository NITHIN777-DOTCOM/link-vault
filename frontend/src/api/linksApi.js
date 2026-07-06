import apiClient from './client'

export const getLinks = (params = {}) =>
  apiClient.get('/links', {
    params
  })
export const addLink = (data) =>
  apiClient.post('/links', data)
export const deleteLink = (id) =>
  apiClient.delete(`/links/${id}`)
export const toggleFavorite = (id) =>
  apiClient.patch(`/links/${id}/favorite`)
export const archiveLink = (id) =>
  apiClient.patch(`/links/${id}/archive`)
export const restoreLink = (id) =>
  apiClient.patch(`/links/${id}/restore`)
export const getTagStats = () =>
  apiClient.get('/links/tag-stats')

export const getCollections = () =>
  apiClient.get('/collections')
export const createCollection = (data) =>
  apiClient.post('/collections', data)
export const updateCollection = (id, data) =>
  apiClient.put(`/collections/${id}`, data)
export const deleteCollection = (id) =>
  apiClient.delete(`/collections/${id}`)

export const bulkOperations = (linkIds, action, payload) =>
  apiClient.post('/links/bulk', {
    linkIds,
    action,
    payload
  })
