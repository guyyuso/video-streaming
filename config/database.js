const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs-extra');

class Database {
  constructor() {
    this.dbPath = process.env.DB_PATH || './database/media.db';
    this.init();
  }

  async init() {
    // Ensure database directory exists
    await fs.ensureDir(path.dirname(this.dbPath));
    
    this.db = new sqlite3.Database(this.dbPath, (err) => {
      if (err) {
        console.error('Error opening database:', err);
      } else {
        console.log('Connected to SQLite database');
        this.createTables();
      }
    });
  }

  createTables() {
    const tables = [
      // Users table
      `CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        role TEXT DEFAULT 'user',
        preferences TEXT DEFAULT '{}',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        last_login DATETIME
      )`,

      // Media files table
      `CREATE TABLE IF NOT EXISTS media_files (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT,
        file_path TEXT NOT NULL,
        thumbnail_path TEXT,
        file_size INTEGER,
        duration INTEGER,
        resolution TEXT,
        bitrate INTEGER,
        codec TEXT,
        format TEXT,
        category TEXT,
        tags TEXT DEFAULT '[]',
        metadata TEXT DEFAULT '{}',
        upload_date DATETIME DEFAULT CURRENT_TIMESTAMP,
        transcoding_status TEXT DEFAULT 'pending',
        user_id INTEGER,
        FOREIGN KEY (user_id) REFERENCES users (id)
      )`,

      // Playlists table
      `CREATE TABLE IF NOT EXISTS playlists (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        media_ids TEXT DEFAULT '[]',
        user_id INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id)
      )`,

      // Watch history table
      `CREATE TABLE IF NOT EXISTS watch_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        media_id TEXT,
        user_id INTEGER,
        position INTEGER DEFAULT 0,
        completed BOOLEAN DEFAULT FALSE,
        watched_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (media_id) REFERENCES media_files (id),
        FOREIGN KEY (user_id) REFERENCES users (id)
      )`,

      // Analytics table
      `CREATE TABLE IF NOT EXISTS analytics (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        event_type TEXT NOT NULL,
        media_id TEXT,
        user_id INTEGER,
        session_id TEXT,
        data TEXT DEFAULT '{}',
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,

      // System configuration table
      `CREATE TABLE IF NOT EXISTS system_config (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`
    ];

    tables.forEach(tableSQL => {
      this.db.run(tableSQL, (err) => {
        if (err) {
          console.error('Error creating table:', err);
        }
      });
    });

    // Create indexes
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_media_category ON media_files(category)',
      'CREATE INDEX IF NOT EXISTS idx_media_upload_date ON media_files(upload_date)',
      'CREATE INDEX IF NOT EXISTS idx_watch_history_user ON watch_history(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_analytics_timestamp ON analytics(timestamp)'
    ];

    indexes.forEach(indexSQL => {
      this.db.run(indexSQL);
    });
  }

  // Generic query methods
  get(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.get(sql, params, (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  }

  all(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }

  run(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.run(sql, params, function(err) {
        if (err) reject(err);
        else resolve({ id: this.lastID, changes: this.changes });
      });
    });
  }

  close() {
    return new Promise((resolve) => {
      this.db.close((err) => {
        if (err) console.error('Error closing database:', err);
        else console.log('Database connection closed');
        resolve();
      });
    });
  }
}

module.exports = new Database();