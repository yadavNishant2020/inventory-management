const express = require("express");
const router = express.Router();
const { pool } = require("../db");

// GET /api/entries - List all entries with optional filters (individual items)
router.get("/", async (req, res) => {
  const { type, date, limit } = req.query;

  try {
    let query = `
      SELECT 
        e.id,
        e.item_id,
        e.truck_transaction_id,
        e.type,
        e.quantity,
        e.remark,
        e.created_at,
        i.name,
        i.variety
      FROM entries e
      JOIN items i ON e.item_id = i.id
    `;

    const conditions = [];
    const params = [];

    if (type) {
      conditions.push("e.type = ?");
      params.push(type);
    }

    if (date) {
      conditions.push("DATE(e.created_at) = ?");
      params.push(date);
    }

    if (conditions.length > 0) {
      query += " WHERE " + conditions.join(" AND ");
    }

    query += " ORDER BY e.created_at DESC";

    if (limit) {
      query += " LIMIT ?";
      params.push(parseInt(limit));
    }

    const [rows] = await pool.execute(query, params);
    res.json(rows);
  } catch (error) {
    console.error("Error fetching entries:", error);
    res.status(500).json({ error: "Failed to fetch entries" });
  }
});

// GET /api/entries/trucks - Get truck-level transactions (grouped)
router.get("/trucks", async (req, res) => {
  const { type, limit = "50" } = req.query;

  try {
    // First check if truck_transactions table exists and has data
    const [tableCheck] = await pool.execute(`
      SELECT COUNT(*) as count FROM truck_transactions
    `);

    if (tableCheck[0].count === 0) {
      // No truck transactions yet, return empty array
      return res.json([]);
    }

    let query = `
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
    `;

    const params = [];

    if (type) {
      query += " WHERE t.type = ?";
      params.push(type);
    }

    query +=
      " GROUP BY t.id, t.type, t.remark, t.transaction_date, t.created_at ORDER BY t.transaction_date DESC, t.created_at DESC";

    // Add limit using string concatenation to avoid parameter binding issues
    const limitValue = parseInt(limit) || 50;
    query += " LIMIT " + limitValue;

    const [rows] = await pool.execute(query, params);
    res.json(rows);
  } catch (error) {
    console.error("Error fetching truck transactions:", error);
    res.status(500).json({ error: "Failed to fetch truck transactions" });
  }
});

// DELETE /api/entries/cleanup - Clean up orphaned truck transactions (admin only)
router.delete("/cleanup", async (req, res) => {
  try {
    // Find truck transactions with no entries
    const [orphaned] = await pool.execute(`
      SELECT t.id 
      FROM truck_transactions t
      LEFT JOIN entries e ON t.id = e.truck_transaction_id
      WHERE e.id IS NULL
    `);

    if (orphaned.length === 0) {
      return res.json({
        message: "No orphaned transactions found",
        cleaned: 0,
      });
    }

    // Delete orphaned truck transactions
    const orphanedIds = orphaned.map((t) => t.id);
    await pool.execute(
      `
      DELETE FROM truck_transactions 
      WHERE id IN (${orphanedIds.map(() => "?").join(",")})
    `,
      orphanedIds
    );

    res.json({
      message: `Cleaned up ${orphaned.length} orphaned truck transactions`,
      cleaned: orphaned.length,
      cleanedIds: orphanedIds,
    });
  } catch (error) {
    console.error("Error cleaning up orphaned transactions:", error);
    res.status(500).json({ error: "Failed to cleanup orphaned transactions" });
  }
});

// GET /api/entries/trucks/:id - Get single truck transaction with all items
router.get("/trucks/:id", async (req, res) => {
  const { id } = req.params;

  try {
    // Get truck transaction
    const [trucks] = await pool.execute(
      "SELECT * FROM truck_transactions WHERE id = ?",
      [id]
    );

    if (trucks.length === 0) {
      return res.status(404).json({ error: "Truck transaction not found" });
    }

    // Get all items in this transaction (using stored names to preserve history)
    const [items] = await pool.execute(
      `
      SELECT 
        e.id,
        e.item_id,
        e.quantity,
        COALESCE(e.item_name, i.name, 'Deleted Item') as name,
        COALESCE(e.item_variety, i.variety, 'Unknown') as variety
      FROM entries e
      LEFT JOIN items i ON e.item_id = i.id
      WHERE e.truck_transaction_id = ?
      ORDER BY name, variety
    `,
      [id]
    );

    res.json({
      ...trucks[0],
      items,
    });
  } catch (error) {
    console.error("Error fetching truck transaction:", error);
    res.status(500).json({ error: "Failed to fetch truck transaction" });
  }
});

// GET /api/entries/today - Get today's entries
router.get("/today", async (req, res) => {
  const { type } = req.query;

  try {
    let query = `
      SELECT 
        e.id,
        e.item_id,
        e.type,
        e.quantity,
        e.remark,
        e.created_at,
        i.name,
        i.variety
      FROM entries e
      JOIN items i ON e.item_id = i.id
      WHERE DATE(e.created_at) = CURDATE()
    `;

    const params = [];

    if (type) {
      query += " AND e.type = ?";
      params.push(type);
    }

    query += " ORDER BY e.created_at DESC";

    const [rows] = await pool.execute(query, params);
    res.json(rows);
  } catch (error) {
    console.error("Error fetching today entries:", error);
    res.status(500).json({ error: "Failed to fetch today entries" });
  }
});

