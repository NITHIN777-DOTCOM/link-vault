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
})
