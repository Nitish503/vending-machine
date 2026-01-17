const express = require("express");
const cors = require("cors");
const path = require("path");
const sqlite3 = require("sqlite3").verbose();

const app = express();
const PORT = process.env.PORT || 10000;

/* Middleware */
app.use(cors());
app.use(express.json());

/* Serve frontend */
app.use(express.static(path.join(__dirname, "../frontend")));

/* Database */
const db = new sqlite3.Database("./payments.db");

db.run(`
  CREATE TABLE IF NOT EXISTS payments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    item TEXT,
    amount INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

/* API */
app.get("/api/payments", (req, res) => {
  db.all("SELECT * FROM payments ORDER BY created_at DESC", [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.post("/api/payments", (req, res) => {
  const { item, amount } = req.body;
  if (!item || !amount) {
    return res.status(400).json({ error: "Invalid data" });
  }

  db.run(
    "INSERT INTO payments (item, amount) VALUES (?, ?)",
    [item, amount],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });

      res.json({
        success: true,
        id: this.lastID,
        item,
        amount
      });
    }
  );
});

/* Default route → frontend */
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "../frontend/index.html"));
});

app.listen(PORT, () => {
  console.log("🚀 Server running on port", PORT);
});