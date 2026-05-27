import { useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import { useAuth } from './context/AuthContext'
import './App.css'

const App = () => {
  const { token } = useAuth()
  const [darkMode, setDarkMode] = useState(true)

  return (
    <div className={darkMode ? 'app dark' : 'app light'}>
      <BrowserRouter>
        <Routes>
          <Route path='/' element={token ? <Navigate to='/dashboard' /> : <Navigate to='/login' />} />
          <Route path='/login' element={!token ? <Login /> : <Navigate to='/dashboard' />} />
          <Route path='/register' element={!token ? <Register /> : <Navigate to='/dashboard' />} />
          <Route path='/dashboard' element={token ? <Dashboard darkMode={darkMode} toggleDark={() => setDarkMode(!darkMode)} /> : <Navigate to='/login' />} />
        </Routes>
      </BrowserRouter>
    </div>
  )
}

export default App