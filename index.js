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

// ================= GET ROUTES =================

// Home page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ================= ADMIN =================

// Admin login page
app.get('/admin-login', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin-login.html'));
});

// Admin dashboard
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// ================= CUSTOMER =================

// Customer login page
app.get('/customer-login', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'customer-login.html'));
});

// Customer register page
app.get('/customer-register', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'customer-register.html'));
});

// Customer dashboard
app.get('/customer', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'customer.html'));
});

// payment logic to store in database
app.post("/api/payments", async (req, res) => {
  try {
    const { customer_id, item, amount } = req.body;

    if (!customer_id || !item || !amount) {
      return res.status(400).json({ error: "Missing fields" });
    }

    const result = await pool.query(
      `INSERT INTO payments (customer_id, item, amount)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [customer_id, item, amount]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error("Payment error:", err);
    res.status(500).json({ error: "Payment failed" });
  }
});


// ==========================
// DATABASE CONNECTION
// ==========================
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

module.exports = pool;

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
  amount NUMERIC(10,2) NOT NULL,
  status TEXT DEFAULT 'SUCCESS',
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

// ===== ADMIN DATA APIs =====
app.get("/api/customers", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT id, name, mobile, created_at FROM customers ORDER BY id DESC"
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch customers" });
  }
});

app.get("/api/payments", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT p.id, c.name, p.item, p.amount, p.created_at
       FROM payments p
       JOIN customers c ON p.customer_id = c.id
       ORDER BY p.id DESC`
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch payments" });
  }
});

// newly self added
app.post("/api/admin/reset-password/:id", async (req, res) => {
  try {
    const id = req.params.id;

    await pool.query(
      "UPDATE customers SET password = NULL WHERE id = $1",
      [id]
    );

    res.json({ success: true });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
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
    return res.redirect("/admin");
  }

  res.status(401).send("Invalid admin credentials");
});

/* ---------- CUSTOMER REGISTER ---------- */
app.post("/register", async (req, res) => {
  try {
    const { name, mobile, password } = req.body;

    if (!name || !mobile || !password) {
      return res.status(400).json({ error: "All fields required" });
    }

    const exists = await pool.query(
      "SELECT id FROM customers WHERE mobile=$1",
      [mobile]
    );

    if (exists.rows.length > 0) {
      return res.status(409).json({ error: "Mobile already registered" });
    }

    await pool.query(
      "INSERT INTO customers (name, mobile, password) VALUES ($1,$2,$3)",
      [name, mobile, password]
    );

    res.status(200).json({ success: true });

  } catch (err) {
    console.error("REGISTER ERROR:", err);
    res.status(500).json({ error: "Registration failed" });
  }
});

/* ---------- ADMIN : GET CUSTOMERS ---------- */
app.get("/api/customers", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT id, name, mobile, created_at FROM customers ORDER BY id DESC"
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch customers" });
  }
});

/* ---------- ADMIN : GET PAYMENTS ---------- */
app.get("/api/payments", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT p.id, c.name, p.item, p.amount, p.created_at
       FROM payments p
       JOIN customers c ON p.customer_id = c.id
       ORDER BY p.id DESC`
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch payments" });
  }
});

// ==========================
// CUSTOMER LOGIN
// ==========================
app.post("/api/customer-login", async (req, res) => {
  try {
    const { mobile, password } = req.body;

    const result = await pool.query(
      "SELECT id, password FROM customers WHERE mobile = $1",
      [mobile]
    );

    if (result.rows.length === 0) {
      return res.json({ error: "Invalid mobile number" });
    }

    const customer = result.rows[0];

    // 🔴 Password reset by admin
    if (customer.password === null) {
      return res.json({ resetRequired: true });
    }

    if (customer.password !== password) {
      return res.json({ error: "Invalid password" });
    }

    res.json({ customer_id: customer.id });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
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