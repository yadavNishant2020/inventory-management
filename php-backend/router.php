<?php
/**
 * Development Router for PHP Built-in Server
 * 
 * Usage: php -S localhost:8000 router.php
 * 
 * This simulates .htaccess URL rewriting for local development
 */

$requestUri = $_SERVER['REQUEST_URI'];
$path = parse_url($requestUri, PHP_URL_PATH);

// Serve static files directly
$staticFile = __DIR__ . $path;
if ($path !== '/' && file_exists($staticFile) && !is_dir($staticFile)) {
    // Set appropriate content type
    $ext = pathinfo($staticFile, PATHINFO_EXTENSION);
    $mimeTypes = [
        'html' => 'text/html',
        'css' => 'text/css',
        'js' => 'application/javascript',
        'json' => 'application/json',
        'png' => 'image/png',
        'jpg' => 'image/jpeg',
        'jpeg' => 'image/jpeg',
        'gif' => 'image/gif',
        'svg' => 'image/svg+xml',
        'woff' => 'font/woff',
        'woff2' => 'font/woff2',
    ];
    
    if (isset($mimeTypes[$ext])) {
        header('Content-Type: ' . $mimeTypes[$ext]);
    }
    
    return false; // Let PHP serve the file
}

// Route API requests
if (preg_match('#^/api#', $path)) {
    require __DIR__ . '/api/index.php';
    return true;
}

// Serve index.html for SPA routes
require __DIR__ . '/index.html';
return true;



