import apiClient from './client'

export const registerUser = (data) => apiClient.post('/auth/register', data)
export const loginUser = (data) => apiClient.post('/auth/login', data)
export const refreshAccessToken = () => apiClient.post('/auth/refresh')
export const logoutUser = () => apiClient.post('/auth/logout')
export const forgotPassword = (data) => apiClient.post('/auth/forgot-password', data)
export const verifyOtp = (data) => apiClient.post('/auth/verify-otp', data)
export const resetPassword = (data) => apiClient.post('/auth/reset-password', data)
