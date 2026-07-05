import { useState, useEffect, useCallback } from 'react'
import { getLinks } from '../api/linksApi'
import { useAuth } from '../context/useAuth'
import Navbar from '../components/Navbar'
import LinkCard from '../components/LinkCard'
import AddLinkModal from '../components/AddLinkModal'

const PAGE_LIMIT = 10

const Dashboard = ({ darkMode, toggleDark }) => {
  const { user } = useAuth()
  const [links, setLinks] = useState([])
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(0)

  const fetchLinks = useCallback(async () => {
    try {
      const res = await getLinks({
        page,
        limit: PAGE_LIMIT,
        search
      })

      setLinks(res.data.links)
      setTotal(res.data.total)
      setTotalPages(res.data.totalPages)
    } catch (err) {
      console.log(err)
    }
  }, [page, search])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchLinks()
  }, [fetchLinks])

  const handleSearchChange = (e) => {
    setSearch(e.target.value)
    setPage(1)
  }

  const handleLinkDeleted = () => {
    if (links.length === 1 && page > 1) {
      setPage(page - 1)
      return
    }

    fetchLinks()
  }

  const handleLinkAdded = () => {
    setShowModal(false)

    if (page === 1 && search === '') {
      fetchLinks()
      return
    }

    setSearch('')
    setPage(1)
  }

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
          placeholder='Search links...'
          value={search}
          onChange={handleSearchChange}
        />
        {links.length === 0
          ? <p className='empty'>No links found.</p>
          : links.map(link => (
            <LinkCard key={link._id} link={link} onDelete={handleLinkDeleted} />
          ))
        }
        {totalPages > 1 && (
          <div className='pagination'>
            <button
              className='page-btn'
              disabled={page === 1}
              onClick={() => setPage(page - 1)}
            >
              Previous
            </button>
            <span className='page-status'>
              Page {page} of {totalPages} - {total} links
            </span>
            <button
              className='page-btn'
              disabled={page === totalPages}
              onClick={() => setPage(page + 1)}
            >
              Next
            </button>
          </div>
        )}
      </div>
      {showModal && <AddLinkModal onClose={() => setShowModal(false)} onAdd={handleLinkAdded} />}
    </div>
  )
}

export default Dashboard
