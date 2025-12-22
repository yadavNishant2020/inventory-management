<?php
/**
 * Environment Configuration for Hostinger
 * Production Ready - Credentials configured
 */

// Database Configuration
putenv('DB_HOST=localhost');
putenv('DB_PORT=3306');
putenv('DB_USER=u746913984_inventory_user');
putenv('DB_PASSWORD=InventoryUser@123');
putenv('DB_NAME=u746913984_inventory_db');

// JWT Secret
putenv('JWT_SECRET=inv-mgmt-2025-hostinger-prod-jwt-secret-key-v1');

// CORS Origin
putenv('CORS_ORIGIN=https://lightyellow-penguin-628956.hostingersite.com');

// Initialize database tables on first run
// Set to false after initial setup
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

