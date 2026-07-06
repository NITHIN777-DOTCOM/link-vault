process.env.NODE_ENV = 'test'
process.env.JWT_SECRET = 'test-jwt-secret'
process.env.RESEND_API_KEY = 're_test_key'

const jwt = require('jsonwebtoken')
const mongoose = require('mongoose')
const request = require('supertest')
const { MongoMemoryServer } = require('mongodb-memory-server')

const app = require('../app')
const User = require('../models/user')
const Link = require('../models/link')
const Collection = require('../models/collection')

let mongoServer

const createUser = async (overrides = {}) => {
  const suffix = new mongoose.Types.ObjectId().toString()
  const user = {
    username: `user-${suffix}`,
    email: `user-${suffix}@example.com`,
    password: 'Password123!',
    ...overrides
  }

  await request(app)
    .post('/api/auth/register')
    .send(user)
    .expect(201)

  const loginRes = await request(app)
    .post('/api/auth/login')
    .send({ email: user.email, password: user.password })
    .expect(200)

  return {
    ...user,
    token: loginRes.body.accessToken,
    userId: loginRes.body.userId,
    cookie: loginRes.headers['set-cookie']
  }
}

const createLink = async (token, overrides = {}) => {
  const link = {
    name: 'Example Link',
    description: 'Useful documentation',
    url: 'https://example.com/docs',
    ...overrides
  }

  const res = await request(app)
    .post('/api/links')
    .set('Authorization', `Bearer ${token}`)
    .send(link)
    .expect(201)

  return res.body
}

const createCollection = async (token, overrides = {}) => {
  const collection = {
    name: 'My Collection',
    ...overrides
  }

  const res = await request(app)
    .post('/api/collections')
    .set('Authorization', `Bearer ${token}`)
    .send(collection)
    .expect(201)

  return res.body
}

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create()
  await mongoose.connect(mongoServer.getUri())
})

afterAll(async () => {
  await mongoose.disconnect()
  await mongoServer.stop()
})

beforeEach(async () => {
  await User.deleteMany({})
  await Link.deleteMany({})
  await Collection.deleteMany({})
})

describe('auth', () => {
  test('registers a user and rejects duplicate email', async () => {
    const user = {
      username: 'alice',
      email: 'alice@example.com',
      password: 'Password123!'
    }

    await request(app)
      .post('/api/auth/register')
      .send(user)
      .expect(201)

    const duplicateRes = await request(app)
      .post('/api/auth/register')
      .send({ ...user, username: 'alice2' })
      .expect(400)

    expect(duplicateRes.body.message).toBe('Email already in use')
  })

  test('logs in with valid credentials', async () => {
    const user = await createUser()

    expect(user.token).toBeTruthy()
    expect(user.userId).toBeTruthy()
    expect(user.cookie.join(';')).toContain('refreshToken=')
  })

  test('uses the same generic message for wrong password and nonexistent email', async () => {
    const user = await createUser()

    const wrongPassword = await request(app)
      .post('/api/auth/login')
      .send({ email: user.email, password: 'wrong-password' })
      .expect(400)

    const nonexistentEmail = await request(app)
      .post('/api/auth/login')
      .send({ email: 'missing@example.com', password: 'Password123!' })
      .expect(400)

    expect(wrongPassword.body.message).toBe('Invalid email or password')
    expect(nonexistentEmail.body.message).toBe('Invalid email or password')
  })

  test('blocks protected routes without a token', async () => {
    const res = await request(app)
      .get('/api/links')
      .expect(401)

    expect(res.body.message).toBe('No token, access denied')
  })

  test('blocks protected routes with invalid or expired tokens', async () => {
    const user = await createUser()
    const expiredToken = jwt.sign(
      { userId: user.userId },
      process.env.JWT_SECRET,
      { expiresIn: '-1s' }
    )

    await request(app)
      .get('/api/links')
      .set('Authorization', 'Bearer invalid-token')
      .expect(401)

    await request(app)
      .get('/api/links')
      .set('Authorization', `Bearer ${expiredToken}`)
      .expect(401)
  })

  test('refreshes access tokens end-to-end and rotates the refresh cookie', async () => {
    const user = await createUser()

    const refreshRes = await request(app)
      .post('/api/auth/refresh')
      .set('Cookie', user.cookie)
      .expect(200)

    expect(refreshRes.body.accessToken).toBeTruthy()
    expect(refreshRes.headers['set-cookie'].join(';')).toContain('refreshToken=')

    await request(app)
      .get('/api/links')
      .set('Authorization', `Bearer ${refreshRes.body.accessToken}`)
      .expect(200)

    await request(app)
      .post('/api/auth/refresh')
      .set('Cookie', user.cookie)
      .expect(401)
  })

  test('logout invalidates the refresh token', async () => {
    const user = await createUser()

    await request(app)
      .post('/api/auth/logout')
      .set('Cookie', user.cookie)
      .expect(200)

    await request(app)
      .post('/api/auth/refresh')
      .set('Cookie', user.cookie)
      .expect(401)
  })
})

