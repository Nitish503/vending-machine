// ==========================
// BASIC SETUP
// ==========================
const express = require("express");
const { Pool } = require("pg");
const path = require("path");
const session = require("express-session");
require("dotenv").config();

const app = express();

// ==========================
// DATABASE CONNECTION
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
// SESSION (ADDED – DOES NOT BREAK ANYTHING)
// ==========================
app.use(
  session({
    secret: process.env.SESSION_SECRET || "vending-secret",
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: true,        // Render uses HTTPS
      maxAge: 60 * 60 * 1000 // 1 hour
    }
  })
);

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
        address TEXT,
        status TEXT DEFAULT 'SUCCESS',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // ✅ MESSAGES TABLE (WAS MISSING EARLIER)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS messages (
        id SERIAL PRIMARY KEY,
        customer_id INTEGER REFERENCES customers(id) ON DELETE CASCADE,
        message TEXT NOT NULL,
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
// PAGES (UNCHANGED)
// ==========================
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

// ==========================
// CUSTOMER REGISTER (UNCHANGED LOGIC)
// ==========================
app.post("/register", async (req, res) => {
  try {
    const { name, mobile, password } = req.body;

    if (!name || !mobile || !password) {
      return res.status(400).json({ error: "All fields required" });
    }

    const result = await pool.query(
      "SELECT password FROM customers WHERE mobile = $1",
      [mobile]
    );

    if (result.rows.length > 0 && result.rows[0].password === null) {
      await pool.query(
        "UPDATE customers SET name=$1, password=$2 WHERE mobile=$3",
        [name, password, mobile]
      );
      return res.json({ success: true, reRegistered: true });
    }

    if (result.rows.length > 0) {
      return res.status(409).json({ error: "Already registered" });
    }

    await pool.query(
      "INSERT INTO customers (name, mobile, password) VALUES ($1,$2,$3)",
      [name, mobile, password]
    );

    res.json({ success: true });

  } catch (err) {
    console.error("REGISTER ERROR:", err);
    res.status(500).json({ error: "Registration failed" });
  }
});

// ==========================
// CUSTOMER LOGIN (UPDATED – SESSION BASED)
// ==========================
app.post("/api/customer-login", async (req, res) => {
  try {
    const { mobile, password } = req.body;

    const result = await pool.query(
      "SELECT id, password FROM customers WHERE mobile=$1",
      [mobile]
    );

    if (!result.rows.length)
      return res.json({ error: "Invalid mobile" });

    const customer = result.rows[0];

    if (customer.password === null)
      return res.json({ resetRequired: true });

    if (customer.password !== password)
      return res.json({ error: "Invalid password" });

    // ✅ STORE LOGIN ON SERVER
    req.session.customerId = customer.id;

    res.json({ success: true });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// ==========================
// PAYMENTS (UPDATED – SESSION REQUIRED)
// ==========================
app.post("/api/payments", async (req, res) => {
  try {
    if (!req.session.customerId) {
      return res.status(401).json({ error: "Login required" });
    }

    const { item, amount, address } = req.body;

    await pool.query(
      `INSERT INTO payments (customer_id, item, amount, address)
       VALUES ($1, $2, $3, $4)`,
      [req.session.customerId, item, amount, address]
    );

    res.json({ success: true });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Payment failed" });
  }
});

// ==========================
// CUSTOMER → ADMIN MESSAGE (SESSION BASED)
// ==========================
app.post("/api/messages", async (req, res) => {
  try {
    if (!req.session.customerId) {
      return res.status(401).json({ error: "Login required" });
    }

    const { message } = req.body;
    if (!message) {
      return res.status(400).json({ error: "Message required" });
    }

    await pool.query(
      "INSERT INTO messages (customer_id, message) VALUES ($1,$2)",
      [req.session.customerId, message]
    );

    res.json({ success: true });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to send message" });
  }
});

// ==========================
// ADMIN DATA (UNCHANGED + FIXED JOIN)
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

app.get("/api/messages", async (req, res) => {
  const result = await pool.query(
    `SELECT m.id, c.name, c.mobile, m.message, m.created_at
     FROM messages m
     JOIN customers c ON m.customer_id = c.id
     ORDER BY m.id DESC`
  );
  res.json(result.rows);
});

// ==========================
// ADMIN RESET PASSWORD (UNCHANGED)
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