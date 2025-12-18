const mongoose = require("mongoose");

const feedbackSchema = new mongoose.Schema({
  ticketId: {
    type: String,
    required: true,
  },
  userId: {
    type: String,
    required: true,
  },
  userTag: {
    type: String,
    required: false,
  },
  staffId: {
    type: String,
    required: true,
  },
  allStaffIds: {
    type: [String],
    required: false,
    default: [],
  },
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5,
  },
  feedback: {
    type: String,
    required: true,
    maxlength: 1000,
  },
  guildId: {
    type: String,
    required: true,
  },
  channelName: {
    type: String,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = new mongoose.model("feedback", feedbackSchema);
