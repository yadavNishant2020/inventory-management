<?php
/**
 * API Test Script
 * Run this after deployment to verify all endpoints work
 * 
 * Access via: https://yourdomain.com/api/test.php
 * 
 * DELETE THIS FILE AFTER TESTING!
 */

header('Content-Type: text/html; charset=UTF-8');

// Load configuration
if (file_exists(__DIR__ . '/../config.php')) {
    require_once __DIR__ . '/../config.php';
}
require_once __DIR__ . '/config/config.php';
require_once __DIR__ . '/config/database.php';
require_once __DIR__ . '/utils/jwt.php';

echo "<h1>🧪 Inventory API Test Suite</h1>";
echo "<style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 800px; margin: 50px auto; padding: 20px; }
    .pass { color: #22c55e; } 
    .fail { color: #ef4444; }
    .test { padding: 10px; margin: 10px 0; border-radius: 8px; background: #f8fafc; border-left: 4px solid #3b82f6; }
    .test.passed { border-left-color: #22c55e; }
    .test.failed { border-left-color: #ef4444; }
    pre { background: #1e293b; color: #e2e8f0; padding: 15px; border-radius: 8px; overflow-x: auto; }
    h2 { color: #475569; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px; }
</style>";

$tests = [];
$passed = 0;
$failed = 0;

function test($name, $callback) {
    global $tests, $passed, $failed;
    try {
        $result = $callback();
        if ($result === true) {
            $tests[] = ['name' => $name, 'status' => 'passed', 'message' => 'OK'];
            $passed++;
        } else {
            $tests[] = ['name' => $name, 'status' => 'failed', 'message' => $result];
            $failed++;
        }
    } catch (Exception $e) {
        $tests[] = ['name' => $name, 'status' => 'failed', 'message' => $e->getMessage()];
        $failed++;
    }
}

// ==================== DATABASE TESTS ====================
echo "<h2>📦 Database Connection</h2>";

test("Database Connection", function() {
    $db = new Database();
    $conn = $db->getConnection();
    return $conn ? true : "Failed to connect";
});

test("Table Initialization", function() {
    $db = new Database();
    $db->initTables();
    return true;
});

test("Tables Exist", function() {
    $db = new Database();
    $conn = $db->getConnection();
    
    $tables = ['items', 'users', 'entries', 'truck_transactions'];
    foreach ($tables as $table) {
        $stmt = $conn->query("SHOW TABLES LIKE '$table'");
        if (!$stmt->fetch()) {
            return "Table '$table' not found";
        }
    }
    return true;
});

// ==================== AUTH TESTS ====================
echo "<h2>🔐 Authentication</h2>";

test("Admin User Exists", function() {
    $db = new Database();
    $conn = $db->getConnection();
    
    $stmt = $conn->prepare("SELECT id, username, role FROM users WHERE username = 'admin'");
    $stmt->execute();
    $user = $stmt->fetch();
    
    if (!$user) return "Admin user not found";
    if ($user['role'] !== 'admin') return "Admin user doesn't have admin role";
    return true;
});

test("Password Verification", function() {
    $db = new Database();
    $conn = $db->getConnection();
    
    $stmt = $conn->prepare("SELECT password FROM users WHERE username = 'admin'");
    $stmt->execute();
    $user = $stmt->fetch();
    
    if (!$user) return "Admin user not found";
    if (!password_verify('admin123', $user['password'])) {
        return "Default password 'admin123' doesn't match";
    }
    return true;
});

test("JWT Token Generation", function() {
    $token = JWT::createToken(1, 'admin', 'admin');
    if (empty($token)) return "Failed to generate token";
    if (substr_count($token, '.') !== 2) return "Invalid token format";
    return true;
});

test("JWT Token Verification", function() {
    $token = JWT::createToken(1, 'testuser', 'user');
    $payload = JWT::decode($token, JWT_SECRET);
    
    if ($payload['id'] !== 1) return "ID mismatch";
    if ($payload['username'] !== 'testuser') return "Username mismatch";
    if ($payload['role'] !== 'user') return "Role mismatch";
    return true;
});

// ==================== ITEMS TESTS ====================
echo "<h2>📋 Items API</h2>";

test("Create Item", function() {
    $db = new Database();
    $conn = $db->getConnection();
    
    // Clean up first
    $conn->exec("DELETE FROM items WHERE name = 'Test Item'");
    
    $stmt = $conn->prepare("INSERT INTO items (name, variety, quantity) VALUES (?, ?, ?)");
    $stmt->execute(['Test Item', 'Test Variety', 100]);
    
    $id = $conn->lastInsertId();
    return $id > 0 ? true : "Failed to create item";
});

test("Read Items", function() {
    $db = new Database();
    $conn = $db->getConnection();
    
    $stmt = $conn->query("SELECT * FROM items WHERE name = 'Test Item'");
    $item = $stmt->fetch();
    
    if (!$item) return "Item not found";
    if ($item['quantity'] != 100) return "Quantity mismatch";
    return true;
});

test("Update Item Quantity", function() {
    $db = new Database();
    $conn = $db->getConnection();
    
    $stmt = $conn->prepare("UPDATE items SET quantity = 150 WHERE name = 'Test Item'");
    $stmt->execute();
    
    $stmt = $conn->query("SELECT quantity FROM items WHERE name = 'Test Item'");
    $item = $stmt->fetch();
    
    return $item['quantity'] == 150 ? true : "Update failed";
});

// ==================== ENTRIES TESTS ====================
echo "<h2>📊 Entries API</h2>";

test("Create Truck Transaction", function() {
    $db = new Database();
    $conn = $db->getConnection();
    
    $stmt = $conn->prepare("INSERT INTO truck_transactions (type, remark, transaction_date) VALUES (?, ?, NOW())");
    $stmt->execute(['IN', 'Test Transaction']);
    
    $truckId = $conn->lastInsertId();
    return $truckId > 0 ? true : "Failed to create truck transaction";
});

test("Create Entry", function() {
    $db = new Database();
    $conn = $db->getConnection();
    
    // Get test item
    $stmt = $conn->query("SELECT id FROM items WHERE name = 'Test Item'");
    $item = $stmt->fetch();
    if (!$item) return "Test item not found";
    
    // Get latest truck transaction
    $stmt = $conn->query("SELECT id FROM truck_transactions ORDER BY id DESC LIMIT 1");
    $truck = $stmt->fetch();
    if (!$truck) return "Truck transaction not found";
    
    $stmt = $conn->prepare("INSERT INTO entries (item_id, item_name, item_variety, truck_transaction_id, type, quantity, remark) VALUES (?, ?, ?, ?, ?, ?, ?)");
    $stmt->execute([$item['id'], 'Test Item', 'Test Variety', $truck['id'], 'IN', 50, 'Test entry']);
    
    $entryId = $conn->lastInsertId();
    return $entryId > 0 ? true : "Failed to create entry";
});

test("Read Truck Transactions", function() {
    $db = new Database();
    $conn = $db->getConnection();
    
    $stmt = $conn->query("
        SELECT t.*, COUNT(e.id) as entry_count
        FROM truck_transactions t
        LEFT JOIN entries e ON t.id = e.truck_transaction_id
        GROUP BY t.id
        ORDER BY t.id DESC
        LIMIT 1
    ");
    $truck = $stmt->fetch();
    
    if (!$truck) return "No truck transactions found";
    return true;
});

// ==================== CLEANUP ====================
echo "<h2>🧹 Cleanup</h2>";

test("Cleanup Test Data", function() {
    $db = new Database();
    $conn = $db->getConnection();
    
    // Delete test entries
    $conn->exec("DELETE FROM entries WHERE item_name = 'Test Item'");
    
    // Delete test truck transactions
    $conn->exec("DELETE FROM truck_transactions WHERE remark = 'Test Transaction'");
    
    // Delete test items
    $conn->exec("DELETE FROM items WHERE name = 'Test Item'");
    
    return true;
});

// ==================== RESULTS ====================
echo "<h2>📊 Results</h2>";

foreach ($tests as $test) {
    $statusClass = $test['status'] === 'passed' ? 'pass' : 'fail';
    $icon = $test['status'] === 'passed' ? '✅' : '❌';
    echo "<div class='test {$test['status']}'>";
    echo "<strong>{$icon} {$test['name']}</strong>";
    if ($test['status'] === 'failed') {
        echo "<br><small class='fail'>Error: {$test['message']}</small>";
    }
    echo "</div>";
}

echo "<h2>📈 Summary</h2>";
echo "<p><span class='pass'>✅ Passed: {$passed}</span> | <span class='fail'>❌ Failed: {$failed}</span></p>";

if ($failed === 0) {
    echo "<div style='background: #dcfce7; padding: 20px; border-radius: 12px; text-align: center;'>";
    echo "<h3 style='color: #166534; margin: 0;'>🎉 All Tests Passed!</h3>";
    echo "<p style='color: #166534; margin: 10px 0 0 0;'>Your API is ready to use. <strong>Delete this test file!</strong></p>";
    echo "</div>";
} else {
    echo "<div style='background: #fee2e2; padding: 20px; border-radius: 12px; text-align: center;'>";
    echo "<h3 style='color: #991b1b; margin: 0;'>⚠️ Some Tests Failed</h3>";
    echo "<p style='color: #991b1b; margin: 10px 0 0 0;'>Check the errors above and fix the configuration.</p>";
    echo "</div>";
}

echo "<hr style='margin-top: 30px;'>";
echo "<p style='color: #94a3b8; font-size: 12px;'>⚠️ <strong>Security Warning:</strong> Delete this file after testing! Access: /api/test.php</p>";

