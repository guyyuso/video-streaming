const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs-extra');
const ffmpeg = require('fluent-ffmpeg');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));
app.use('/videos', express.static('videos'));
app.use('/thumbnails', express.static('thumbnails'));

// Ensure directories exist
const createDirectories = async () => {
  await fs.ensureDir('videos');
  await fs.ensureDir('thumbnails');
  await fs.ensureDir('uploads');
};

// Storage configuration for multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv4()}-${file.originalname}`;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 500 * 1024 * 1024 }, // 500MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('video/')) {
      cb(null, true);
    } else {
      cb(new Error('Please upload only video files'));
    }
  }
});

// In-memory video database (in production, use a real database)
let videoDatabase = [];

// Compress video using FFmpeg
const compressVideo = (inputPath, outputPath, thumbnailPath) => {
  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .output(outputPath)
      .videoCodec('libx264')
      .audioCodec('aac')
      .size('1280x720')
      .videoBitrate('1000k')
      .audioBitrate('128k')
      .on('end', () => {
        // Generate thumbnail
        ffmpeg(inputPath)
          .screenshots({
            timestamps: ['10%'],
            filename: path.basename(thumbnailPath),
            folder: path.dirname(thumbnailPath),
            size: '400x225'
          })
          .on('end', () => resolve())
          .on('error', reject);
      })
      .on('error', reject)
      .run();
  });
};

// Get video duration
const getVideoDuration = (filePath) => {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filePath, (err, metadata) => {
      if (err) reject(err);
      else resolve(metadata.format.duration);
    });
  });
};

// Format duration to HH:MM:SS
const formatDuration = (seconds) => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  } else {
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  }
};

// Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Upload video endpoint
app.post('/upload', upload.single('video'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No video file uploaded' });
    }

    const { title, category, description } = req.body;
    const videoId = uuidv4();
    const inputPath = req.file.path;
    const outputPath = `videos/${videoId}.mp4`;
    const thumbnailPath = `thumbnails/${videoId}.jpg`;

    // Get video duration
    const duration = await getVideoDuration(inputPath);
    const formattedDuration = formatDuration(duration);

    // Compress video
    await compressVideo(inputPath, outputPath, thumbnailPath);

    // Add to database
    const videoData = {
      id: videoId,
      title: title || req.file.originalname,
      category: category || 'General',
      description: description || '',
      duration: formattedDuration,
      filename: `${videoId}.mp4`,
      thumbnail: `${videoId}.jpg`,
      uploadDate: new Date().toISOString(),
      views: 0,
      rating: 'PG'
    };

    videoDatabase.push(videoData);

    // Clean up original file
    await fs.remove(inputPath);

    res.json({ success: true, video: videoData });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Failed to process video' });
  }
});

// Get all videos
app.get('/api/videos', (req, res) => {
  res.json(videoDatabase);
});

// Get video by ID
app.get('/api/videos/:id', (req, res) => {
  const video = videoDatabase.find(v => v.id === req.params.id);
  if (!video) {
    return res.status(404).json({ error: 'Video not found' });
  }
  
  // Increment views
  video.views++;
  res.json(video);
});

// Delete video
app.delete('/api/videos/:id', async (req, res) => {
  try {
    const videoIndex = videoDatabase.findIndex(v => v.id === req.params.id);
    if (videoIndex === -1) {
      return res.status(404).json({ error: 'Video not found' });
    }

    const video = videoDatabase[videoIndex];
    
    // Remove files
    await fs.remove(`videos/${video.filename}`);
    await fs.remove(`thumbnails/${video.thumbnail}`);
    
    // Remove from database
    videoDatabase.splice(videoIndex, 1);
    
    res.json({ success: true });
  } catch (error) {
    console.error('Delete error:', error);
    res.status(500).json({ error: 'Failed to delete video' });
  }
});

// Search videos
app.get('/api/search', (req, res) => {
  const { q } = req.query;
  if (!q) {
    return res.json(videoDatabase);
  }
  
  const results = videoDatabase.filter(video => 
    video.title.toLowerCase().includes(q.toLowerCase()) ||
    video.category.toLowerCase().includes(q.toLowerCase())
  );
  
  res.json(results);
});

// Initialize server
const startServer = async () => {
  await createDirectories();
  
  app.listen(PORT, () => {
    console.log(`🚀 StreamHub server running on http://localhost:${PORT}`);
    console.log(`📁 Upload videos to get started!`);
  });
};

startServer().catch(console.error);