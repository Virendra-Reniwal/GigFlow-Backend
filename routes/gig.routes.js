import express from "express"
import { getGigs, getGigById, createGig, updateGig, deleteGig, getMyGigs } from "../controllers/gig.controller.js"
import { protect } from "../middleware/auth.middleware.js"

const router = express.Router()

router.get("/", getGigs)
router.get("/my/gigs", protect, getMyGigs)
router.get("/:id", getGigById)
router.post("/", protect, createGig)
router.put("/:id", protect, updateGig)
router.delete("/:id", protect, deleteGig)

export default router
