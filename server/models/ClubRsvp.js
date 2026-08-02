const mongoose = require('mongoose');

const clubRsvpSchema = new mongoose.Schema(
  {
    clubPost: { type: mongoose.Schema.Types.ObjectId, ref: 'ClubPost', required: true, index: true },
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    phone: { type: String, required: true, trim: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('ClubRsvp', clubRsvpSchema);
