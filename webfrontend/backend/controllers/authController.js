const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET, {expiresIn: '7d'})
}

const register = async (req, res, next) => {
  try {
    const { name, email, password } = req.body
    const existingUser = await prisma.user.findUnique({where: {email}})
    if (existingUser) {
      return res.status(409).json({error: 'User with this email already exists'})
    }
    const password_hash = await bcrypt.hash(password, 10)

    const user = await prisma.user.create({data: {name, email, password_hash, role: 'USER'}, 
      select: {user_id: true, name: true, email: true, role: true, created_at: true}})

    const token = generateToken(user.user_id)

    res.status(201).json({message: 'User registered successfully', user, token})
  } catch (error) {
    console.error(error)
  }
}

const login = async (req, res, next) => {
  try {
    const { email, password } = req.body

    const user = await prisma.user.findUnique({where: {email}})
    if (!user) {
      return res.status(401).json({error: 'Invalid email or password'})
    }
    const isValidPassword = await bcrypt.compare(password, user.password_hash)

    if (!isValidPassword) {
      return res.status(401).json({error: 'Invalid email or password'})
    }

    const token = generateToken(user.user_id)

    res.json({message: 'Login successful',user,token})
  } catch (error) {
    console.error(error)
  }
}

const getProfile = async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { user_id: req.user.user_id },
      select: {user_id: true, name: true, email: true, role: true, created_at: true, updated_at: true}})
    res.json({ user })
  } catch (error) {
    console.error(error)
  }
}

module.exports = {
  register,
  login,
  getProfile,
}

