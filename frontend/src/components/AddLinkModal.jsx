import { useState } from 'react'
import { addLink } from '../api/linksApi'

const AddLinkModal = ({ onClose, onAdd }) => {
  const [form, setForm] = useState({ name: '', description: '', url: '', tags: [] })
  const [tagInput, setTagInput] = useState('')
  const [error, setError] = useState('')

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value })

  const handleAddTag = () => {
    const trimmedTag = tagInput.trim()
    if (trimmedTag && !form.tags.includes(trimmedTag)) {
      setForm({ ...form, tags: [...form.tags, trimmedTag] })
      setTagInput('')
    }
  }

  const handleRemoveTag = (idx) => {
    setForm({ ...form, tags: form.tags.filter((_, i) => i !== idx) })
  }

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleAddTag()
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      await addLink(form)
      onAdd()
      onClose()
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong')
    }
  }

  return (
    <div className='modal-overlay' onClick={onClose}>
      <div className='modal' onClick={e => e.stopPropagation()}>
        <h3>Add a link</h3>
        {error && <p className='error'>{error}</p>}
        <form onSubmit={handleSubmit}>
          <label>Name : </label>
          <input name='name' value={form.name} onChange={handleChange} required />
          <label>Description : </label>
          <input name='description' value={form.description} onChange={handleChange} />
          <label>URL : </label>
          <input name='url' value={form.url} onChange={handleChange} required />
          <label>Tags : </label>
          <div className='tag-input-wrapper'>
            <input 
              type='text'
              placeholder='Type a tag and press Enter'
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyPress={handleKeyPress}
            />
            <button type='button' onClick={handleAddTag} className='add-tag-btn'>Add</button>
          </div>
          {form.tags.length > 0 && (
            <div className='modal-tags'>
              {form.tags.map((tag, idx) => (
                <span key={idx} className='tag-chip-modal'>
                  {tag}
                  <button type='button' onClick={() => handleRemoveTag(idx)} className='remove-tag'>×</button>
                </span>
              ))}
            </div>
          )}
          <div className='modal-actions'>
            <button type='button' onClick={onClose} className='cancel-btn'>Cancel</button>
            <button type='submit'>Save</button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default AddLinkModal
