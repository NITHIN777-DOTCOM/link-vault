const swaggerJsdoc = require('swagger-jsdoc')

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'LinkVault API',
      version: '1.0.0',
      description: 'A secure API for managing bookmarks and links with JWT authentication'
    },
    servers: [
      {
        url: 'http://localhost:3001',
        description: 'Development server'
      },
      {
        url: 'https://link-vault-backend.onrender.com',
        description: 'Production server'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT access token (15-minute expiry)'
        },
        cookieAuth: {
          type: 'apiKey',
          in: 'cookie',
          name: 'refreshToken',
          description: 'Refresh token in httpOnly cookie (7-day expiry)'
        }
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'User ID'
            },
            username: {
              type: 'string',
              description: 'Username'
            },
            email: {
              type: 'string',
              format: 'email',
              description: 'User email address'
            }
          }
        },
        Link: {
          type: 'object',
          properties: {
            _id: {
              type: 'string',
              description: 'Link ID'
            },
            user: {
              type: 'string',
              description: 'User ID of the link owner'
            },
            name: {
              type: 'string',
              description: 'Link name'
            },
            description: {
              type: 'string',
              description: 'Link description'
            },
            url: {
              type: 'string',
              format: 'uri',
              description: 'The URL being bookmarked'
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'When the link was created'
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
              description: 'When the link was last updated'
            }
          },
          required: ['name', 'url']
        },
        LinkList: {
          type: 'object',
          properties: {
            links: {
              type: 'array',
              items: {
                $ref: '#/components/schemas/Link'
              }
            },
            total: {
              type: 'integer',
              description: 'Total number of links matching the query'
            },
            page: {
              type: 'integer',
              description: 'Current page number'
            },
            totalPages: {
              type: 'integer',
              description: 'Total number of pages'
            }
          }
        },
        Error: {
          type: 'object',
          properties: {
            message: {
              type: 'string',
              description: 'Error message'
            },
            error: {
              type: 'string',
              description: 'Error details'
            }
          }
        }
      }
    }
  },
  apis: [
    './routes/auth.js',
    './routes/links.js'
  ]
}

const swaggerSpec = swaggerJsdoc(options)

module.exports = swaggerSpec
