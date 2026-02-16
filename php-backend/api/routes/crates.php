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
                    COALESCE(c.opening_balance_wg, 0) as opening_balance_wg,
                    COALESCE(c.opening_balance_normal, 0) as opening_balance_normal,
                    c.created_at,
                    COALESCE(SUM(CASE WHEN e.type = 'OUT' THEN e.quantity ELSE 0 END), 0) as total_out,
                    COALESCE(SUM(CASE WHEN e.type = 'IN' THEN e.quantity ELSE 0 END), 0) as total_in,
                    COALESCE(SUM(CASE WHEN e.type = 'OUT' THEN COALESCE(e.wg_quantity, 0) ELSE 0 END), 0) as total_out_wg,
                    COALESCE(SUM(CASE WHEN e.type = 'OUT' THEN COALESCE(e.normal_quantity, e.quantity) ELSE 0 END), 0) as total_out_normal,
                    COALESCE(SUM(CASE WHEN e.type = 'IN' THEN COALESCE(e.wg_quantity, 0) ELSE 0 END), 0) as total_in_wg,
                    COALESCE(SUM(CASE WHEN e.type = 'IN' THEN COALESCE(e.normal_quantity, e.quantity) ELSE 0 END), 0) as total_in_normal
                FROM crate_customers c
                LEFT JOIN crate_entries e ON c.id = e.customer_id
                GROUP BY c.id, c.name_en, c.name_hi, c.opening_balance, c.opening_balance_wg, c.opening_balance_normal, c.created_at
                ORDER BY c.name_en ASC
            ");
            $customers = $stmt->fetchAll();

            // Convert types and calculate balance (including WG/Normal split)
            $customers = array_map(function($customer) {
                $customer['id'] = (int)$customer['id'];
                $customer['opening_balance'] = (int)$customer['opening_balance'];
                $customer['opening_balance_wg'] = (int)$customer['opening_balance_wg'];
                $customer['opening_balance_normal'] = (int)$customer['opening_balance_normal'];
                $customer['total_out'] = (int)$customer['total_out'];
                $customer['total_in'] = (int)$customer['total_in'];
                $customer['total_out_wg'] = (int)$customer['total_out_wg'];
                $customer['total_out_normal'] = (int)$customer['total_out_normal'];
                $customer['total_in_wg'] = (int)$customer['total_in_wg'];
                $customer['total_in_normal'] = (int)$customer['total_in_normal'];
                $customer['current_balance'] = $customer['opening_balance'] + $customer['total_out'] - $customer['total_in'];
                $customer['current_balance_wg'] = $customer['opening_balance_wg'] + $customer['total_out_wg'] - $customer['total_in_wg'];
                $customer['current_balance_normal'] = $customer['opening_balance_normal'] + $customer['total_out_normal'] - $customer['total_in_normal'];
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
        $openingBalanceWg = isset($data['opening_balance_wg']) ? (int)$data['opening_balance_wg'] : 0;
        $openingBalanceNormal = isset($data['opening_balance_normal']) ? (int)$data['opening_balance_normal'] : 0;
        $openingBalance = $openingBalanceWg + $openingBalanceNormal;

        if (empty($nameEn)) {
            errorResponse('English name is required', 400);
        }

        if ($openingBalanceWg < 0 || $openingBalanceNormal < 0) {
            errorResponse('Opening balance WG and Normal cannot be negative', 400);
        }

        try {
            $stmt = $this->conn->prepare("
                INSERT INTO crate_customers (name_en, name_hi, opening_balance, opening_balance_wg, opening_balance_normal)
                VALUES (?, ?, ?, ?, ?)
            ");
            $stmt->execute([$nameEn, $nameHi ?: null, $openingBalance, $openingBalanceWg, $openingBalanceNormal]);
            $customerId = $this->conn->lastInsertId();

            jsonResponse([
                'message' => 'Customer created',
                'customer' => [
                    'id' => (int)$customerId,
                    'name_en' => $nameEn,
                    'name_hi' => $nameHi,
                    'opening_balance' => $openingBalance,
                    'opening_balance_wg' => $openingBalanceWg,
                    'opening_balance_normal' => $openingBalanceNormal
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
        $openingBalanceWg = isset($data['opening_balance_wg']) ? (int)$data['opening_balance_wg'] : 0;
        $openingBalanceNormal = isset($data['opening_balance_normal']) ? (int)$data['opening_balance_normal'] : 0;
        $openingBalance = $openingBalanceWg + $openingBalanceNormal;

        if (empty($nameEn)) {
            errorResponse('English name is required', 400);
        }

        if ($openingBalanceWg < 0 || $openingBalanceNormal < 0) {
            errorResponse('Opening balance WG and Normal cannot be negative', 400);
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
                SET name_en = ?, name_hi = ?, opening_balance = ?, opening_balance_wg = ?, opening_balance_normal = ?
                WHERE id = ?
            ");
            $stmt->execute([$nameEn, $nameHi ?: null, $openingBalance, $openingBalanceWg, $openingBalanceNormal, $id]);

            jsonResponse([
                'message' => 'Customer updated',
                'customer' => [
                    'id' => (int)$id,
                    'name_en' => $nameEn,
                    'name_hi' => $nameHi,
                    'opening_balance' => $openingBalance,
                    'opening_balance_wg' => $openingBalanceWg,
                    'opening_balance_normal' => $openingBalanceNormal
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
                    e.wg_quantity,
                    e.normal_quantity,
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

            // Convert types (wg_quantity/normal_quantity may be missing in old DB before migration)
            $entries = array_map(function($entry) {
                $entry['id'] = (int)$entry['id'];
                $entry['customer_id'] = (int)$entry['customer_id'];
                $entry['quantity'] = (int)$entry['quantity'];
                $entry['wg_quantity'] = (int)($entry['wg_quantity'] ?? 0);
                $entry['normal_quantity'] = (int)($entry['normal_quantity'] ?? $entry['quantity']);
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
        $wgQuantity = isset($data['wg_quantity']) ? (int)$data['wg_quantity'] : 0;
        $normalQuantity = isset($data['normal_quantity']) ? (int)$data['normal_quantity'] : 0;
        $quantity = $wgQuantity + $normalQuantity;
        $entryDate = $data['entry_date'] ?? date('Y-m-d');
        $remark = trim($data['remark'] ?? '');

        if (!$customerId) {
            errorResponse('Customer ID is required', 400);
        }

        if (!in_array($type, ['IN', 'OUT'])) {
            errorResponse('Type must be IN or OUT', 400);
        }

        if ($quantity <= 0 || ($wgQuantity < 0 || $normalQuantity < 0)) {
            errorResponse('At least one of WG or Sada quantity must be greater than 0', 400);
        }

        try {
            // Check if customer exists
            $stmt = $this->conn->prepare("SELECT id FROM crate_customers WHERE id = ?");
            $stmt->execute([$customerId]);
            if (!$stmt->fetch()) {
                errorResponse('Customer not found', 404);
            }

            $stmt = $this->conn->prepare("
                INSERT INTO crate_entries (customer_id, type, quantity, wg_quantity, normal_quantity, entry_date, remark)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            ");
            $stmt->execute([$customerId, $type, $quantity, $wgQuantity, $normalQuantity, $entryDate, $remark ?: null]);
            $entryId = $this->conn->lastInsertId();

            jsonResponse([
                'message' => 'Entry created',
                'entry' => [
                    'id' => (int)$entryId,
                    'customer_id' => (int)$customerId,
                    'type' => $type,
                    'quantity' => $quantity,
                    'wg_quantity' => $wgQuantity,
                    'normal_quantity' => $normalQuantity,
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
                $wgQuantity = isset($entry['wg_quantity']) ? (int)$entry['wg_quantity'] : 0;
                $normalQuantity = isset($entry['normal_quantity']) ? (int)$entry['normal_quantity'] : 0;
                $quantity = $wgQuantity + $normalQuantity;
                $entryDate = $entry['entry_date'] ?? date('Y-m-d');
                $remark = trim($entry['remark'] ?? '');

                if (!in_array($type, ['IN', 'OUT'])) {
                    $errors[] = "Entry $index: Type must be IN or OUT";
                    continue;
                }

                if ($quantity <= 0 || ($wgQuantity < 0 || $normalQuantity < 0)) {
                    $errors[] = "Entry $index: At least one of WG or Sada quantity must be greater than 0";
                    continue;
                }

                $stmt = $this->conn->prepare("
                    INSERT INTO crate_entries (customer_id, type, quantity, wg_quantity, normal_quantity, entry_date, remark)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                ");
                $stmt->execute([$customerId, $type, $quantity, $wgQuantity, $normalQuantity, $entryDate, $remark ?: null]);
                
                $createdEntries[] = [
                    'id' => (int)$this->conn->lastInsertId(),
                    'type' => $type,
                    'quantity' => $quantity,
                    'wg_quantity' => $wgQuantity,
                    'normal_quantity' => $normalQuantity,
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
            // Get customer details (include split opening balance)
            $stmt = $this->conn->prepare("
                SELECT id, name_en, name_hi, opening_balance,
                    COALESCE(opening_balance_wg, 0) as opening_balance_wg,
                    COALESCE(opening_balance_normal, 0) as opening_balance_normal,
                    created_at
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
            $customer['opening_balance_wg'] = (int)$customer['opening_balance_wg'];
            $customer['opening_balance_normal'] = (int)$customer['opening_balance_normal'];

            // Build entries query with date filter (include wg_quantity, normal_quantity)
            $query = "
                SELECT 
                    id,
                    type,
                    quantity,
                    COALESCE(wg_quantity, 0) as wg_quantity,
                    COALESCE(normal_quantity, quantity) as normal_quantity,
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

            // Calculate totals (including WG and Normal split)
            $totalOut = 0;
            $totalIn = 0;
            $totalOutWg = 0;
            $totalOutNormal = 0;
            $totalInWg = 0;
            $totalInNormal = 0;

            $entries = array_map(function($entry) use (&$totalOut, &$totalIn, &$totalOutWg, &$totalOutNormal, &$totalInWg, &$totalInNormal) {
                $entry['id'] = (int)$entry['id'];
                $entry['quantity'] = (int)$entry['quantity'];
                $wg = (int)$entry['wg_quantity'];
                $normal = (int)$entry['normal_quantity'];
                $entry['wg_quantity'] = $wg;
                $entry['normal_quantity'] = $normal;

                if ($entry['type'] === 'OUT') {
                    $totalOut += $entry['quantity'];
                    $totalOutWg += $wg;
                    $totalOutNormal += $normal;
                } else {
                    $totalIn += $entry['quantity'];
                    $totalInWg += $wg;
                    $totalInNormal += $normal;
                }

                return $entry;
            }, $entries);

            // Calculate balance before the date range if from date is specified (split by WG/Normal)
            $balanceBeforeRange = $customer['opening_balance'];
            $balanceBeforeRangeWg = $customer['opening_balance_wg'];
            $balanceBeforeRangeNormal = $customer['opening_balance_normal'];
            if ($fromDate) {
                $stmt = $this->conn->prepare("
                    SELECT 
                        COALESCE(SUM(CASE WHEN type = 'OUT' THEN quantity ELSE 0 END), 0) as out_total,
                        COALESCE(SUM(CASE WHEN type = 'IN' THEN quantity ELSE 0 END), 0) as in_total,
                        COALESCE(SUM(CASE WHEN type = 'OUT' THEN COALESCE(wg_quantity, 0) ELSE 0 END), 0) as out_wg,
                        COALESCE(SUM(CASE WHEN type = 'OUT' THEN COALESCE(normal_quantity, quantity) ELSE 0 END), 0) as out_normal,
                        COALESCE(SUM(CASE WHEN type = 'IN' THEN COALESCE(wg_quantity, 0) ELSE 0 END), 0) as in_wg,
                        COALESCE(SUM(CASE WHEN type = 'IN' THEN COALESCE(normal_quantity, quantity) ELSE 0 END), 0) as in_normal
                    FROM crate_entries
                    WHERE customer_id = ? AND entry_date < ?
                ");
                $stmt->execute([$customerId, $fromDate]);
                $beforeRange = $stmt->fetch();
                $balanceBeforeRange += (int)$beforeRange['out_total'] - (int)$beforeRange['in_total'];
                $balanceBeforeRangeWg += (int)$beforeRange['out_wg'] - (int)$beforeRange['in_wg'];
                $balanceBeforeRangeNormal += (int)$beforeRange['out_normal'] - (int)$beforeRange['in_normal'];
            }

            $netBalance = $balanceBeforeRange + $totalOut - $totalIn;
            $netBalanceWg = $balanceBeforeRangeWg + $totalOutWg - $totalInWg;
            $netBalanceNormal = $balanceBeforeRangeNormal + $totalOutNormal - $totalInNormal;

            jsonResponse([
                'customer' => $customer,
                'entries' => $entries,
                'summary' => [
                    'opening_balance' => $balanceBeforeRange,
                    'opening_balance_wg' => $balanceBeforeRangeWg,
                    'opening_balance_normal' => $balanceBeforeRangeNormal,
                    'total_out' => $totalOut,
                    'total_out_wg' => $totalOutWg,
                    'total_out_normal' => $totalOutNormal,
                    'total_in' => $totalIn,
                    'total_in_wg' => $totalInWg,
                    'total_in_normal' => $totalInNormal,
                    'net_balance' => $netBalance,
                    'net_balance_wg' => $netBalanceWg,
                    'net_balance_normal' => $netBalanceNormal
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