describe('links', () => {
  test('creates, reads, updates, and deletes a link', async () => {
    const user = await createUser()
    const created = await createLink(user.token)

    const readRes = await request(app)
      .get(`/api/links/${created._id}`)
      .set('Authorization', `Bearer ${user.token}`)
      .expect(200)

    expect(readRes.body.name).toBe('Example Link')

    const updateRes = await request(app)
      .put(`/api/links/${created._id}`)
      .set('Authorization', `Bearer ${user.token}`)
      .send({
        name: 'Updated Link',
        description: 'Updated description',
        url: 'https://example.com/updated'
      })
      .expect(200)

    expect(updateRes.body.name).toBe('Updated Link')
    expect(updateRes.body.url).toBe('https://example.com/updated')

    await request(app)
      .delete(`/api/links/${created._id}`)
      .set('Authorization', `Bearer ${user.token}`)
      .expect(200)

    await request(app)
      .get(`/api/links/${created._id}`)
      .set('Authorization', `Bearer ${user.token}`)
      .expect(404)
  })

  test('validates update input', async () => {
    const user = await createUser()
    const created = await createLink(user.token)

    await request(app)
      .put(`/api/links/${created._id}`)
      .set('Authorization', `Bearer ${user.token}`)
      .send({ name: '', description: 'No name', url: 'https://example.com' })
      .expect(400)

    await request(app)
      .put(`/api/links/${created._id}`)
      .set('Authorization', `Bearer ${user.token}`)
      .send({ name: 'Bad URL', description: 'Invalid URL', url: 'notaurl' })
      .expect(400)
  })

  test('returns 404 when one user tries to read, update, or delete another user link', async () => {
    const owner = await createUser({ email: 'owner@example.com', username: 'owner' })
    const attacker = await createUser({ email: 'attacker@example.com', username: 'attacker' })
    const ownerLink = await createLink(owner.token)

    await request(app)
      .get(`/api/links/${ownerLink._id}`)
      .set('Authorization', `Bearer ${attacker.token}`)
      .expect(404)

    await request(app)
      .put(`/api/links/${ownerLink._id}`)
      .set('Authorization', `Bearer ${attacker.token}`)
      .send({
        name: 'Stolen',
        description: 'Should not update',
        url: 'https://example.com/stolen'
      })
      .expect(404)

    await request(app)
      .delete(`/api/links/${ownerLink._id}`)
      .set('Authorization', `Bearer ${attacker.token}`)
      .expect(404)

    const stillThere = await Link.findById(ownerLink._id)
    expect(stillThere.name).toBe('Example Link')
  })

  test('paginates results and returns empty links for out-of-range pages', async () => {
    const user = await createUser()

    for (let index = 1; index <= 12; index += 1) {
      await createLink(user.token, {
        name: `Link ${index}`,
        description: `Description ${index}`,
        url: `https://example.com/${index}`
      })
    }

    const pageOne = await request(app)
      .get('/api/links?page=1&limit=5')
      .set('Authorization', `Bearer ${user.token}`)
      .expect(200)

    expect(pageOne.body.links).toHaveLength(5)
    expect(pageOne.body.total).toBe(12)
    expect(pageOne.body.page).toBe(1)
    expect(pageOne.body.totalPages).toBe(3)

    const pageThree = await request(app)
      .get('/api/links?page=3&limit=5')
      .set('Authorization', `Bearer ${user.token}`)
      .expect(200)

    expect(pageThree.body.links).toHaveLength(2)

    const outOfRange = await request(app)
      .get('/api/links?page=9&limit=5')
      .set('Authorization', `Bearer ${user.token}`)
      .expect(200)

    expect(outOfRange.body.links).toHaveLength(0)
    expect(outOfRange.body.total).toBe(12)
    expect(outOfRange.body.totalPages).toBe(3)
  })

  test('search filters name, description, and url while empty search returns all results', async () => {
    const user = await createUser()

    await createLink(user.token, {
      name: 'Mongo Guide',
      description: 'Database reference',
      url: 'https://docs.mongodb.com'
    })
    await createLink(user.token, {
      name: 'React Notes',
      description: 'Frontend library',
      url: 'https://react.dev'
    })
    await createLink(user.token, {
      name: 'Deployment',
      description: 'Render backend checklist',
      url: 'https://render.com/docs'
    })

    const byName = await request(app)
      .get('/api/links?search=mongo')
      .set('Authorization', `Bearer ${user.token}`)
      .expect(200)

    expect(byName.body.links).toHaveLength(1)
    expect(byName.body.links[0].name).toBe('Mongo Guide')

    const byDescription = await request(app)
      .get('/api/links?search=frontend')
      .set('Authorization', `Bearer ${user.token}`)
      .expect(200)

    expect(byDescription.body.links).toHaveLength(1)
    expect(byDescription.body.links[0].name).toBe('React Notes')

    const byUrl = await request(app)
      .get('/api/links?search=render.com')
      .set('Authorization', `Bearer ${user.token}`)
      .expect(200)

    expect(byUrl.body.links).toHaveLength(1)
    expect(byUrl.body.links[0].name).toBe('Deployment')

    const emptySearch = await request(app)
      .get('/api/links?search=')
      .set('Authorization', `Bearer ${user.token}`)
      .expect(200)

    expect(emptySearch.body.links).toHaveLength(3)
    expect(emptySearch.body.total).toBe(3)
  })

  test('creates link with tags and optional fields', async () => {
    const user = await createUser()

    const res = await request(app)
      .post('/api/links')
      .set('Authorization', `Bearer ${user.token}`)
      .send({
        name: 'React Docs',
        description: 'Official React documentation',
        url: 'https://react.dev',
        tags: ['React', 'Frontend', 'JavaScript'],
        favorite: true
      })
      .expect(201)

    expect(res.body.name).toBe('React Docs')
    expect(res.body.tags).toEqual(['React', 'Frontend', 'JavaScript'])
    expect(res.body.favorite).toBe(true)
    expect(res.body.status).toBe('active')
  })

  test('filters links by single tag', async () => {
    const user = await createUser()

    await createLink(user.token, {
      name: 'React Guide',
      url: 'https://react.dev',
      tags: ['React', 'Frontend']
    })
    await createLink(user.token, {
      name: 'Vue Guide',
      url: 'https://vue.dev',
      tags: ['Vue', 'Frontend']
    })
    await createLink(user.token, {
      name: 'Express Docs',
      url: 'https://expressjs.com',
      tags: ['Node', 'Backend']
    })

    const byReact = await request(app)
      .get('/api/links?tag=React')
      .set('Authorization', `Bearer ${user.token}`)
      .expect(200)

    expect(byReact.body.links).toHaveLength(1)
    expect(byReact.body.links[0].name).toBe('React Guide')
  })

  test('filters links by favorite status', async () => {
    const user = await createUser()

    await createLink(user.token, {
      name: 'Favorite 1',
      url: 'https://example1.com',
      favorite: true
    })
    await createLink(user.token, {
      name: 'Not Favorite',
      url: 'https://example2.com',
      favorite: false
    })
    await createLink(user.token, {
      name: 'Favorite 2',
      url: 'https://example3.com',
      favorite: true
    })

    const onlyFavorites = await request(app)
      .get('/api/links?favorite=true')
      .set('Authorization', `Bearer ${user.token}`)
      .expect(200)

    expect(onlyFavorites.body.links).toHaveLength(2)
    expect(onlyFavorites.body.links.every(link => link.favorite)).toBe(true)
  })

  test('excludes archived links by default, includes them when requested', async () => {
    const user = await createUser()

    const link1 = await createLink(user.token, {
      name: 'Active Link',
      url: 'https://active.com'
    })
    const link2 = await createLink(user.token, {
      name: 'To Archive',
      url: 'https://archive.com'
    })

    // Manually set status to archived
    await Link.findByIdAndUpdate(link2._id, { status: 'archived' })

    const activeOnly = await request(app)
      .get('/api/links')
      .set('Authorization', `Bearer ${user.token}`)
      .expect(200)

    expect(activeOnly.body.links).toHaveLength(1)
    expect(activeOnly.body.links[0].name).toBe('Active Link')

    const archived = await request(app)
      .get('/api/links?archived=true')
      .set('Authorization', `Bearer ${user.token}`)
      .expect(200)

    expect(archived.body.links).toHaveLength(1)
    expect(archived.body.links[0].name).toBe('To Archive')
  })

  test('combines multiple filters (tag + favorite)', async () => {
    const user = await createUser()

    await createLink(user.token, {
      name: 'React Favorite',
      url: 'https://react1.com',
      tags: ['React'],
      favorite: true
    })
    await createLink(user.token, {
      name: 'React Not Favorite',
      url: 'https://react2.com',
      tags: ['React'],
      favorite: false
    })
    await createLink(user.token, {
      name: 'Vue Favorite',
      url: 'https://vue1.com',
      tags: ['Vue'],
      favorite: true
    })

    const result = await request(app)
      .get('/api/links?tag=React&favorite=true')
      .set('Authorization', `Bearer ${user.token}`)
      .expect(200)

    expect(result.body.links).toHaveLength(1)
    expect(result.body.links[0].name).toBe('React Favorite')
  })

  test('validates collection ID format', async () => {
    const user = await createUser()

    const res = await request(app)
      .post('/api/links')
      .set('Authorization', `Bearer ${user.token}`)
      .send({
        name: 'Test Link',
        url: 'https://example.com',
        collectionId: 'invalid-id'
      })
      .expect(400)

    expect(res.body.message).toBe('Invalid collection ID format')
  })

  test('updates link with tags', async () => {
    const user = await createUser()
    const link = await createLink(user.token, {
      name: 'Original',
      url: 'https://example.com',
      tags: ['Old']
    })

    const updated = await request(app)
      .put(`/api/links/${link._id}`)
      .set('Authorization', `Bearer ${user.token}`)
      .send({
        name: 'Updated',
        url: 'https://example.com',
        tags: ['New', 'Tag']
      })
      .expect(200)

    expect(updated.body.tags).toEqual(['New', 'Tag'])
  })

  test('toggles favorite status', async () => {
    const user = await createUser()
    const link = await createLink(user.token, {
      name: 'Test Link',
      url: 'https://example.com',
      favorite: false
    })

    expect(link.favorite).toBe(false)

    const toggled1 = await request(app)
      .patch(`/api/links/${link._id}/favorite`)
      .set('Authorization', `Bearer ${user.token}`)
      .expect(200)

    expect(toggled1.body.favorite).toBe(true)

    const toggled2 = await request(app)
      .patch(`/api/links/${link._id}/favorite`)
      .set('Authorization', `Bearer ${user.token}`)
      .expect(200)

    expect(toggled2.body.favorite).toBe(false)
  })

  test('archives and restores links', async () => {
    const user = await createUser()
    const link = await createLink(user.token, {
      name: 'To Archive',
      url: 'https://example.com'
    })

    expect(link.status).toBe('active')

    const archived = await request(app)
      .patch(`/api/links/${link._id}/archive`)
      .set('Authorization', `Bearer ${user.token}`)
      .expect(200)

    expect(archived.body.status).toBe('archived')

    const restored = await request(app)
      .patch(`/api/links/${link._id}/restore`)
      .set('Authorization', `Bearer ${user.token}`)
      .expect(200)

    expect(restored.body.status).toBe('active')
  })

  test('favorite, archive, restore return 404 for non-existent or unowned links', async () => {
    const user1 = await createUser({ email: 'user1@example.com', username: 'user1' })
    const user2 = await createUser({ email: 'user2@example.com', username: 'user2' })
    const link = await createLink(user1.token)

    // Non-existent link ID
    await request(app)
      .patch(`/api/links/000000000000000000000000/favorite`)
      .set('Authorization', `Bearer ${user1.token}`)
      .expect(404)

    // Unowned link
    await request(app)
      .patch(`/api/links/${link._id}/favorite`)
      .set('Authorization', `Bearer ${user2.token}`)
      .expect(404)

    await request(app)
      .patch(`/api/links/${link._id}/archive`)
      .set('Authorization', `Bearer ${user2.token}`)
      .expect(404)

    await request(app)
      .patch(`/api/links/${link._id}/restore`)
      .set('Authorization', `Bearer ${user2.token}`)
      .expect(404)

    // Verify link is unchanged
    const unchanged = await request(app)
      .get(`/api/links/${link._id}`)
      .set('Authorization', `Bearer ${user1.token}`)
      .expect(200)

    expect(unchanged.body.favorite).toBe(false)
    expect(unchanged.body.status).toBe('active')
  })

  test('archived links excluded from default list but visible when explicitly requested', async () => {
    const user = await createUser()

    const link1 = await createLink(user.token, {
      name: 'Link 1',
      url: 'https://example1.com'
    })

    const link2 = await createLink(user.token, {
      name: 'Link 2',
      url: 'https://example2.com'
    })

    const link3 = await createLink(user.token, {
      name: 'Link 3',
      url: 'https://example3.com'
    })

    // Archive link2
    await request(app)
      .patch(`/api/links/${link2._id}/archive`)
      .set('Authorization', `Bearer ${user.token}`)
      .expect(200)

    // Default GET should exclude archived
    const defaultList = await request(app)
      .get('/api/links')
      .set('Authorization', `Bearer ${user.token}`)
      .expect(200)

    expect(defaultList.body.links).toHaveLength(2)
    expect(defaultList.body.links.map(l => l._id)).toEqual(
      expect.not.arrayContaining([link2._id])
    )

    // With ?archived=true should show only archived
    const archivedOnly = await request(app)
      .get('/api/links?archived=true')
      .set('Authorization', `Bearer ${user.token}`)
      .expect(200)

    expect(archivedOnly.body.links).toHaveLength(1)
    expect(archivedOnly.body.links[0]._id).toBe(link2._id)
  })

  test('favorite toggle works correctly with other filters', async () => {
    const user = await createUser()

    const link = await createLink(user.token, {
      name: 'React Tutorial',
      url: 'https://react.dev',
      tags: ['React', 'Tutorial'],
      favorite: false
    })

    await request(app)
      .patch(`/api/links/${link._id}/favorite`)
      .set('Authorization', `Bearer ${user.token}`)
      .expect(200)

    const byTagAndFavorite = await request(app)
      .get('/api/links?tag=React&favorite=true')
      .set('Authorization', `Bearer ${user.token}`)
      .expect(200)

    expect(byTagAndFavorite.body.links).toHaveLength(1)
    expect(byTagAndFavorite.body.links[0].favorite).toBe(true)
  })
})

