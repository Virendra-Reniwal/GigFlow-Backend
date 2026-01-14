import express from "express"
import mongoose from "mongoose"
import cookieParser from "cookie-parser"
import cors from "cors"
import dotenv from "dotenv"
import { createServer } from "http"
import { Server } from "socket.io"

// Routes
import authRoutes from "./routes/auth.routes.js"
import gigRoutes from "./routes/gig.routes.js"
import bidRoutes from "./routes/bid.routes.js"

// Error handler
import { errorHandler } from "./middleware/error.middleware.js"

dotenv.config()

const app = express()
const httpServer = createServer(app)

/* =========================
   CORS (PROD + DEV SAFE)
   Works with Vercel proxy
========================= */
app.use(
  cors({
    origin: true,          // allow Vercel proxy + dev
    credentials: true,    // cookies / auth
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
)

// ✅ IMPORTANT: handle preflight properly (fixes 500)
app.options("*", cors())

/* =========================
   MIDDLEWARE
========================= */
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(cookieParser())

/* =========================
   ROUTES
========================= */
app.use("/api/auth", authRoutes)
app.use("/api/gigs", gigRoutes)
app.use("/api/bids", bidRoutes)

app.get("/api/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    message: "GigFlow API running",
  })
})

/* =========================
   SOCKET.IO (SAFE)
========================= */
const io = new Server(httpServer, {
  cors: {
    origin: true,
    credentials: true,
  },
})

app.set("io", io)

io.on("connection", (socket) => {
  console.log("🔌 Socket connected:", socket.id)

  socket.on("join", (userId) => {
    socket.join(`user:${userId}`)
  })

  socket.on("disconnect", () => {
    console.log("❌ Socket disconnected:", socket.id)
  })
})

/* =========================
   ERROR HANDLER
========================= */
app.use(errorHandler)

/* =========================
   DATABASE + SERVER
========================= */
const PORT = process.env.PORT || 5000

mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => {
    console.log("✅ MongoDB connected")
    httpServer.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`)
    })
  })
  .catch((err) => {
    console.error("❌ MongoDB error:", err)
    process.exit(1)
  })

/* =========================
   SAFETY
========================= */
process.on("unhandledRejection", (err) => {
  console.error("Unhandled Rejection:", err)
  httpServer.close(() => process.exit(1))
})
