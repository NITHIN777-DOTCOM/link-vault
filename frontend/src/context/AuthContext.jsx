import { useState } from 'react'
import apiClient from '../api/client'
import { AuthContext } from './authContextValue'

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(localStorage.getItem('token') || null)
  const [user, setUser] = useState(JSON.parse(localStorage.getItem('user')) || null)
  const login = (token, user) => {
    localStorage.setItem('token', token)
    localStorage.setItem('user', JSON.stringify(user))
    setToken(token)
    setUser(user)
  }
  const logout = async () => {
    try {
      await apiClient.post('/auth/logout')
    } catch (err) {
      console.log(err)
    }

    localStorage.removeItem('token')
    localStorage.removeItem('user')
    setToken(null)
    setUser(null)
  }
  return (
    <AuthContext.Provider value={{ token, user, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}
