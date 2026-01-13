import Gig from "../models/Gig.model.js"
import Bid from "../models/Bid.model.js"

// @desc    Get all gigs with optional search
// @route   GET /api/gigs?search=keyword
// @access  Public
export const getGigs = async (req, res, next) => {
  try {
    const { search, status } = req.query

    const query = {}

    // Filter by status (default: only open gigs)
    if (status) {
      query.status = status
    } else {
      query.status = "open"
    }

    // Search functionality
    if (search) {
      query.$or = [{ title: { $regex: search, $options: "i" } }, { description: { $regex: search, $options: "i" } }]
    }

    const gigs = await Gig.find(query).populate("ownerId", "name email").sort({ createdAt: -1 })

    res.status(200).json({
      success: true,
      count: gigs.length,
      gigs,
    })
  } catch (error) {
    next(error)
  }
}

// @desc    Get single gig by ID
// @route   GET /api/gigs/:id
// @access  Public
export const getGigById = async (req, res, next) => {
  try {
    const gig = await Gig.findById(req.params.id).populate("ownerId", "name email")

    if (!gig) {
      return res.status(404).json({
        success: false,
        message: "Gig not found",
      })
    }

    res.status(200).json({
      success: true,
      gig,
    })
  } catch (error) {
    next(error)
  }
}

// @desc    Create new gig
// @route   POST /api/gigs
// @access  Private
export const createGig = async (req, res, next) => {
  try {
    const { title, description, budget } = req.body

    const gig = await Gig.create({
      title,
      description,
      budget,
      ownerId: req.user._id,
    })

    const populatedGig = await Gig.findById(gig._id).populate("ownerId", "name email")

    res.status(201).json({
      success: true,
      message: "Gig created successfully",
      gig: populatedGig,
    })
  } catch (error) {
    next(error)
  }
}

// @desc    Update gig
// @route   PUT /api/gigs/:id
// @access  Private (Owner only)
export const updateGig = async (req, res, next) => {
  try {
    const gig = await Gig.findById(req.params.id)

    if (!gig) {
      return res.status(404).json({
        success: false,
        message: "Gig not found",
      })
    }

    // Check ownership
    if (gig.ownerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to update this gig",
      })
    }

    // Don't allow updating if gig is already assigned
    if (gig.status === "assigned") {
      return res.status(400).json({
        success: false,
        message: "Cannot update an assigned gig",
      })
    }

    const { title, description, budget } = req.body

    gig.title = title || gig.title
    gig.description = description || gig.description
    gig.budget = budget || gig.budget

    await gig.save()

    const updatedGig = await Gig.findById(gig._id).populate("ownerId", "name email")

    res.status(200).json({
      success: true,
      message: "Gig updated successfully",
      gig: updatedGig,
    })
  } catch (error) {
    next(error)
  }
}

// @desc    Delete gig
// @route   DELETE /api/gigs/:id
// @access  Private (Owner only)
export const deleteGig = async (req, res, next) => {
  try {
    const gig = await Gig.findById(req.params.id)

    if (!gig) {
      return res.status(404).json({
        success: false,
        message: "Gig not found",
      })
    }

    // Check ownership
    if (gig.ownerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to delete this gig",
      })
    }

    // Delete all bids associated with this gig
    await Bid.deleteMany({ gigId: gig._id })

    await gig.deleteOne()

    res.status(200).json({
      success: true,
      message: "Gig and associated bids deleted successfully",
    })
  } catch (error) {
    next(error)
  }
}

// @desc    Get user's own gigs
// @route   GET /api/gigs/my/gigs
// @access  Private
export const getMyGigs = async (req, res, next) => {
  try {
    const gigs = await Gig.find({ ownerId: req.user._id }).populate("ownerId", "name email").sort({ createdAt: -1 })

    res.status(200).json({
      success: true,
      count: gigs.length,
      gigs,
    })
  } catch (error) {
    next(error)
  }
}
