const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const path = require("path");

const app = express();
const PORT = process.env.PORT || 10000;

// Middleware
app.use(express.json());
app.use(express.static("public"));

// Database
const db = new sqlite3.Database("payments.db", (err) => {
  if (err) console.error(err.message);
  else console.log("Connected to SQLite database");
});

// Create table if not exists
db.run(`
  CREATE TABLE IF NOT EXISTS payments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    item TEXT,
    amount INTEGER,
    time TEXT
  )
`);

// Payment API
app.post("/api/pay", (req, res) => {
  const { item, amount } = req.body;
  const time = new Date().toLocaleString();

  db.run(
    "INSERT INTO payments (item, amount, time) VALUES (?, ?, ?)",
    [item, amount, time],
    (err) => {
      if (err) {
        res.status(500).json({ success: false });
      } else {
        res.json({ success: true });
      }
    }
  );
});

// 🔐 ADMIN API (NEW)
app.get("/api/admin/payments", (req, res) => {
  db.all("SELECT * FROM payments ORDER BY id DESC", [], (err, rows) => {
    if (err) {
      res.status(500).json([]);
    } else {
      res.json(rows);
    }
  });
});

// Routes
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.get("/admin", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "admin.html"));
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});