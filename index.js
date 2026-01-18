const express = require("express");
const session = require("express-session");
const sqlite3 = require("sqlite3").verbose();
const path = require("path");

const app = express();
const PORT = process.env.PORT || 10000;

// Admin credentials (from environment variables)
const ADMIN_USER = process.env.ADMIN_USER;
const ADMIN_PASS = process.env.ADMIN_PASS;

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use(
  session({
    secret: "vending-secret",
    resave: false,
    saveUninitialized: false,
  })
);

// Static files
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

// ROUTES

app.get("/", (req, res) =>
  res.sendFile(path.join(__dirname, "public", "index.html"))
);

app.get("/customer", (req, res) =>
  res.sendFile(path.join(__dirname, "public", "customer.html"))
);

app.get("/admin", (req, res) => {
  if (req.session.admin)
    res.sendFile(path.join(__dirname, "public", "admin.html"));
  else
    res.sendFile(path.join(__dirname, "public", "admin-login.html"));
});

app.post("/admin/login", (req, res) => {
  const { username, password } = req.body;
  if (username === ADMIN_USER && password === ADMIN_PASS) {
    req.session.admin = true;
    res.redirect("/admin");
  } else {
    res.redirect("/admin?error=1");
  }
});

app.get("/admin/logout", (req, res) => {
  req.session.destroy(() => res.redirect("/"));
});

// API

app.post("/buy", (req, res) => {
  const { item, amount } = req.body;
  db.run(
    "INSERT INTO payments (item, amount) VALUES (?, ?)",
    [item, amount],
    () => res.json({ success: true })
  );
});

app.get("/admin/payments", (req, res) => {
  if (!req.session.admin) return res.status(401).json([]);
  db.all("SELECT * FROM payments ORDER BY id DESC", (err, rows) =>
    res.json(rows)
  );
});

app.listen(PORT, () =>
  console.log("Server running on port", PORT)
);