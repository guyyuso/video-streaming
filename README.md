# StreamHub - Video Streaming Platform

A professional video streaming platform with upload, compression, and management features. Built with Node.js, Express, and FFmpeg for optimal video processing.

## Features

### 🎬 Video Management
- **Upload Videos**: Drag & drop or click to upload video files
- **Automatic Compression**: Videos are compressed using FFmpeg for optimal streaming
- **Thumbnail Generation**: Automatic thumbnail creation from video frames
- **Video Metadata**: Title, category, description, and duration tracking
- **View Counter**: Track video views automatically

### 🎯 User Interface
- **Netflix-style Design**: Modern, responsive interface
- **Video Grid**: Clean card-based video display
- **Search Functionality**: Real-time video search
- **Categories**: Organize videos by genre (Action, Comedy, Drama, etc.)
- **My List**: Personal video collection management

### 🎪 Streaming Features
- **HTML5 Video Player**: Built-in video player with controls
- **Responsive Design**: Works on desktop, tablet, and mobile
- **Modal Player**: Full-screen video viewing experience
- **Progress Tracking**: Resume watching from where you left off

### 🔧 Technical Features
- **FFmpeg Integration**: Professional video compression and processing
- **RESTful API**: Clean API endpoints for video management
- **File Management**: Automatic cleanup of original files after compression
- **Error Handling**: Comprehensive error handling and user feedback

## Installation

### Prerequisites
- Node.js (v14 or higher)
- FFmpeg installed on your system

### FFmpeg Installation

#### Windows
1. Download FFmpeg from [https://ffmpeg.org/download.html](https://ffmpeg.org/download.html)
2. Extract to a folder (e.g., `C:\ffmpeg`)
3. Add `C:\ffmpeg\bin` to your PATH environment variable

#### macOS
```bash
brew install ffmpeg
```

#### Linux (Ubuntu/Debian)
```bash
sudo apt update
sudo apt install ffmpeg
```

### Project Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd streamhub-video-platform
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Create required directories**
   ```bash
   mkdir videos thumbnails uploads
   ```

4. **Start the server**
   ```bash
   npm start
   ```

   For development with auto-reload:
   ```bash
   npm run dev
   ```

5. **Open your browser**
   Navigate to `http://localhost:3000`

## Usage

### Uploading Videos
1. Click "Upload Video" button or navigate to Upload section
2. Drag & drop a video file or click to browse
3. Fill in video details (title, category, description)
4. Click "Upload & Compress"
5. Wait for processing to complete

### Viewing Videos
1. Browse videos in the main grid
2. Click any video card to start playback
3. Use the built-in player controls
4. Add videos to your personal list

### Managing Videos
1. Search for videos using the search bar
2. Filter by categories in the navigation
3. Delete videos from the player modal
4. View upload history and statistics

## API Endpoints

### Video Management
- `GET /api/videos` - Get all videos
- `GET /api/videos/:id` - Get specific video
- `POST /upload` - Upload new video
- `DELETE /api/videos/:id` - Delete video
- `GET /api/search?q=query` - Search videos

### File Serving
- `GET /videos/:filename` - Stream video files
- `GET /thumbnails/:filename` - Serve thumbnail images

## Configuration

### Video Compression Settings
Default compression settings in `server.js`:
- Resolution: 1280x720 (720p)
- Video Bitrate: 1000k
- Audio Bitrate: 128k
- Codec: H.264 (libx264) + AAC

### File Limits
- Maximum file size: 500MB
- Supported formats: All video formats supported by FFmpeg
- Output format: MP4 (H.264)

## Project Structure

```
streamhub-video-platform/
├── public/
│   ├── index.html      # Main HTML file
│   ├── style.css       # Styling
│   └── script.js       # Frontend JavaScript
├── videos/             # Compressed video files
├── thumbnails/         # Generated thumbnails
├── uploads/            # Temporary upload directory
├── server.js           # Main server file
├── package.json        # Dependencies
└── README.md          # This file
```

## Features in Detail

### Video Compression
- **Quality Optimization**: Videos are compressed to 720p for optimal streaming
- **Size Reduction**: Significant file size reduction while maintaining quality
- **Format Standardization**: All videos converted to MP4 format
- **Thumbnail Generation**: Automatic thumbnail creation at 10% of video duration

### User Experience
- **Responsive Design**: Works seamlessly across all device sizes
- **Loading States**: Clear feedback during upload and processing
- **Error Handling**: User-friendly error messages and validation
- **Progress Tracking**: Visual feedback for long-running operations

### Performance
- **Efficient Streaming**: Optimized video delivery
- **Lazy Loading**: Videos load only when needed
- **Memory Management**: Automatic cleanup of temporary files
- **Concurrent Processing**: Multiple uploads can be processed simultaneously

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

If you encounter any issues:
1. Check that FFmpeg is properly installed
2. Ensure all dependencies are installed
3. Verify file permissions for upload directories
4. Check server logs for detailed error messages

## Troubleshooting

### FFmpeg Not Found
- Verify FFmpeg is installed and in PATH
- Test: `ffmpeg -version` in terminal

### Upload Fails
- Check file size limits (500MB default)
- Verify upload directory permissions
- Ensure sufficient disk space

### Videos Don't Play
- Check video file exists in `/videos` directory
- Verify browser video format support
- Check console for JavaScript errors

## Future Enhancements

- [ ] User authentication system
- [ ] Video sharing capabilities
- [ ] Playlist management
- [ ] Advanced search filters
- [ ] Video analytics dashboard
- [ ] Mobile app development
- [ ] Cloud storage integration
- [ ] Live streaming support