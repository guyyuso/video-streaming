const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs-extra');
const { body, validationResult } = require('express-validator');
const router = express.Router();

const MediaService = require('../services/MediaService');
const AnalyticsService = require('../services/AnalyticsService');
const { verifyToken, optionalAuth, generateToken, hashPassword, comparePassword } = require('../middleware/auth');
const db = require('../config/database');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, process.env.TEMP_STORAGE_PATH || './storage/temp');
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1E9)}-${file.originalname}`;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage: storage,
  limits: { 
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 2147483648 // 2GB default
  },
  fileFilter: (req, file, cb) => {
    const supportedFormats = process.env.SUPPORTED_VIDEO_FORMATS?.split(',') || ['mp4', 'avi', 'mkv', 'mov'];
    const fileExtension = path.extname(file.originalname).slice(1).toLowerCase();
    
    if (supportedFormats.includes(fileExtension)) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported file format. Supported formats: ${supportedFormats.join(', ')}`));
    }
  }
});

// Authentication Routes
router.post('/auth/register', [
  body('username').isLength({ min: 3 }).withMessage('Username must be at least 3 characters'),
  body('email').isEmail().withMessage('Valid email required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { username, email, password } = req.body;
    
    // Check if user exists
    const existingUser = await db.get(
      'SELECT id FROM users WHERE username = ? OR email = ?',
      [username, email]
    );
    
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }

    // Create user
    const passwordHash = await hashPassword(password);
    const result = await db.run(
      'INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)',
      [username, email, passwordHash]
    );

    const token = generateToken(result.id);
    res.json({ 
      success: true, 
      token,
      user: { id: result.id, username, email }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/auth/login', [
  body('username').notEmpty().withMessage('Username required'),
  body('password').notEmpty().withMessage('Password required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { username, password } = req.body;
    
    const user = await db.get(
      'SELECT * FROM users WHERE username = ? OR email = ?',
      [username, username]
    );
    
    if (!user || !(await comparePassword(password, user.password_hash))) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Update last login
    await db.run('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?', [user.id]);

    const token = generateToken(user.id);
    res.json({ 
      success: true, 
      token,
      user: { 
        id: user.id, 
        username: user.username, 
        email: user.email,
        role: user.role 
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Media Routes
router.post('/upload', verifyToken, upload.single('video'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No video file uploaded' });
    }

    const { title, category, description, tags } = req.body;
    
    const metadata = {
      title,
      category: category || 'General',
      description: description || '',
      tags: tags ? JSON.parse(tags) : [],
      userId: req.user.id
    };

    // Track upload event
    await AnalyticsService.trackEvent('upload_start', {
      userId: req.user.id,
      fileSize: req.file.size,
      fileName: req.file.originalname
    });

    // Process media file asynchronously
    const mediaData = await MediaService.processMediaFile(req.file.path, metadata);
    
    await AnalyticsService.trackEvent('upload_complete', {
      userId: req.user.id,
      mediaId: mediaData.id
    });

    res.json({ success: true, media: mediaData });
  } catch (error) {
    console.error('Upload error:', error);
    
    await AnalyticsService.trackEvent('upload_error', {
      userId: req.user?.id,
      error: error.message
    });

    res.status(500).json({ error: error.message });
  }
});

router.get('/media', optionalAuth, async (req, res) => {
  try {
    const { category, search, limit, page = 1 } = req.query;
    
    const filters = {
      category,
      search,
      limit: limit ? parseInt(limit) : null,
      offset: limit ? (page - 1) * parseInt(limit) : 0
    };

    const media = await MediaService.getAllMedia(filters);
    
    // Add watch progress for authenticated users
    if (req.user) {
      const watchHistory = await MediaService.getWatchHistory(req.user.id);
      const watchMap = new Map(watchHistory.map(w => [w.media_id, w]));
      
      media.forEach(item => {
        const watch = watchMap.get(item.id);
        item.watchProgress = watch ? {
          position: watch.position,
          completed: watch.completed,
          lastWatched: watch.watched_at
        } : null;
      });
    }

    res.json(media);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/media/:id', optionalAuth, async (req, res) => {
  try {
    const media = await MediaService.getMediaById(req.params.id);
    
    if (!media) {
      return res.status(404).json({ error: 'Media not found' });
    }

    // Track view event
    if (req.user) {
      await AnalyticsService.trackEvent('view', {
        userId: req.user.id,
        mediaId: media.id
      });
    }

    res.json(media);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/media/:id', verifyToken, async (req, res) => {
  try {
    await MediaService.deleteMedia(req.params.id);
    
    await AnalyticsService.trackEvent('delete', {
      userId: req.user.id,
      mediaId: req.params.id
    });

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/media/:id/watch-progress', verifyToken, async (req, res) => {
  try {
    const { position, completed } = req.body;
    
    await MediaService.updateWatchProgress(
      req.params.id, 
      req.user.id, 
      position, 
      completed
    );

    if (completed) {
      await AnalyticsService.trackEvent('watch_complete', {
        userId: req.user.id,
        mediaId: req.params.id,
        duration: position
      });
    }

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Search endpoint
router.get('/search', optionalAuth, async (req, res) => {
  try {
    const { q: query } = req.query;
    
    if (!query) {
      return res.json([]);
    }

    const results = await MediaService.getAllMedia({ search: query });
    
    await AnalyticsService.trackEvent('search', {
      userId: req.user?.id,
      query
    });

    res.json(results);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Analytics Routes (Admin only)
router.get('/analytics/stats', verifyToken, async (req, res) => {
  try {
    const { timeframe = '7 days' } = req.query;
    
    const [playbackStats, popularMedia, systemHealth] = await Promise.all([
      AnalyticsService.getPlaybackStats(timeframe),
      AnalyticsService.getPopularMedia(),
      AnalyticsService.getSystemHealth()
    ]);

    res.json({
      playbackStats,
      popularMedia,
      systemHealth
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/user/engagement', verifyToken, async (req, res) => {
  try {
    const engagement = await AnalyticsService.getUserEngagement(req.user.id);
    res.json(engagement);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;