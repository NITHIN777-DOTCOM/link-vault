import axios from 'axios'
const BASE_URL = 'https://link-vault-backend-w18w.onrender.com'
export const registerUser = (data) => axios.post(`${BASE_URL}/register`, data)
export const loginUser = (data) => axios.post(`${BASE_URL}/login`, data)