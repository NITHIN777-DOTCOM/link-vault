import { deleteLink, toggleFavorite, restoreLink } from '../api/linksApi'

const LinkCard = ({ link, onDelete, onUpdate, isArchived }) => {
  const handleDelete = async () => {
    try {
      await deleteLink(link._id)
      onDelete()
    } catch (err) {
      console.log(err)
    }
  }

  const handleRestore = async () => {
    try {
      const restored = await restoreLink(link._id)
      onUpdate(link._id, restored.data)
    } catch (err) {
      console.log(err)
    }
  }

  const handleToggleFavorite = async () => {
    try {
      // Optimistic update
      const updatedLink = { ...link, favorite: !link.favorite }
      onUpdate(link._id, updatedLink)

      // API call
      await toggleFavorite(link._id)
    } catch (err) {
      // Revert on error
      const revertedLink = { ...link, favorite: !updatedLink.favorite }
      onUpdate(link._id, revertedLink)
      console.log(err)
    }
  }

  return (
    <div className='link-card'>
      <div className='link-info'>
        <div className='link-header'>
          <a href={link.url} target='_blank' rel='noreferrer' className='link-name'>{link.name}</a>
          {!isArchived && (
            <button 
              className='favorite-btn' 
              onClick={handleToggleFavorite}
              title={link.favorite ? 'Remove from favorites' : 'Add to favorites'}
            >
              {link.favorite ? '★' : '☆'}
            </button>
          )}
        </div>
        {link.description && <p className='link-desc'>{link.description}</p>}
        {link.tags && link.tags.length > 0 && (
          <div className='link-tags'>
            {link.tags.map((tag, idx) => (
              <span key={idx} className='tag-chip'>{tag}</span>
            ))}
          </div>
        )}
        <span className='link-url'>{link.url}</span>
      </div>
      <div className='link-actions'>
        {isArchived ? (
          <>
            <button className='restore-btn' onClick={handleRestore}>Restore</button>
            <button className='delete-btn' onClick={handleDelete}>Delete</button>
          </>
        ) : (
          <button className='delete-btn' onClick={handleDelete}>Delete</button>
        )}
      </div>
    </div>
  )
}

export default LinkCard
