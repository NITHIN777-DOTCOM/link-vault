import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { loginUser } from '../api/authApi'
import { useAuth } from '../context/AuthContext'

const Login = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const { login } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      const res = await loginUser({ email, password })
      login(res.data.token, { userId: res.data.userId, username: res.data.username })
      navigate('/dashboard')
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong')
    }
  }

  return (
    <div className='auth-wrapper'>
      <div className='auth-box'>
        <h2>Sign in</h2>
        <p className='auth-sub'>Welcome back</p>
        {error && <p className='error'>{error}</p>}
        <form onSubmit={handleSubmit}>
          <label>Email</label>
          <input type='email' value={email} onChange={e => setEmail(e.target.value)} required />
          <label>Password</label>
          <input type='password' value={password} onChange={e => setPassword(e.target.value)} required />
          <button type='submit'>Sign in</button>
          <p className='switch'>
          <Link to='/forgot-password'>Forgot password?</Link>
          </p>
        </form>
        <p className='switch'>Don't have an account? <Link to='/register'>Register</Link></p>
      </div>
    </div>
  )
}

export default Login