const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const path = require("path");

const app = express();
const PORT = process.env.PORT || 10000;

/* =======================
   DATABASE
======================= */
const db = new sqlite3.Database("payments.db");

db.run(`
  CREATE TABLE IF NOT EXISTS payments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    item TEXT,
    amount INTEGER,
    time DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

/* =======================
   MIDDLEWARE
======================= */
app.use(express.json());
app.use(express.static("public"));

/* =======================
   PAYMENT API
======================= */
app.post("/api/pay", (req, res) => {
  const { item, amount } = req.body;

  db.run(
    "INSERT INTO payments (item, amount) VALUES (?, ?)",
    [item, amount],
    () => res.json({ success: true })
  );
});

/* =======================
   ADMIN AUTH MIDDLEWARE
======================= */
const adminAuth = (req, res, next) => {
  const auth = req.headers.authorization;

  if (!auth) {
    res.setHeader("WWW-Authenticate", "Basic");
    return res.status(401).send("Authentication required");
  }

  const base64 = auth.split(" ")[1];
  const [user, pass] = Buffer.from(base64, "base64")
    .toString()
    .split(":");

  if (user === "admin" && pass === "admin123") {
    next();
  } else {
    return res.status(403).send("Access denied");
  }
};

/* =======================
   ADMIN API
======================= */
app.get("/api/admin/payments", adminAuth, (req, res) => {
  db.all("SELECT * FROM payments ORDER BY id DESC", (err, rows) => {
    res.json(rows);
  });
});

/* =======================
   ADMIN PAGE
======================= */
app.get("/admin", adminAuth, (req, res) => {
  res.sendFile(path.join(__dirname, "public", "admin.html"));
});

/* =======================
   START SERVER
======================= */
app.listen(PORT, () => {
  console.log("Server running on port", PORT);
});