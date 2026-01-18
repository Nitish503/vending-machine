const express = require("express");
const path = require("path");
const session = require("express-session");
const sqlite3 = require("sqlite3").verbose();

const app = express();
const PORT = process.env.PORT || 10000;

// 🔐 Admin credentials
const ADMIN_USER = process.env.ADMIN_USER || "admin";
const ADMIN_PASS = process.env.ADMIN_PASS || "1234";

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(
  session({
    secret: "vending-secret",
    resave: false,
    saveUninitialized: false,
  })
);

// Static files
app.use(express.static(path.join(__dirname, "public")));

// Database
const db = new sqlite3.Database("./payments.db");

// Create table if not exists
db.run(`
  CREATE TABLE IF NOT EXISTS payments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    item TEXT,
    amount INTEGER,
    time DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

// 🔐 Auth middleware
function requireLogin(req, res, next) {
  if (req.session.loggedIn) return next();
  res.redirect("/admin/login");
}

// ===== LOGIN =====
app.get("/admin/login", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "admin-login.html"));
});

app.post("/admin/login", (req, res) => {
  const { username, password } = req.body;
  if (username === ADMIN_USER && password === ADMIN_PASS) {
    req.session.loggedIn = true;
    res.redirect("/admin");
  } else {
    res.send("❌ Invalid username or password");
  }
});

app.get("/admin/logout", (req, res) => {
  req.session.destroy(() => res.redirect("/admin/login"));
});

// ===== ADMIN =====
app.get("/admin", requireLogin, (req, res) => {
  res.sendFile(path.join(__dirname, "public", "admin.html"));
});

app.get("/api/payments", requireLogin, (req, res) => {
  db.all("SELECT * FROM payments ORDER BY id DESC", [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// ===== BUY API =====
app.post("/buy", (req, res) => {
  const { item, amount } = req.body;
  db.run(
    "INSERT INTO payments (item, amount) VALUES (?, ?)",
    [item, amount],
    () => res.json({ success: true })
  );
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});