# Mail Tracker - TypeScript MERN Application

A modern, full-stack mail tracking application built with the MERN stack and TypeScript.

## 🚀 Features

- **User Authentication**: Register, login, password reset, and profile management
- **Package Tracking**: Track packages from USPS and FedEx carriers
- **Package Management**: Add, view, edit, and delete packages
- **Real-time Updates**: Refresh tracking information and status updates
- **Email Notifications**: Optional email notifications for package deliveries
- **Modern UI**: Clean, responsive interface built with React Bootstrap
- **Type Safety**: Full TypeScript implementation for both frontend and backend

## 🛠 Tech Stack

### Backend
- **Node.js** with **TypeScript**
- **Express.js** - Web framework
- **MongoDB** with **Mongoose** - Database and ODM
- **JWT** - Authentication
- **Joi** - Input validation
- **bcryptjs** - Password hashing
- **Helmet** - Security headers
- **CORS** - Cross-origin resource sharing

### Frontend
- **React 18** with **TypeScript**
- **React Router** - Client-side routing
- **React Bootstrap** - UI components
- **Axios** - HTTP client
- **Context API** - State management

## 📁 Project Structure

```
mail-tracker-mern/
├── client/                 # React frontend application
│   ├── src/
│   │   ├── components/     # Reusable React components
│   │   ├── pages/          # Page components
│   │   ├── contexts/       # React context providers
│   │   ├── types/          # TypeScript type definitions
│   │   └── services/       # API service layer
│   └── package.json
├── server/                 # Express backend application
│   ├── src/
│   │   ├── models/         # MongoDB/Mongoose models
│   │   ├── routes/         # Express route handlers
│   │   ├── middleware/     # Custom middleware
│   │   ├── types/          # TypeScript interfaces
│   │   ├── utils/          # Utility functions
│   │   └── server.ts       # Main server file
│   └── package.json
├── package.json            # Root workspace configuration
└── README.md
```

## 🚀 Getting Started

### Prerequisites

- **Node.js** (v16 or higher)
- **npm** (v8 or higher)
- **MongoDB** (running locally or connection string)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd mail-tracker-mern
   ```

2. **Install dependencies**
   ```bash
   npm run install:all
   ```

3. **Environment Setup**
   
   Copy and configure environment files:
   
   **Server (.env in server/ directory):**
   ```env
   NODE_ENV=development
   PORT=5000
   MONGODB_URI=mongodb://localhost:27017/mailtracker
   JWT_SECRET=your_jwt_secret_key_here
   CLIENT_URL=http://localhost:3000
   ```

4. **Start MongoDB**
   
   Make sure MongoDB is running on your system.

5. **Start the application**
   ```bash
   npm run dev
   ```

   This will start both the server (port 5000) and client (port 3000).

### Individual Commands

- **Start both servers**: `npm run dev`
- **Start server only**: `npm run server:dev`
- **Start client only**: `npm run client:dev`
- **Build server**: `npm run server:build`
- **Build client**: `npm run client:build`
- **Build both**: `npm run build`

## 🔗 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `POST /api/auth/forgot-password` - Request password reset
- `POST /api/auth/reset-password/:token` - Reset password

### Users
- `GET /api/users/profile` - Get user profile (protected)
- `PUT /api/users/profile` - Update user profile (protected)

### Packages
- `GET /api/packages` - Get user's packages with pagination/filtering (protected)
- `POST /api/packages` - Create new package (protected)
- `GET /api/packages/:id` - Get single package (protected)
- `PUT /api/packages/:id` - Update package (protected)
- `DELETE /api/packages/:id` - Delete package (protected)
- `POST /api/packages/:id/refresh` - Refresh package tracking (protected)

## 📦 Package Types

- **LOR** - Letter of Representation
- **Demand** - Demand Letter
- **SPOL** - Special Processing Letter
- **AL** - Authorization Letter
- **Other** - Other document types

## 🔒 Security Features

- Password hashing with bcryptjs
- JWT token authentication
- Input validation with Joi
- Security headers with Helmet
- CORS configuration
- MongoDB injection protection

## 🎨 UI Features

- Responsive design with React Bootstrap
- Dark/light theme support
- Toast notifications
- Form validation
- Loading states
- Error handling

## 🧪 Development

### Code Structure

- **TypeScript**: Full type safety across the entire application
- **Modular Architecture**: Clean separation of concerns
- **Error Handling**: Comprehensive error handling and logging
- **Validation**: Input validation on both client and server
- **Authentication**: JWT-based authentication with middleware

### Database Schema

**Users:**
- username, email, password (hashed)
- firstName, lastName
- emailNotifications, isActive
- resetPasswordToken, resetPasswordExpires
- timestamps (createdAt, updatedAt)

**Packages:**
- trackingNumber, carrier, customer
- packageType, status, dateSent, deliveryDate
- notes, trackingHistory
- userId (reference to User)
- timestamps (createdAt, updatedAt, lastUpdated)

## 🚀 Deployment

The application is ready for deployment to platforms like:
- **Heroku** (with MongoDB Atlas)
- **Vercel** (frontend) + **Railway** (backend)
- **DigitalOcean** App Platform
- **AWS** (EC2, RDS, S3)

## 📄 License

MIT License - see LICENSE file for details.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## 📞 Support

For questions or issues, please create an issue in the repository or contact the development team.
