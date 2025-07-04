const fs = require('fs-extra');
const path = require('path');
const ffmpeg = require('fluent-ffmpeg');
const sharp = require('sharp');
const { v4: uuidv4 } = require('uuid');
const db = require('../config/database');

class MediaService {
  constructor() {
    this.storageConfig = {
      media: process.env.MEDIA_STORAGE_PATH || './storage/media',
      thumbnails: process.env.THUMBNAIL_STORAGE_PATH || './storage/thumbnails',
      temp: process.env.TEMP_STORAGE_PATH || './storage/temp'
    };
    this.initializeStorage();
  }

  async initializeStorage() {
    for (const [key, dir] of Object.entries(this.storageConfig)) {
      await fs.ensureDir(dir);
    }
  }

  // Extract metadata from media file
  async extractMetadata(filePath) {
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(filePath, (err, metadata) => {
        if (err) {
          reject(err);
        } else {
          const videoStream = metadata.streams.find(s => s.codec_type === 'video');
          const audioStream = metadata.streams.find(s => s.codec_type === 'audio');
          
          resolve({
            duration: metadata.format.duration,
            size: metadata.format.size,
            bitrate: metadata.format.bit_rate,
            format: metadata.format.format_name,
            resolution: videoStream ? `${videoStream.width}x${videoStream.height}` : null,
            videoCodec: videoStream ? videoStream.codec_name : null,
            audioCodec: audioStream ? audioStream.codec_name : null,
            frameRate: videoStream ? videoStream.r_frame_rate : null
          });
        }
      });
    });
  }

  // Generate video thumbnail
  async generateThumbnail(inputPath, outputPath, timestamp = '10%') {
    return new Promise((resolve, reject) => {
      ffmpeg(inputPath)
        .screenshots({
          timestamps: [timestamp],
          filename: path.basename(outputPath),
          folder: path.dirname(outputPath),
          size: '400x225'
        })
        .on('end', () => resolve(outputPath))
        .on('error', reject);
    });
  }

  // Transcode video for optimal streaming
  async transcodeVideo(inputPath, outputPath, options = {}) {
    const defaultOptions = {
      videoCodec: 'libx264',
      audioCodec: 'aac',
      videoBitrate: process.env.DEFAULT_VIDEO_BITRATE || '2000k',
      audioBitrate: process.env.DEFAULT_AUDIO_BITRATE || '192k',
      resolution: process.env.DEFAULT_RESOLUTION || '1920x1080',
      preset: 'fast',
      format: 'mp4'
    };

    const transcodeOptions = { ...defaultOptions, ...options };

    return new Promise((resolve, reject) => {
      let command = ffmpeg(inputPath)
        .output(outputPath)
        .videoCodec(transcodeOptions.videoCodec)
        .audioCodec(transcodeOptions.audioCodec)
        .videoBitrate(transcodeOptions.videoBitrate)
        .audioBitrate(transcodeOptions.audioBitrate)
        .preset(transcodeOptions.preset)
        .format(transcodeOptions.format);

      if (transcodeOptions.resolution) {
        command = command.size(transcodeOptions.resolution);
      }

      command
        .on('start', (cmdline) => {
          console.log('Transcoding started:', cmdline);
        })
        .on('progress', (progress) => {
          console.log(`Transcoding progress: ${progress.percent}%`);
        })
        .on('end', () => {
          console.log('Transcoding completed');
          resolve(outputPath);
        })
        .on('error', (err) => {
          console.error('Transcoding error:', err);
          reject(err);
        })
        .run();
    });
  }

  // Process uploaded media file
  async processMediaFile(filePath, metadata) {
    try {
      const mediaId = uuidv4();
      const fileExtension = path.extname(filePath);
      const fileName = `${mediaId}.mp4`;
      const thumbnailName = `${mediaId}.jpg`;
      
      const processedVideoPath = path.join(this.storageConfig.media, fileName);
      const thumbnailPath = path.join(this.storageConfig.thumbnails, thumbnailName);

      // Extract file metadata
      const fileMetadata = await this.extractMetadata(filePath);
      
      // Update transcoding status
      await db.run(
        'UPDATE media_files SET transcoding_status = ? WHERE id = ?',
        ['processing', mediaId]
      );

      // Transcode video if needed
      if (fileExtension.toLowerCase() !== '.mp4' || this.needsTranscoding(fileMetadata)) {
        await this.transcodeVideo(filePath, processedVideoPath);
      } else {
        await fs.copy(filePath, processedVideoPath);
      }

      // Generate thumbnail
      await this.generateThumbnail(processedVideoPath, thumbnailPath);

      // Get final file stats
      const stats = await fs.stat(processedVideoPath);
      const finalMetadata = await this.extractMetadata(processedVideoPath);

      // Save to database
      const mediaData = {
        id: mediaId,
        title: metadata.title || path.basename(filePath, fileExtension),
        description: metadata.description || '',
        file_path: processedVideoPath,
        thumbnail_path: thumbnailPath,
        file_size: stats.size,
        duration: Math.round(finalMetadata.duration),
        resolution: finalMetadata.resolution,
        bitrate: finalMetadata.bitrate,
        codec: finalMetadata.videoCodec,
        format: finalMetadata.format,
        category: metadata.category || 'General',
        tags: JSON.stringify(metadata.tags || []),
        metadata: JSON.stringify(finalMetadata),
        transcoding_status: 'completed',
        user_id: metadata.userId || 1
      };

      await db.run(
        `INSERT INTO media_files (
          id, title, description, file_path, thumbnail_path, file_size,
          duration, resolution, bitrate, codec, format, category, tags,
          metadata, transcoding_status, user_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        Object.values(mediaData)
      );

      // Clean up temporary file
      await fs.remove(filePath);

      return mediaData;
    } catch (error) {
      console.error('Media processing error:', error);
      throw error;
    }
  }

  // Check if file needs transcoding
  needsTranscoding(metadata) {
    const maxBitrate = parseInt(process.env.DEFAULT_VIDEO_BITRATE) * 1000;
    return metadata.bitrate > maxBitrate || 
           metadata.videoCodec !== 'h264' ||
           !metadata.resolution.includes('1920x1080');
  }

  // Get all media files
  async getAllMedia(filters = {}) {
    let sql = 'SELECT * FROM media_files WHERE transcoding_status = "completed"';
    const params = [];

    if (filters.category) {
      sql += ' AND category = ?';
      params.push(filters.category);
    }

    if (filters.search) {
      sql += ' AND (title LIKE ? OR description LIKE ?)';
      params.push(`%${filters.search}%`, `%${filters.search}%`);
    }

    sql += ' ORDER BY upload_date DESC';

    if (filters.limit) {
      sql += ' LIMIT ?';
      params.push(filters.limit);
    }

    return await db.all(sql, params);
  }

  // Get media by ID
  async getMediaById(id) {
    return await db.get('SELECT * FROM media_files WHERE id = ?', [id]);
  }

  // Delete media file
  async deleteMedia(id) {
    const media = await this.getMediaById(id);
    if (!media) {
      throw new Error('Media not found');
    }

    // Delete files
    await fs.remove(media.file_path);
    await fs.remove(media.thumbnail_path);

    // Delete from database
    await db.run('DELETE FROM media_files WHERE id = ?', [id]);
    await db.run('DELETE FROM watch_history WHERE media_id = ?', [id]);

    return true;
  }

  // Update watch progress
  async updateWatchProgress(mediaId, userId, position, completed = false) {
    const existing = await db.get(
      'SELECT * FROM watch_history WHERE media_id = ? AND user_id = ?',
      [mediaId, userId]
    );

    if (existing) {
      await db.run(
        'UPDATE watch_history SET position = ?, completed = ?, watched_at = CURRENT_TIMESTAMP WHERE media_id = ? AND user_id = ?',
        [position, completed, mediaId, userId]
      );
    } else {
      await db.run(
        'INSERT INTO watch_history (media_id, user_id, position, completed) VALUES (?, ?, ?, ?)',
        [mediaId, userId, position, completed]
      );
    }
  }

  // Get watch history
  async getWatchHistory(userId) {
    return await db.all(`
      SELECT wh.*, mf.title, mf.thumbnail_path, mf.duration
      FROM watch_history wh
      JOIN media_files mf ON wh.media_id = mf.id
      WHERE wh.user_id = ?
      ORDER BY wh.watched_at DESC
    `, [userId]);
  }
}

module.exports = new MediaService();