describe('collections', () => {
  test('creates a root-level collection', async () => {
    const user = await createUser()

    const res = await request(app)
      .post('/api/collections')
      .set('Authorization', `Bearer ${user.token}`)
      .send({ name: 'Frontend Resources' })
      .expect(201)

    expect(res.body.name).toBe('Frontend Resources')
    expect(res.body.owner).toBe(user.userId)
    expect(res.body.parentId).toBeNull()
  })

  test('creates a nested collection with valid parent', async () => {
    const user = await createUser()

    const parent = await createCollection(user.token, { name: 'Root' })

    const res = await request(app)
      .post('/api/collections')
      .set('Authorization', `Bearer ${user.token}`)
      .send({ name: 'Child', parentId: parent._id })
      .expect(201)

    expect(res.body.name).toBe('Child')
    expect(res.body.parentId).toBe(parent._id)
  })

  test('rejects collection creation with invalid parent ID format', async () => {
    const user = await createUser()

    const res = await request(app)
      .post('/api/collections')
      .set('Authorization', `Bearer ${user.token}`)
      .send({ name: 'Child', parentId: 'invalid-id' })
      .expect(400)

    expect(res.body.message).toBe('Invalid parent collection ID format')
  })

  test('rejects collection creation with non-existent or unowned parent', async () => {
    const user1 = await createUser({ email: 'user1@example.com', username: 'user1' })
    const user2 = await createUser({ email: 'user2@example.com', username: 'user2' })

    const parentByUser2 = await createCollection(user2.token, { name: 'User2 Collection' })

    const res = await request(app)
      .post('/api/collections')
      .set('Authorization', `Bearer ${user1.token}`)
      .send({ name: 'Child', parentId: parentByUser2._id })
      .expect(404)

    expect(res.body.message).toBe('Parent collection not found')
  })

  test('retrieves collections as a nested tree', async () => {
    const user = await createUser()

    const root1 = await createCollection(user.token, { name: 'Root 1' })
    const root2 = await createCollection(user.token, { name: 'Root 2' })
    const child1 = await createCollection(user.token, { name: 'Child 1', parentId: root1._id })
    const grandchild = await createCollection(user.token, { name: 'Grandchild', parentId: child1._id })

    const res = await request(app)
      .get('/api/collections')
      .set('Authorization', `Bearer ${user.token}`)
      .expect(200)

    expect(res.body.totalCount).toBe(4)
    expect(res.body.collections).toHaveLength(2) // Two root collections

    // Verify tree structure
    const rootCollection = res.body.collections.find(c => c.name === 'Root 1')
    expect(rootCollection.children).toHaveLength(1)
    expect(rootCollection.children[0].name).toBe('Child 1')
    expect(rootCollection.children[0].children).toHaveLength(1)
    expect(rootCollection.children[0].children[0].name).toBe('Grandchild')
  })

  test('updates collection name and parent', async () => {
    const user = await createUser()

    const col1 = await createCollection(user.token, { name: 'Original' })
    const col2 = await createCollection(user.token, { name: 'Parent' })

    const res = await request(app)
      .put(`/api/collections/${col1._id}`)
      .set('Authorization', `Bearer ${user.token}`)
      .send({ name: 'Updated', parentId: col2._id })
      .expect(200)

    expect(res.body.name).toBe('Updated')
    expect(res.body.parentId).toBe(col2._id)
  })

  test('rejects update with circular reference', async () => {
    const user = await createUser()

    const parent = await createCollection(user.token, { name: 'Parent' })
    const child = await createCollection(user.token, { name: 'Child', parentId: parent._id })

    // Try to set child as parent of parent (circular)
    const res = await request(app)
      .put(`/api/collections/${parent._id}`)
      .set('Authorization', `Bearer ${user.token}`)
      .send({ parentId: child._id })
      .expect(400)

    expect(res.body.message).toContain('circular reference')
  })

  test('deletes collection and reassigns links to parent', async () => {
    const user = await createUser()

    const parent = await createCollection(user.token, { name: 'Parent' })
    const child = await createCollection(user.token, { name: 'Child', parentId: parent._id })

    const link1 = await createLink(user.token, { name: 'Link 1', collectionId: child._id })
    const link2 = await createLink(user.token, { name: 'Link 2', collectionId: child._id })

    await request(app)
      .delete(`/api/collections/${child._id}`)
      .set('Authorization', `Bearer ${user.token}`)
      .expect(200)

    // Verify links were reassigned to parent
    const reAssignedLink1 = await request(app)
      .get(`/api/links/${link1._id}`)
      .set('Authorization', `Bearer ${user.token}`)
      .expect(200)

    expect(reAssignedLink1.body.collectionId).toBe(parent._id)

    // Verify child collection is deleted
    const collections = await request(app)
      .get('/api/collections')
      .set('Authorization', `Bearer ${user.token}`)
      .expect(200)

    expect(collections.body.totalCount).toBe(1)
  })

  test('cascade deletes nested collections and reassigns links', async () => {
    const user = await createUser()

    const root = await createCollection(user.token, { name: 'Root' })
    const child = await createCollection(user.token, { name: 'Child', parentId: root._id })
    const grandchild = await createCollection(user.token, { name: 'Grandchild', parentId: child._id })

    const link1 = await createLink(user.token, { name: 'Link 1', collectionId: child._id })
    const link2 = await createLink(user.token, { name: 'Link 2', collectionId: grandchild._id })

    await request(app)
      .delete(`/api/collections/${root._id}`)
      .set('Authorization', `Bearer ${user.token}`)
      .expect(200)

    // Verify all collections deleted
    const collections = await request(app)
      .get('/api/collections')
      .set('Authorization', `Bearer ${user.token}`)
      .expect(200)

    expect(collections.body.totalCount).toBe(0)

    // Verify links reassigned to null
    const reAssignedLink1 = await request(app)
      .get(`/api/links/${link1._id}`)
      .set('Authorization', `Bearer ${user.token}`)
      .expect(200)

    expect(reAssignedLink1.body.collectionId).toBeNull()
  })

  test('returns 404 when accessing unowned collection', async () => {
    const user1 = await createUser({ email: 'user1@example.com', username: 'user1' })
    const user2 = await createUser({ email: 'user2@example.com', username: 'user2' })

    const col = await createCollection(user1.token, { name: 'User 1 Collection' })

    // User2 tries to access User1's collection
    const getRes = await request(app)
      .get('/api/collections')
      .set('Authorization', `Bearer ${user2.token}`)
      .expect(200)

    expect(getRes.body.collections).toHaveLength(0)

    // User2 tries to update User1's collection
    await request(app)
      .put(`/api/collections/${col._id}`)
      .set('Authorization', `Bearer ${user2.token}`)
      .send({ name: 'Hacked' })
      .expect(404)

    // User2 tries to delete User1's collection
    await request(app)
      .delete(`/api/collections/${col._id}`)
      .set('Authorization', `Bearer ${user2.token}`)
      .expect(404)

    // Verify collection still exists
    const stillExists = await request(app)
      .get('/api/collections')
      .set('Authorization', `Bearer ${user1.token}`)
      .expect(200)

    expect(stillExists.body.totalCount).toBe(1)
  })
})

