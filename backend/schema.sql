-- Database creation is handled dynamically in db.js

-- Users Table
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  avatar LONGTEXT,
  username VARCHAR(100) UNIQUE,
  bio VARCHAR(160) DEFAULT '',
  phone VARCHAR(20) DEFAULT '',
  dob DATE DEFAULT NULL,
  homecity VARCHAR(255) DEFAULT '',
  website VARCHAR(255) DEFAULT '',
  settings_language VARCHAR(50) DEFAULT 'English',
  settings_currency VARCHAR(50) DEFAULT 'INR',
  settings_dateformat VARCHAR(50) DEFAULT 'DD/MM/YYYY',
  settings_timeformat VARCHAR(50) DEFAULT '12 hour',
  settings_units VARCHAR(50) DEFAULT 'Metric',
  notif_email BOOLEAN DEFAULT TRUE,
  notif_reminders BOOLEAN DEFAULT TRUE,
  notif_recommendations BOOLEAN DEFAULT FALSE,
  notif_budget BOOLEAN DEFAULT TRUE,
  priv_public BOOLEAN DEFAULT TRUE,
  priv_search BOOLEAN DEFAULT TRUE,
  priv_stats BOOLEAN DEFAULT TRUE,
  two_factor_enabled BOOLEAN DEFAULT FALSE,
  role VARCHAR(50) DEFAULT 'traveler',
  status VARCHAR(50) DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Trips Table
CREATE TABLE IF NOT EXISTS trips (
  id VARCHAR(100) PRIMARY KEY,
  user_id INT NOT NULL,
  name VARCHAR(255) NOT NULL,
  destination VARCHAR(255) NOT NULL,
  startDate DATE NOT NULL,
  endDate DATE NOT NULL,
  travelers INT DEFAULT 1,
  budget DECIMAL(12, 2) DEFAULT 0.00,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Itineraries Table (Stops)
CREATE TABLE IF NOT EXISTS itineraries (
  id INT AUTO_INCREMENT PRIMARY KEY,
  trip_id VARCHAR(100) NOT NULL,
  city VARCHAR(255) NOT NULL,
  date DATE NOT NULL,
  activity VARCHAR(255) NOT NULL,
  category VARCHAR(50) NOT NULL,
  cost DECIMAL(12, 2) DEFAULT 0.00,
  duration VARCHAR(50),
  start_time VARCHAR(50) DEFAULT NULL,
  sort_order INT DEFAULT 0,
  FOREIGN KEY (trip_id) REFERENCES trips(id) ON DELETE CASCADE
);

-- Expenses Table (Budgeting)
CREATE TABLE IF NOT EXISTS expenses (
  id INT AUTO_INCREMENT PRIMARY KEY,
  trip_id VARCHAR(100) NOT NULL,
  description VARCHAR(255) NOT NULL,
  amount DECIMAL(12, 2) NOT NULL,
  category VARCHAR(50) NOT NULL,
  date DATE NOT NULL,
  status VARCHAR(50) DEFAULT 'Paid',
  FOREIGN KEY (trip_id) REFERENCES trips(id) ON DELETE CASCADE
);

-- Checklists Table (Packing List)
CREATE TABLE IF NOT EXISTS checklists (
  id INT AUTO_INCREMENT PRIMARY KEY,
  trip_id VARCHAR(100) NOT NULL,
  name VARCHAR(255) NOT NULL,
  category VARCHAR(50) NOT NULL,
  packed BOOLEAN DEFAULT FALSE,
  FOREIGN KEY (trip_id) REFERENCES trips(id) ON DELETE CASCADE
);

-- Notes Table (Travel Journal)
CREATE TABLE IF NOT EXISTS notes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  trip_id VARCHAR(100) NOT NULL,
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  timestamp BIGINT NOT NULL,
  FOREIGN KEY (trip_id) REFERENCES trips(id) ON DELETE CASCADE
);

-- User Sessions Table
CREATE TABLE IF NOT EXISTS user_sessions (
  id VARCHAR(100) PRIMARY KEY,
  user_id INT NOT NULL,
  device VARCHAR(50) NOT NULL,
  name VARCHAR(255) NOT NULL,
  location VARCHAR(255) NOT NULL,
  lastActive VARCHAR(100) NOT NULL,
  current BOOLEAN DEFAULT FALSE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Saved Cities Table (Bookmarked destinations)
CREATE TABLE IF NOT EXISTS saved_cities (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  name VARCHAR(255) NOT NULL,
  country VARCHAR(255) NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Announcements Table (Global Content)
CREATE TABLE IF NOT EXISTS announcements (
  id INT AUTO_INCREMENT PRIMARY KEY,
  message TEXT NOT NULL,
  type VARCHAR(50) DEFAULT 'info',
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Error Logs Table (System Health)
CREATE TABLE IF NOT EXISTS error_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  endpoint VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  stack_trace TEXT,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
