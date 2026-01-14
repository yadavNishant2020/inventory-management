<?php
/**
 * Database Configuration and Connection
 * Inventory Management System
 */

class Database {
    private $host;
    private $port;
    private $db_name;
    private $username;
    private $password;
    public $conn;

    public function __construct() {
        // Load from environment or use defaults
        $this->host = getenv('DB_HOST') ?: 'localhost';
        $this->port = getenv('DB_PORT') ?: '3306';
        $this->db_name = getenv('DB_NAME') ?: 'inventory_db';
        $this->username = getenv('DB_USER') ?: 'root';
        $this->password = getenv('DB_PASSWORD') ?: '';
    }

    public function getConnection() {
        $this->conn = null;

        try {
            $dsn = "mysql:host={$this->host};port={$this->port};dbname={$this->db_name};charset=utf8mb4";
            $this->conn = new PDO($dsn, $this->username, $this->password);
            $this->conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
            $this->conn->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
        } catch(PDOException $e) {
            error_log("Database Connection Error: " . $e->getMessage());
            throw new Exception("Database connection failed");
        }

        return $this->conn;
    }

    /**
     * Initialize database tables if they don't exist
     */
    public function initTables() {
        $conn = $this->getConnection();
        
        try {
            // Create items table
            $conn->exec("
                CREATE TABLE IF NOT EXISTS items (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    name VARCHAR(100) NOT NULL,
                    variety VARCHAR(100) NOT NULL,
                    quantity INT DEFAULT 0,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    UNIQUE KEY unique_item (name, variety)
                )
            ");

            // Create truck_transactions table
            $conn->exec("
                CREATE TABLE IF NOT EXISTS truck_transactions (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    type ENUM('IN', 'OUT') NOT NULL,
                    remark VARCHAR(255),
                    transaction_date DATETIME DEFAULT CURRENT_TIMESTAMP,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            ");

            // Create entries table
            $conn->exec("
                CREATE TABLE IF NOT EXISTS entries (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    item_id INT,
                    item_name VARCHAR(100) NOT NULL,
                    item_variety VARCHAR(100) NOT NULL,
                    truck_transaction_id INT,
                    type ENUM('IN', 'OUT') NOT NULL,
                    quantity INT NOT NULL,
                    remark VARCHAR(255),
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE SET NULL,
                    FOREIGN KEY (truck_transaction_id) REFERENCES truck_transactions(id) ON DELETE SET NULL
                )
            ");

            // Create users table
            $conn->exec("
                CREATE TABLE IF NOT EXISTS users (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    username VARCHAR(50) NOT NULL UNIQUE,
                    password VARCHAR(255) NOT NULL,
                    role ENUM('admin', 'user') DEFAULT 'user',
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            ");

            // Create default admin user if not exists
            $stmt = $conn->prepare("SELECT id FROM users WHERE username = 'admin'");
            $stmt->execute();
            if (!$stmt->fetch()) {
                $hashedPassword = password_hash('admin123', PASSWORD_BCRYPT);
                $stmt = $conn->prepare("INSERT INTO users (username, password, role) VALUES ('admin', ?, 'admin')");
                $stmt->execute([$hashedPassword]);
            }

            // Create crate_customers table
            $conn->exec("
                CREATE TABLE IF NOT EXISTS crate_customers (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    name_en VARCHAR(100) NOT NULL,
                    name_hi VARCHAR(100),
                    opening_balance INT DEFAULT 0,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            ");

            // Create crate_entries table
            $conn->exec("
                CREATE TABLE IF NOT EXISTS crate_entries (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    customer_id INT NOT NULL,
                    type ENUM('IN', 'OUT') NOT NULL,
                    quantity INT NOT NULL,
                    entry_date DATE NOT NULL,
                    remark VARCHAR(255),
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (customer_id) REFERENCES crate_customers(id) ON DELETE CASCADE
                )
            ");

            return true;
        } catch (PDOException $e) {
            error_log("Table initialization error: " . $e->getMessage());
            throw new Exception("Failed to initialize database tables");
        }
    }
}

