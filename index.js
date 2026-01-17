const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const path = require("path");
const jwt = require("jsonwebtoken");

const app = express();
const PORT = process.env.PORT || 10000;
const SECRET = "SUPER_SECRET_KEY";

app.use(express.json());
app.use(express.static("public"));

const db = new sqlite3.Database("payments.db");

db.run(`
  CREATE TABLE IF NOT EXISTS payments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    item TEXT,
    amount INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

/* ------------------- USER PAYMENT ------------------- */
app.post("/api/pay", (req, res) => {
  const { item, amount } = req.body;
  db.run(
    "INSERT INTO payments (item, amount) VALUES (?, ?)",
    [item, amount],
    () => res.json({ success: true })
  );
});

/* ------------------- LOGIN ------------------- */
app.post("/api/admin/login", (req, res) => {
  const { username, password } = req.body;

  if (username === "admin" && password === "admin123") {
    const token = jwt.sign({ role: "admin" }, SECRET, { expiresIn: "1h" });
    return res.json({ token });
  }

  res.status(401).json({ error: "Invalid credentials" });
});

/* ------------------- AUTH MIDDLEWARE ------------------- */
function verifyToken(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.sendStatus(401);

  const token = authHeader.split(" ")[1];
  jwt.verify(token, SECRET, (err) => {
    if (err) return res.sendStatus(403);
    next();
  });
}

/* ------------------- ADMIN DATA ------------------- */
app.get("/api/admin/payments", verifyToken, (req, res) => {
  db.all("SELECT * FROM payments ORDER BY id DESC", (err, rows) => {
    res.json(rows);
  });
});

/* ------------------- SERVE ADMIN PAGES ------------------- */
app.get("/admin", (req, res) => {
  res.sendFile(path.join(__dirname, "public/admin.html"));
});

app.get("/admin-login", (req, res) => {
  res.sendFile(path.join(__dirname, "public/admin-login.html"));
});

app.listen(PORT, () => {
  console.log(Server running on port ${PORT});
});