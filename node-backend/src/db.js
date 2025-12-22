const mysql = require('mysql2/promise');
require('dotenv').config();

// Create connection pool
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'inventory_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Initialize database tables
const initDatabase = async () => {
  try {
    const connection = await pool.getConnection();
    
    // Create items table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS items (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        variety VARCHAR(100) NOT NULL,
        quantity INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY unique_item (name, variety)
      )
    `);
    
    // Create truck_transactions table (groups entries by truck)
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS truck_transactions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        type ENUM('IN', 'OUT') NOT NULL,
        remark VARCHAR(255),
        transaction_date DATETIME DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Check if entries table exists and get its structure
    const [tables] = await connection.execute(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'entries'
    `);
    
    const existingColumns = tables.map(row => row.COLUMN_NAME);
    const hasTruckTransactionId = existingColumns.includes('truck_transaction_id');
    
    if (existingColumns.length > 0) {
      // Table exists, check what needs to be added/modified
      
      if (!hasTruckTransactionId) {
        console.log('Adding truck_transaction_id column to existing entries table...');
        await connection.execute(`
          ALTER TABLE entries 
          ADD COLUMN truck_transaction_id INT,
          ADD CONSTRAINT fk_entries_truck_transaction 
          FOREIGN KEY (truck_transaction_id) REFERENCES truck_transactions(id) ON DELETE SET NULL
        `);
      }
      
      // Check if entries table has item_name and item_variety columns
      const hasItemName = existingColumns.includes('item_name');
      
      if (!hasItemName) {
        console.log('Adding item_name and item_variety columns to preserve history...');
        await connection.execute(`
          ALTER TABLE entries 
          ADD COLUMN item_name VARCHAR(100),
          ADD COLUMN item_variety VARCHAR(100)
        `);
        
        // Update existing entries with item names
        await connection.execute(`
          UPDATE entries e 
          JOIN items i ON e.item_id = i.id 
          SET e.item_name = i.name, e.item_variety = i.variety
          WHERE e.item_name IS NULL
        `);
        
        // Make columns NOT NULL after updating
        await connection.execute(`
          ALTER TABLE entries 
          MODIFY COLUMN item_name VARCHAR(100) NOT NULL,
          MODIFY COLUMN item_variety VARCHAR(100) NOT NULL
        `);
      }
      
      // Fix foreign key constraint to prevent history deletion
      try {
        console.log('Fixing foreign key constraint for history preservation...');
        await connection.execute(`
          ALTER TABLE entries 
          DROP FOREIGN KEY entries_ibfk_1
        `);
        await connection.execute(`
          ALTER TABLE entries 
          ADD CONSTRAINT entries_ibfk_1 
          FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE SET NULL
        `);
        console.log('✓ Fixed foreign key constraint');
      } catch (e) {
        // Constraint might already be correct or not exist
        console.log('Foreign key constraint already correct or not found');
      }
    } else {
      // Table doesn't exist, create it
      await connection.execute(`
        CREATE TABLE entries (
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
      `);
    }
    
    connection.release();
    console.log('✓ Database tables initialized');
  } catch (error) {
    console.error('Database initialization error:', error.message);
    throw error;
  }
};

module.exports = { pool, initDatabase };