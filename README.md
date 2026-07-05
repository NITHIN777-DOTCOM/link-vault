# LinkVault

A full-stack web app to save and organize your important links — built with the MERN stack.

# Live Demo

Frontend: https://link-vault-beta-one.vercel.app

Backend API: https://link-vault-backend-w18w.onrender.com

![Dashboard Preview](preview.png) 


## Features

- JWT authentication with refresh token rotation (15-min access token + 7-day refresh token in httpOnly cookie)
- Save links with a name, description and URL
- Update links
- Delete links
- Search links by name, description, and URL with pagination
- Dark / light mode toggle
- Protected routes on both frontend and backend
- Forgot password with OTP email verification
- API documentation with Swagger/OpenAPI at `/api-docs`

## Tech Stack

**Frontend**
- React (Vite)
- React Router DOM
- Axios
- CSS Variables (no UI library)

**Backend**
- Node.js
- Express.js
- MongoDB + Mongoose
- JWT (jsonwebtoken)
- bcryptjs

## Architecture

┌──────────────────────┐        HTTPS/JSON        ┌──────────────────────┐
│                      │ ────────────────────────> │                      │
│      Frontend        │                            │       Backend        │
│   (React + Vite)     │ <──────────────────────── │   (Node + Express)   │
│  link-vault-beta-    │      Access Token          │  link-vault-backend- │
│  one.vercel.app      │      (Authorization        │  w18w.onrender.com   │
│                      │       header, 15 min)      │                      │
└──────────┬───────────┘                            └──────────┬───────────┘
           │                                                   │
           │         httpOnly Refresh Cookie (7 days)          │
           │ <─────────────────────────────────────────────── │
           │                                                   │
           │                                          ┌────────▼──────────┐
           │                                          │                    │
           │                                          │   MongoDB Atlas    │
           │                                          │  (Users, Links)    │
           │                                          │                    │
           │                                          └────────┬──────────┘
           │                                                   │
           │                                          ┌────────▼──────────┐
           │                                          │                    │
           │                                          │   Resend (Email)   │
           │                                          │  OTP / Password    │
           │                                          │      Reset         │
           │                                          └────────────────────┘

API Docs: link-vault-backend-w18w.onrender.com/api-docs (Swagger UI)

## Project Structure

```
link-vault/
├── backend/
│   ├── middleware/     # JWT auth guard
│   ├── models/         # User and Link schemas
│   ├── routes/         # Auth and Links API
│   └── server.js       # Entry point
└── frontend/
    └── src/
        ├── api/        # Axios API functions
        ├── components/ # Navbar, LinkCard, AddLinkModal
        ├── context/    # Auth context (global state)
        └── pages/      # Login, Register, Dashboard
```

## Getting Started Locally

**1. Clone the repo**
```bash
git clone https://github.com/yourusername/link-vault.git
cd link-vault
```

**2. Setup backend**
```bash
cd backend
npm install
```

Create a `.env` file inside `backend/`:
```
PORT=5000
MONGO_URI=your_mongodb_atlas_uri
JWT_SECRET=your_secret_key
```

```bash
npm run dev
```

**3. Setup frontend**
```bash
cd frontend
npm install
npm run dev
```

App runs at `http://localhost:5173`

## API Endpoints

| Method | Endpoint | Description | Auth | Query Params |
|--------|----------|-------------|------|--------------|
| POST | /api/auth/register | Register a new user | No | — |
| POST | /api/auth/login | Login and get access token (refresh token in cookie) | No | — |
| POST | /api/auth/refresh | Get new access token using refresh token | Refresh cookie | — |
| POST | /api/auth/logout | Logout and invalidate refresh token | Refresh cookie | — |
| GET | /api/links | Get all links with pagination and search | Bearer | `page`, `limit`, `search` |
| POST | /api/links | Create a new link | Bearer | — |
| GET | /api/links/:id | Get a specific link | Bearer | — |
| PUT | /api/links/:id | Update a link | Bearer | — |
| DELETE | /api/links/:id | Delete a link | Bearer | — |

### API Documentation

Interactive Swagger/OpenAPI documentation is available at **`/api-docs`** on both development and production servers:
- **Development**: http://localhost:3001/api-docs
- **Production**: https://link-vault-backend-w18w.onrender.com/api-docs

Documentation includes request/response schemas, authentication requirements, and example payloads for all endpoints.

## Engineering Highlights

### Ownership Checks at the Database Query Level, Not After Fetching

In LinkVault, ownership is enforced **at the query level**, not in application code:
```javascript
// ✓ Correct: Ownership check is part of the query
const link = await Link.findOneAndUpdate(
  { _id: req.params.id, user: req.userId },  // Both conditions in the query
  { name, description, url },
  { new: true }
)
```

Why this matters: If you fetch first, then check ownership in JS, you introduce a race condition. Between fetch and check, the resource could be modified or deleted. More importantly, at scale, you're moving data over the network unnecessarily. The database can enforce the constraint atomically.

### Why Refresh Tokens Are Hashed and Rotated

LinkVault stores a **hash of the refresh token** in the database, not the token itself. On each refresh, a new token is issued and the old hash is replaced:
```javascript
// Store only the hash in the database
user.refreshTokenHash = hashToken(refreshToken)
await user.save()

// Verify on refresh
if (user.refreshTokenHash !== hashToken(refreshToken)) {
  // Token has been stolen or rotated—reject it
}
```

This provides **theft detection**: If a token is stolen and used after legitimate refresh, the legitimate user's new token won't match what the database has for the attacker's old token. The attacker's request fails, and you detect the compromise.

### Why Login Errors Are Generic

Both "user not found" and "wrong password" return the same message:
```javascript
const INVALID_CREDENTIALS_MESSAGE = 'Invalid email or password'

if (!user) {
  return res.status(400).json({ message: INVALID_CREDENTIALS_MESSAGE })
}
if (!isMatch) {
  return res.status(400).json({ message: INVALID_CREDENTIALS_MESSAGE })
}
```

This prevents **user enumeration attacks**: An attacker cannot probe to discover which emails are registered by observing different error messages. A single, uniform response forces them to try every email+password combination rather than first enumerating valid users.

### Pagination/Search Tradeoff: Regex vs Text Index

LinkVault uses escaped regex search across name, description, and URL fields:
```javascript
const searchRegex = new RegExp(escapeRegex(search), 'i')
query.$or = [
  { name: searchRegex },
  { description: searchRegex },
  { url: searchRegex }
]
```

**Trade-off**: Regex is simple to implement and works well for small/medium datasets (~100K links per user). However, it doesn't scale to millions—MongoDB cannot use indexes efficiently on regex patterns.

**At scale, I'd switch to**:
- **MongoDB text search** (`{ $text: { $search: "..." } }`) with a compound text index across all searchable fields, or
- **Elasticsearch** for fuzzy matching, ranking, and advanced query syntax.

The current approach is reasonable for MVP; the migration path is clear once performance becomes a bottleneck.

## Author

Nithin
[GitHub](https://github.com/NITHIN777-DOTCOM)
[LinkedIn](https://www.linkedin.com/in/nithin-r-876b5b373/)
