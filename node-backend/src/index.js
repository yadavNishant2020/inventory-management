const express = require('express');
const cors = require('cors');
require('dotenv').config();

const { initDatabase } = require('./db');
const { authMiddleware } = require('./middleware/auth');
const authRouter = require('./routes/auth');
const itemsRouter = require('./routes/items');
const entriesRouter = require('./routes/entries');

const app = express();
const PORT = process.env.PORT || 5001;

// Middleware
app.use(cors());
app.use(express.json());

// Public routes (no auth required)
app.use('/api/auth', authRouter);

// Health check (public)
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Inventory API is running' });
});

// Protected routes (auth required)
app.use('/api/items', authMiddleware, itemsRouter);
app.use('/api/entries', authMiddleware, entriesRouter);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err.message);
  res.status(500).json({ error: 'Internal server error', message: err.message });
});

// Start server
const startServer = async () => {
  try {
    await initDatabase();
    app.listen(PORT, () => {
      console.log(`\n🚀 Server running on http://localhost:${PORT}`);
      console.log(`📦 Inventory Management API ready`);
      console.log(`🔐 Authentication enabled\n`);
    });
  } catch (error) {
    console.error('Failed to start server:', error.message);
    process.exit(1);
  }
};

startServer();
