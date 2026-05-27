import { deleteLink } from '../api/linksApi'

const LinkCard = ({ link, token, onDelete }) => {
  const handleDelete = async () => {
    try {
      await deleteLink(link._id, token)
      onDelete()
    } catch (err) {
      console.log(err)
    }
  }

  return (
    <div className='link-card'>
      <div className='link-info'>
        <a href={link.url} target='_blank' rel='noreferrer' className='link-name'>{link.name}</a>
        {link.description && <p className='link-desc'>{link.description}</p>}
        <span className='link-url'>{link.url}</span>
      </div>
      <button className='delete-btn' onClick={handleDelete}>Delete</button>
    </div>
  )
}

export default LinkCard