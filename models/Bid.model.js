import mongoose from "mongoose"

const bidSchema = new mongoose.Schema(
  {
    gigId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Gig",
      required: true,
      index: true,
    },
    freelancerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    message: {
      type: String,
      required: [true, "Bid message is required"],
      trim: true,
      minlength: [10, "Message must be at least 10 characters"],
      maxlength: [1000, "Message cannot exceed 1000 characters"],
    },
    price: {
      type: Number,
      required: [true, "Bid price is required"],
      min: [1, "Bid price must be at least $1"],
      max: [1000000, "Bid price cannot exceed $1,000,000"],
    },
    status: {
      type: String,
      enum: ["pending", "hired", "rejected"],
      default: "pending",
      index: true,
    },
  },
  {
    timestamps: true,
  },
)

// Compound index to prevent duplicate bids
bidSchema.index({ gigId: 1, freelancerId: 1 }, { unique: true })

const Bid = mongoose.model("Bid", bidSchema)

export default Bid
