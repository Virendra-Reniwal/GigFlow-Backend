import mongoose from "mongoose"
import Bid from "../models/Bid.model.js"
import Gig from "../models/Gig.model.js"

// @desc    Submit a bid for a gig
// @route   POST /api/bids
// @access  Private
export const createBid = async (req, res, next) => {
  try {
    const { gigId, message, price } = req.body

    // Check if gig exists
    const gig = await Gig.findById(gigId)

    if (!gig) {
      return res.status(404).json({
        success: false,
        message: "Gig not found",
      })
    }

    // Check if gig is still open
    if (gig.status !== "open") {
      return res.status(400).json({
        success: false,
        message: "This gig is no longer accepting bids",
      })
    }

    // Check if user is trying to bid on their own gig
    if (gig.ownerId.toString() === req.user._id.toString()) {
      return res.status(400).json({
        success: false,
        message: "You cannot bid on your own gig",
      })
    }

    // Check if user has already bid on this gig
    const existingBid = await Bid.findOne({
      gigId,
      freelancerId: req.user._id,
    })

    if (existingBid) {
      return res.status(400).json({
        success: false,
        message: "You have already submitted a bid for this gig",
      })
    }

    // Create bid
    const bid = await Bid.create({
      gigId,
      freelancerId: req.user._id,
      message,
      price,
    })

    const populatedBid = await Bid.findById(bid._id)
      .populate("freelancerId", "name email")
      .populate("gigId", "title description budget")

    res.status(201).json({
      success: true,
      message: "Bid submitted successfully",
      bid: populatedBid,
    })
  } catch (error) {
    next(error)
  }
}

// @desc    Get all bids for a specific gig
// @route   GET /api/bids/:gigId
// @access  Private (Gig owner only)
export const getBidsForGig = async (req, res, next) => {
  try {
    const { gigId } = req.params

    // Check if gig exists
    const gig = await Gig.findById(gigId)

    if (!gig) {
      return res.status(404).json({
        success: false,
        message: "Gig not found",
      })
    }

    // Check if user is the gig owner
    if (gig.ownerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to view bids for this gig",
      })
    }

    // Get all bids for this gig
    const bids = await Bid.find({ gigId }).populate("freelancerId", "name email").sort({ createdAt: -1 })

    res.status(200).json({
      success: true,
      count: bids.length,
      bids,
    })
  } catch (error) {
    next(error)
  }
}

// @desc    Get user's own bids
// @route   GET /api/bids/my/bids
// @access  Private
export const getMyBids = async (req, res, next) => {
  try {
    const bids = await Bid.find({ freelancerId: req.user._id })
      .populate("gigId", "title description budget status")
      .sort({ createdAt: -1 })

    res.status(200).json({
      success: true,
      count: bids.length,
      bids,
    })
  } catch (error) {
    next(error)
  }
}

// @desc    Hire a freelancer (THE CRUCIAL HIRING LOGIC)
// @route   PATCH /api/bids/:bidId/hire
// @access  Private (Gig owner only)
export const hireBid = async (req, res, next) => {
  // Start a MongoDB session for transaction
  const session = await mongoose.startSession()
  session.startTransaction()

  try {
    const { bidId } = req.params

    // Find the bid with session
    const bid = await Bid.findById(bidId).populate("gigId").session(session)

    if (!bid) {
      await session.abortTransaction()
      return res.status(404).json({
        success: false,
        message: "Bid not found",
      })
    }

    const gig = await Gig.findById(bid.gigId).session(session)

    if (!gig) {
      await session.abortTransaction()
      return res.status(404).json({
        success: false,
        message: "Gig not found",
      })
    }

    // Check if user is the gig owner
    if (gig.ownerId.toString() !== req.user._id.toString()) {
      await session.abortTransaction()
      return res.status(403).json({
        success: false,
        message: "Not authorized to hire for this gig",
      })
    }

    // Check if gig is still open (RACE CONDITION PREVENTION)
    if (gig.status === "assigned") {
      await session.abortTransaction()
      return res.status(400).json({
        success: false,
        message: "This gig has already been assigned to someone else",
      })
    }

    // ATOMIC UPDATE: Update the gig status to 'assigned'
    gig.status = "assigned"
    gig.hiredBidId = bid._id
    await gig.save({ session })

    // Update the hired bid status to 'hired'
    bid.status = "hired"
    await bid.save({ session })

    // Reject all other pending bids for this gig
    await Bid.updateMany(
      {
        gigId: gig._id,
        _id: { $ne: bid._id },
        status: "pending",
      },
      {
        $set: { status: "rejected" },
      },
      { session },
    )

    // Commit the transaction
    await session.commitTransaction()

    // Populate the bid for response
    const hiredBid = await Bid.findById(bid._id)
      .populate("freelancerId", "name email")
      .populate("gigId", "title description budget")

    // BONUS: Real-time notification via Socket.io
    const io = req.app.get("io")
    if (io) {
      io.to(`user:${bid.freelancerId._id}`).emit("hired", {
        message: `You have been hired for "${gig.title}"!`,
        gig: {
          id: gig._id,
          title: gig.title,
        },
        bid: {
          id: bid._id,
          price: bid.price,
        },
      })
    }

    res.status(200).json({
      success: true,
      message: "Freelancer hired successfully",
      bid: hiredBid,
    })
  } catch (error) {
    // Rollback transaction on error
    await session.abortTransaction()
    next(error)
  } finally {
    session.endSession()
  }
}

// @desc    Update bid (freelancer can update their own bid if still pending)
// @route   PUT /api/bids/:bidId
// @access  Private (Bid owner only)
export const updateBid = async (req, res, next) => {
  try {
    const { bidId } = req.params
    const { message, price } = req.body

    const bid = await Bid.findById(bidId)

    if (!bid) {
      return res.status(404).json({
        success: false,
        message: "Bid not found",
      })
    }

    // Check ownership
    if (bid.freelancerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to update this bid",
      })
    }

    // Can only update pending bids
    if (bid.status !== "pending") {
      return res.status(400).json({
        success: false,
        message: "Cannot update a bid that is not pending",
      })
    }

    bid.message = message || bid.message
    bid.price = price || bid.price

    await bid.save()

    const updatedBid = await Bid.findById(bid._id)
      .populate("freelancerId", "name email")
      .populate("gigId", "title description budget")

    res.status(200).json({
      success: true,
      message: "Bid updated successfully",
      bid: updatedBid,
    })
  } catch (error) {
    next(error)
  }
}

// @desc    Delete bid
// @route   DELETE /api/bids/:bidId
// @access  Private (Bid owner only)
export const deleteBid = async (req, res, next) => {
  try {
    const { bidId } = req.params

    const bid = await Bid.findById(bidId)

    if (!bid) {
      return res.status(404).json({
        success: false,
        message: "Bid not found",
      })
    }

    // Check ownership
    if (bid.freelancerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to delete this bid",
      })
    }

    // Can only delete pending bids
    if (bid.status !== "pending") {
      return res.status(400).json({
        success: false,
        message: "Cannot delete a bid that is not pending",
      })
    }

    await bid.deleteOne()

    res.status(200).json({
      success: true,
      message: "Bid deleted successfully",
    })
  } catch (error) {
    next(error)
  }
}
