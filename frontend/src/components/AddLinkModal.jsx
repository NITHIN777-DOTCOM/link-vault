import { useState } from 'react'
import { addLink } from '../api/linksApi'

const AddLinkModal = ({ onClose, onAdd }) => {
  const [form, setForm] = useState({ name: '', description: '', url: '' })
  const [error, setError] = useState('')

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value })

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
