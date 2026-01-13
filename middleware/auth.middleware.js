import jwt from "jsonwebtoken"
import User from "../models/User.model.js"

export const protect = async (req, res, next) => {
  try {
    // Try to get token from cookie first, fallback to Authorization header
    let token = req.cookies?.token

    if (!token && req.headers.authorization?.startsWith("Bearer")) {
      token = req.headers.authorization.split(" ")[1]
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Not authorized, no token provided",
      })
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET)

    // Get user from token
    req.user = await User.findById(decoded.userId).select("-password")

    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Not authorized, user not found",
      })
    }

    next()
  } catch (error) {
    console.error("[v0] Auth middleware error:", error)
    return res.status(401).json({
      success: false,
      message: "Not authorized, token invalid or expired",
    })
  }
}
