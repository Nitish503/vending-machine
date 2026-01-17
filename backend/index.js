const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const path = require("path");

const app = express();
const PORT = process.env.PORT || 10000;

app.use(express.json());

// ✅ Serve frontend files
app.use("/frontend", express.static(path.join(__dirname, "frontend")));

// ✅ Root → Frontend
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "frontend", "index.html"));
});

// ✅ SQLite DB
const db = new sqlite3.Database("./payments.db", (err) => {
  if (err) console.error(err.message);
  else console.log("Connected to SQLite database");
});

db.run(`
  CREATE TABLE IF NOT EXISTS payments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    item TEXT,
    amount INTEGER,
    time DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

// ✅ Payment API
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
        res.status(500).json({ success: false });
      } else {
        res.json({ success: true });
      }
    }
  );
});

// ✅ Payment History
app.get("/api/payments", (req, res) => {
  db.all("SELECT * FROM payments ORDER BY time DESC", [], (err, rows) => {
    if (err) res.status(500).json([]);
    else res.json(rows);
  });
});

// ✅ Start server
app.listen(PORT, () => {
  console.log(`Backend running on port ${PORT}`);
});