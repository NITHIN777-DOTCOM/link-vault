import axios from 'axios'
const BASE_URL = `${import.meta.env.VITE_API_URL}/api/auth`
export const registerUser = (data) => axios.post(`${BASE_URL}/register`, data)
export const loginUser = (data) => axios.post(`${BASE_URL}/login`, data)
export const forgotPassword = (data) => axios.post(`${BASE_URL}/forgot-password`, data)
export const verifyOtp = (data) => axios.post(`${BASE_URL}/verify-otp`, data)
export const resetPassword = (data) => axios.post(`${BASE_URL}/reset-password`, data)