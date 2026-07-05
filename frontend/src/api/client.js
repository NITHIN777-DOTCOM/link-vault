import axios from 'axios'

const API_URL = `${import.meta.env.VITE_API_URL}/api`

const apiClient = axios.create({
  baseURL: API_URL,
  withCredentials: true
})

let refreshRequest = null

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')

  if (token && !config.headers.Authorization) {
    config.headers.Authorization = `Bearer ${token}`
  }

  return config
})

apiClient.interceptors.response.use(
  response => response,
  async (error) => {
    const originalRequest = error.config

    if (
      error.response?.status !== 401 ||
      originalRequest?._retry ||
      originalRequest?.url === '/auth/refresh'
    ) {
      return Promise.reject(error)
    }

    originalRequest._retry = true

    try {
      refreshRequest ||= axios.post(`${API_URL}/auth/refresh`, null, {
        withCredentials: true
      })

      const res = await refreshRequest
      refreshRequest = null

      localStorage.setItem('token', res.data.accessToken)
      originalRequest.headers.Authorization = `Bearer ${res.data.accessToken}`

      return apiClient(originalRequest)
    } catch (refreshError) {
      refreshRequest = null
      localStorage.removeItem('token')
      localStorage.removeItem('user')

      if (window.location.pathname !== '/login') {
        window.location.assign('/login')
      }

      return Promise.reject(refreshError)
    }
  }
)

export default apiClient
