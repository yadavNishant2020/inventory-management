<?php
/**
 * API Router
 * Inventory Management System
 * 
 * All API requests are routed through this file
 */

// Load environment config (Hostinger specific)
if (file_exists(__DIR__ . '/../config.php')) {
    require_once __DIR__ . '/../config.php';
}

// Load configuration
require_once __DIR__ . '/config/config.php';
require_once __DIR__ . '/config/database.php';

// Handle CORS preflight
handlePreflight();
setCorsHeaders();

// Load route handlers
require_once __DIR__ . '/routes/auth.php';
require_once __DIR__ . '/routes/items.php';
require_once __DIR__ . '/routes/entries.php';

// Get request method and path
$method = $_SERVER['REQUEST_METHOD'];
$requestUri = $_SERVER['REQUEST_URI'];

// Parse the path (remove query string and /api prefix)
$path = parse_url($requestUri, PHP_URL_PATH);
$path = preg_replace('#^/api#', '', $path); // Remove /api prefix
$path = rtrim($path, '/'); // Remove trailing slash

// Simple router
try {
    // Health check
    if ($path === '/health' && $method === 'GET') {
        jsonResponse(['status' => 'ok', 'message' => 'Inventory API is running']);
    }

    // Auth routes
    if (preg_match('#^/auth#', $path)) {
        $auth = new AuthRoutes();
        
        if ($path === '/auth/login' && $method === 'POST') {
            $auth->login();
        }
        elseif ($path === '/auth/verify' && $method === 'GET') {
            $auth->verify();
        }
        elseif ($path === '/auth/change-password' && $method === 'POST') {
            $auth->changePassword();
        }
        elseif ($path === '/auth/users' && $method === 'GET') {
            $auth->getUsers();
        }
        elseif ($path === '/auth/users' && $method === 'POST') {
            $auth->createUser();
        }
        elseif (preg_match('#^/auth/users/(\d+)/reset-password$#', $path, $matches) && $method === 'PUT') {
            $auth->resetUserPassword($matches[1]);
        }
        elseif (preg_match('#^/auth/users/(\d+)$#', $path, $matches) && $method === 'DELETE') {
            $auth->deleteUser($matches[1]);
        }
        else {
            errorResponse('Auth endpoint not found', 404);
        }
    }

    // Items routes
    elseif (preg_match('#^/items#', $path)) {
        $items = new ItemsRoutes();
        
        if ($path === '/items' && $method === 'GET') {
            $items->getAll();
        }
        elseif ($path === '/items/stats' && $method === 'GET') {
            $items->getStats();
        }
        elseif ($path === '/items' && $method === 'POST') {
            $items->create();
        }
        elseif (preg_match('#^/items/(\d+)$#', $path, $matches) && $method === 'DELETE') {
            $items->delete($matches[1]);
        }
        else {
            errorResponse('Items endpoint not found', 404);
        }
    }

    // Entries routes
    elseif (preg_match('#^/entries#', $path)) {
        $entries = new EntriesRoutes();
        
        if ($path === '/entries' && $method === 'GET') {
            $entries->getAll();
        }
        elseif ($path === '/entries/today' && $method === 'GET') {
            $entries->getToday();
        }
        elseif ($path === '/entries' && $method === 'POST') {
            $entries->create();
        }
        elseif ($path === '/entries/trucks' && $method === 'GET') {
            $entries->getTrucks();
        }
        elseif (preg_match('#^/entries/trucks/(\d+)$#', $path, $matches) && $method === 'GET') {
            $entries->getTruckDetails($matches[1]);
        }
        elseif ($path === '/entries/truck' && $method === 'POST') {
            $entries->createTruckTransaction();
        }
        elseif ($path === '/entries/cleanup' && $method === 'DELETE') {
            $entries->cleanup();
        }
        else {
            errorResponse('Entries endpoint not found', 404);
        }
    }

    // Not found
    else {
        errorResponse('API endpoint not found', 404);
    }

} catch (Exception $e) {
    error_log("API Error: " . $e->getMessage());
    errorResponse('Internal server error: ' . $e->getMessage(), 500);
}

