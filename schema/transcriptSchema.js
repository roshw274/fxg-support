const mongoose = require('mongoose');

const transcriptSchema = new mongoose.Schema({
  transcriptId: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  ticketChannelId: {
    type: String,
    required: true,
  },
  ticketChannelName: {
    type: String,
    required: true,
  },
  categoryId: {
    type: String,
  },
  categoryName: {
    type: String,
  },
  ticketOpener: {
    id: String,
    username: String,
    tag: String,
    avatar: String,
  },
  claimedBy: {
    id: String,
    username: String,
    tag: String,
    avatar: String,
  },
  staff: [
    {
      id: String,
      username: String,
      tag: String,
      avatar: String,
    },
  ],
  status: {
    type: String,
    enum: ['open', 'closed'],
    default: 'open',
  },
  closeReason: String,
  messages: [
    {
      id: String,
      authorId: String,
      author: String,
      authorTag: String,
      authorAvatar: String,
      isBot: Boolean,
      roleColor: String,
      timestamp: Date,
      content: String,
      embeds: mongoose.Schema.Types.Mixed,
      attachments: [
        {
          id: String,
          filename: String,
          size: Number,
          url: String,
          contentType: String,
          width: Number,
          height: Number,
        },
      ],
      reactions: [
        {
          emoji: String,
          count: Number,
          users: [String],
        },
      ],
      edited: Boolean,
      editedTimestamp: Date,
    },
  ],
  createdAt: {
    type: Date,
    default: Date.now,
  },
  closedAt: Date,
  expiresAt: {
    type: Date,
    index: true,
  },
  password: String,
  isPublic: {
    type: Boolean,
    default: true,
  },
  viewCount: {
    type: Number,
    default: 0,
  },
});

module.exports = mongoose.model('Transcript', transcriptSchema);
