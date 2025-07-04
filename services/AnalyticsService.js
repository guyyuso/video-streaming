const db = require('../config/database');

class AnalyticsService {
  constructor() {
    this.enabled = process.env.ENABLE_ANALYTICS === 'true';
  }

  // Track media events
  async trackEvent(eventType, data = {}) {
    if (!this.enabled) return;

    try {
      await db.run(
        'INSERT INTO analytics (event_type, media_id, user_id, session_id, data) VALUES (?, ?, ?, ?, ?)',
        [
          eventType,
          data.mediaId || null,
          data.userId || null,
          data.sessionId || null,
          JSON.stringify(data)
        ]
      );
    } catch (error) {
      console.error('Analytics tracking error:', error);
    }
  }

  // Get playback statistics
  async getPlaybackStats(timeframe = '7 days') {
    const sql = `
      SELECT 
        DATE(timestamp) as date,
        COUNT(*) as plays,
        COUNT(DISTINCT user_id) as unique_users,
        COUNT(DISTINCT media_id) as unique_media
      FROM analytics 
      WHERE event_type = 'play' 
        AND timestamp >= datetime('now', '-${timeframe}')
      GROUP BY DATE(timestamp)
      ORDER BY date DESC
    `;

    return await db.all(sql);
  }

  // Get popular media
  async getPopularMedia(limit = 10) {
    const sql = `
      SELECT 
        mf.id,
        mf.title,
        mf.thumbnail_path,
        COUNT(a.id) as play_count,
        COUNT(DISTINCT a.user_id) as unique_viewers
      FROM media_files mf
      LEFT JOIN analytics a ON mf.id = a.media_id AND a.event_type = 'play'
      WHERE mf.transcoding_status = 'completed'
      GROUP BY mf.id
      ORDER BY play_count DESC
      LIMIT ?
    `;

    return await db.all(sql, [limit]);
  }

  // Get user engagement metrics
  async getUserEngagement(userId) {
    const totalPlays = await db.get(
      'SELECT COUNT(*) as count FROM analytics WHERE user_id = ? AND event_type = "play"',
      [userId]
    );

    const watchTime = await db.get(`
      SELECT SUM(CAST(JSON_EXTRACT(data, '$.duration') AS INTEGER)) as total_seconds
      FROM analytics 
      WHERE user_id = ? AND event_type = 'watch_complete'
    `, [userId]);

    const favoriteCategories = await db.all(`
      SELECT 
        mf.category,
        COUNT(*) as plays
      FROM analytics a
      JOIN media_files mf ON a.media_id = mf.id
      WHERE a.user_id = ? AND a.event_type = 'play'
      GROUP BY mf.category
      ORDER BY plays DESC
      LIMIT 5
    `, [userId]);

    return {
      totalPlays: totalPlays.count,
      totalWatchTime: watchTime.total_seconds || 0,
      favoriteCategories
    };
  }

  // Get system health metrics
  async getSystemHealth() {
    const totalMedia = await db.get('SELECT COUNT(*) as count FROM media_files');
    const totalUsers = await db.get('SELECT COUNT(*) as count FROM users');
    const storageUsed = await db.get('SELECT SUM(file_size) as size FROM media_files');
    
    const recentActivity = await db.get(`
      SELECT COUNT(*) as count 
      FROM analytics 
      WHERE timestamp >= datetime('now', '-24 hours')
    `);

    return {
      totalMediaFiles: totalMedia.count,
      totalUsers: totalUsers.count,
      storageUsed: storageUsed.size || 0,
      dailyActivity: recentActivity.count
    };
  }

  // Clean old analytics data
  async cleanupOldData() {
    const retentionDays = process.env.ANALYTICS_RETENTION_DAYS || 90;
    
    await db.run(
      'DELETE FROM analytics WHERE timestamp < datetime("now", "-' + retentionDays + ' days")'
    );
  }
}

module.exports = new AnalyticsService();