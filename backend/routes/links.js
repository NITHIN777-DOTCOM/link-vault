const express = require('express')
const router = express.Router()
const Link = require('../models/link')
const authMiddleware = require('../middleware/authMiddleware')

/**
 * @swagger
 * tags:
 *   - name: links
 *     description: Link management endpoints
 */

/**
 * @swagger
 * /api/links:
 *   get:
 *     summary: Get all links for authenticated user with pagination and search
 *     tags: [links]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: page
 *         in: query
 *         description: Page number (default 1)
 *         schema:
 *           type: integer
 *           default: 1
 *       - name: limit
 *         in: query
 *         description: Number of results per page (default 10, max 50)
 *         schema:
 *           type: integer
 *           default: 10
 *       - name: search
 *         in: query
 *         description: Search query (searches across name, description, and url)
 *         schema:
 *           type: string
 *           example: github
 *     responses:
 *       200:
 *         description: Links retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/LinkList'
 *       401:
 *         description: No token or invalid token
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: No token, access denied
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

/**
 * @swagger
 * /api/links:
 *   post:
 *     summary: Create a new link
 *     tags: [links]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - url
 *             properties:
 *               name:
 *                 type: string
 *                 example: GitHub Repository
 *               description:
 *                 type: string
 *                 example: My awesome project on GitHub
 *               url:
 *                 type: string
 *                 format: uri
 *                 example: https://github.com/user/repo
 *     responses:
 *       201:
 *         description: Link created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Link'
 *       400:
 *         description: Validation error (invalid URL, missing fields)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: No token or invalid token
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: No token, access denied
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

/**
 * @swagger
 * /api/links/{id}:
 *   get:
 *     summary: Get a specific link by ID
 *     tags: [links]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: Link ID
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Link retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Link'
 *       401:
 *         description: No token or invalid token
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: No token, access denied
 *       404:
 *         description: Link not found or does not belong to user
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Link not found
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

/**
 * @swagger
 * /api/links/{id}:
 *   put:
 *     summary: Update a link
 *     tags: [links]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: Link ID
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - url
 *             properties:
 *               name:
 *                 type: string
 *                 example: Updated Link Name
 *               description:
 *                 type: string
 *                 example: Updated description
 *               url:
 *                 type: string
 *                 format: uri
 *                 example: https://updated-url.com
 *     responses:
 *       200:
 *         description: Link updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Link'
 *       400:
 *         description: Validation error (invalid URL, missing fields)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: No token or invalid token
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: No token, access denied
 *       404:
 *         description: Link not found or does not belong to user
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Link not found
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

/**
 * @swagger
 * /api/links/{id}:
 *   delete:
 *     summary: Delete a link
 *     tags: [links]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: Link ID
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Link deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Link deleted
 *       401:
 *         description: No token or invalid token
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: No token, access denied
 *       404:
 *         description: Link not found or does not belong to user
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Link not found
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

const isValidUrl = (value) => {
  try {
    const parsedUrl = new URL(value)
    return ['http:', 'https:'].includes(parsedUrl.protocol)
  } catch {
    return false
  }
}

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

router.get('/', authMiddleware, async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1)
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 10, 1), 50)
    const search = req.query.search?.trim()
    const skip = (page - 1) * limit

    const query = { user: req.userId }

    if (search) {
      const searchRegex = new RegExp(escapeRegex(search), 'i')
      query.$or = [
        { name: searchRegex },
        { description: searchRegex },
        { url: searchRegex }
      ]
    }

    const [links, total] = await Promise.all([
      Link.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Link.countDocuments(query)
    ])

    res.status(200).json({
      links,
      total,
      page,
      totalPages: Math.ceil(total / limit)
    })
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

router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const link = await Link.findOne({
      _id: req.params.id,
      user: req.userId
    })

    if (!link) {
      return res.status(404).json({ message: 'Link not found' })
    }

    res.status(200).json(link)
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message })
  }
})

router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const name = req.body.name?.trim()
    const description = req.body.description?.trim() || ''
    const url = req.body.url?.trim()

    if (!name) {
      return res.status(400).json({ message: 'Name is required' })
    }

    if (!url || !isValidUrl(url)) {
      return res.status(400).json({ message: 'A valid URL is required' })
    }

    const link = await Link.findOneAndUpdate(
      { _id: req.params.id, user: req.userId },
      { name, description, url },
      { new: true, runValidators: true }
    )

    if (!link) {
      return res.status(404).json({ message: 'Link not found' })
    }

    res.status(200).json(link)
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message })
  }
})

router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const link = await Link.findOneAndDelete({
      _id: req.params.id,
      user: req.userId
    })

    if (!link) {
      return res.status(404).json({ message: 'Link not found' })
    }
    res.status(200).json({ message: 'Link deleted' })
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message })
  }
})

module.exports = router
