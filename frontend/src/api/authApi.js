import axios from 'axios'
const BASE_URL = 'http://localhost:5000/api/auth'
export const registerUser = (data) => axios.post(`${BASE_URL}/register`, data)
export const loginUser = (data) => axios.post(`${BASE_URL}/login`, data)