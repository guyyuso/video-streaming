const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Sample data for demo
const sampleMedia = [
  {
    id: '1',
    title: 'Sample Video 1',
    description: 'This is a sample video for demonstration',
    category: 'Action',
    duration: 120,
    thumbnail: 'https://images.pexels.com/photos/7991579/pexels-photo-7991579.jpeg?auto=compress&cs=tinysrgb&w=400&h=225',
    uploadDate: new Date().toISOString()
  },
  {
    id: '2',
    title: 'Sample Video 2',
    description: 'Another sample video',
    category: 'Comedy',
    duration: 95,
    thumbnail: 'https://images.pexels.com/photos/4009402/pexels-photo-4009402.jpeg?auto=compress&cs=tinysrgb&w=400&h=225',
    uploadDate: new Date().toISOString()
  },
  {
    id: '3',
    title: 'Sample Video 3',
    description: 'Third sample video',
    category: 'Drama',
    duration: 110,
    thumbnail: 'https://images.pexels.com/photos/3945313/pexels-photo-3945313.jpeg?auto=compress&cs=tinysrgb&w=400&h=225',
    uploadDate: new Date().toISOString()
  }
];

// API Routes
app.get('/api/media', (req, res) => {
  res.json(sampleMedia);
});

app.get('/api/media/:id', (req, res) => {
  const media = sampleMedia.find(m => m.id === req.params.id);
  if (media) {
    res.json(media);
  } else {
    res.status(404).json({ error: 'Media not found' });
  }
});

app.post('/api/auth/login', (req, res) => {
  res.json({ 
    success: true, 
    token: 'demo-token',
    user: { id: 1, username: 'demo', email: 'demo@example.com' }
  });
});

app.post('/api/auth/register', (req, res) => {
  res.json({ 
    success: true, 
    token: 'demo-token',
    user: { id: 1, username: req.body.username, email: req.body.email }
  });
});

app.get('/api/analytics/stats', (req, res) => {
  res.json({
    systemHealth: {
      totalMediaFiles: 3,
      storageUsed: 1024 * 1024 * 500 // 500MB
    },
    popularMedia: sampleMedia
  });
});

app.get('/api/user/engagement', (req, res) => {
  res.json({
    totalPlays: 42,
    totalWatchTime: 3600,
    favoriteCategories: [
      { category: 'Action', plays: 15 },
      { category: 'Comedy', plays: 12 },
      { category: 'Drama', plays: 8 }
    ]
  });
});

app.get('/api/search', (req, res) => {
  const query = req.query.q?.toLowerCase() || '';
  const results = sampleMedia.filter(media => 
    media.title.toLowerCase().includes(query) ||
    media.description.toLowerCase().includes(query)
  );
  res.json(results);
});

// Serve the main page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server
app.listen(PORT, () => {
  console.log(`
🚀 StreamHub running on http://localhost:${PORT}
📱 Simplified version - no database required
🎬 Sample data loaded for demonstration
  `);
});

module.exports = app;