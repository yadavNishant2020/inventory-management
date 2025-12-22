const express = require("express");
const router = express.Router();
const { pool } = require("../db");

// GET /api/items - List all items with quantities
router.get("/", async (req, res) => {
  try {
    const [rows] = await pool.execute(`
      SELECT id, name, variety, quantity, created_at 
      FROM items 
      ORDER BY name, variety
    `);
    res.json(rows);
  } catch (error) {
    console.error("Error fetching items:", error);
    res.status(500).json({ error: "Failed to fetch items" });
  }
});

// GET /api/items/stats - Get dashboard statistics
router.get("/stats", async (req, res) => {
  try {
    // Total stock
    const [stockResult] = await pool.execute(`
      SELECT COALESCE(SUM(quantity), 0) as totalStock FROM items
    `);

    // Item count
    const [countResult] = await pool.execute(`
      SELECT COUNT(*) as itemCount FROM items
    `);

    // Today's entries
    const [entriesResult] = await pool.execute(`
      SELECT COUNT(*) as todayEntries 
      FROM entries 
      WHERE DATE(created_at) = CURDATE()
    `);

    res.json({
      totalStock: stockResult[0].totalStock,
      itemCount: countResult[0].itemCount,
      todayEntries: entriesResult[0].todayEntries,
    });
  } catch (error) {
    console.error("Error fetching stats:", error);
    res.status(500).json({ error: "Failed to fetch statistics" });
  }
});

// POST /api/items - Create new item (with 0 quantity by default)
router.post("/", async (req, res) => {
  const { name, variety, quantity = 0 } = req.body;

  if (!name || !variety) {
    return res.status(400).json({ error: "Name and variety are required" });
  }

  try {
    // Check if item exists
    const [existing] = await pool.execute(
      "SELECT id, quantity FROM items WHERE name = ? AND variety = ?",
      [name.trim(), variety.trim()]
    );

    if (existing.length > 0) {
      return res.status(400).json({
        error: "Duplicate entry: This item already exists",
        item: existing[0],
      });
    }

    // Create new item with quantity (default 0)
    const [result] = await pool.execute(
      "INSERT INTO items (name, variety, quantity) VALUES (?, ?, ?)",
      [name.trim(), variety.trim(), parseInt(quantity) || 0]
    );

    const [newItem] = await pool.execute("SELECT * FROM items WHERE id = ?", [
      result.insertId,
    ]);
    res.status(201).json({ message: "Item created", item: newItem[0] });
  } catch (error) {
    console.error("Error creating item:", error);
    if (error.code === "ER_DUP_ENTRY") {
      res
        .status(400)
        .json({ error: "Duplicate entry: This item already exists" });
    } else {
      res.status(500).json({ error: "Failed to create item" });
    }
  }
});

// DELETE /api/items/:id - Remove item (preserves history)
router.delete("/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const [existing] = await pool.execute("SELECT * FROM items WHERE id = ?", [
      id,
    ]);

    if (existing.length === 0) {
      return res.status(404).json({ error: "Item not found" });
    }

    // Check if item has transaction history
    const [entries] = await pool.execute(
      "SELECT COUNT(*) as count FROM entries WHERE item_id = ?",
      [id]
    );
    const hasHistory = entries[0].count > 0;

    // Delete the item (entries will have item_id set to NULL but keep name/variety for history)
    await pool.execute("DELETE FROM items WHERE id = ?", [id]);

    const message = hasHistory
      ? `Item deleted. Historical transactions preserved (${entries[0].count} entries)`
      : "Item deleted";

    res.json({
      message,
      item: existing[0],
      historyPreserved: hasHistory,
      entriesCount: entries[0].count,
    });
  } catch (error) {
    console.error("Error deleting item:", error);
    res.status(500).json({ error: "Failed to delete item" });
  }
});

module.exports = router;
