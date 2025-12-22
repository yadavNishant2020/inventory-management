<?php
/**
 * Local Development Configuration
 * 
 * Copy this to config.php for local testing
 */

// Database Configuration (Local MySQL)
putenv('DB_HOST=localhost');
putenv('DB_PORT=3306');
putenv('DB_USER=root');
putenv('DB_PASSWORD=');  // Your local MySQL password
putenv('DB_NAME=inventory_db');

// JWT Secret
putenv('JWT_SECRET=local-dev-secret-key-2025');

// CORS Origin
putenv('CORS_ORIGIN=*');

// Auto-initialize tables
define('AUTO_INIT_TABLES', true);

if (AUTO_INIT_TABLES) {
    require_once __DIR__ . '/api/config/database.php';
    try {
        $db = new Database();
        $db->initTables();
    } catch (Exception $e) {
        error_log("Table init: " . $e->getMessage());
    }
}



