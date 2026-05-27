import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { registerUser } from '../api/authApi'

const Register = () => {
  const [form, setForm] = useState({ username: '', email: '', password: '' })
  const [error, setError] = useState('')
  const navigate = useNavigate()

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value })

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      await registerUser(form)
      navigate('/login')
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong')
    }
  }

  return (
    <div className='auth-wrapper'>
      <div className='auth-box'>
        <h2>Create account</h2>
        <p className='auth-sub'>Start saving your links</p>
        {error && <p className='error'>{error}</p>}
        <form onSubmit={handleSubmit}>
          <label>Username</label>
          <input name='username' value={form.username} onChange={handleChange} required />
          <label>Email</label>
          <input name='email' type='email' value={form.email} onChange={handleChange} required />
          <label>Password</label>
          <input name='password' type='password' value={form.password} onChange={handleChange} required />
          <button type='submit'>Create account</button>
        </form>
        <p className='switch'>Already have an account? <Link to='/login'>Sign in</Link></p>
      </div>
    </div>
  )
}

export default Register