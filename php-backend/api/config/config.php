<?php
/**
 * Application Configuration
 * Inventory Management System
 */

// Error reporting (disable in production)
error_reporting(E_ALL);
ini_set('display_errors', 0);
ini_set('log_errors', 1);

// Timezone
date_default_timezone_set('Asia/Kolkata');

// JWT Configuration
define('JWT_SECRET', getenv('JWT_SECRET') ?: 'inv-mgmt-2025-super-secure-jwt-key');
define('JWT_EXPIRY', 86400 * 7); // 7 days in seconds

// CORS Configuration
define('CORS_ORIGIN', getenv('CORS_ORIGIN') ?: '*');

// API Response Headers
function setCorsHeaders() {
    $origin = CORS_ORIGIN;
    
    if ($origin === '*') {
        header("Access-Control-Allow-Origin: *");
    } else {
        $requestOrigin = $_SERVER['HTTP_ORIGIN'] ?? '';
        if ($requestOrigin === $origin) {
            header("Access-Control-Allow-Origin: $origin");
        }
    }
    
    header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
    header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
    header("Access-Control-Allow-Credentials: true");
    header("Content-Type: application/json; charset=UTF-8");
}

// Handle preflight requests
function handlePreflight() {
    if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
        setCorsHeaders();
        http_response_code(200);
        exit();
    }
}

// JSON Response helper
function jsonResponse($data, $statusCode = 200) {
    http_response_code($statusCode);
    echo json_encode($data);
    exit();
}

// Error Response helper
function errorResponse($message, $statusCode = 400) {
    jsonResponse(['error' => $message], $statusCode);
}

// Get JSON body
function getJsonBody() {
    $json = file_get_contents('php://input');
    return json_decode($json, true) ?? [];
}

// Get query params
function getQueryParams() {
    return $_GET ?? [];
}



