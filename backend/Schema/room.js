import mongoose from "mongoose";

export const roomSchema = new mongoose.Schema({
  code: {
    type: String,
    required: true,
    unique: true
  },
  host: {
    type: String,
    required: true
  },
  created_at: {
    type: Date,
    default: Date.now
  }
});