describe('bulk operations', () => {
  test('bulk delete removes only owned links', async () => {
    const user = await createUser()

    const link1 = await createLink(user.token, { name: 'Link 1', url: 'https://example1.com' })
    const link2 = await createLink(user.token, { name: 'Link 2', url: 'https://example2.com' })
    const link3 = await createLink(user.token, { name: 'Link 3', url: 'https://example3.com' })

    const res = await request(app)
      .post('/api/links/bulk')
      .set('Authorization', `Bearer ${user.token}`)
      .send({
        linkIds: [link1._id, link2._id],
        action: 'delete'
      })
      .expect(200)

    expect(res.body.affected).toBe(2)

    // Verify only link3 remains
    const remaining = await request(app)
      .get('/api/links')
      .set('Authorization', `Bearer ${user.token}`)
      .expect(200)

    expect(remaining.body.links).toHaveLength(1)
    expect(remaining.body.links[0]._id).toBe(link3._id)
  })

  test('bulk archive', async () => {
    const user = await createUser()

    const link1 = await createLink(user.token, { name: 'Link 1', url: 'https://example1.com' })
    const link2 = await createLink(user.token, { name: 'Link 2', url: 'https://example2.com' })

    const res = await request(app)
      .post('/api/links/bulk')
      .set('Authorization', `Bearer ${user.token}`)
      .send({
        linkIds: [link1._id, link2._id],
        action: 'archive'
      })
      .expect(200)

    expect(res.body.affected).toBe(2)

    // Verify archived links don't appear in default list
    const active = await request(app)
      .get('/api/links')
      .set('Authorization', `Bearer ${user.token}`)
      .expect(200)

    expect(active.body.links).toHaveLength(0)

    // Verify they appear when requesting archived
    const archived = await request(app)
      .get('/api/links?archived=true')
      .set('Authorization', `Bearer ${user.token}`)
      .expect(200)

    expect(archived.body.links).toHaveLength(2)
  })

  test('bulk restore', async () => {
    const user = await createUser()

    const link1 = await createLink(user.token, { name: 'Link 1', url: 'https://example1.com' })
    const link2 = await createLink(user.token, { name: 'Link 2', url: 'https://example2.com' })

    // Archive them first
    await request(app)
      .post('/api/links/bulk')
      .set('Authorization', `Bearer ${user.token}`)
      .send({ linkIds: [link1._id, link2._id], action: 'archive' })
      .expect(200)

    // Restore them
    const res = await request(app)
      .post('/api/links/bulk')
      .set('Authorization', `Bearer ${user.token}`)
      .send({ linkIds: [link1._id, link2._id], action: 'restore' })
      .expect(200)

    expect(res.body.affected).toBe(2)

    // Verify they're back in active list
    const active = await request(app)
      .get('/api/links')
      .set('Authorization', `Bearer ${user.token}`)
      .expect(200)

    expect(active.body.links).toHaveLength(2)
  })

  test('bulk addTag', async () => {
    const user = await createUser()

    const link1 = await createLink(user.token, { name: 'Link 1', url: 'https://example1.com', tags: [] })
    const link2 = await createLink(user.token, { name: 'Link 2', url: 'https://example2.com', tags: ['Existing'] })

    const res = await request(app)
      .post('/api/links/bulk')
      .set('Authorization', `Bearer ${user.token}`)
      .send({
        linkIds: [link1._id, link2._id],
        action: 'addTag',
        payload: { tag: 'React' }
      })
      .expect(200)

    expect(res.body.affected).toBe(2)

    // Verify tags were added
    const updated1 = await request(app)
      .get(`/api/links/${link1._id}`)
      .set('Authorization', `Bearer ${user.token}`)
      .expect(200)

    expect(updated1.body.tags).toContain('React')

    const updated2 = await request(app)
      .get(`/api/links/${link2._id}`)
      .set('Authorization', `Bearer ${user.token}`)
      .expect(200)

    expect(updated2.body.tags).toContain('React')
    expect(updated2.body.tags).toContain('Existing')
  })

  test('bulk removeTag', async () => {
    const user = await createUser()

    const link1 = await createLink(user.token, { name: 'Link 1', url: 'https://example1.com', tags: ['React', 'Frontend'] })
    const link2 = await createLink(user.token, { name: 'Link 2', url: 'https://example2.com', tags: ['React'] })

    const res = await request(app)
      .post('/api/links/bulk')
      .set('Authorization', `Bearer ${user.token}`)
      .send({
        linkIds: [link1._id, link2._id],
        action: 'removeTag',
        payload: { tag: 'React' }
      })
      .expect(200)

    expect(res.body.affected).toBe(2)

    const updated1 = await request(app)
      .get(`/api/links/${link1._id}`)
      .set('Authorization', `Bearer ${user.token}`)
      .expect(200)

    expect(updated1.body.tags).toContain('Frontend')
    expect(updated1.body.tags).not.toContain('React')

    const updated2 = await request(app)
      .get(`/api/links/${link2._id}`)
      .set('Authorization', `Bearer ${user.token}`)
      .expect(200)

    expect(updated2.body.tags).toHaveLength(0)
  })

  test('bulk operations silently ignore unowned links', async () => {
    const user1 = await createUser({ email: 'user1@example.com', username: 'user1' })
    const user2 = await createUser({ email: 'user2@example.com', username: 'user2' })

    const user1Link = await createLink(user1.token, { name: 'User1 Link', url: 'https://example1.com' })
    const user2Link = await createLink(user2.token, { name: 'User2 Link', url: 'https://example2.com' })

    // User1 tries bulk delete with mixed ownership
    const res = await request(app)
      .post('/api/links/bulk')
      .set('Authorization', `Bearer ${user1.token}`)
      .send({
        linkIds: [user1Link._id, user2Link._id],
        action: 'delete'
      })
      .expect(200)

    expect(res.body.affected).toBe(1) // Only user1Link deleted

    // Verify user1Link is gone
    const user1Links = await request(app)
      .get('/api/links')
      .set('Authorization', `Bearer ${user1.token}`)
      .expect(200)

    expect(user1Links.body.links).toHaveLength(0)

    // Verify user2Link still exists
    const user2Links = await request(app)
      .get('/api/links')
      .set('Authorization', `Bearer ${user2.token}`)
      .expect(200)

    expect(user2Links.body.links).toHaveLength(1)
  })

  test('bulk operations reject invalid requests', async () => {
    const user = await createUser()

    // No linkIds
    await request(app)
      .post('/api/links/bulk')
      .set('Authorization', `Bearer ${user.token}`)
      .send({ action: 'delete' })
      .expect(400)

    // Invalid action
    const link = await createLink(user.token)
    await request(app)
      .post('/api/links/bulk')
      .set('Authorization', `Bearer ${user.token}`)
      .send({ linkIds: [link._id], action: 'invalid' })
      .expect(400)

    // Missing tag payload for addTag
    await request(app)
      .post('/api/links/bulk')
      .set('Authorization', `Bearer ${user.token}`)
      .send({ linkIds: [link._id], action: 'addTag' })
      .expect(400)
  })
})
