// ==========================
// BASIC SETUP
// ==========================
const express = require("express");
const { Pool } = require("pg");
const path = require("path");
require("dotenv").config();

const app = express();

// ==========================
// DATABASE CONNECTION (MUST BE FIRST)
// ==========================
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// ==========================
// MIDDLEWARE
// ==========================
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));

// ==========================
// DATABASE INITIALIZATION
// ==========================
async function initDB() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS customers (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        mobile TEXT UNIQUE NOT NULL,
        password TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

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

    console.log("✅ Database ready");
  } catch (err) {
    console.error("❌ DB init error:", err);
  }
}
initDB();

// ==========================
// PAGES
// ==========================
app.get("/products", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "customer.html"));
});

app.get("/", (req, res) =>
  res.sendFile(path.join(__dirname, "public", "index.html"))
);

app.get("/admin-login", (req, res) =>
  res.sendFile(path.join(__dirname, "public", "admin-login.html"))
);

app.get("/admin", (req, res) =>
  res.sendFile(path.join(__dirname, "public", "admin.html"))
);

app.get("/customer-login", (req, res) =>
  res.sendFile(path.join(__dirname, "public", "customer-login.html"))
);

app.get("/customer-register", (req, res) =>
  res.sendFile(path.join(__dirname, "public", "customer-register.html"))
);

app.get("/customer", (req, res) =>
  res.sendFile(path.join(__dirname, "public", "customer.html"))
);

// ==========================
// ADMIN LOGIN
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

// ==========================
// CUSTOMER REGISTER
// ==========================

app.post("/register", async (req, res) => {
  try {
    const { name, mobile, password } = req.body;

    if (!name || !mobile || !password) {
      return res.status(400).json({ error: "All fields required" });
    }

    // Check existing customer
    const result = await pool.query(
      "SELECT id, password FROM customers WHERE mobile = $1",
      [mobile]
    );

    // Case 1: Customer exists AND password is NULL → re-registration allowed
    if (result.rows.length > 0 && result.rows[0].password === null) {
      await pool.query(
        "UPDATE customers SET name = $1, password = $2 WHERE mobile = $3",
        [name, password, mobile]
      );

      return res.json({ success: true, reRegistered: true });
    }

    // Case 2: Customer exists and password NOT NULL → block
    if (result.rows.length > 0) {
      return res.status(409).json({ error: "Already registered" });
    }

    // Case 3: New customer
    await pool.query(
      "INSERT INTO customers (name, mobile, password) VALUES ($1, $2, $3)",
      [name, mobile, password]
    );

    res.json({ success: true });

  } catch (err) {
    console.error("REGISTER ERROR:", err);
    res.status(500).json({ error: "Registration failed" });
  }
});

// ==========================
// CUSTOMER LOGIN
// ==========================
app.post("/api/customer-login", async (req, res) => {
  try {
    const { mobile, password } = req.body;

    const result = await pool.query(
      "SELECT id, password FROM customers WHERE mobile=$1",
      [mobile]
    );

    if (result.rows.length === 0) {
      return res.json({ error: "Invalid mobile" });
    }

    const customer = result.rows[0];

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

// messages post
app.post("/api/messages", async (req, res) => {
  try {
    const { name, phone, message } = req.body;

    if (!message) {
      return res.status(400).json({ error: "Message required" });
    }

    await pool.query(
      "INSERT INTO messages (name, phone, message) VALUES ($1, $2, $3)",
      [name || "Anonymous", phone || "-", message]
    );

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to send message" });
  }
});

// ==========================
// PAYMENTS
// ==========================
app.post("/api/payments", async (req, res) => {
  try {
    const { customer_id, item, amount, address } = req.body;

    await pool.query(
      `INSERT INTO payments (customer_id, item, amount, address)
       VALUES ($1, $2, $3, $4)`,
      [customer_id, item, amount, address]
    );

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Payment failed" });
  }
});

// ==========================
// ADMIN DATA
// ==========================
app.get("/api/customers", async (req, res) => {
  const result = await pool.query(
    "SELECT id, name, mobile, password FROM customers ORDER BY id DESC"
  );
  res.json(result.rows);
});

app.get("/api/payments", async (req, res) => {
  const result = await pool.query(
    `SELECT p.id, c.name, p.item, p.amount, p.address, p.created_at
     FROM payments p
     JOIN customers c ON p.customer_id = c.id
     ORDER BY p.id DESC`
  );
  res.json(result.rows);
});

// admin messages get routes
app.get("/api/messages", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM messages ORDER BY id DESC"
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch messages" });
  }
});

// ==========================
// ADMIN RESET PASSWORD
// ==========================
app.post("/api/admin/reset-password/:id", async (req, res) => {
  await pool.query(
    "UPDATE customers SET password=NULL WHERE id=$1",
    [req.params.id]
  );
  res.json({ success: true });
});

// ==========================
// SERVER
// ==========================
const PORT = process.env.PORT || 10000;
app.listen(PORT, () =>
  console.log("🚀 Server running on port", PORT)
);