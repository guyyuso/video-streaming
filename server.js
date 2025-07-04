require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const path = require('path');
const fs = require('fs-extra');
const cron = require('node-cron');
const WebSocket = require('ws');
const http = require('http');

const db = require('./config/database');
const apiRoutes = require('./routes/api');
const AnalyticsService = require('./services/AnalyticsService');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:", "blob:"],
      mediaSrc: ["'self'", "blob:"],
      connectSrc: ["'self'", "ws:", "wss:"]
    }
  }
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: (process.env.RATE_LIMIT_WINDOW || 15) * 60 * 1000,
  max: process.env.RATE_LIMIT_MAX_REQUESTS || 100,
  message: { error: 'Too many requests, please try again later' }
});

app.use(limiter);

// CORS configuration
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? process.env.ALLOWED_ORIGINS?.split(',') 
    : true,
  credentials: true
}));

// Logging
app.use(morgan('combined'));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static file serving
app.use(express.static('public'));
app.use('/storage/media', express.static(process.env.MEDIA_STORAGE_PATH || './storage/media'));
app.use('/storage/thumbnails', express.static(process.env.THUMBNAIL_STORAGE_PATH || './storage/thumbnails'));

// API routes
app.use('/api', apiRoutes);

// Serve main application
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// WebSocket connection for real-time updates
wss.on('connection', (ws) => {
  console.log('Client connected via WebSocket');
  
  ws.on('message', async (message) => {
    try {
      const data = JSON.parse(message);
      
      // Handle different message types
      switch (data.type) {
        case 'ping':
          ws.send(JSON.stringify({ type: 'pong' }));
          break;
          
        case 'subscribe_to_uploads':
          ws.uploadSubscriber = true;
          break;
          
        case 'get_system_status':
          const systemHealth = await AnalyticsService.getSystemHealth();
          ws.send(JSON.stringify({ 
            type: 'system_status', 
            data: systemHealth 
          }));
          break;
      }
    } catch (error) {
      console.error('WebSocket message error:', error);
    }
  });
  
  ws.on('close', () => {
    console.log('Client disconnected from WebSocket');
  });
});

// Broadcast to all connected clients
const broadcast = (message) => {
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(message));
    }
  });
};

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Application error:', error);
  
  if (error.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ 
      error: 'File too large. Maximum size is ' + 
             Math.round(parseInt(process.env.MAX_FILE_SIZE) / 1024 / 1024) + 'MB' 
    });
  }
  
  res.status(500).json({ 
    error: process.env.NODE_ENV === 'production' 
      ? 'Internal server error' 
      : error.message 
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Scheduled tasks
if (process.env.NODE_ENV === 'production') {
  // Clean up old analytics data daily at midnight
  cron.schedule('0 0 * * *', async () => {
    try {
      await AnalyticsService.cleanupOldData();
      console.log('Analytics cleanup completed');
    } catch (error) {
      console.error('Analytics cleanup error:', error);
    }
  });
}

// Initialize storage directories
const initializeDirectories = async () => {
  const directories = [
    process.env.MEDIA_STORAGE_PATH || './storage/media',
    process.env.THUMBNAIL_STORAGE_PATH || './storage/thumbnails',
    process.env.TEMP_STORAGE_PATH || './storage/temp',
    './database'
  ];
  
  for (const dir of directories) {
    await fs.ensureDir(dir);
  }
};

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully');
  
  server.close(() => {
    console.log('HTTP server closed');
    db.close().then(() => {
      console.log('Database connection closed');
      process.exit(0);
    });
  });
});

// Start server
const startServer = async () => {
  try {
    await initializeDirectories();
    
    // Create default admin user if none exists
    const adminExists = await db.get('SELECT id FROM users WHERE role = "admin"');
    if (!adminExists) {
      const { hashPassword } = require('./middleware/auth');
      const passwordHash = await hashPassword('admin123');
      
      await db.run(
        'INSERT INTO users (username, email, password_hash, role) VALUES (?, ?, ?, ?)',
        ['admin', 'admin@streamhub.local', passwordHash, 'admin']
      );
      
      console.log('Default admin user created: admin / admin123');
    }
    
    server.listen(PORT, () => {
      console.log(`
🚀 StreamHub Media Platform running on http://localhost:${PORT}
📱 Environment: ${process.env.NODE_ENV}
💾 Database: ${process.env.DB_PATH}
📁 Storage: ${process.env.MEDIA_STORAGE_PATH || './storage/media'}
🔐 JWT Secret: ${process.env.JWT_SECRET ? 'Configured' : 'Using default (change in production!)'}
📊 Analytics: ${process.env.ENABLE_ANALYTICS === 'true' ? 'Enabled' : 'Disabled'}
      `);
    });
  } catch (error) {
    console.error('Server startup error:', error);
    process.exit(1);
  }
};

// Export for testing
module.exports = { app, server, broadcast };

// Start if not being imported
if (require.main === module) {
  startServer();
}