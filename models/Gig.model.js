import mongoose from "mongoose"

const gigSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Title is required"],
      trim: true,
      minlength: [5, "Title must be at least 5 characters"],
      maxlength: [100, "Title cannot exceed 100 characters"],
    },
    description: {
      type: String,
      required: [true, "Description is required"],
      trim: true,
      minlength: [20, "Description must be at least 20 characters"],
      maxlength: [2000, "Description cannot exceed 2000 characters"],
    },
    budget: {
      type: Number,
      required: [true, "Budget is required"],
      min: [1, "Budget must be at least $1"],
      max: [1000000, "Budget cannot exceed $1,000,000"],
    },
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ["open", "assigned"],
      default: "open",
      index: true,
    },
    hiredBidId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Bid",
      default: null,
    },
  },
  {
    timestamps: true,
  },
)

// Index for searching
gigSchema.index({ title: "text", description: "text" })

const Gig = mongoose.model("Gig", gigSchema)

export default Gig
