const express = require('express')
const router = express.Router()
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const User = require('../models/user')

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
      return res.status(400).json({ message: 'User does not exist!' })
    }

    const isMatch = await bcrypt.compare(password, user.password)
    if (!isMatch) {
      return res.status(400).json({ message: 'Incorrect Password' })
    }

    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET,
      { expiresIn: '3d' } // 3 days expiration
    )

    res.status(200).json({ token, userId: user._id, username: user.username })

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