const mongoose = require('mongoose');

// User Schema
const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  password: {
    type: String,
    required: true,
  },
  role: {
    type: String,
    required: true,
    enum: ['admin', 'checker'],
    default: 'checker',
  },
}, { timestamps: true });

// Song Schema
const songSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    unique: true,
  },
  title: {
    type: String,
    required: true,
  },
  tanglishTitle: {
    type: String,
    required: true,
  },
  alphabet: {
    type: String,
    required: true,
  },
  status: {
    type: String,
    required: true,
    enum: ['pending', 'in_review', 'corrected', 'approved'],
    default: 'pending',
  },
  slides: [
    {
      ta: { type: String, required: true },
      tg: { type: String, required: true },
    }
  ],
  reviewedBy: {
    type: String,
    default: null,
  },
  submittedAt: {
    type: Date,
    default: null,
  }
}, { timestamps: true });

// Error Pinpoint Schema
const errorPinpointSchema = new mongoose.Schema({
  songId: {
    type: String,
    required: true,
  },
  songTitle: {
    type: String,
    required: true,
  },
  slideIndex: {
    type: Number,
    required: true,
  },
  language: {
    type: String,
    required: true,
    enum: ['Tamil', 'Tanglish'],
  },
  originalText: {
    type: String,
    required: true,
  },
  suggestedCorrection: {
    type: String,
    default: '',
  },
  mistakeType: {
    type: String,
    required: true,
    enum: [
      'Tamil spelling mistake',
      'Tanglish spelling mistake',
      'Missing word',
      'Extra word',
      'Line break issue',
      'Other'
    ],
  },
  comment: {
    type: String,
    default: '',
  },
  checkedBy: {
    type: String,
    required: true,
  },
  status: {
    type: String,
    required: true,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending',
  }
}, { timestamps: true });

const User = mongoose.model('User', userSchema);
const Song = mongoose.model('Song', songSchema);
const ErrorPinpoint = mongoose.model('ErrorPinpoint', errorPinpointSchema);

module.exports = { User, Song, ErrorPinpoint };
