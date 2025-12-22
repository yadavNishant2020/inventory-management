<?php
/**
 * Entries Routes
 * /api/entries/*
 */

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../config/config.php';
require_once __DIR__ . '/../middleware/auth.php';

class EntriesRoutes {
    private $db;
    private $conn;

    public function __construct() {
        $this->db = new Database();
        $this->conn = $this->db->getConnection();
    }

    /**
     * GET /api/entries - Get all entries
     */
    public function getAll() {
        requireAuth();
        $params = getQueryParams();
        
        $type = $params['type'] ?? null;
        $limit = isset($params['limit']) ? (int)$params['limit'] : 50;

        try {
            $query = "
                SELECT 
                    e.id,
                    e.item_id,
                    e.item_name,
                    e.item_variety,
                    e.truck_transaction_id,
                    e.type,
                    e.quantity,
                    e.remark,
                    e.created_at
                FROM entries e
            ";

            $queryParams = [];

            if ($type) {
                $query .= " WHERE e.type = ?";
                $queryParams[] = $type;
            }

            $query .= " ORDER BY e.created_at DESC LIMIT " . $limit;

            $stmt = $this->conn->prepare($query);
            $stmt->execute($queryParams);
            $entries = $stmt->fetchAll();

            // Convert types
            $entries = array_map(function($entry) {
                $entry['id'] = (int)$entry['id'];
                $entry['item_id'] = $entry['item_id'] ? (int)$entry['item_id'] : null;
                $entry['truck_transaction_id'] = $entry['truck_transaction_id'] ? (int)$entry['truck_transaction_id'] : null;
                $entry['quantity'] = (int)$entry['quantity'];
                return $entry;
            }, $entries);

            jsonResponse($entries);
        } catch (Exception $e) {
            error_log("Get entries error: " . $e->getMessage());
            errorResponse('Failed to fetch entries', 500);
        }
    }

    /**
     * GET /api/entries/today - Get today's entries
     */
    public function getToday() {
        requireAuth();
        $params = getQueryParams();
        $type = $params['type'] ?? null;

        try {
            $query = "
                SELECT 
                    e.id,
                    e.item_id,
                    e.item_name,
                    e.item_variety,
                    e.type,
                    e.quantity,
                    e.remark,
                    e.created_at
                FROM entries e
                WHERE DATE(e.created_at) = CURDATE()
            ";

            $queryParams = [];

            if ($type) {
                $query .= " AND e.type = ?";
                $queryParams[] = $type;
            }

            $query .= " ORDER BY e.created_at DESC";

            $stmt = $this->conn->prepare($query);
            $stmt->execute($queryParams);
            $entries = $stmt->fetchAll();

            // Convert types
            $entries = array_map(function($entry) {
                $entry['id'] = (int)$entry['id'];
                $entry['item_id'] = $entry['item_id'] ? (int)$entry['item_id'] : null;
                $entry['quantity'] = (int)$entry['quantity'];
                return $entry;
            }, $entries);

            jsonResponse($entries);
        } catch (Exception $e) {
            error_log("Get today entries error: " . $e->getMessage());
            errorResponse('Failed to fetch today entries', 500);
        }
    }

