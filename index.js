// ==========================
// BASIC SETUP
// ==========================
const express = require("express");
const { Pool } = require("pg");
require("dotenv").config();
const app = express();

// ==========================
// MIDDLEWARE
// ==========================
app.use(express.json());
const path = require('path');
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));

// ===== LOGIN PAGES (GET) =====

// Customer login page
app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// Admin login page
app.get('/admin-login', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin-login.html'));
});

// ==========================
// DATABASE CONNECTION
// ==========================
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

// ==========================
// DATABASE INITIALIZATION
// ==========================
async function initDB() {
  try {
    // Customers table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS customers (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        phone TEXT UNIQUE NOT NULL,
        password TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Payments table (✅ MISSING EARLIER – NOW FIXED)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS payments (
        id SERIAL PRIMARY KEY,
        customer_id INTEGER REFERENCES customers(id) ON DELETE CASCADE,
        item TEXT NOT NULL,
        amount INTEGER NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    console.log("✅ Database tables ready (customers, payments)");
  } catch (err) {
    console.error("❌ DB init error:", err);
  }
}

initDB();

// ==========================
// HEALTH CHECK
// ==========================
app.get("/", (req, res) => {
  res.send("Backend running");
});

// ==========================
// ADMIN LOGIN (UNCHANGED)
// ==========================
app.post("/admin-login", (req, res) => {
  const { username, password } = req.body;

  if (
    username === process.env.ADMIN_USER &&
    password === process.env.ADMIN_PASS
  ) {
    return res.send("Admin login successful");
  }

  res.status(401).send("Invalid admin credentials");
});

// ==========================
// CUSTOMER REGISTER
// ==========================
app.post("/customer-register", async (req, res) => {
  const { name, phone, password } = req.body;

  if (!name || !phone || !password) {
    return res.status(400).send("Missing fields");
  }

  try {
    await pool.query(
      "INSERT INTO customers (name, phone, password) VALUES ($1,$2,$3)",
      [name, phone, password]
    );
    res.send("Customer registered successfully");
  } catch (err) {
    if (err.code === "23505") {
      return res.status(400).send("Phone already registered");
    }
    console.error(err);
    res.status(500).send("Registration failed");
  }
});

// ==========================
// CUSTOMER LOGIN
// ==========================
app.post("/customer-login", async (req, res) => {
  const { phone, password } = req.body;

  try {
    const result = await pool.query(
      "SELECT * FROM customers WHERE phone=$1 AND password=$2",
      [phone, password]
    );

    if (result.rows.length === 0) {
      return res.status(401).send("Invalid credentials");
    }

    res.send("Customer login successful");
  } catch (err) {
    console.error(err);
    res.status(500).send("Login error");
  }
});

// ==========================
// PAYMENT SAVE (NEW & REQUIRED)
// ==========================
app.post("/api/payment", async (req, res) => {
  const { customerId, item, amount } = req.body;

  if (!customerId || !item || !amount) {
    return res.status(400).send("Missing payment data");
  }

  try {
    await pool.query(
      "INSERT INTO payments (customer_id, item, amount) VALUES ($1,$2,$3)",
      [customerId, item, amount]
    );

    res.send("Payment saved");
  } catch (err) {
    console.error(err);
    res.status(500).send("Payment failed");
  }
});

// ==========================
// SERVER START
// ==========================
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log("🚀 Server running on port", PORT);
});