import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { forgotPassword, verifyOtp, resetPassword } from '../api/authApi'

const ForgotPassword = () => {
  const [step, setStep] = useState(1)
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const navigate = useNavigate()

  const handleSendOtp = async (e) => {
    e.preventDefault()
    setError('')
    try {
      await forgotPassword({ email })
      setMessage('OTP sent to your email!')
      setStep(2)
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong')
    }
  }

  const handleVerifyOtp = async (e) => {
    e.preventDefault()
    setError('')
    try {
      await verifyOtp({ email, otp })
      setMessage('OTP verified!')
      setStep(3)
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid OTP')
    }
  }

  const handleResetPassword = async (e) => {
    e.preventDefault()
    setError('')
    try {
      await resetPassword({ email, otp, newPassword })
      setMessage('Password reset successful!')
      setTimeout(() => navigate('/login'), 2000)
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong')
    }
  }

  return (
    <div className='auth-wrapper'>
      <div className='auth-box'>
        {step === 1 && (
          <>
            <h2>Forgot password</h2>
            <p className='auth-sub'>We'll send an OTP to your email</p>
            {error && <p className='error'>{error}</p>}
            {message && <p className='success'>{message}</p>}
            <form onSubmit={handleSendOtp}>
              <label>Email</label>
              <input
                type='email'
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
              />
              <button type='submit'>Send OTP</button>
            </form>
            <p className='switch'><Link to='/login'>Back to login</Link></p>
          </>
        )}

        {step === 2 && (
          <>
            <h2>Enter OTP</h2>
            <p className='auth-sub'>Check your email for the 6 digit code</p>
            {error && <p className='error'>{error}</p>}
            {message && <p className='success'>{message}</p>}
            <form onSubmit={handleVerifyOtp}>
              <label>OTP</label>
              <input
                type='text'
                value={otp}
                onChange={e => setOtp(e.target.value)}
                maxLength={6}
                required
              />
              <button type='submit'>Verify OTP</button>
            </form>
            <p className='switch' onClick={() => { setStep(1); setError('') }} style={{ cursor: 'pointer' }}>
              Resend OTP
            </p>
          </>
        )}
        {step === 3 && (
          <>
            <h2>New password</h2>
            <p className='auth-sub'>Enter your new password</p>
            {error && <p className='error'>{error}</p>}
            {message && <p className='success'>{message}</p>}
            <form onSubmit={handleResetPassword}>
              <label>New Password</label>
              <input
                type='password'
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                required
              />
              <button type='submit'>Reset Password</button>
            </form>
          </>
        )}

      </div>
    </div>
  )
}

export default ForgotPassword