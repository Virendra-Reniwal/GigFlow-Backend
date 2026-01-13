# GigFlow Backend API

A complete RESTful API for the GigFlow freelance marketplace platform built with Node.js, Express, and MongoDB.

## Features

- ✅ **Secure Authentication** - JWT with HttpOnly cookies
- ✅ **Gig Management** - Full CRUD operations for job postings
- ✅ **Bidding System** - Freelancers can bid on gigs
- ✅ **Hiring Logic** - Atomic transaction-based hiring with race condition prevention
- ✅ **Real-time Notifications** - Socket.io for instant hire notifications
- ✅ **Search & Filter** - Search gigs by title and description
- ✅ **Role Flexibility** - Users can be both clients and freelancers

## Tech Stack

- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **MongoDB** - Database
- **Mongoose** - ODM for MongoDB
- **JWT** - Authentication
- **bcryptjs** - Password hashing
- **Socket.io** - Real-time communication
- **Cookie Parser** - Parse HTTP cookies

## Installation

1. **Install dependencies**
```bash
cd backend
npm install
```

2. **Set up environment variables**
```bash
cp .env.example .env
```

Edit `.env` and add your configuration:
```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/gigflow
JWT_SECRET=your_super_secret_jwt_key
JWT_EXPIRES_IN=7d
FRONTEND_URL=http://localhost:5173
```

3. **Start MongoDB**
Make sure MongoDB is running on your system.

4. **Run the server**
```bash
# Development mode with auto-restart
npm run dev

# Production mode
npm start
```

The server will start on `http://localhost:5000`

## API Endpoints

### Authentication
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/api/auth/register` | Register new user | No |
| POST | `/api/auth/login` | Login user | No |
| POST | `/api/auth/logout` | Logout user | Yes |
| GET | `/api/auth/me` | Get current user | Yes |

### Gigs
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/api/gigs` | Get all open gigs (with search) | No |
| GET | `/api/gigs/:id` | Get single gig | No |
| GET | `/api/gigs/my/gigs` | Get user's own gigs | Yes |
| POST | `/api/gigs` | Create new gig | Yes |
| PUT | `/api/gigs/:id` | Update gig | Yes (Owner) |
| DELETE | `/api/gigs/:id` | Delete gig | Yes (Owner) |

### Bids
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/api/bids` | Submit a bid | Yes |
| GET | `/api/bids/:gigId` | Get all bids for a gig | Yes (Owner) |
| GET | `/api/bids/my/bids` | Get user's own bids | Yes |
| PATCH | `/api/bids/:bidId/hire` | Hire a freelancer | Yes (Owner) |
| PUT | `/api/bids/:bidId` | Update bid | Yes (Owner) |
| DELETE | `/api/bids/:bidId` | Delete bid | Yes (Owner) |

## API Usage Examples

### Register User
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john@example.com",
    "password": "password123"
  }'
```

### Create Gig
```bash
curl -X POST http://localhost:5000/api/gigs \
  -H "Content-Type: application/json" \
  -H "Cookie: token=YOUR_JWT_TOKEN" \
  -d '{
    "title": "Build a React Website",
    "description": "Need a modern React website with responsive design",
    "budget": 5000
  }'
```

### Submit Bid
```bash
curl -X POST http://localhost:5000/api/bids \
  -H "Content-Type: application/json" \
  -H "Cookie: token=YOUR_JWT_TOKEN" \
  -d '{
    "gigId": "GIG_ID_HERE",
    "message": "I can complete this project in 2 weeks",
    "price": 4500
  }'
```

### Hire Freelancer
```bash
curl -X PATCH http://localhost:5000/api/bids/BID_ID_HERE/hire \
  -H "Cookie: token=YOUR_JWT_TOKEN"
```

## Key Features Explained

### 1. Hiring Logic with Race Condition Prevention
The hiring endpoint uses MongoDB transactions to ensure atomicity:
- Checks if gig is still open
- Updates gig status to 'assigned'
- Updates hired bid to 'hired'
- Rejects all other pending bids
- All operations happen in a single atomic transaction

### 2. Real-time Notifications
When a freelancer is hired, they receive an instant Socket.io notification without page refresh:
```javascript
// Client receives this event
socket.on('hired', (data) => {
  // Show notification: "You have been hired for [Project Name]!"
});
```

### 3. Security Features
- Password hashing with bcryptjs
- JWT tokens in HttpOnly cookies (prevents XSS attacks)
- Protected routes with authentication middleware
- Input validation on all endpoints
- CORS configured for frontend origin

## Database Schema

### User
```javascript
{
  name: String,
  email: String (unique),
  password: String (hashed),
  timestamps: true
}
```

### Gig
```javascript
{
  title: String,
  description: String,
  budget: Number,
  ownerId: ObjectId (ref: User),
  status: 'open' | 'assigned',
  hiredBidId: ObjectId (ref: Bid),
  timestamps: true
}
```

### Bid
```javascript
{
  gigId: ObjectId (ref: Gig),
  freelancerId: ObjectId (ref: User),
  message: String,
  price: Number,
  status: 'pending' | 'hired' | 'rejected',
  timestamps: true
}
```

## Socket.io Events

### Client → Server
- `join` - Join user-specific room for notifications

### Server → Client
- `hired` - Notification when freelancer is hired

## Error Handling

All endpoints return consistent error responses:
```json
{
  "success": false,
  "message": "Error message here",
  "errors": ["Validation error 1", "Validation error 2"]
}
```

## Testing

You can test the API using:
- **Postman** - Import the endpoints
- **Thunder Client** - VS Code extension
- **cURL** - Command line
- **Frontend** - Connect your React app

## Production Deployment

1. Set `NODE_ENV=production`
2. Use strong `JWT_SECRET`
3. Set `COOKIE_SECURE=true` for HTTPS
4. Use MongoDB Atlas for cloud database
5. Set appropriate CORS origins

## License

MIT
