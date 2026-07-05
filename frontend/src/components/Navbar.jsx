import { useAuth } from '../context/useAuth'
import { useNavigate } from 'react-router-dom'

const Navbar = ({ user, darkMode, toggleDark }) => {
  const { logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  return (
    <nav className='navbar'>
      <span className='nav-brand'>LinkVault</span>
      <div className='nav-right'>
        <span className='nav-user'>Welcome {user?.username}</span>
        <button className='toggle-btn' onClick={toggleDark}>{darkMode ? 'dark mode' : 'light mode'}</button>
        <button className='logout-btn' onClick={handleLogout}>Logout</button>
      </div>
    </nav>
  )
}

export default Navbar
