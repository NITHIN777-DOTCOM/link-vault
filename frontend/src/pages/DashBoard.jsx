import { useState, useEffect } from 'react'
import { getLinks } from '../api/linksApi'
import { useAuth } from '../context/AuthContext'
import Navbar from '../components/Navbar'
import LinkCard from '../components/LinkCard'
import AddLinkModal from '../components/AddLinkModal'

const Dashboard = ({ darkMode, toggleDark }) => {
  const { token, user } = useAuth()
  const [links, setLinks] = useState([])
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)

  const fetchLinks = async () => {
    try {
      const res = await getLinks(token)
      setLinks(res.data)
    } catch (err) {
      console.log(err)
    }
  }

  useEffect(() => {
    fetchLinks()
  }, [])

  const filtered = links.filter(l =>
    l.name.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className='page'>
      <Navbar user={user} darkMode={darkMode} toggleDark={toggleDark} />
      <div className='dashboard'>
        <div className='dashboard-header'>
          <h2>My Links</h2>
          <button className='add-btn' onClick={() => setShowModal(true)}>+ Add Link</button>
        </div>
        <input
          className='search'
          placeholder='Search by name...'
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        {filtered.length === 0
          ? <p className='empty'>No links found.</p>
          : filtered.map(link => (
            <LinkCard key={link._id} link={link} token={token} onDelete={fetchLinks} />
          ))
        }
      </div>
      {showModal && <AddLinkModal token={token} onClose={() => setShowModal(false)} onAdd={fetchLinks} />}
    </div>
  )
}

export default Dashboard