    /**
     * POST /api/entries - Create single entry
     */
    public function create() {
        requireAuth();
        $data = getJsonBody();

        $itemId = $data['item_id'] ?? null;
        $type = $data['type'] ?? '';
        $quantity = isset($data['quantity']) ? (int)$data['quantity'] : 0;
        $remark = $data['remark'] ?? null;

        if (!$itemId || !$type || $quantity <= 0) {
            errorResponse('Item ID, type, and quantity are required', 400);
        }

        if (!in_array($type, ['IN', 'OUT'])) {
            errorResponse('Type must be IN or OUT', 400);
        }

        try {
            // Get item details
            $stmt = $this->conn->prepare("SELECT id, name, variety, quantity FROM items WHERE id = ?");
            $stmt->execute([$itemId]);
            $item = $stmt->fetch();

            if (!$item) {
                errorResponse('Item not found', 404);
            }

            // Check stock for OUT
            if ($type === 'OUT' && $item['quantity'] < $quantity) {
                errorResponse("Insufficient stock. Available: {$item['quantity']}", 400);
            }

            $this->conn->beginTransaction();

            // Create entry
            $stmt = $this->conn->prepare("
                INSERT INTO entries (item_id, item_name, item_variety, type, quantity, remark) 
                VALUES (?, ?, ?, ?, ?, ?)
            ");
            $stmt->execute([$itemId, $item['name'], $item['variety'], $type, $quantity, $remark]);
            $entryId = $this->conn->lastInsertId();

            // Update item quantity
            $newQuantity = $type === 'IN' 
                ? $item['quantity'] + $quantity 
                : $item['quantity'] - $quantity;

            $stmt = $this->conn->prepare("UPDATE items SET quantity = ? WHERE id = ?");
            $stmt->execute([$newQuantity, $itemId]);

            $this->conn->commit();

            jsonResponse([
                'message' => 'Entry created',
                'entry' => [
                    'id' => (int)$entryId,
                    'item_id' => (int)$itemId,
                    'item_name' => $item['name'],
                    'item_variety' => $item['variety'],
                    'type' => $type,
                    'quantity' => $quantity
                ],
                'newStock' => $newQuantity
            ], 201);
        } catch (Exception $e) {
            $this->conn->rollBack();
            error_log("Create entry error: " . $e->getMessage());
            errorResponse('Failed to create entry', 500);
        }
    }

    /**
     * GET /api/entries/trucks - Get truck-level transactions
     */
    public function getTrucks() {
        requireAuth();
        $params = getQueryParams();
        
        $type = $params['type'] ?? null;
        $limit = isset($params['limit']) ? (int)$params['limit'] : 50;

        try {
            $query = "
                SELECT 
                    t.id,
                    t.type,
                    t.remark,
                    t.transaction_date,
                    t.created_at,
                    COALESCE(COUNT(e.id), 0) as item_count,
                    COALESCE(SUM(e.quantity), 0) as total_quantity
                FROM truck_transactions t
                LEFT JOIN entries e ON t.id = e.truck_transaction_id
            ";

            $queryParams = [];

            if ($type) {
                $query .= " WHERE t.type = ?";
                $queryParams[] = $type;
            }

            $query .= " GROUP BY t.id, t.type, t.remark, t.transaction_date, t.created_at";
            $query .= " ORDER BY t.transaction_date DESC";
            $query .= " LIMIT " . $limit;

            $stmt = $this->conn->prepare($query);
            $stmt->execute($queryParams);
            $trucks = $stmt->fetchAll();

            // Convert types
            $trucks = array_map(function($truck) {
                $truck['id'] = (int)$truck['id'];
                $truck['item_count'] = (int)$truck['item_count'];
                $truck['total_quantity'] = (int)$truck['total_quantity'];
                return $truck;
            }, $trucks);

            jsonResponse($trucks);
        } catch (Exception $e) {
            error_log("Get trucks error: " . $e->getMessage());
            errorResponse('Failed to fetch truck transactions', 500);
        }
    }

    /**
     * GET /api/entries/trucks/{id} - Get single truck with items
     */
    public function getTruckDetails($id) {
        requireAuth();

        try {
            // Get truck transaction
            $stmt = $this->conn->prepare("
                SELECT id, type, remark, transaction_date, created_at 
                FROM truck_transactions 
                WHERE id = ?
            ");
            $stmt->execute([$id]);
            $truck = $stmt->fetch();

            if (!$truck) {
                errorResponse('Truck transaction not found', 404);
            }

            // Get entries for this truck
            $stmt = $this->conn->prepare("
                SELECT 
                    e.id,
                    e.item_id,
                    e.item_name,
                    e.item_variety,
                    e.quantity,
                    e.remark
                FROM entries e
                WHERE e.truck_transaction_id = ?
                ORDER BY e.id ASC
            ");
            $stmt->execute([$id]);
            $entries = $stmt->fetchAll();

            // Convert types
            $truck['id'] = (int)$truck['id'];
            $entries = array_map(function($entry) {
                $entry['id'] = (int)$entry['id'];
                $entry['item_id'] = $entry['item_id'] ? (int)$entry['item_id'] : null;
                $entry['quantity'] = (int)$entry['quantity'];
                return $entry;
            }, $entries);

            jsonResponse([
                'truck' => $truck,
                'entries' => $entries
            ]);
        } catch (Exception $e) {
            error_log("Get truck details error: " . $e->getMessage());
            errorResponse('Failed to fetch truck details', 500);
        }
    }

    /**
     * POST /api/entries/truck - Create truck transaction with multiple items
     */
    public function createTruckTransaction() {
        requireAuth();
        $data = getJsonBody();

        $type = $data['type'] ?? '';
        $remark = $data['remark'] ?? null;
        $transactionDate = $data['transaction_date'] ?? date('Y-m-d H:i:s');
        $items = $data['items'] ?? [];

        if (!in_array($type, ['IN', 'OUT'])) {
            errorResponse('Type must be IN or OUT', 400);
        }

        if (empty($items) || !is_array($items)) {
            errorResponse('Items array is required', 400);
        }

        // Validate all items first
        foreach ($items as $item) {
            if (!isset($item['item_id']) || !isset($item['quantity']) || $item['quantity'] <= 0) {
                errorResponse('Each item must have item_id and positive quantity', 400);
            }
        }

        try {
            $this->conn->beginTransaction();

            // Create truck transaction
            $stmt = $this->conn->prepare("
                INSERT INTO truck_transactions (type, remark, transaction_date) 
                VALUES (?, ?, ?)
            ");
            $stmt->execute([$type, $remark, $transactionDate]);
            $truckId = $this->conn->lastInsertId();

            $processedItems = [];
            $errors = [];

            foreach ($items as $itemData) {
                $itemId = $itemData['item_id'];
                $quantity = (int)$itemData['quantity'];
                $itemRemark = $itemData['remark'] ?? null;

                // Get item
                $stmt = $this->conn->prepare("SELECT id, name, variety, quantity FROM items WHERE id = ?");
                $stmt->execute([$itemId]);
                $item = $stmt->fetch();

                if (!$item) {
                    $errors[] = "Item ID {$itemId} not found";
                    continue;
                }

                // Check stock for OUT
                if ($type === 'OUT' && $item['quantity'] < $quantity) {
                    $errors[] = "{$item['name']} ({$item['variety']}): Insufficient stock. Available: {$item['quantity']}";
                    continue;
                }

                // Create entry
                $stmt = $this->conn->prepare("
                    INSERT INTO entries (item_id, item_name, item_variety, truck_transaction_id, type, quantity, remark)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                ");
                $stmt->execute([$itemId, $item['name'], $item['variety'], $truckId, $type, $quantity, $itemRemark]);

                // Update item quantity
                $newQuantity = $type === 'IN' 
                    ? $item['quantity'] + $quantity 
                    : $item['quantity'] - $quantity;

                $stmt = $this->conn->prepare("UPDATE items SET quantity = ? WHERE id = ?");
                $stmt->execute([$newQuantity, $itemId]);

                $processedItems[] = [
                    'item_id' => (int)$itemId,
                    'name' => $item['name'],
                    'variety' => $item['variety'],
                    'quantity' => $quantity,
                    'previousStock' => (int)$item['quantity'],
                    'newStock' => $newQuantity
                ];
            }

            // If all items failed, rollback
            if (empty($processedItems)) {
                $this->conn->rollBack();
                errorResponse('No items were processed: ' . implode('; ', $errors), 400);
            }

            $this->conn->commit();

            $response = [
                'message' => 'Truck transaction created',
                'truckId' => (int)$truckId,
                'type' => $type,
                'itemsProcessed' => count($processedItems),
                'items' => $processedItems
            ];

            if (!empty($errors)) {
                $response['warnings'] = $errors;
            }

            jsonResponse($response, 201);
        } catch (Exception $e) {
            $this->conn->rollBack();
            error_log("Create truck transaction error: " . $e->getMessage());
            errorResponse('Failed to create truck transaction', 500);
        }
    }

    /**
     * DELETE /api/entries/cleanup - Clean up orphaned truck transactions
     */
    public function cleanup() {
        requireAuth();

        try {
            // Find orphaned truck transactions
            $stmt = $this->conn->query("
                SELECT t.id 
                FROM truck_transactions t
                LEFT JOIN entries e ON t.id = e.truck_transaction_id
                WHERE e.id IS NULL
            ");
            $orphaned = $stmt->fetchAll();

            if (empty($orphaned)) {
                jsonResponse(['message' => 'No orphaned transactions found', 'cleaned' => 0]);
            }

            $orphanedIds = array_column($orphaned, 'id');
            $placeholders = implode(',', array_fill(0, count($orphanedIds), '?'));

            $stmt = $this->conn->prepare("DELETE FROM truck_transactions WHERE id IN ($placeholders)");
            $stmt->execute($orphanedIds);

            jsonResponse([
                'message' => "Cleaned up " . count($orphanedIds) . " orphaned truck transactions",
                'cleaned' => count($orphanedIds),
                'cleanedIds' => array_map('intval', $orphanedIds)
            ]);
        } catch (Exception $e) {
            error_log("Cleanup error: " . $e->getMessage());
            errorResponse('Failed to cleanup orphaned transactions', 500);
        }
    }
}

