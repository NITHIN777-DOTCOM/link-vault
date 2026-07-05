const express = require('express')
const cors = require('cors')
const dotenv = require('dotenv')
const swaggerUi = require('swagger-ui-express')
const swaggerSpec = require('./swagger')

dotenv.config({
  path: process.env.NODE_ENV === 'production'
    ? '.env'
    : '../.env'
})

const authRoutes = require('./routes/auth')
const linkRoutes = require('./routes/links')

const app = express()

app.use(cors({
  origin: [
    'http://localhost:5173',
    'https://link-vault-beta-one.vercel.app'
  ],
  credentials: true
}))
app.use(express.json())

app.get('/health', (req, res) => res.status(200).json({ status: 'ok' }))
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec))
app.use('/api/auth', authRoutes)
app.use('/api/links', linkRoutes)

module.exports = app
