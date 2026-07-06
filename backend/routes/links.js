const express = require('express')
const mongoose = require('mongoose')
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
 *     summary: Get all links for authenticated user with pagination, search, and advanced filters
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
 *       - name: tag
 *         in: query
 *         description: Filter by tag (exact match)
 *         schema:
 *           type: string
 *           example: React
 *       - name: collectionId
 *         in: query
 *         description: Filter by collection ID
 *         schema:
 *           type: string
 *           example: 507f1f77bcf86cd799439011
 *       - name: favorite
 *         in: query
 *         description: Filter by favorite status (true/false)
 *         schema:
 *           type: string
 *           enum: ['true', 'false']
 *           example: 'true'
 *       - name: archived
 *         in: query
 *         description: Filter by archived status. If not provided, returns only active links. If true, returns only archived links
 *         schema:
 *           type: string
 *           enum: ['true']
 *           example: 'true'
 *     responses:
 *       200:
 *         description: Links retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/LinkList'
 *       400:
 *         description: Invalid filter parameters
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
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
 *               tags:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ['React', 'Frontend']
 *               collectionId:
 *                 type: string
 *                 nullable: true
 *                 example: null
 *               favorite:
 *                 type: boolean
 *                 default: false
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
 *               tags:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ['React', 'Frontend']
 *               collectionId:
 *                 type: string
 *                 nullable: true
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
    const tag = req.query.tag?.trim()
    const collectionId = req.query.collectionId?.trim()
    const favorite = req.query.favorite
    const archived = req.query.archived
    const skip = (page - 1) * limit

    const query = { user: req.userId }

    // By default, exclude archived links unless explicitly requesting them
    if (archived === 'true') {
      query.status = 'archived'
    } else if (archived !== 'true') {
      query.status = 'active'
    }

    // Search filter (name, description, url)
    if (search) {
      const searchRegex = new RegExp(escapeRegex(search), 'i')
      query.$or = [
        { name: searchRegex },
        { description: searchRegex },
        { url: searchRegex }
      ]
    }

    // Tag filter
    if (tag) {
      query.tags = tag
    }

    // Collection filter
    if (collectionId) {
      // Validate that it's a valid ObjectId
      if (!mongoose.Types.ObjectId.isValid(collectionId)) {
        return res.status(400).json({ message: 'Invalid collection ID format' })
      }
      query.collectionId = new mongoose.Types.ObjectId(collectionId)
    }

    // Favorite filter
    if (favorite === 'true') {
      query.favorite = true
    } else if (favorite === 'false') {
      query.favorite = false
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
    const { name, description, url, tags, collectionId, favorite } = req.body

    if (!name || !isValidUrl(url)) {
      return res.status(400).json({ message: 'Name and valid URL are required' })
    }

    // Validate collectionId if provided
    if (collectionId && !mongoose.Types.ObjectId.isValid(collectionId)) {
      return res.status(400).json({ message: 'Invalid collection ID format' })
    }

    const link = new Link({
      user: req.userId,
      name: name.trim(),
      description: description?.trim() || '',
      url: url.trim(),
      tags: Array.isArray(tags) ? tags : [],
      collectionId: collectionId || null,
      favorite: favorite === true
    })
    await link.save()

    res.status(201).json(link)
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message })
  }
})

/**
 * @swagger
 * /api/links/tag-stats:
 *   get:
 *     summary: Get tag statistics (counts) for all active links owned by user
 *     tags: [links]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Tag statistics object with tag names as keys and counts as values
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               example: { "React": 5, "Node.js": 3, "CSS": 2 }
 *       401:
 *         description: Unauthorized
 */
