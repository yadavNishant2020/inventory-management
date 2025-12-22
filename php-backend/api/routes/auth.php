<?php
/**
 * Authentication Routes
 * /api/auth/*
 */

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../config/config.php';
require_once __DIR__ . '/../middleware/auth.php';
require_once __DIR__ . '/../utils/jwt.php';

class AuthRoutes {
    private $db;
    private $conn;

    public function __construct() {
        $this->db = new Database();
        $this->conn = $this->db->getConnection();
    }

    /**
     * POST /api/auth/login
     */
    public function login() {
        $data = getJsonBody();
        
        $username = $data['username'] ?? '';
        $password = $data['password'] ?? '';

        if (empty($username) || empty($password)) {
            errorResponse('Username and password are required', 400);
        }

        try {
            $stmt = $this->conn->prepare("SELECT id, username, password, role FROM users WHERE username = ?");
            $stmt->execute([$username]);
            $user = $stmt->fetch();

            if (!$user || !password_verify($password, $user['password'])) {
                errorResponse('Invalid credentials', 401);
            }

            $token = JWT::createToken($user['id'], $user['username'], $user['role']);

            jsonResponse([
                'message' => 'Login successful',
                'token' => $token,
                'user' => [
                    'id' => $user['id'],
                    'username' => $user['username'],
                    'role' => $user['role']
                ]
            ]);
        } catch (Exception $e) {
            error_log("Login error: " . $e->getMessage());
            errorResponse('Login failed', 500);
        }
    }

    /**
     * GET /api/auth/verify
     */
    public function verify() {
        $user = requireAuth();
        
        jsonResponse([
            'valid' => true,
            'user' => [
                'id' => $user['id'],
                'username' => $user['username'],
                'role' => $user['role']
            ]
        ]);
    }

    /**
     * POST /api/auth/change-password
     */
    public function changePassword() {
        $user = requireAuth();
        $data = getJsonBody();

        $currentPassword = $data['currentPassword'] ?? '';
        $newPassword = $data['newPassword'] ?? '';

        if (empty($currentPassword) || empty($newPassword)) {
            errorResponse('Current password and new password are required', 400);
        }

        if (strlen($newPassword) < 6) {
            errorResponse('New password must be at least 6 characters', 400);
        }

        try {
            // Verify current password
            $stmt = $this->conn->prepare("SELECT password FROM users WHERE id = ?");
            $stmt->execute([$user['id']]);
            $userData = $stmt->fetch();

            if (!$userData || !password_verify($currentPassword, $userData['password'])) {
                errorResponse('Current password is incorrect', 401);
            }

            // Update password
            $hashedPassword = password_hash($newPassword, PASSWORD_BCRYPT);
            $stmt = $this->conn->prepare("UPDATE users SET password = ? WHERE id = ?");
            $stmt->execute([$hashedPassword, $user['id']]);

            jsonResponse(['message' => 'Password changed successfully']);
        } catch (Exception $e) {
            error_log("Change password error: " . $e->getMessage());
            errorResponse('Failed to change password', 500);
        }
    }

    /**
     * GET /api/auth/users - List all users (admin only)
     */
    public function getUsers() {
        requireAdmin();

        try {
            $stmt = $this->conn->query("SELECT id, username, role, created_at FROM users ORDER BY created_at DESC");
            $users = $stmt->fetchAll();

            jsonResponse($users);
        } catch (Exception $e) {
            error_log("Get users error: " . $e->getMessage());
            errorResponse('Failed to fetch users', 500);
        }
    }

    /**
     * POST /api/auth/users - Create new user (admin only)
     */
    public function createUser() {
        requireAdmin();
        $data = getJsonBody();

        $username = trim($data['username'] ?? '');
        $password = $data['password'] ?? '';
        $role = $data['role'] ?? 'user';

        if (empty($username) || empty($password)) {
            errorResponse('Username and password are required', 400);
        }

        if (strlen($password) < 6) {
            errorResponse('Password must be at least 6 characters', 400);
        }

        if (!in_array($role, ['admin', 'user'])) {
            errorResponse('Invalid role', 400);
        }

        try {
            // Check if username exists
            $stmt = $this->conn->prepare("SELECT id FROM users WHERE username = ?");
            $stmt->execute([$username]);
            if ($stmt->fetch()) {
                errorResponse('Username already exists', 400);
            }

            // Create user
            $hashedPassword = password_hash($password, PASSWORD_BCRYPT);
            $stmt = $this->conn->prepare("INSERT INTO users (username, password, role) VALUES (?, ?, ?)");
            $stmt->execute([$username, $hashedPassword, $role]);

            $userId = $this->conn->lastInsertId();

            jsonResponse([
                'message' => 'User created successfully',
                'user' => [
                    'id' => (int)$userId,
                    'username' => $username,
                    'role' => $role
                ]
            ], 201);
        } catch (Exception $e) {
            error_log("Create user error: " . $e->getMessage());
            errorResponse('Failed to create user', 500);
        }
    }

    /**
     * DELETE /api/auth/users/{id} - Delete user (admin only)
     */
    public function deleteUser($id) {
        $currentUser = requireAdmin();

        if ($currentUser['id'] == $id) {
            errorResponse('Cannot delete yourself', 400);
        }

        try {
            $stmt = $this->conn->prepare("SELECT id, username FROM users WHERE id = ?");
            $stmt->execute([$id]);
            $user = $stmt->fetch();

            if (!$user) {
                errorResponse('User not found', 404);
            }

            $stmt = $this->conn->prepare("DELETE FROM users WHERE id = ?");
            $stmt->execute([$id]);

            jsonResponse(['message' => 'User deleted successfully', 'user' => $user]);
        } catch (Exception $e) {
            error_log("Delete user error: " . $e->getMessage());
            errorResponse('Failed to delete user', 500);
        }
    }

    /**
     * PUT /api/auth/users/{id}/reset-password - Reset user password (admin only)
     */
    public function resetUserPassword($id) {
        requireAdmin();
        $data = getJsonBody();

        $newPassword = $data['newPassword'] ?? '';

        if (empty($newPassword) || strlen($newPassword) < 6) {
            errorResponse('Password must be at least 6 characters', 400);
        }

        try {
            $stmt = $this->conn->prepare("SELECT id FROM users WHERE id = ?");
            $stmt->execute([$id]);
            if (!$stmt->fetch()) {
                errorResponse('User not found', 404);
            }

            $hashedPassword = password_hash($newPassword, PASSWORD_BCRYPT);
            $stmt = $this->conn->prepare("UPDATE users SET password = ? WHERE id = ?");
            $stmt->execute([$hashedPassword, $id]);

            jsonResponse(['message' => 'Password reset successfully']);
        } catch (Exception $e) {
            error_log("Reset password error: " . $e->getMessage());
            errorResponse('Failed to reset password', 500);
        }
    }
}



