<?php
/**
 * Items Routes
 * /api/items/*
 */

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../config/config.php';
require_once __DIR__ . '/../middleware/auth.php';

class ItemsRoutes {
    private $db;
    private $conn;

    public function __construct() {
        $this->db = new Database();
        $this->conn = $this->db->getConnection();
    }

    /**
     * GET /api/items - List all items with quantities
     */
    public function getAll() {
        requireAuth();

        try {
            $stmt = $this->conn->query("
                SELECT id, name, variety, quantity, created_at 
                FROM items 
                ORDER BY name ASC, variety ASC
            ");
            $items = $stmt->fetchAll();

            // Convert numeric strings to integers
            $items = array_map(function($item) {
                $item['id'] = (int)$item['id'];
                $item['quantity'] = (int)$item['quantity'];
                return $item;
            }, $items);

            jsonResponse($items);
        } catch (Exception $e) {
            error_log("Get items error: " . $e->getMessage());
            errorResponse('Failed to fetch items', 500);
        }
    }

    /**
     * GET /api/items/stats - Get dashboard statistics
     */
    public function getStats() {
        requireAuth();

        try {
            // Total stock
            $stmt = $this->conn->query("SELECT COALESCE(SUM(quantity), 0) as totalStock FROM items");
            $stockResult = $stmt->fetch();

            // Item count
            $stmt = $this->conn->query("SELECT COUNT(*) as itemCount FROM items");
            $countResult = $stmt->fetch();

            // Today's entries
            $stmt = $this->conn->query("
                SELECT COALESCE(SUM(quantity), 0) as todayEntries 
                FROM entries 
                WHERE DATE(created_at) = CURDATE()
            ");
            $entriesResult = $stmt->fetch();

            jsonResponse([
                'totalStock' => (int)$stockResult['totalStock'],
                'itemCount' => (int)$countResult['itemCount'],
                'todayEntries' => (int)$entriesResult['todayEntries']
            ]);
        } catch (Exception $e) {
            error_log("Get stats error: " . $e->getMessage());
            errorResponse('Failed to fetch statistics', 500);
        }
    }

    /**
     * POST /api/items - Create new item
     */
    public function create() {
        requireAuth();
        $data = getJsonBody();

        $name = trim($data['name'] ?? '');
        $variety = trim($data['variety'] ?? '');
        $quantity = isset($data['quantity']) ? (int)$data['quantity'] : 0;

        if (empty($name) || empty($variety)) {
            errorResponse('Name and variety are required', 400);
        }

        try {
            // Check if item exists
            $stmt = $this->conn->prepare("SELECT id, quantity FROM items WHERE name = ? AND variety = ?");
            $stmt->execute([$name, $variety]);
            $existing = $stmt->fetch();

            if ($existing) {
                errorResponse('Duplicate entry: This item already exists', 400);
            }

            // Create new item
            $stmt = $this->conn->prepare("INSERT INTO items (name, variety, quantity) VALUES (?, ?, ?)");
            $stmt->execute([$name, $variety, $quantity]);

            $itemId = $this->conn->lastInsertId();

            $stmt = $this->conn->prepare("SELECT * FROM items WHERE id = ?");
            $stmt->execute([$itemId]);
            $newItem = $stmt->fetch();
            $newItem['id'] = (int)$newItem['id'];
            $newItem['quantity'] = (int)$newItem['quantity'];

            jsonResponse(['message' => 'Item created', 'item' => $newItem], 201);
        } catch (PDOException $e) {
            if ($e->getCode() == 23000) { // Duplicate entry
                errorResponse('Duplicate entry: This item already exists', 400);
            }
            error_log("Create item error: " . $e->getMessage());
            errorResponse('Failed to create item', 500);
        }
    }

    /**
     * DELETE /api/items/{id} - Remove item (preserves history)
     */
    public function delete($id) {
        requireAuth();

        try {
            $stmt = $this->conn->prepare("SELECT * FROM items WHERE id = ?");
            $stmt->execute([$id]);
            $existing = $stmt->fetch();

            if (!$existing) {
                errorResponse('Item not found', 404);
            }

            // Check if item has transaction history
            $stmt = $this->conn->prepare("SELECT COUNT(*) as count FROM entries WHERE item_id = ?");
            $stmt->execute([$id]);
            $entriesCount = $stmt->fetch();
            $hasHistory = (int)$entriesCount['count'] > 0;

            // Delete the item (entries will have item_id set to NULL but keep name/variety for history)
            $stmt = $this->conn->prepare("DELETE FROM items WHERE id = ?");
            $stmt->execute([$id]);

            $message = $hasHistory 
                ? "Item deleted. Historical transactions preserved ({$entriesCount['count']} entries)"
                : 'Item deleted';

            $existing['id'] = (int)$existing['id'];
            $existing['quantity'] = (int)$existing['quantity'];

            jsonResponse([
                'message' => $message,
                'item' => $existing,
                'historyPreserved' => $hasHistory,
                'entriesCount' => (int)$entriesCount['count']
            ]);
        } catch (Exception $e) {
            error_log("Delete item error: " . $e->getMessage());
            errorResponse('Failed to delete item', 500);
        }
    }
}



