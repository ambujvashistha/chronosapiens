# JobSync Backend API

Backend server for JobSync - Unified Job Application Hub.

## Tech Stack

- **Node.js** with **Express.js**
- **MySQL** database with **Prisma ORM**
- **JWT** for authentication
- **bcryptjs** for password hashing

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Database Setup

1. Create a MySQL database:
   ```sql
   CREATE DATABASE jobsync;
   ```

2. Create a `.env` file in the backend directory:
   ```env
   DATABASE_URL="mysql://user:password@localhost:3306/jobsync"
   JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
   JWT_EXPIRES_IN=7d
   PORT=3000
   NODE_ENV=development
   CORS_ORIGIN=http://localhost:5173
   ```

3. Generate Prisma Client:
   ```bash
   npm run prisma:generate
   ```

4. Run database migrations:
   ```bash
   npm run prisma:migrate
   ```

### 3. Run the Server

Development mode (with nodemon):
```bash
npm run dev
```

Production mode:
```bash
npm start
```

The server will run on `http://localhost:3000` (or the port specified in `.env`).

## Database Schema

### Users
- `user_id` (Primary Key)
- `name`
- `email` (Unique)
- `password_hash`
- `role` (USER | ADMIN)
- `created_at`
- `updated_at`

### Connections
- `connection_id` (Primary Key)
- `user_id` (Foreign Key → Users)
- `platform_name`
- `api_token`
- `last_sync`
- `created_at`
- `updated_at`

### Jobs
- `job_id` (Primary Key)
- `user_id` (Foreign Key → Users)
- `platform_name`
- `job_title`
- `company_name`
- `status` (APPLIED | SHORTLISTED | REJECTED | INTERVIEW | OFFER | ACCEPTED | WITHDRAWN)
- `applied_on`
- `created_at`
- `updated_at`

## Project Structure

```
backend/
├── controllers/
│   ├── authController.js    # Authentication logic
│   ├── connectionController.js
│   ├── jobController.js
│   └── adminController.js
├── middleware/
│   └── auth.js              # JWT authentication middleware
├── prisma/
│   └── schema.prisma        # Database schema
├── index.js                 # Main server file
└── package.json
```

## Development

### Prisma Studio
View and edit your database with Prisma Studio:
```bash
npm run prisma:studio
```

### Environment Variables
Make sure to set all required environment variables in your `.env` file before running the server.

## License

This project is open source and available for contribution.

