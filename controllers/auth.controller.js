import jwt from "jsonwebtoken"
import User from "../models/User.model.js"

// Generate JWT token
const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  })
}

// Set JWT cookie
const setTokenCookie = (res, token) => {
  const cookieOptions = {
    httpOnly: true,
    secure: process.env.COOKIE_SECURE === "true",
    sameSite: process.env.COOKIE_SAME_SITE || "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  }

  res.cookie("token", token, cookieOptions)
}

// @desc    Register new user
// @route   POST /api/auth/register
// @access  Public
export const register = async (req, res, next) => {
  try {
    const { name, email, password } = req.body

    // Check if user already exists
    const existingUser = await User.findOne({ email })
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "User already exists with this email",
      })
    }

    // Create user
    const user = await User.create({
      name,
      email,
      password,
    })

    // Generate token
    const token = generateToken(user._id)

    // Set cookie
    setTokenCookie(res, token)

    res.status(201).json({
      success: true,
      message: "User registered successfully",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
      },
    })
  } catch (error) {
    next(error)
  }
}

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body

    // Validate input
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Please provide email and password",
      })
    }

    // Find user and include password
    const user = await User.findOne({ email }).select("+password")

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      })
    }

    // Check password
    const isPasswordValid = await user.comparePassword(password)

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      })
    }

    // Generate token
    const token = generateToken(user._id)

    // Set cookie
    setTokenCookie(res, token)

    res.status(200).json({
      success: true,
      message: "Login successful",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
      },
    })
  } catch (error) {
    next(error)
  }
}

// @desc    Logout user
// @route   POST /api/auth/logout
// @access  Private
export const logout = async (req, res) => {
  res.cookie("token", "", {
    httpOnly: true,
    expires: new Date(0),
  })

  res.status(200).json({
    success: true,
    message: "Logged out successfully",
  })
}

// @desc    Get current user
// @route   GET /api/auth/me
// @access  Private
export const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id)

    res.status(200).json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
      },
    })
  } catch (error) {
    next(error)
  }
}
