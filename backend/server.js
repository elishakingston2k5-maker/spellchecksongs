const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const connectDB = require('./db');
const { User, Song, ErrorPinpoint } = require('./models');

const app = express();
const JWT_SECRET = process.env.JWT_SECRET || 'worshipflowsecret';

// Connect to Database
connectDB();

// Middleware
app.use(cors());
app.use(express.json());

// Auth Middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Authentication token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ message: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};

// Admin Middleware
const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Admin access required' });
  }
  next();
};

// --- AUTH ROUTES ---

// Login
app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;

  try {
    if (!username || !password) {
      return res.status(400).json({ message: 'Username and password are required' });
    }

    const user = await User.findOne({ username });
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: user._id, username: user.username, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: {
        id: user._id,
        username: user.username,
        role: user.role,
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Signup
app.post('/api/auth/signup', async (req, res) => {
  const { username, password, role } = req.body;

  try {
    if (!username || !password) {
      return res.status(400).json({ message: 'Username and password are required' });
    }

    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).json({ message: 'Username is already taken' });
    }

    // Default to checker role
    const userRole = role === 'admin' ? 'admin' : 'checker';

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({
      username,
      password: hashedPassword,
      role: userRole,
    });

    await newUser.save();

    const token = jwt.sign(
      { id: newUser._id, username: newUser.username, role: newUser.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      token,
      user: {
        id: newUser._id,
        username: newUser.username,
        role: newUser.role,
      }
    });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get current user info
app.get('/api/auth/me', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json({
      id: user._id,
      username: user.username,
      role: user.role,
    });
  } catch (error) {
    console.error('Fetch user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});


// --- SONG ROUTES ---

// List songs with filters, search, and pagination
app.get('/api/songs', authenticateToken, async (req, res) => {
  try {
    const { alphabet, search, status, page = 1, limit = 50 } = req.query;
    const query = {};

    // Filter by Tamil alphabet if provided
    if (alphabet) {
      query.alphabet = alphabet;
    }

    // Filter by status if provided
    if (status === 'completed') {
      query.status = { $in: ['in_review', 'corrected', 'approved'] };
    } else if (status) {
      query.status = status;
    }

    // Search by title or Tanglish title
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { tanglishTitle: { $regex: search, $options: 'i' } },
        { id: search }
      ];
    }

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const songs = await Song.find(query)
      .select('id title tanglishTitle alphabet status reviewedBy submittedAt')
      .collation({ locale: 'en', numericOrdering: true })
      .skip(skip)
      .limit(limitNum)
      .sort({ id: 1 }); // Sort by song ID

    const total = await Song.countDocuments(query);

    res.json({
      songs,
      pagination: {
        total,
        page: pageNum,
        pages: Math.ceil(total / limitNum),
        limit: limitNum
      }
    });
  } catch (error) {
    console.error('Fetch songs error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get single song details with its reported errors
app.get('/api/songs/:id', authenticateToken, async (req, res) => {
  try {
    const song = await Song.findOne({ id: req.params.id });
    if (!song) {
      return res.status(404).json({ message: 'Song not found' });
    }

    // Fetch errors reported for this song
    // A checker should see their own errors for editing, and admin should see all errors
    const errorsQuery = { songId: song.id };
    if (req.user.role !== 'admin') {
      errorsQuery.checkedBy = req.user.username;
    }
    const errors = await ErrorPinpoint.find(errorsQuery).sort({ slideIndex: 1, createdAt: 1 });

    res.json({
      song,
      errors
    });
  } catch (error) {
    console.error('Fetch song error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Save progress (Draft saving)
app.post('/api/songs/:id/save', authenticateToken, async (req, res) => {
  const { errors } = req.body; // Array of error pinpoint objects

  try {
    const song = await Song.findOne({ id: req.params.id });
    if (!song) {
      return res.status(404).json({ message: 'Song not found' });
    }

    // Clear previous pending errors submitted by this checker for this song
    await ErrorPinpoint.deleteMany({
      songId: song.id,
      checkedBy: req.user.username,
      status: 'pending'
    });

    if (errors && errors.length > 0) {
      const pinpointsToInsert = errors.map(err => ({
        songId: song.id,
        songTitle: song.title,
        slideIndex: err.slideIndex,
        language: err.language,
        originalText: err.originalText,
        suggestedCorrection: err.suggestedCorrection || '',
        mistakeType: err.mistakeType,
        comment: err.comment || '',
        checkedBy: req.user.username,
        status: 'pending' // progress saving is always pending approval
      }));

      await ErrorPinpoint.insertMany(pinpointsToInsert);
    }

    res.json({ message: 'Progress saved successfully' });
  } catch (error) {
    console.error('Save progress error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Submit review
app.post('/api/songs/:id/submit', authenticateToken, async (req, res) => {
  const { errors } = req.body;

  try {
    const song = await Song.findOne({ id: req.params.id });
    if (!song) {
      return res.status(404).json({ message: 'Song not found' });
    }

    // Clear previous pending errors submitted by this checker for this song
    await ErrorPinpoint.deleteMany({
      songId: song.id,
      checkedBy: req.user.username,
      status: 'pending'
    });

    if (errors && errors.length > 0) {
      const pinpointsToInsert = errors.map(err => ({
        songId: song.id,
        songTitle: song.title,
        slideIndex: err.slideIndex,
        language: err.language,
        originalText: err.originalText,
        suggestedCorrection: err.suggestedCorrection || '',
        mistakeType: err.mistakeType,
        comment: err.comment || '',
        checkedBy: req.user.username,
        status: 'pending'
      }));

      await ErrorPinpoint.insertMany(pinpointsToInsert);
    }

    // Update song status to 'in_review'
    song.status = 'in_review';
    song.reviewedBy = req.user.username;
    song.submittedAt = new Date();
    await song.save();

    res.json({ message: 'Review submitted successfully', songStatus: song.status });
  } catch (error) {
    console.error('Submit review error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Reopen a song back to pending status for further editing (Checker/Admin)
app.post('/api/songs/:id/reopen', authenticateToken, async (req, res) => {
  try {
    const song = await Song.findOne({ id: req.params.id });
    if (!song) {
      return res.status(404).json({ message: 'Song not found' });
    }

    song.status = 'pending';
    await song.save();

    res.json({ message: 'Song reopened for review successfully', status: song.status });
  } catch (error) {
    console.error('Reopen song error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update song status (Admin only)
app.post('/api/songs/:id/status', authenticateToken, requireAdmin, async (req, res) => {
  const { status } = req.body;

  if (!['pending', 'in_review', 'corrected', 'approved'].includes(status)) {
    return res.status(400).json({ message: 'Invalid status type' });
  }

  try {
    const song = await Song.findOne({ id: req.params.id });
    if (!song) {
      return res.status(404).json({ message: 'Song not found' });
    }

    song.status = status;
    await song.save();

    res.json({ message: 'Song status updated successfully', status: song.status });
  } catch (error) {
    console.error('Update song status error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});


// --- ADMIN ERROR MANAGEMENT ROUTES ---

// List all errors with filters
app.get('/api/errors', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { status, checkedBy, songId, mistakeType } = req.query;
    const query = {};

    if (status) query.status = status;
    if (checkedBy) query.checkedBy = { $regex: checkedBy, $options: 'i' };
    if (songId) query.songId = songId;
    if (mistakeType) query.mistakeType = mistakeType;

    const errors = await ErrorPinpoint.find(query).sort({ createdAt: -1 });
    res.json(errors);
  } catch (error) {
    console.error('Fetch errors error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Approve an error pinpoint
app.post('/api/errors/:id/approve', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const errorPin = await ErrorPinpoint.findById(req.params.id);
    if (!errorPin) {
      return res.status(404).json({ message: 'Error record not found' });
    }

    if (errorPin.status === 'approved') {
      return res.status(400).json({ message: 'Error is already approved' });
    }

    // 1. Find the associated song in MongoDB
    const song = await Song.findOne({ id: errorPin.songId });
    if (!song) {
      return res.status(404).json({ message: 'Associated song not found' });
    }

    // 2. Apply the correction to the slide in MongoDB
    const slide = song.slides[errorPin.slideIndex];
    if (slide) {
      if (errorPin.language === 'Tamil') {
        slide.ta = slide.ta.replace(errorPin.originalText, errorPin.suggestedCorrection).replace(/  +/g, ' ');
      } else {
        slide.tg = slide.tg.replace(errorPin.originalText, errorPin.suggestedCorrection).replace(/  +/g, ' ');
      }
      song.markModified('slides');
      await song.save();
    }

    // 3. Mark the pinpoint error as approved
    errorPin.status = 'approved';
    await errorPin.save();

    // 4. Try to write all songs for this alphabet back to the local source JSON file in songsdb
    try {
      const fs = require('fs');
      const path = require('path');
      const alphabet = song.alphabet;
      const directoryPath = '/Users/elishakingston/Desktop/songsdb';
      const filePath = path.join(directoryPath, `${alphabet}.json`);

      // Only attempt write if directory exists (running locally)
      if (fs.existsSync(directoryPath)) {
        // Fetch all songs for this alphabet from MongoDB sorted numerically
        const allSongs = await Song.find({ alphabet })
          .sort({ id: 1 })
          .collation({ locale: 'en', numericOrdering: true });

        // Format songs back to original schema
        const formattedSongs = allSongs.map(s => {
          const originalId = s.id.split('_')[0];
          return {
            id: originalId,
            title: s.title,
            tanglishTitle: s.tanglishTitle,
            slides: s.slides.map(sl => ({
              ta: sl.ta,
              tg: sl.tg
            }))
          };
        });

        // Write back to Desktop/songsdb/
        fs.writeFileSync(filePath, JSON.stringify(formattedSongs, null, 2), 'utf-8');
        console.log(`Successfully auto-corrected song ${song.id} and updated local source file: ${filePath}`);
      } else {
        console.log(`Local directory ${directoryPath} not found. Skipping local file write (expected when running in cloud).`);
      }
    } catch (writeErr) {
      console.error('Failed to update local JSON file, but database change was saved:', writeErr);
    }

    res.json({ message: 'Error approved and applied to database successfully', errorPin });
  } catch (error) {
    console.error('Approve error error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Reject an error pinpoint
app.post('/api/errors/:id/reject', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const errorPin = await ErrorPinpoint.findById(req.params.id);
    if (!errorPin) {
      return res.status(404).json({ message: 'Error record not found' });
    }

    errorPin.status = 'rejected';
    await errorPin.save();

    res.json({ message: 'Error rejected successfully', errorPin });
  } catch (error) {
    console.error('Reject error error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Approve all pending error pinpoints for a song (Admin only)
app.post('/api/songs/:id/approve-all-errors', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const song = await Song.findOne({ id: req.params.id });
    if (!song) {
      return res.status(404).json({ message: 'Song not found' });
    }

    // Find all pending errors for this song
    const pendingErrors = await ErrorPinpoint.find({ songId: song.id, status: 'pending' });
    if (pendingErrors.length === 0) {
      return res.status(400).json({ message: 'No pending errors found for this song' });
    }

    // Apply each correction to the slides
    for (const errorPin of pendingErrors) {
      const slide = song.slides[errorPin.slideIndex];
      if (slide) {
        if (errorPin.language === 'Tamil') {
          slide.ta = slide.ta.replace(errorPin.originalText, errorPin.suggestedCorrection).replace(/  +/g, ' ');
        } else {
          slide.tg = slide.tg.replace(errorPin.originalText, errorPin.suggestedCorrection).replace(/  +/g, ' ');
        }
      }
      errorPin.status = 'approved';
      await errorPin.save();
    }

    song.markModified('slides');
    await song.save();

    // Write back to Desktop/songsdb if exists
    try {
      const fs = require('fs');
      const path = require('path');
      const alphabet = song.alphabet;
      const directoryPath = '/Users/elishakingston/Desktop/songsdb';
      const filePath = path.join(directoryPath, `${alphabet}.json`);

      if (fs.existsSync(directoryPath)) {
        const allSongs = await Song.find({ alphabet })
          .sort({ id: 1 })
          .collation({ locale: 'en', numericOrdering: true });

        const formattedSongs = allSongs.map(s => {
          const originalId = s.id.split('_')[0];
          return {
            id: originalId,
            title: s.title,
            tanglishTitle: s.tanglishTitle,
            slides: s.slides.map(sl => ({
              ta: sl.ta,
              tg: sl.tg
            }))
          };
        });

        fs.writeFileSync(filePath, JSON.stringify(formattedSongs, null, 2), 'utf-8');
        console.log(`Successfully approved all errors for song ${song.id} and updated local source file.`);
      }
    } catch (writeErr) {
      console.error('Failed to update local JSON file on approve-all, but DB changes saved:', writeErr);
    }

    res.json({ message: 'All pending errors approved and applied successfully' });
  } catch (error) {
    console.error('Approve all errors error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Reject all pending error pinpoints for a song (Admin only)
app.post('/api/songs/:id/reject-all-errors', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const song = await Song.findOne({ id: req.params.id });
    if (!song) {
      return res.status(404).json({ message: 'Song not found' });
    }

    const result = await ErrorPinpoint.updateMany(
      { songId: song.id, status: 'pending' },
      { status: 'rejected' }
    );

    if (result.matchedCount === 0) {
      return res.status(400).json({ message: 'No pending errors found for this song' });
    }

    res.json({ message: 'All pending errors rejected successfully' });
  } catch (error) {
    console.error('Reject all errors error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Export songs for a specific alphabet as JSON (Admin only)
app.get('/api/admin/export/:alphabet', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { alphabet } = req.params;
    
    // Fetch all songs for this alphabet from MongoDB sorted numerically
    const allSongs = await Song.find({ alphabet })
      .sort({ id: 1 })
      .collation({ locale: 'en', numericOrdering: true });

    // Format songs back to original schema
    const formattedSongs = allSongs.map(s => {
      const originalId = s.id.split('_')[0];
      return {
        id: originalId,
        title: s.title,
        tanglishTitle: s.tanglishTitle,
        slides: s.slides.map(sl => ({
          ta: sl.ta,
          tg: sl.tg
        }))
      };
    });

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename=${encodeURIComponent(alphabet)}.json`);
    res.send(JSON.stringify(formattedSongs, null, 2));
  } catch (error) {
    console.error('Export error:', error);
    res.status(500).json({ message: 'Server error during export' });
  }
});

// Get dashboard stats
app.get('/api/stats', authenticateToken, async (req, res) => {
  try {
    const totalSongs = await Song.countDocuments({});
    const pendingReviews = await Song.countDocuments({ status: 'in_review' });
    const correctedSongs = await Song.countDocuments({ status: 'corrected' });
    const approvedSongs = await Song.countDocuments({ status: 'approved' });

    const responseData = {
      stats: {
        totalSongs,
        pendingReviews,
        correctedSongs,
        approvedSongs,
      }
    };

    // Only admins get list of recent errors and checkers list
    if (req.user.role === 'admin') {
      responseData.recentErrors = await ErrorPinpoint.find({})
        .sort({ createdAt: -1 })
        .limit(10);
      responseData.checkers = await ErrorPinpoint.distinct('checkedBy');
    }

    res.json(responseData);
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});


// Start Server
const PORT = process.env.PORT || 5000;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});
