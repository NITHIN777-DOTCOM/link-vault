const express = require('express')
const router = express.Router()
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const crypto = require('crypto')
const User = require('../models/user')

/**
 * @swagger
 * tags:
 *   - name: auth
 *     description: Authentication endpoints
 */

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Register a new user
 *     tags: [auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - email
 *               - password
 *             properties:
 *               username:
 *                 type: string
 *                 example: johnDoe
 *               email:
 *                 type: string
 *                 format: email
 *                 example: john@example.com
 *               password:
 *                 type: string
 *                 format: password
 *                 example: SecurePassword123!
 *     responses:
 *       201:
 *         description: User registered successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: User registered successfully
 *       400:
 *         description: Email already in use or validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Login and receive JWT access token + refresh token cookie
 *     tags: [auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: john@example.com
 *               password:
 *                 type: string
 *                 format: password
 *                 example: SecurePassword123!
 *     responses:
 *       200:
 *         description: Login successful. Access token returned in body, refresh token in httpOnly cookie.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 accessToken:
 *                   type: string
 *                   description: JWT access token (expires in 15 minutes)
 *                   example: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 *                 userId:
 *                   type: string
 *                   example: 65d8e9f1b2c3d4e5f6g7h8i9
 *                 username:
 *                   type: string
 *                   example: johnDoe
 *       400:
 *         description: Invalid email or password
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Invalid email or password
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

/**
 * @swagger
 * /api/auth/refresh:
 *   post:
 *     summary: Refresh access token using refresh token cookie
 *     tags: [auth]
 *     description: Requires valid refresh token in httpOnly cookie. Issues new access token and rotates refresh token.
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Token refreshed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 accessToken:
 *                   type: string
 *                   description: New JWT access token (expires in 15 minutes)
 *                 userId:
 *                   type: string
 *                   example: 65d8e9f1b2c3d4e5f6g7h8i9
 *                 username:
 *                   type: string
 *                   example: johnDoe
 *       401:
 *         description: Invalid or missing refresh token
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Invalid refresh token
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     summary: Logout user and invalidate refresh token
 *     tags: [auth]
 *     description: Clears refresh token cookie and invalidates the token on the server.
 *     responses:
 *       200:
 *         description: User logged out successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Logged out
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

const ACCESS_TOKEN_EXPIRES_IN = '15m'
const REFRESH_TOKEN_EXPIRES_IN = '7d'
const REFRESH_COOKIE_NAME = 'refreshToken'
const INVALID_CREDENTIALS_MESSAGE = 'Invalid email or password'

const refreshCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
  maxAge: 7 * 24 * 60 * 60 * 1000
}

const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex')

const parseCookies = (cookieHeader = '') => cookieHeader
  .split(';')
  .filter(Boolean)
  .reduce((cookies, cookie) => {
    const [name, ...rest] = cookie.trim().split('=')
    cookies[name] = decodeURIComponent(rest.join('='))
    return cookies
  }, {})

const getAccessTokenSecret = () => process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET
const getRefreshTokenSecret = () => process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET

const createAccessToken = (userId) => jwt.sign(
  { userId },
  getAccessTokenSecret(),
  { expiresIn: ACCESS_TOKEN_EXPIRES_IN }
)

const createRefreshToken = (userId) => jwt.sign(
  { userId },
  getRefreshTokenSecret(),
  {
    expiresIn: REFRESH_TOKEN_EXPIRES_IN,
    jwtid: crypto.randomUUID()
  }
)

const sendRefreshCookie = (res, refreshToken) => {
  res.cookie(REFRESH_COOKIE_NAME, refreshToken, refreshCookieOptions)
}

const clearRefreshCookie = (res) => {
  res.clearCookie(REFRESH_COOKIE_NAME, {
    httpOnly: true,
    secure: refreshCookieOptions.secure,
    sameSite: refreshCookieOptions.sameSite
  })
}

router.post('/register', async (req, res) => {
  try {
    const { username, email, password } = req.body

    const existingUser = await User.findOne({ email })
    if (existingUser) {
      return res.status(400).json({ message: 'Email already in use' })
    }

    const salt = await bcrypt.genSalt(10)
    const hashedPassword = await bcrypt.hash(password, salt)

    const user = new User({
      username,
      email,
      password: hashedPassword
    })
    await user.save()

    res.status(201).json({ message: 'User registered successfully' })

  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message })
  }
})

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body
    const user = await User.findOne({ email })
    if (!user) {
      return res.status(400).json({ message: INVALID_CREDENTIALS_MESSAGE })
    }

    const isMatch = await bcrypt.compare(password, user.password)
    if (!isMatch) {
      return res.status(400).json({ message: INVALID_CREDENTIALS_MESSAGE })
    }

    const accessToken = createAccessToken(user._id)
    const refreshToken = createRefreshToken(user._id)

    user.refreshTokenHash = hashToken(refreshToken)
    await user.save()

    sendRefreshCookie(res, refreshToken)

    res.status(200).json({ accessToken, userId: user._id, username: user.username })

  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message })
  }
})

router.post('/refresh', async (req, res) => {
  try {
    const cookies = parseCookies(req.headers.cookie)
    const refreshToken = cookies[REFRESH_COOKIE_NAME]

    if (!refreshToken) {
      return res.status(401).json({ message: 'Refresh token required' })
    }

    const decoded = jwt.verify(refreshToken, getRefreshTokenSecret())
    const user = await User.findById(decoded.userId)

    if (!user || user.refreshTokenHash !== hashToken(refreshToken)) {
      clearRefreshCookie(res)
      return res.status(401).json({ message: 'Invalid refresh token' })
    }

    const accessToken = createAccessToken(user._id)
    const nextRefreshToken = createRefreshToken(user._id)

    user.refreshTokenHash = hashToken(nextRefreshToken)
    await user.save()

    sendRefreshCookie(res, nextRefreshToken)

    res.status(200).json({
      accessToken,
      userId: user._id,
      username: user.username
    })
  } catch (err) {
    clearRefreshCookie(res)
    res.status(401).json({ message: 'Invalid refresh token' })
  }
})

router.post('/logout', async (req, res) => {
  try {
    const cookies = parseCookies(req.headers.cookie)
    const refreshToken = cookies[REFRESH_COOKIE_NAME]

    if (refreshToken) {
      try {
        const decoded = jwt.verify(refreshToken, getRefreshTokenSecret())
        await User.findByIdAndUpdate(decoded.userId, { refreshTokenHash: null })
      } catch {
        // Clear the cookie even if the token is already invalid or expired.
      }
    }

    clearRefreshCookie(res)
    res.status(200).json({ message: 'Logged out' })
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message })
  }
})

const sendEmail = require('../utils/sendEmail')

router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body

    const user = await User.findOne({ email })
    if (!user) {
      return res.status(404).json({ message: 'No account with that email' })
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString()

    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000)

    user.otp = otp
    user.otpExpiry = otpExpiry
    await user.save()

    await sendEmail(email, otp)

    res.status(200).json({ message: 'OTP sent to your email' })

  } catch (err) {
    console.log('FORGOT PASSWORD ERROR:', err) 
    res.status(500).json({ message: 'Server error', error: err.message })
  }
})

router.post('/verify-otp', async (req, res) => {
  try {
    const { email, otp } = req.body

    const user = await User.findOne({ email })
    if (!user) {
      return res.status(404).json({ message: 'User not found' })
    }

    if (user.otp !== otp) {
      return res.status(400).json({ message: 'Invalid OTP' })
    }
    if (user.otpExpiry < new Date()) {
      return res.status(400).json({ message: 'OTP expired' })
    }

    res.status(200).json({ message: 'OTP verified' })

  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message })
  }
})

router.post('/reset-password', async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body

    const user = await User.findOne({ email })
    if (!user) {
      return res.status(404).json({ message: 'User not found' })
    }

    if (user.otp !== otp) {
      return res.status(400).json({ message: 'Invalid OTP' })
    }

    if (user.otpExpiry < new Date()) {
      return res.status(400).json({ message: 'OTP expired' })
    }
    const salt = await bcrypt.genSalt(10)
    user.password = await bcrypt.hash(newPassword, salt)

    user.otp = null
    user.otpExpiry = null

    await user.save()

    res.status(200).json({ message: 'Password reset successful' })

  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message })
  }
})

module.exports = router
