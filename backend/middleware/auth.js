const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization']
    const token = authHeader && authHeader.split(' ')[1]

    if (!token) {
      return res.status(401).json({error: 'Access token required'})
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    const user = await prisma.user.findUnique({
      where: { user_id: decoded.userId }, select: {user_id: true, name: true, email: true, role: true}})

    if (!user) {
      return res.status(401).json({error: 'User not found'})
    }

    req.user = user
    next()
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(403).json({error: 'Invalid token'})
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(403).json({error: 'Token expired'})
    }
    return res.status(500).json({error: 'Authentication error'})
  }
}

const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'ADMIN') {
    return res.status(403).json({error: 'Admin access required'})
  }
  next()
}

module.exports = {
  authenticateToken,
  requireAdmin,
}

