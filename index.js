const express = require("express");
const cors = require("cors");
const sqlite3 = require("sqlite3").verbose();
const path = require("path");

const app = express();
app.use(cors());
app.use(express.json());

// Serve frontend
app.use(express.static("public"));

// Database
const db = new sqlite3.Database("payments.db");

db.run(`
  CREATE TABLE IF NOT EXISTS payments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    item TEXT,
    amount INTEGER,
    time DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

// API: payment
app.post("/api/pay", (req, res) => {
  const { item, amount } = req.body;

  if (!item || !amount) {
    return res.status(400).json({ success: false });
  }

  db.run(
    "INSERT INTO payments (item, amount) VALUES (?, ?)",
    [item, amount],
    (err) => {
      if (err) {
        return res.status(500).json({ success: false });
      }
      res.json({ success: true });
    }
  );
});

// Root route
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// REQUIRED FOR RENDER
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});