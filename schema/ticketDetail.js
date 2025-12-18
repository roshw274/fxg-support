const mongoose = require("mongoose");

const Cdata = new mongoose.Schema({
  channelId: {
    type: String,
  },
  userId: {
    type: String,
  },
  claimer: {
    type: String,
  },
  staffMembers: [{
    type: String,
  }],
});
module.exports = new mongoose.model("channelData", Cdata);
