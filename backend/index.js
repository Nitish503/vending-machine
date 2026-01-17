const express = require("express");
const cors = require("cors");
const sqlite3 = require("sqlite3").verbose();
const path = require("path");

const app = express();
app.use(cors());
app.use(express.json());

// ===== DATABASE =====
const dbPath = path.join(__dirname, "payments.db");
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error("❌ Database error:", err.message);
  } else {
    console.log("✅ Connected to SQLite database");
  }
});

db.run(`
  CREATE TABLE IF NOT EXISTS payments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    item TEXT NOT NULL,
    price INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

// ===== ROUTES =====

// Health check
app.get("/", (req, res) => {
  res.send("Backend running successfully ✅");
});

// Create payment
app.post("/api/pay", (req, res) => {
  const { item, price } = req.body;

  if (!item || !price) {
    return res.status(400).json({ error: "Item and price required" });
  }

  const sql = "INSERT INTO payments (item, price) VALUES (?, ?)";
  db.run(sql, [item, price], function (err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    res.json({
      success: true,
      paymentId: this.lastID,
      item,
      price
    });
  });
});

// Get all payments
app.get("/api/payments", (req, res) => {
  db.all(
    "SELECT * FROM payments ORDER BY created_at DESC",
    [],
    (err, rows) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json(rows);
    }
  );
});

// ===== SERVER =====
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Backend running on port ${PORT}`);
});