router.get('/tag-stats', authMiddleware, async (req, res) => {
  try {
    const links = await Link.find({
      user: req.userId,
      status: 'active'
    }).select('tags')

    const counts = {}
    links.forEach(link => {
      link.tags.forEach(tag => {
        counts[tag] = (counts[tag] || 0) + 1
      })
    })

    res.json(counts)
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
    const tags = req.body.tags
    const collectionId = req.body.collectionId

    if (!name) {
      return res.status(400).json({ message: 'Name is required' })
    }

    if (!url || !isValidUrl(url)) {
      return res.status(400).json({ message: 'A valid URL is required' })
    }

    // Validate collectionId if provided
    if (collectionId && !mongoose.Types.ObjectId.isValid(collectionId)) {
      return res.status(400).json({ message: 'Invalid collection ID format' })
    }

    const updateData = {
      name,
      description,
      url
    }

    if (tags !== undefined) {
      updateData.tags = Array.isArray(tags) ? tags : []
    }

    if (collectionId !== undefined) {
      updateData.collectionId = collectionId || null
    }

    const link = await Link.findOneAndUpdate(
      { _id: req.params.id, user: req.userId },
      updateData,
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

/**
 * @swagger
 * /api/links/{id}/favorite:
 *   patch:
 *     summary: Toggle favorite status of a link
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
 *         description: Link favorite status toggled
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
router.patch('/:id/favorite', authMiddleware, async (req, res) => {
  try {
    const link = await Link.findOne({
      _id: req.params.id,
      user: req.userId
    })

    if (!link) {
      return res.status(404).json({ message: 'Link not found' })
    }

    link.favorite = !link.favorite
    await link.save()

    res.status(200).json(link)
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message })
  }
})

/**
 * @swagger
 * /api/links/{id}/archive:
 *   patch:
 *     summary: Archive a link (set status to archived)
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
 *         description: Link archived successfully
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
router.patch('/:id/archive', authMiddleware, async (req, res) => {
  try {
    const link = await Link.findOneAndUpdate(
      { _id: req.params.id, user: req.userId },
      { status: 'archived' },
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

/**
 * @swagger
 * /api/links/{id}/restore:
 *   patch:
 *     summary: Restore an archived link (set status to active)
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
 *         description: Link restored successfully
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
router.patch('/:id/restore', authMiddleware, async (req, res) => {
  try {
    const link = await Link.findOneAndUpdate(
      { _id: req.params.id, user: req.userId },
      { status: 'active' },
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

/**
 * @swagger
 * /api/links/bulk:
 *   post:
 *     summary: Perform bulk operations on links (delete, archive, restore, addTag)
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
 *               - linkIds
 *               - action
 *             properties:
 *               linkIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ['507f1f77bcf86cd799439011', '507f1f77bcf86cd799439012']
 *               action:
 *                 type: string
 *                 enum: ['delete', 'archive', 'restore', 'addTag', 'removeTag']
 *                 example: delete
 *               payload:
 *                 type: object
 *                 description: Action-specific payload (required for addTag and removeTag)
 *                 properties:
 *                   tag:
 *                     type: string
 *                     example: React
 *     responses:
 *       200:
 *         description: Bulk operation completed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 affected:
 *                   type: integer
 *       400:
 *         description: Invalid action or missing payload
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
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
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 */
router.post('/bulk', authMiddleware, async (req, res) => {
  try {
    const { linkIds, action, payload } = req.body

    if (!linkIds || !Array.isArray(linkIds) || linkIds.length === 0) {
      return res.status(400).json({ message: 'linkIds must be a non-empty array' })
    }

    if (!action || !['delete', 'archive', 'restore', 'addTag', 'removeTag'].includes(action)) {
      return res.status(400).json({ message: 'Invalid action' })
    }

    // Validate ObjectIds
    const validIds = linkIds.filter(id => mongoose.Types.ObjectId.isValid(id))

    let result
    switch (action) {
      case 'delete':
        result = await Link.deleteMany({
          _id: { $in: validIds },
          user: req.userId
        })
        break

      case 'archive':
        result = await Link.updateMany(
          { _id: { $in: validIds }, user: req.userId },
          { status: 'archived' }
        )
        break

      case 'restore':
        result = await Link.updateMany(
          { _id: { $in: validIds }, user: req.userId },
          { status: 'active' }
        )
        break

      case 'addTag':
        if (!payload || !payload.tag || !payload.tag.trim()) {
          return res.status(400).json({ message: 'Tag is required for addTag action' })
        }
        const tag = payload.tag.trim()
        result = await Link.updateMany(
          { _id: { $in: validIds }, user: req.userId },
          { $addToSet: { tags: tag } }
        )
        break

      case 'removeTag':
        if (!payload || !payload.tag) {
          return res.status(400).json({ message: 'Tag is required for removeTag action' })
        }
        result = await Link.updateMany(
          { _id: { $in: validIds }, user: req.userId },
          { $pull: { tags: payload.tag } }
        )
        break

      default:
        return res.status(400).json({ message: 'Unknown action' })
    }

    res.status(200).json({
      message: `Bulk ${action} completed`,
      affected: result.modifiedCount || result.deletedCount || 0
    })
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message })
  }
})

module.exports = router
