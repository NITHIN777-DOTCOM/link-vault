import { useState, useEffect, useCallback } from 'react'
import { getLinks, getCollections, bulkOperations, getTagStats } from '../api/linksApi'
import { useAuth } from '../context/useAuth'
import Navbar from '../components/Navbar'
import LinkCard from '../components/LinkCard'
import AddLinkModal from '../components/AddLinkModal'
import Sidebar from '../components/Sidebar'

const PAGE_LIMIT = 10

const Dashboard = ({ darkMode, toggleDark }) => {
  const { user } = useAuth()
  const [links, setLinks] = useState([])
  const [collections, setCollections] = useState([])
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [currentFilter, setCurrentFilter] = useState({ type: 'all' })
  const [tags, setTags] = useState([])
  const [selectMode, setSelectMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState(new Set())
  const [bulkAction, setBulkAction] = useState(null)
  const [bulkTag, setBulkTag] = useState('')

  // Fetch collections on mount
  useEffect(() => {
    const fetchCollections = async () => {
      try {
        const res = await getCollections()
        setCollections(res.data.collections)
      } catch (err) {
        console.log(err)
      }
    }
    fetchCollections()
  }, [])

  // Fetch tag statistics on mount
  useEffect(() => {
    const fetchTagStats = async () => {
      try {
        const res = await getTagStats()
        const tagArray = Object.entries(res.data)
          .map(([name, count]) => ({ name, count }))
          .sort((a, b) => b.count - a.count)
        setTags(tagArray)
      } catch (err) {
        console.log(err)
      }
    }
    fetchTagStats()
  }, [])

  const fetchLinks = useCallback(async () => {
    try {
      const params = {
        page,
        limit: PAGE_LIMIT,
        search
      }

      // Apply current filter
      if (currentFilter.type === 'favorite') {
        params.favorite = 'true'
      } else if (currentFilter.type === 'archive') {
        params.archived = 'true'
      } else if (currentFilter.type === 'collection') {
        params.collectionId = currentFilter.id
      } else if (currentFilter.type === 'tag') {
        params.tag = currentFilter.value
      }

      const res = await getLinks(params)
      setLinks(res.data.links)
      setTotal(res.data.total)
      setTotalPages(res.data.totalPages)
    } catch (err) {
      console.log(err)
    }
  }, [page, search, currentFilter])

  useEffect(() => {
    fetchLinks()
  }, [fetchLinks])

  const handleSearchChange = (e) => {
    setSearch(e.target.value)
    setPage(1)
  }

  const handleFilterChange = (filter) => {
    setCurrentFilter(filter)
    setPage(1)
    setSearch('')
    setSelectedIds(new Set())
    setSelectMode(false)
  }

  const handleLinkDeleted = () => {
    setSelectedIds(new Set())
    if (links.length === 1 && page > 1) {
      setPage(page - 1)
      return
    }
    fetchLinks()
  }

  const handleLinkAdded = () => {
    setShowModal(false)
    if (page === 1 && search === '' && currentFilter.type === 'all') {
      fetchLinks()
      return
    }
    setSearch('')
    setPage(1)
    setCurrentFilter({ type: 'all' })
  }

  const handleLinkUpdate = (linkId, updatedLink) => {
    setLinks(links.map(link => link._id === linkId ? updatedLink : link))
  }

  const handleSelectLink = (linkId) => {
    const newSelected = new Set(selectedIds)
    if (newSelected.has(linkId)) {
      newSelected.delete(linkId)
    } else {
      newSelected.add(linkId)
    }
    setSelectedIds(newSelected)
  }

  const handleBulkAction = async (action) => {
    if (selectedIds.size === 0) return

    try {
      const payload = action === 'addTag' ? { tag: bulkTag.trim() } : undefined
      
      if (action === 'addTag' && !bulkTag.trim()) {
        alert('Please enter a tag')
        return
      }

      await bulkOperations(Array.from(selectedIds), action, payload)

      // Clear selection and refresh
      setSelectedIds(new Set())
      setSelectMode(false)
      setBulkTag('')
      fetchLinks()
    } catch (err) {
      console.log(err)
      alert('Bulk operation failed')
    }
  }

  const getPageTitle = () => {
    if (currentFilter.type === 'all') return 'All Links'
    if (currentFilter.type === 'favorite') return 'Favorites'
    if (currentFilter.type === 'archive') return 'Archive'
    if (currentFilter.type === 'collection') {
      const collection = findCollectionById(collections, currentFilter.id)
      return collection?.name || 'Collection'
    }
    if (currentFilter.type === 'tag') return `Tag: ${currentFilter.value}`
    return 'My Links'
  }

  const findCollectionById = (items, id) => {
    for (const item of items) {
      if (item._id === id) return item
      if (item.children?.length > 0) {
        const found = findCollectionById(item.children, id)
        if (found) return found
      }
    }
    return null
  }

  return (
    <div className='page'>
      <Navbar user={user} darkMode={darkMode} toggleDark={toggleDark} />
      <div className='dashboard-with-sidebar'>
        <Sidebar
          collections={collections}
          tags={tags}
          currentFilter={currentFilter}
          onFilterChange={handleFilterChange}
        />
        <div className='dashboard'>
          <div className='dashboard-header'>
            <h2>{getPageTitle()}</h2>
            <div className='header-actions'>
              <button 
                className={`select-mode-btn ${selectMode ? 'active' : ''}`}
                onClick={() => {
                  setSelectMode(!selectMode)
                  setSelectedIds(new Set())
                }}
              >
                {selectMode ? 'Cancel' : 'Select'}
              </button>
              <button className='add-btn' onClick={() => setShowModal(true)}>+ Add Link</button>
            </div>
          </div>

          {selectMode && selectedIds.size > 0 && (
            <div className='bulk-action-bar'>
              <span className='selected-count'>{selectedIds.size} selected</span>
              <div className='action-buttons'>
                <button className='bulk-btn archive-btn' onClick={() => handleBulkAction('archive')}>Archive</button>
                {currentFilter.type === 'archive' && (
                  <button className='bulk-btn restore-btn' onClick={() => handleBulkAction('restore')}>Restore</button>
                )}
                <div className='tag-input-inline'>
                  <input
                    type='text'
                    placeholder='Tag'
                    value={bulkTag}
                    onChange={(e) => setBulkTag(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') handleBulkAction('addTag')
                    }}
                  />
                  <button className='bulk-btn' onClick={() => handleBulkAction('addTag')}>Add Tag</button>
                </div>
                <button className='bulk-btn delete-btn' onClick={() => handleBulkAction('delete')}>Delete</button>
              </div>
            </div>
          )}

          <input
            className='search'
            placeholder='Search links...'
            value={search}
            onChange={handleSearchChange}
          />
          {links.length === 0
            ? <p className='empty'>No links found.</p>
            : links.map(link => (
              <div key={link._id} className='link-card-with-checkbox'>
                {selectMode && (
                  <input
                    type='checkbox'
                    className='link-checkbox'
                    checked={selectedIds.has(link._id)}
                    onChange={() => handleSelectLink(link._id)}
                  />
                )}
                <LinkCard 
                  link={link} 
                  onDelete={handleLinkDeleted}
                  onUpdate={handleLinkUpdate}
                  isArchived={currentFilter.type === 'archive'}
                />
              </div>
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
      </div>
      {showModal && <AddLinkModal onClose={() => setShowModal(false)} onAdd={handleLinkAdded} />}
    </div>
  )
}

export default Dashboard
