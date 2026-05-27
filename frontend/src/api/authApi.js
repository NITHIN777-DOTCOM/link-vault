import axios from 'axios'
const BASE_URL = `${import.meta.env.VITE_API_URL}/api/auth`
export const registerUser = (data) => axios.post(`${BASE_URL}/register`, data)
export const loginUser = (data) => axios.post(`${BASE_URL}/login`, data)