<?php
/**
 * Crates Routes
 * /api/crates/*
 */

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../config/config.php';
require_once __DIR__ . '/../middleware/auth.php';

class CratesRoutes {
    private $db;
    private $conn;

    public function __construct() {
        $this->db = new Database();
        $this->conn = $this->db->getConnection();
    }

    /**
     * GET /api/crates/customers - Get all customers
     */
    public function getCustomers() {
        requireAuth();

        try {
            $stmt = $this->conn->query("
                SELECT 
                    c.id,
                    c.name_en,
                    c.name_hi,
                    c.opening_balance,
                    c.created_at,
                    COALESCE(SUM(CASE WHEN e.type = 'OUT' THEN e.quantity ELSE 0 END), 0) as total_out,
                    COALESCE(SUM(CASE WHEN e.type = 'IN' THEN e.quantity ELSE 0 END), 0) as total_in
                FROM crate_customers c
                LEFT JOIN crate_entries e ON c.id = e.customer_id
                GROUP BY c.id, c.name_en, c.name_hi, c.opening_balance, c.created_at
                ORDER BY c.name_en ASC
            ");
            $customers = $stmt->fetchAll();

            // Convert types and calculate balance
            $customers = array_map(function($customer) {
                $customer['id'] = (int)$customer['id'];
                $customer['opening_balance'] = (int)$customer['opening_balance'];
                $customer['total_out'] = (int)$customer['total_out'];
                $customer['total_in'] = (int)$customer['total_in'];
                // Balance = opening + out - in (positive means customer has crates)
                $customer['current_balance'] = $customer['opening_balance'] + $customer['total_out'] - $customer['total_in'];
                return $customer;
            }, $customers);

            jsonResponse($customers);
        } catch (Exception $e) {
            error_log("Get crate customers error: " . $e->getMessage());
            errorResponse('Failed to fetch customers', 500);
        }
    }

    /**
     * POST /api/crates/customers - Create new customer
     */
    public function createCustomer() {
        requireAuth();
        $data = getJsonBody();

        $nameEn = trim($data['name_en'] ?? '');
        $nameHi = trim($data['name_hi'] ?? '');
        $openingBalance = isset($data['opening_balance']) ? (int)$data['opening_balance'] : 0;

        if (empty($nameEn)) {
            errorResponse('English name is required', 400);
        }

        try {
            $stmt = $this->conn->prepare("
                INSERT INTO crate_customers (name_en, name_hi, opening_balance)
                VALUES (?, ?, ?)
            ");
            $stmt->execute([$nameEn, $nameHi ?: null, $openingBalance]);
            $customerId = $this->conn->lastInsertId();

            jsonResponse([
                'message' => 'Customer created',
                'customer' => [
                    'id' => (int)$customerId,
                    'name_en' => $nameEn,
                    'name_hi' => $nameHi,
                    'opening_balance' => $openingBalance
                ]
            ], 201);
        } catch (Exception $e) {
            error_log("Create crate customer error: " . $e->getMessage());
            errorResponse('Failed to create customer', 500);
        }
    }

    /**
     * PUT /api/crates/customers/{id} - Update customer
     */
    public function updateCustomer($id) {
        requireAuth();
        $data = getJsonBody();

        $nameEn = trim($data['name_en'] ?? '');
        $nameHi = trim($data['name_hi'] ?? '');
        $openingBalance = isset($data['opening_balance']) ? (int)$data['opening_balance'] : 0;

        if (empty($nameEn)) {
            errorResponse('English name is required', 400);
        }

        try {
            // Check if customer exists
            $stmt = $this->conn->prepare("SELECT id FROM crate_customers WHERE id = ?");
            $stmt->execute([$id]);
            if (!$stmt->fetch()) {
                errorResponse('Customer not found', 404);
            }

            $stmt = $this->conn->prepare("
                UPDATE crate_customers 
                SET name_en = ?, name_hi = ?, opening_balance = ?
                WHERE id = ?
            ");
            $stmt->execute([$nameEn, $nameHi ?: null, $openingBalance, $id]);

            jsonResponse([
                'message' => 'Customer updated',
                'customer' => [
                    'id' => (int)$id,
                    'name_en' => $nameEn,
                    'name_hi' => $nameHi,
                    'opening_balance' => $openingBalance
                ]
            ]);
        } catch (Exception $e) {
            error_log("Update crate customer error: " . $e->getMessage());
            errorResponse('Failed to update customer', 500);
        }
    }

    /**
     * DELETE /api/crates/customers/{id} - Delete customer
     */
    public function deleteCustomer($id) {
        requireAuth();

        try {
            // Check if customer exists
            $stmt = $this->conn->prepare("SELECT id, name_en FROM crate_customers WHERE id = ?");
            $stmt->execute([$id]);
            $customer = $stmt->fetch();

            if (!$customer) {
                errorResponse('Customer not found', 404);
            }

            // Delete customer (cascade will delete entries)
            $stmt = $this->conn->prepare("DELETE FROM crate_customers WHERE id = ?");
            $stmt->execute([$id]);

            jsonResponse([
                'message' => "Customer '{$customer['name_en']}' deleted"
            ]);
        } catch (Exception $e) {
            error_log("Delete crate customer error: " . $e->getMessage());
            errorResponse('Failed to delete customer', 500);
        }
    }

    /**
     * GET /api/crates/entries - Get entries (with optional customer_id filter)
     */
    public function getEntries() {
        requireAuth();
        $params = getQueryParams();

        $customerId = $params['customer_id'] ?? null;
        $limit = isset($params['limit']) ? (int)$params['limit'] : 100;

        try {
            $query = "
                SELECT 
                    e.id,
                    e.customer_id,
                    c.name_en as customer_name,
                    e.type,
                    e.quantity,
                    e.entry_date,
                    e.remark,
                    e.created_at
                FROM crate_entries e
                JOIN crate_customers c ON e.customer_id = c.id
            ";

            $queryParams = [];

            if ($customerId) {
                $query .= " WHERE e.customer_id = ?";
                $queryParams[] = $customerId;
            }

            $query .= " ORDER BY e.entry_date DESC, e.created_at DESC LIMIT " . $limit;

            $stmt = $this->conn->prepare($query);
            $stmt->execute($queryParams);
            $entries = $stmt->fetchAll();

            // Convert types
            $entries = array_map(function($entry) {
                $entry['id'] = (int)$entry['id'];
                $entry['customer_id'] = (int)$entry['customer_id'];
                $entry['quantity'] = (int)$entry['quantity'];
                return $entry;
            }, $entries);

            jsonResponse($entries);
        } catch (Exception $e) {
            error_log("Get crate entries error: " . $e->getMessage());
            errorResponse('Failed to fetch entries', 500);
        }
    }

    /**
     * POST /api/crates/entries - Create single entry
     */
    public function createEntry() {
        requireAuth();
        $data = getJsonBody();

        $customerId = $data['customer_id'] ?? null;
        $type = $data['type'] ?? '';
        $quantity = isset($data['quantity']) ? (int)$data['quantity'] : 0;
        $entryDate = $data['entry_date'] ?? date('Y-m-d');
        $remark = trim($data['remark'] ?? '');

        if (!$customerId) {
            errorResponse('Customer ID is required', 400);
        }

        if (!in_array($type, ['IN', 'OUT'])) {
            errorResponse('Type must be IN or OUT', 400);
        }

        if ($quantity <= 0) {
            errorResponse('Quantity must be greater than 0', 400);
        }

        try {
            // Check if customer exists
            $stmt = $this->conn->prepare("SELECT id FROM crate_customers WHERE id = ?");
            $stmt->execute([$customerId]);
            if (!$stmt->fetch()) {
                errorResponse('Customer not found', 404);
            }

            $stmt = $this->conn->prepare("
                INSERT INTO crate_entries (customer_id, type, quantity, entry_date, remark)
                VALUES (?, ?, ?, ?, ?)
            ");
            $stmt->execute([$customerId, $type, $quantity, $entryDate, $remark ?: null]);
            $entryId = $this->conn->lastInsertId();

            jsonResponse([
                'message' => 'Entry created',
                'entry' => [
                    'id' => (int)$entryId,
                    'customer_id' => (int)$customerId,
                    'type' => $type,
                    'quantity' => $quantity,
                    'entry_date' => $entryDate,
                    'remark' => $remark
                ]
            ], 201);
        } catch (Exception $e) {
            error_log("Create crate entry error: " . $e->getMessage());
            errorResponse('Failed to create entry', 500);
        }
    }

    /**
     * POST /api/crates/entries/bulk - Create multiple entries
     */
    public function createBulkEntries() {
        requireAuth();
        $data = getJsonBody();

        $customerId = $data['customer_id'] ?? null;
        $entries = $data['entries'] ?? [];

        if (!$customerId) {
            errorResponse('Customer ID is required', 400);
        }

        if (empty($entries) || !is_array($entries)) {
            errorResponse('Entries array is required', 400);
        }

        try {
            // Check if customer exists
            $stmt = $this->conn->prepare("SELECT id FROM crate_customers WHERE id = ?");
            $stmt->execute([$customerId]);
            if (!$stmt->fetch()) {
                errorResponse('Customer not found', 404);
            }

            $this->conn->beginTransaction();

            $createdEntries = [];
            $errors = [];

            foreach ($entries as $index => $entry) {
                $type = $entry['type'] ?? '';
                $quantity = isset($entry['quantity']) ? (int)$entry['quantity'] : 0;
                $entryDate = $entry['entry_date'] ?? date('Y-m-d');
                $remark = trim($entry['remark'] ?? '');

                if (!in_array($type, ['IN', 'OUT'])) {
                    $errors[] = "Entry $index: Type must be IN or OUT";
                    continue;
                }

                if ($quantity <= 0) {
                    $errors[] = "Entry $index: Quantity must be greater than 0";
                    continue;
                }

                $stmt = $this->conn->prepare("
                    INSERT INTO crate_entries (customer_id, type, quantity, entry_date, remark)
                    VALUES (?, ?, ?, ?, ?)
                ");
                $stmt->execute([$customerId, $type, $quantity, $entryDate, $remark ?: null]);
                
                $createdEntries[] = [
                    'id' => (int)$this->conn->lastInsertId(),
                    'type' => $type,
                    'quantity' => $quantity,
                    'entry_date' => $entryDate
                ];
            }

            if (empty($createdEntries)) {
                $this->conn->rollBack();
                errorResponse('No entries were created: ' . implode('; ', $errors), 400);
            }

            $this->conn->commit();

            $response = [
                'message' => count($createdEntries) . ' entries created',
                'entries' => $createdEntries
            ];

            if (!empty($errors)) {
                $response['warnings'] = $errors;
            }

            jsonResponse($response, 201);
        } catch (Exception $e) {
            $this->conn->rollBack();
            error_log("Create bulk crate entries error: " . $e->getMessage());
            errorResponse('Failed to create entries', 500);
        }
    }

    /**
     * DELETE /api/crates/entries/{id} - Delete entry
     */
    public function deleteEntry($id) {
        requireAuth();

        try {
            // Check if entry exists
            $stmt = $this->conn->prepare("SELECT id FROM crate_entries WHERE id = ?");
            $stmt->execute([$id]);
            if (!$stmt->fetch()) {
                errorResponse('Entry not found', 404);
            }

            $stmt = $this->conn->prepare("DELETE FROM crate_entries WHERE id = ?");
            $stmt->execute([$id]);

            jsonResponse(['message' => 'Entry deleted']);
        } catch (Exception $e) {
            error_log("Delete crate entry error: " . $e->getMessage());
            errorResponse('Failed to delete entry', 500);
        }
    }

    /**
     * GET /api/crates/ledger/{customer_id} - Get ledger for a customer
     */
    public function getLedger($customerId) {
        requireAuth();
        $params = getQueryParams();

        $fromDate = $params['from'] ?? null;
        $toDate = $params['to'] ?? null;

        try {
            // Get customer details
            $stmt = $this->conn->prepare("
                SELECT id, name_en, name_hi, opening_balance, created_at
                FROM crate_customers
                WHERE id = ?
            ");
            $stmt->execute([$customerId]);
            $customer = $stmt->fetch();

            if (!$customer) {
                errorResponse('Customer not found', 404);
            }

            $customer['id'] = (int)$customer['id'];
            $customer['opening_balance'] = (int)$customer['opening_balance'];

            // Build entries query with date filter
            $query = "
                SELECT 
                    id,
                    type,
                    quantity,
                    entry_date,
                    remark,
                    created_at
                FROM crate_entries
                WHERE customer_id = ?
            ";
            $queryParams = [$customerId];

            if ($fromDate) {
                $query .= " AND entry_date >= ?";
                $queryParams[] = $fromDate;
            }

            if ($toDate) {
                $query .= " AND entry_date <= ?";
                $queryParams[] = $toDate;
            }

            $query .= " ORDER BY entry_date ASC, created_at ASC";

            $stmt = $this->conn->prepare($query);
            $stmt->execute($queryParams);
            $entries = $stmt->fetchAll();

            // Calculate totals
            $totalOut = 0;
            $totalIn = 0;

            $entries = array_map(function($entry) use (&$totalOut, &$totalIn) {
                $entry['id'] = (int)$entry['id'];
                $entry['quantity'] = (int)$entry['quantity'];
                
                if ($entry['type'] === 'OUT') {
                    $totalOut += $entry['quantity'];
                } else {
                    $totalIn += $entry['quantity'];
                }
                
                return $entry;
            }, $entries);

            // Calculate balance before the date range if from date is specified
            $balanceBeforeRange = $customer['opening_balance'];
            if ($fromDate) {
                $stmt = $this->conn->prepare("
                    SELECT 
                        COALESCE(SUM(CASE WHEN type = 'OUT' THEN quantity ELSE 0 END), 0) as out_total,
                        COALESCE(SUM(CASE WHEN type = 'IN' THEN quantity ELSE 0 END), 0) as in_total
                    FROM crate_entries
                    WHERE customer_id = ? AND entry_date < ?
                ");
                $stmt->execute([$customerId, $fromDate]);
                $beforeRange = $stmt->fetch();
                $balanceBeforeRange += (int)$beforeRange['out_total'] - (int)$beforeRange['in_total'];
            }

            $netBalance = $balanceBeforeRange + $totalOut - $totalIn;

            jsonResponse([
                'customer' => $customer,
                'entries' => $entries,
                'summary' => [
                    'opening_balance' => $balanceBeforeRange,
                    'total_out' => $totalOut,
                    'total_in' => $totalIn,
                    'net_balance' => $netBalance
                ],
                'date_range' => [
                    'from' => $fromDate,
                    'to' => $toDate
                ],
                'generated_at' => date('Y-m-d H:i:s')
            ]);
        } catch (Exception $e) {
            error_log("Get crate ledger error: " . $e->getMessage());
            errorResponse('Failed to fetch ledger', 500);
        }
    }

    /**
     * GET /api/crates/stats - Get overall crates statistics
     */
    public function getStats() {
        requireAuth();

        try {
            // Get total customers
            $stmt = $this->conn->query("SELECT COUNT(*) as total FROM crate_customers");
            $totalCustomers = (int)$stmt->fetch()['total'];

            // Get totals
            $stmt = $this->conn->query("
                SELECT 
                    COALESCE(SUM(CASE WHEN type = 'OUT' THEN quantity ELSE 0 END), 0) as total_out,
                    COALESCE(SUM(CASE WHEN type = 'IN' THEN quantity ELSE 0 END), 0) as total_in
                FROM crate_entries
            ");
            $totals = $stmt->fetch();

            // Get opening balance sum
            $stmt = $this->conn->query("SELECT COALESCE(SUM(opening_balance), 0) as total FROM crate_customers");
            $openingSum = (int)$stmt->fetch()['total'];

            $totalOut = (int)$totals['total_out'];
            $totalIn = (int)$totals['total_in'];
            $netPending = $openingSum + $totalOut - $totalIn;

            jsonResponse([
                'total_customers' => $totalCustomers,
                'total_opening_balance' => $openingSum,
                'total_out' => $totalOut,
                'total_in' => $totalIn,
                'net_pending' => $netPending
            ]);
        } catch (Exception $e) {
            error_log("Get crates stats error: " . $e->getMessage());
            errorResponse('Failed to fetch stats', 500);
        }
    }
}
