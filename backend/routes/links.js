const express = require('express')
const router = express.Router()
const Link = require('../models/Link')
const authMiddleware = require('../middleware/authMiddleware')

router.get('/', authMiddleware, async (req, res) => {
  try {
    const links = await Link.find({ user: req.userId })
    res.status(200).json(links)
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message })
  }
})

router.post('/', authMiddleware, async (req, res) => {
  try {
    const { name, description, url } = req.body

    const link = new Link({
      user: req.userId,
      name,
      description,
      url
    })
    await link.save()

    res.status(201).json(link)
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message })
  }
})

router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const link = await Link.findById(req.params.id)

    if (!link) {
      return res.status(404).json({ message: 'Link not found' })
    }

    if (link.user.toString() !== req.userId) {
      return res.status(401).json({ message: 'Not authorized' })
    }

    await link.deleteOne()
    res.status(200).json({ message: 'Link deleted' })
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message })
  }
})

module.exports = router