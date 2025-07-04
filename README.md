# StreamHub - Personal Media Streaming Platform

A comprehensive personal media streaming platform built with a layered architecture following enterprise-grade design patterns. This platform provides professional-grade video management, transcoding, and streaming capabilities.

## 🏗️ Architecture Overview

```
[Client Applications] 
        ↓
   [API Gateway]
        ↓
[Media Management] — [Transcoding & Streaming]  
        |                     |
        ↓                     ↓
[Media Storage]      [User & Config Database]
        ↓                     ↓
     [Network Infrastructure & Security]
        ↓
 [Monitoring & Analytics]
```

## 🎯 Core Features

### 📱 Client Application Layer
- **Web Interface**: Responsive Netflix-style web application
- **Real-time Updates**: WebSocket integration for live notifications
- **Progressive Web App**: Offline-capable with service worker support
- **Mobile Responsive**: Optimized for all device sizes

### 🔐 API Gateway & Security
- **JWT Authentication**: Secure token-based authentication
- **Rate Limiting**: Configurable request throttling
- **CORS Protection**: Cross-origin request security
- **Input Validation**: Comprehensive data validation
- **Security Headers**: Helmet.js security middleware

### 🎬 Media Management Service
- **Smart Upload**: Drag & drop with progress tracking
- **Automatic Metadata**: Title, duration, resolution extraction
- **Category Organization**: Flexible categorization system
- **Search & Filter**: Real-time search with multiple filters
- **Batch Operations**: Multiple file management

### 🔄 Transcoding & Streaming Service
- **FFmpeg Integration**: Professional video processing
- **Adaptive Quality**: Multiple resolution support
- **Format Standardization**: Convert to web-optimized MP4
- **Thumbnail Generation**: Automatic preview thumbnails
- **Progress Tracking**: Real-time transcoding updates

### 💾 Storage Layer
- **Local Storage**: Efficient file system management
- **Organized Structure**: Separate media and thumbnail directories
- **Compression**: Size optimization while maintaining quality
- **Cleanup**: Automatic temporary file removal

### 🗄️ Database Layer
- **SQLite Integration**: Lightweight, reliable database
- **User Management**: Authentication and preferences
- **Media Metadata**: Comprehensive file information
- **Watch History**: Progress tracking and resume functionality
- **Analytics Data**: Usage statistics and insights

### 📊 Analytics & Monitoring
- **Usage Analytics**: Play counts, view statistics
- **User Engagement**: Watch time, favorite categories
- **System Health**: Storage usage, performance metrics
- **Popular Content**: Trending media identification

## 🚀 Installation & Setup

### Prerequisites
```bash
# Node.js v16+ required
node --version

# FFmpeg installation required
ffmpeg -version
```

### FFmpeg Installation

