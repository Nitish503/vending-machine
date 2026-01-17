const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const path = require("path");

const app = express();
const PORT = process.env.PORT || 10000;

// Middleware
app.use(express.json());

// ✅ Serve frontend folder
app.use(express.static(path.join(__dirname, "../frontend")));

// Database
const db = new sqlite3.Database("./payments.db", (err) => {
  if (err) console.error(err.message);
  else console.log("Connected to SQLite database");
});

// Create table
db.run(`
  CREATE TABLE IF NOT EXISTS payments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    item TEXT,
    amount INTEGER,
    time TEXT
  )
`);

// API: make payment
app.post("/api/pay", (req, res) => {
  const { item, amount } = req.body;

  if (!item || !amount) {
    return res.status(400).json({ success: false });
  }

  const time = new Date().toLocaleString();

  db.run(
    "INSERT INTO payments (item, amount, time) VALUES (?, ?, ?)",
    [item, amount, time],
    () => {
      res.json({ success: true });
    }
  );
});

// API: get payments
app.get("/api/payments", (req, res) => {
  db.all("SELECT * FROM payments ORDER BY id DESC", [], (err, rows) => {
    if (err) return res.status(500).json([]);
    res.json(rows);
  });
});

// Root fallback (IMPORTANT)
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "../frontend/index.html"));
});

app.listen(PORT, () => {
  console.log("Backend running on port", PORT);
});