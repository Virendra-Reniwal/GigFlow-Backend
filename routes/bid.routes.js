import express from "express"
import { createBid, getBidsForGig, getMyBids, hireBid, updateBid, deleteBid } from "../controllers/bid.controller.js"
import { protect } from "../middleware/auth.middleware.js"

const router = express.Router()

router.post("/", protect, createBid)
router.get("/my/bids", protect, getMyBids)
router.get("/:gigId", protect, getBidsForGig)
router.patch("/:bidId/hire", protect, hireBid)
router.put("/:bidId", protect, updateBid)
router.delete("/:bidId", protect, deleteBid)

export default router
