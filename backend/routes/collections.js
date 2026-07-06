const express = require('express')
const mongoose = require('mongoose')
const router = express.Router()
const Collection = require('../models/collection')
const Link = require('../models/link')
const authMiddleware = require('../middleware/authMiddleware')

/**
 * @swagger
 * tags:
 *   - name: collections
 *     description: Collection management endpoints
 */

/**
 * @swagger
 * /api/collections:
 *   post:
 *     summary: Create a new collection
 *     tags: [collections]
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
 *             properties:
 *               name:
 *                 type: string
 *                 example: React Resources
 *               parentId:
 *                 type: string
 *                 nullable: true
 *                 example: null
 *     responses:
 *       201:
 *         description: Collection created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 _id:
 *                   type: string
 *                 owner:
 *                   type: string
 *                 name:
 *                   type: string
 *                 parentId:
 *                   type: string
 *                   nullable: true
 *                 createdAt:
 *                   type: string
 *                 updatedAt:
 *                   type: string
 *       400:
 *         description: Validation error (invalid parentId format or missing name)
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
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { name, parentId } = req.body

    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'Collection name is required' })
    }

    // Validate parentId format if provided
    if (parentId && !mongoose.Types.ObjectId.isValid(parentId)) {
      return res.status(400).json({ message: 'Invalid parent collection ID format' })
    }

    // If parentId is provided, verify it exists and is owned by the user
    if (parentId) {
      const parentCollection = await Collection.findOne({
        _id: parentId,
        owner: req.userId
      })
      if (!parentCollection) {
        return res.status(404).json({ message: 'Parent collection not found' })
      }
    }

    const collection = new Collection({
      owner: req.userId,
      name: name.trim(),
      parentId: parentId || null
    })
    await collection.save()

    res.status(201).json(collection)
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message })
  }
})

/**
 * @swagger
 * /api/collections:
 *   get:
 *     summary: Get all collections for authenticated user as a nested tree structure
 *     tags: [collections]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Collections retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 collections:
 *                   type: array
 *                   items:
 *                     type: object
 *                 totalCount:
 *                   type: integer
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
router.get('/', authMiddleware, async (req, res) => {
  try {
    const collections = await Collection.find({ owner: req.userId })
      .sort({ createdAt: 1 })

    // Build nested tree structure
    const tree = buildCollectionTree(collections)

    res.status(200).json({
      collections: tree,
      totalCount: collections.length
    })
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message })
  }
})

/**
 * @swagger
 * /api/collections/{id}:
 *   put:
 *     summary: Update a collection (rename or change parent)
 *     tags: [collections]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: Collection ID
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: Updated Collection Name
 *               parentId:
 *                 type: string
 *                 nullable: true
 *                 example: null
 *     responses:
 *       200:
 *         description: Collection updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 _id:
 *                   type: string
 *                 owner:
 *                   type: string
 *                 name:
 *                   type: string
 *                 parentId:
 *                   type: string
 *                   nullable: true
 *       400:
 *         description: Validation error
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
 *       404:
 *         description: Collection not found or does not belong to user
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Collection not found
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
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const { name, parentId } = req.body

    const collection = await Collection.findOne({
      _id: req.params.id,
      owner: req.userId
    })

    if (!collection) {
      return res.status(404).json({ message: 'Collection not found' })
    }

    // Validate new parentId if provided
    if (parentId !== undefined) {
      if (parentId !== null && !mongoose.Types.ObjectId.isValid(parentId)) {
        return res.status(400).json({ message: 'Invalid parent collection ID format' })
      }

      // If parentId is provided, verify it exists and is owned by the user
      if (parentId) {
        const parentCollection = await Collection.findOne({
          _id: parentId,
          owner: req.userId
        })
        if (!parentCollection) {
          return res.status(404).json({ message: 'Parent collection not found' })
        }

        // Prevent circular reference: check if parentId is a descendant of this collection
        if (await isDescendant(parentId, req.params.id)) {
          return res.status(400).json({ message: 'Cannot set a descendant as parent (circular reference)' })
        }
      }

      collection.parentId = parentId || null
    }

    if (name !== undefined) {
      const trimmed = name.trim()
      if (!trimmed) {
        return res.status(400).json({ message: 'Collection name cannot be empty' })
      }
      collection.name = trimmed
    }

    await collection.save()
    res.status(200).json(collection)
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message })
  }
})

/**
 * @swagger
 * /api/collections/{id}:
 *   delete:
 *     summary: Delete a collection and cascade delete its child collections. Links in deleted collections are reassigned to the parent collection (or null if root).
 *     tags: [collections]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: Collection ID
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Collection deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Collection deleted
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
 *         description: Collection not found or does not belong to user
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Collection not found
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
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const collectionId = req.params.id

    const collection = await Collection.findOne({
      _id: collectionId,
      owner: req.userId
    })

    if (!collection) {
      return res.status(404).json({ message: 'Collection not found' })
    }

    const parentId = collection.parentId

    // Recursive function to handle cascade delete
    async function cascadeDelete(currentId, targetParentId) {
      const childCollections = await Collection.find({
        parentId: currentId,
        owner: req.userId
      })

      for (const child of childCollections) {
        // Recursively delete grandchildren
        await cascadeDelete(child._id, targetParentId)
        
        // Delete child collection
        await Collection.deleteOne({ _id: child._id })
      }

      // Reassign links from current collection to target parent
      await Link.updateMany(
        { collectionId: currentId },
        { collectionId: targetParentId || null }
      )
    }

    // Start cascade delete
    await cascadeDelete(collectionId, parentId)

    // Delete the root collection itself
    await Collection.deleteOne({ _id: collectionId })

    res.status(200).json({ message: 'Collection deleted' })
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message })
  }
})

// Helper function to build nested tree from flat collection list
function buildCollectionTree(collections) {
  const map = {}
  const roots = []

  // Create a map of all collections
  collections.forEach(col => {
    map[col._id] = {
      ...col.toObject(),
      children: []
    }
  })

  // Build tree structure
  collections.forEach(col => {
    if (col.parentId) {
      const parent = map[col.parentId]
      if (parent) {
        parent.children.push(map[col._id])
      }
    } else {
      roots.push(map[col._id])
    }
  })

  return roots
}

// Helper function to check if targetId is a descendant of ancestorId
async function isDescendant(targetId, ancestorId) {
  let current = targetId
  const visited = new Set()

  while (current) {
    if (visited.has(current.toString())) {
      return false // Circular reference already exists, break to avoid infinite loop
    }
    visited.add(current.toString())

    if (current.toString() === ancestorId.toString()) {
      return true
    }

    const collection = await Collection.findById(current)
    if (!collection || !collection.parentId) {
      return false
    }

    current = collection.parentId
  }

  return false
}

module.exports = router
