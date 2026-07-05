import apiClient from './client'

export const getLinks = (params = {}) =>
  apiClient.get('/links', {
    params
  })
export const addLink = (data) =>
  apiClient.post('/links', data)
export const deleteLink = (id) =>
  apiClient.delete(`/links/${id}`)
