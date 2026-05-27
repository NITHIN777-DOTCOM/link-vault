import axios from 'axios'

const BASE_URL = `${import.meta.env.VITE_API_URL}/api/links`
export const getLinks = (token) =>
  axios.get(BASE_URL, {
    headers: { Authorization: `Bearer ${token}` }
  })
export const addLink = (data, token) =>
  axios.post(BASE_URL, data, {
    headers: { Authorization: `Bearer ${token}` }
  })
export const deleteLink = (id, token) =>
  axios.delete(`${BASE_URL}/${id}`, {
    headers: { Authorization: `Bearer ${token}` }
  })