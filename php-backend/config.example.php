<?php
/**
 * Environment Configuration Example
 * 
 * Instructions:
 * 1. Copy this file to config.php
 * 2. Fill in your actual credentials
 * 3. Never commit config.php to version control
 */

// Database Configuration
putenv('DB_HOST=localhost');
putenv('DB_PORT=3306');
putenv('DB_USER=your_database_user');
putenv('DB_PASSWORD=your_database_password');
putenv('DB_NAME=your_database_name');

// JWT Secret
// Generate a secure random string, e.g.: openssl rand -base64 32
putenv('JWT_SECRET=generate-a-secure-random-string-here');

// CORS Origin
// Use '*' for development, or your specific domain for production
// Example: https://yourdomain.com
putenv('CORS_ORIGIN=*');

// Initialize database tables on first run
// Set to false after initial setup to avoid overhead
define('AUTO_INIT_TABLES', true);

// Auto-initialize if configured
if (AUTO_INIT_TABLES) {
    require_once __DIR__ . '/api/config/database.php';
    try {
        $db = new Database();
        $db->initTables();
    } catch (Exception $e) {
        // Log but don't fail - tables might already exist
        error_log("Table init: " . $e->getMessage());
    }
}

