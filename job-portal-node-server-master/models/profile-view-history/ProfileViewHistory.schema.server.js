const mongoose = require("mongoose");

const ProfileViewHistorySchema = new mongoose.Schema({
  viewerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  profileId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  viewedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("ProfileViewHistory", ProfileViewHistorySchema);