#### Windows
1. Download from [FFmpeg Official Site](https://ffmpeg.org/download.html#build-windows)
2. Extract to `C:\ffmpeg`
3. Add `C:\ffmpeg\bin` to system PATH

#### macOS
```bash
# Using Homebrew
brew install ffmpeg
```

#### Linux (Ubuntu/Debian)
```bash
sudo apt update
sudo apt install ffmpeg
```

### Project Setup

1. **Clone & Install**
   ```bash
   git clone <repository-url>
   cd streamhub-media-platform
   npm install
   ```

2. **Environment Configuration**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Database Initialization**
   ```bash
   npm run init-db
   ```

4. **Start Application**
   ```bash
   # Development mode
   npm run dev
   
   # Production mode
   npm start
   ```

5. **Access Application**
   ```
   Open: http://localhost:3000
   Default Admin: admin / admin123
   ```

## 📋 Configuration

### Environment Variables

```env
# Server Configuration
PORT=3000
NODE_ENV=development

# Database
DB_PATH=./database/media.db

# Security
JWT_SECRET=your-super-secret-key
JWT_EXPIRES_IN=7d

# Media Processing
MAX_FILE_SIZE=2147483648  # 2GB
DEFAULT_VIDEO_BITRATE=2000k
DEFAULT_AUDIO_BITRATE=192k
DEFAULT_RESOLUTION=1920x1080

# Storage Paths
MEDIA_STORAGE_PATH=./storage/media
THUMBNAIL_STORAGE_PATH=./storage/thumbnails
TEMP_STORAGE_PATH=./storage/temp

# Security
RATE_LIMIT_WINDOW=15
RATE_LIMIT_MAX_REQUESTS=100

# Analytics
ENABLE_ANALYTICS=true
ANALYTICS_RETENTION_DAYS=90
```

## 🎮 Usage Guide

### 👤 User Management
1. **Registration**: Create new user accounts
2. **Authentication**: Secure login with JWT tokens
3. **Profile Management**: Update user preferences
4. **Session Management**: Persistent login sessions

### 📤 Media Upload
1. **File Selection**: Drag & drop or browse files
2. **Metadata Entry**: Title, category, description, tags
3. **Processing**: Automatic transcoding and optimization
4. **Organization**: Automatic categorization and indexing

### 🎥 Media Playback
1. **Browse Library**: Grid or list view with filters
2. **Search Function**: Real-time search across metadata
3. **Video Player**: HTML5 player with full controls
4. **Progress Tracking**: Resume from last position

### 📈 Analytics Dashboard
1. **Usage Statistics**: Play counts, watch time
2. **Popular Content**: Trending media identification
3. **Storage Metrics**: Space usage and optimization
4. **User Engagement**: Personalized insights

## 🔧 API Documentation

### Authentication Endpoints
```javascript
POST /api/auth/register    // User registration
POST /api/auth/login       // User login
GET  /api/auth/profile     // Get user profile
POST /api/auth/logout      // User logout
```

### Media Management Endpoints
```javascript
GET    /api/media           // List all media
GET    /api/media/:id       // Get specific media
POST   /api/upload          // Upload new media
DELETE /api/media/:id       // Delete media
GET    /api/search          // Search media
```

### Analytics Endpoints
```javascript
GET /api/analytics/stats        // System statistics
GET /api/analytics/popular      // Popular content
GET /api/user/engagement        // User engagement metrics
POST /api/analytics/track       // Track events
```

## 🏗️ Architecture Details

### Layer Separation
- **Presentation Layer**: React-like vanilla JS frontend
- **API Layer**: Express.js REST API with JWT authentication
- **Business Logic**: Service classes for media, analytics, auth
- **Data Layer**: SQLite with proper schema design
- **Infrastructure**: File system, WebSocket, security middleware

### Security Implementation
- **Authentication**: JWT tokens with secure headers
- **Authorization**: Role-based access control
- **Input Validation**: Express-validator middleware
- **Rate Limiting**: Configurable request throttling
- **File Security**: Type validation and size limits

### Performance Optimization
- **Async Processing**: Non-blocking video transcoding
- **Caching Strategy**: Static file serving optimization
- **Database Indexing**: Optimized query performance
- **Memory Management**: Efficient file handling

## 🧪 Testing

```bash
# Run test suite
npm test

# Run with coverage
npm run test:coverage

# Run specific test file
npm test -- services/MediaService.test.js
```

## 📦 Deployment

### Docker Deployment
```dockerfile
# Build image
docker build -t streamhub .

# Run container
docker run -p 3000:3000 -v $(pwd)/storage:/app/storage streamhub
```

### Production Setup
```bash
# Set production environment
export NODE_ENV=production

# Build optimized assets
npm run build

# Start with PM2
pm2 start server.js --name streamhub
```

## 🛠️ Development

### Project Structure
```
streamhub-media-platform/
├── config/
│   └── database.js           # Database configuration
├── middleware/
│   └── auth.js              # Authentication middleware
├── routes/
│   └── api.js               # API route definitions
├── services/
│   ├── MediaService.js      # Media management logic
│   └── AnalyticsService.js  # Analytics processing
├── public/
│   ├── index.html           # Frontend application
│   ├── style.css            # Application styles
│   └── script.js            # Frontend JavaScript
├── storage/
│   ├── media/               # Processed video files
│   ├── thumbnails/          # Generated thumbnails
│   └── temp/                # Temporary uploads
├── database/
│   └── media.db             # SQLite database
├── server.js                # Main application server
└── package.json             # Dependencies and scripts
```

### Development Commands
```bash
# Start development server
npm run dev

# Run linting
npm run lint

# Run tests
npm test

# Database operations
npm run init-db
npm run migrate
npm run seed
```

## 📊 Monitoring

### System Health Checks
- **Database Connection**: SQLite connectivity
- **Storage Space**: Available disk space
- **FFmpeg Status**: Processing capability
- **WebSocket Health**: Real-time connection status

### Analytics Tracking
- **User Events**: Login, upload, play, search
- **System Events**: Errors, performance metrics
- **Media Events**: View counts, completion rates
- **Storage Events**: Upload size, processing time

## 🔍 Troubleshooting

### Common Issues

1. **FFmpeg Not Found**
   ```bash
   # Verify installation
   ffmpeg -version
   
   # Check PATH
   echo $PATH
   ```

2. **Database Connection Error**
   ```bash
   # Check permissions
   ls -la database/
   
   # Recreate database
   npm run init-db
   ```

3. **Upload Failures**
   ```bash
   # Check storage permissions
   ls -la storage/
   
   # Verify file size limits
   du -h storage/temp/
   ```

4. **Authentication Issues**
   ```bash
   # Check JWT secret
   echo $JWT_SECRET
   
   # Clear browser storage
   localStorage.clear()
   ```

## 🤝 Contributing

1. Fork the repository
2. Create feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **FFmpeg**: Video processing engine
- **Express.js**: Web application framework
- **SQLite**: Lightweight database engine
- **WebSocket**: Real-time communication
- **JWT**: Secure authentication standard

## 📞 Support

For support and questions:
- Create an issue on GitHub
- Check the troubleshooting guide
- Review the API documentation
- Join our community discussions

---

**StreamHub** - Professional Personal Media Streaming Platform
Built with ❤️ for media enthusiasts and professionals.