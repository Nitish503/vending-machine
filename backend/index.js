const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const path = require("path");

const app = express();
const PORT = process.env.PORT || 10000;

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// Database
const db = new sqlite3.Database("vending.db", () => {
  console.log("Connected to SQLite database");
});

db.run(`
  CREATE TABLE IF NOT EXISTS payments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    item TEXT,
    amount INTEGER,
    status TEXT,
    time DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

// API route
app.post("/api/pay", (req, res) => {
  const { item, amount } = req.body;

  db.run(
    "INSERT INTO payments (item, amount, status) VALUES (?, ?, ?)",
    [item, amount, "SUCCESS"],
    () => {
      res.json({ success: true });
    }
  );
});

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

// Serve frontend
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, () => {
  console.log(`Backend running on port ${PORT}`);
});