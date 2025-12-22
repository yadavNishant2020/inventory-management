<?php
/**
 * Authentication Middleware
 * Inventory Management System
 */

require_once __DIR__ . '/../utils/jwt.php';

/**
 * Require authentication for the request
 * Returns user data if authenticated, exits with 401 if not
 */
function requireAuth() {
    try {
        $user = JWT::verifyFromHeader();
        return $user;
    } catch (Exception $e) {
        errorResponse('Authentication required: ' . $e->getMessage(), 401);
    }
}

/**
 * Require admin role
 * Returns user data if admin, exits with 403 if not
 */
function requireAdmin() {
    $user = requireAuth();
    
    if ($user['role'] !== 'admin') {
        errorResponse('Admin access required', 403);
    }
    
    return $user;
}

/**
 * Optional authentication - returns user if token present, null otherwise
 */
function optionalAuth() {
    try {
        return JWT::verifyFromHeader();
    } catch (Exception $e) {
        return null;
    }
}