// POST /api/entries - Create single entry (legacy support)
router.post("/", async (req, res) => {
  const { item_id, type, quantity, remark, name, variety } = req.body;

  if (!type || !quantity) {
    return res.status(400).json({ error: "Type and quantity are required" });
  }

  if (!["IN", "OUT"].includes(type)) {
    return res.status(400).json({ error: "Type must be IN or OUT" });
  }

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    let itemId = item_id;

    // If item_id not provided, try to find or create item
    if (!itemId && name && variety) {
      const [existing] = await connection.execute(
        "SELECT id FROM items WHERE name = ? AND variety = ?",
        [name.trim(), variety.trim()]
      );

      if (existing.length > 0) {
        itemId = existing[0].id;
      } else if (type === "IN") {
        const [result] = await connection.execute(
          "INSERT INTO items (name, variety, quantity) VALUES (?, ?, 0)",
          [name.trim(), variety.trim()]
        );
        itemId = result.insertId;
      } else {
        await connection.rollback();
        return res.status(400).json({
          error:
            "Item not found. Cannot create OUT entry for non-existent item.",
        });
      }
    }

    if (!itemId) {
      await connection.rollback();
      return res
        .status(400)
        .json({ error: "Item ID or name/variety required" });
    }

    // Get current item
    const [items] = await connection.execute(
      "SELECT * FROM items WHERE id = ?",
      [itemId]
    );

    if (items.length === 0) {
      await connection.rollback();
      return res.status(404).json({ error: "Item not found" });
    }

    const item = items[0];
    const qty = parseInt(quantity);

    // For OUT, check if enough stock
    if (type === "OUT" && item.quantity < qty) {
      await connection.rollback();
      return res.status(400).json({
        error: "Insufficient stock",
        available: item.quantity,
        requested: qty,
      });
    }

    // Update stock
    const newQuantity =
      type === "IN" ? item.quantity + qty : item.quantity - qty;
    await connection.execute("UPDATE items SET quantity = ? WHERE id = ?", [
      newQuantity,
      itemId,
    ]);

    // Create entry
    const [entryResult] = await connection.execute(
      "INSERT INTO entries (item_id, type, quantity, remark) VALUES (?, ?, ?, ?)",
      [itemId, type, qty, remark || null]
    );

    await connection.commit();

    // Fetch the created entry with item details
    const [newEntry] = await pool.execute(
      `
      SELECT 
        e.id,
        e.item_id,
        e.type,
        e.quantity,
        e.remark,
        e.created_at,
        i.name,
        i.variety,
        i.quantity as current_stock
      FROM entries e
      JOIN items i ON e.item_id = i.id
      WHERE e.id = ?
    `,
      [entryResult.insertId]
    );

    res.status(201).json({
      message: `Stock ${type === "IN" ? "added" : "removed"} successfully`,
      entry: newEntry[0],
    });
  } catch (error) {
    await connection.rollback();
    console.error("Error creating entry:", error);
    res.status(500).json({ error: "Failed to create entry" });
  } finally {
    connection.release();
  }
});

// POST /api/entries/truck - Create truck transaction with multiple items
router.post("/truck", async (req, res) => {
  const { type, remark, transaction_date, items } = req.body;

  if (!type || !["IN", "OUT"].includes(type)) {
    return res.status(400).json({ error: "Type must be IN or OUT" });
  }

  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: "Items array is required" });
  }

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    // Create truck transaction
    const txnDate = transaction_date ? new Date(transaction_date) : new Date();
    const [truckResult] = await connection.execute(
      "INSERT INTO truck_transactions (type, remark, transaction_date) VALUES (?, ?, ?)",
      [type, remark || null, txnDate]
    );
    const truckId = truckResult.insertId;

    let successCount = 0;
    const errors = [];

    for (const entry of items) {
      const { item_id, quantity } = entry;

      if (!item_id || !quantity || quantity <= 0) {
        continue;
      }

      // Get current item
      const [itemRows] = await connection.execute(
        "SELECT * FROM items WHERE id = ?",
        [item_id]
      );

      if (itemRows.length === 0) {
        errors.push({ item_id, error: "Item not found" });
        continue;
      }

      const item = itemRows[0];
      const qty = parseInt(quantity);

      // For OUT, check if enough stock
      if (type === "OUT" && item.quantity < qty) {
        errors.push({
          item_id,
          name: item.name,
          error: "Insufficient stock",
          available: item.quantity,
          requested: qty,
        });
        continue;
      }

      // Update stock
      const newQuantity =
        type === "IN" ? item.quantity + qty : item.quantity - qty;
      await connection.execute("UPDATE items SET quantity = ? WHERE id = ?", [
        newQuantity,
        item_id,
      ]);

      // Create entry linked to truck transaction with item details for history preservation
      await connection.execute(
        "INSERT INTO entries (item_id, item_name, item_variety, truck_transaction_id, type, quantity, remark) VALUES (?, ?, ?, ?, ?, ?, ?)",
        [item_id, item.name, item.variety, truckId, type, qty, remark || null]
      );

      successCount++;
    }

    if (successCount === 0) {
      await connection.rollback();
      return res.status(400).json({
        error: "No items were processed",
        details: errors,
      });
    }

    await connection.commit();

    res.status(201).json({
      message: `Truck ${type} processed successfully`,
      truck_transaction_id: truckId,
      items_processed: successCount,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    await connection.rollback();
    console.error("Error creating truck transaction:", error);
    res.status(500).json({ error: "Failed to create truck transaction" });
  } finally {
    connection.release();
  }
});

module.exports = router;
