const express = require('express')
const mongoose = require('mongoose')
const cors = require('cors')
const dotenv = require('dotenv')
const authRoutes = require('./routes/auth')
const linkRoutes = require('./routes/links')
dotenv.config({
  path: process.env.NODE_ENV === 'production'
    ? '.env'
    : '../.env'
})
const app = express()
app.use(cors({
  origin: [
    'http://localhost:5173',
    'https://link-vault-beta-one.vercel.app'
  ],
  credentials: true
}))
app.use(express.json())
app.get('/health', (req, res) => res.status(200).json({ status: 'ok' })) //Health check in uptimerobot
app.use('/api/auth', authRoutes)
app.use('/api/links', linkRoutes)
const PORT = process.env.PORT || 5000
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('MongoDB connected')
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`)
    })
  })
  .catch((err) => {
    console.log('Connection failed', err)
  })