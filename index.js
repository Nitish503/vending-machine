// ==========================
// BASIC SETUP
// ==========================
const express = require("express");
const bcrypt = require("bcrypt");
const session = require("express-session");
const { Pool } = require("pg");
const path = require("path");
require("dotenv").config();

const app = express();
const SALT_ROUNDS = 10;

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

app.use(
  session({
    secret: process.env.SESSION_SECRET || "vending_secret",
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false } // Render handles HTTPS
  })
);

// ==========================
// AUTH MIDDLEWARE
// ==========================
function requireAdmin(req, res, next) {
  if (!req.session.admin) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
}

function requireCustomer(req, res, next) {
  if (!req.session.customerId) {
    return res.status(401).json({ error: "Login required" });
  }
  next();
}

// ==========================
// VISITOR TRACKING (ONLY PAGE LOADS)
// ==========================
app.use(async (req, res, next) => {
  if (req.method === "GET" && !req.path.startsWith("/api")) {
    try {
      const ip =
        req.headers["x-forwarded-for"]?.split(",")[0] ||
        req.socket.remoteAddress;

      if (ip) {
        await pool.query(
          "INSERT INTO visits (ip) VALUES ($1) ON CONFLICT (ip) DO NOTHING",
          [ip]
        );
      }
    } catch (err) {
      console.error("Visit tracking error:", err.message);
    }
  }
  next();
});

// ==========================
// DATABASE INIT
// ==========================
async function initDB() {
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
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS messages (
      id SERIAL PRIMARY KEY,
      name TEXT,
      phone TEXT,
      message TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS visits (
      ip TEXT PRIMARY KEY,
      first_visit TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  console.log("✅ Database ready");
}
initDB();

// ==========================
// PAGES
// ==========================
app.get("/", (_, res) =>
  res.sendFile(path.join(__dirname, "public/index.html"))
);

app.get("/products", (_, res) =>
  res.sendFile(path.join(__dirname, "public/customer.html"))
);

app.get("/customer-login", (_, res) =>
  res.sendFile(path.join(__dirname, "public/customer-login.html"))
);

app.get("/customer-register", (_, res) =>
  res.sendFile(path.join(__dirname, "public/customer-register.html"))
);

app.get("/admin-login", (_, res) =>
  res.sendFile(path.join(__dirname, "public/admin-login.html"))
);

app.get("/admin", requireAdmin, (_, res) =>
  res.sendFile(path.join(__dirname, "public/admin.html"))
);

// ==========================
// ADMIN LOGIN (HASHED)
// ==========================
app.post("/admin-login", async (req, res) => {
  try {
    const { username, password } = req.body;

    // 1. Username check
    if (username !== process.env.ADMIN_USER) {
      return res.status(401).send("Invalid credentials");
    }

    // 2. Password hash must exist
    if (!process.env.ADMIN_PASS_HASH) {
      console.error("ADMIN_PASS_HASH missing");
      return res.status(500).send("Server misconfigured");
    }

    // 3. bcrypt compare
    const isMatch = await bcrypt.compare(
      password,
      process.env.ADMIN_PASS_HASH
    );

    if (!isMatch) {
      return res.status(401).send("Invalid credentials");
    }

    // 4. Success
    req.session.admin = true;
    res.redirect("/admin");

  } catch (err) {
    console.error("Admin login error:", err);
    res.status(500).send("Server error");
  }
});
// ==========================
// CUSTOMER REGISTER
// ==========================
app.post("/register", async (req, res) => {
  const { name, mobile, password } = req.body;
  if (!name || !mobile || !password) {
    return res.status(400).json({ error: "All fields required" });
  }

  const result = await pool.query(
    "SELECT password FROM customers WHERE mobile=$1",
    [mobile]
  );

  const hashed = await bcrypt.hash(password, SALT_ROUNDS);

  if (result.rows.length && result.rows[0].password !== null) {
    return res.status(409).json({ error: "Already registered" });
  }

  if (result.rows.length) {
    await pool.query(
      "UPDATE customers SET name=$1, password=$2 WHERE mobile=$3",
      [name, hashed, mobile]
    );
    return res.json({ success: true, reRegistered: true });
  }

  await pool.query(
    "INSERT INTO customers (name,mobile,password) VALUES ($1,$2,$3)",
    [name, mobile, hashed]
  );

  res.json({ success: true });
});

// ==========================
// CUSTOMER LOGIN
// ==========================
app.post("/api/customer-login", async (req, res) => {
  const { mobile, password } = req.body;

  const result = await pool.query(
    "SELECT id,password FROM customers WHERE mobile=$1",
    [mobile]
  );

  if (!result.rows.length) {
    return res.json({ error: "Invalid mobile" });
  }

  const customer = result.rows[0];

  if (customer.password === null) {
    return res.json({ resetRequired: true });
  }

  const isMatch = await bcrypt.compare(password, customer.password);
  if (!isMatch) {
    return res.json({ error: "Invalid password" });
  }

  req.session.customerId = customer.id;
  res.json({ success: true });
});

// ==========================
// PAYMENTS (SESSION-BASED)
// ==========================
app.post("/api/payments", requireCustomer, async (req, res) => {
  const { item, amount, address } = req.body;

  await pool.query(
    `INSERT INTO payments (customer_id,item,amount,address)
     VALUES ($1,$2,$3,$4)`,
    [req.session.customerId, item, amount, address]
  );

  res.json({ success: true });
});

// ==========================
// PUBLIC MESSAGES
// ==========================
app.post("/api/messages", async (req, res) => {
  const { name, phone, message } = req.body;
  if (!message) return res.status(400).json({ error: "Message required" });

  await pool.query(
    "INSERT INTO messages (name,phone,message) VALUES ($1,$2,$3)",
    [name || null, phone || null, message]
  );

  res.json({ success: true });
});

// ==========================
// ADMIN APIs
// ==========================
app.get("/api/customers", requireAdmin, async (_, res) => {
  const r = await pool.query(
    "SELECT id,name,mobile,password FROM customers ORDER BY id DESC"
  );
  res.json(r.rows);
});

app.get("/api/payments", requireAdmin, async (_, res) => {
  const r = await pool.query(`
    SELECT c.name,p.item,p.amount,p.address,p.created_at
    FROM payments p JOIN customers c ON p.customer_id=c.id
    ORDER BY p.id DESC
  `);
  res.json(r.rows);
});

app.get("/api/messages", requireAdmin, async (_, res) => {
  const r = await pool.query("SELECT * FROM messages ORDER BY id DESC");
  res.json(r.rows);
});

app.delete("/api/messages/:id", requireAdmin, async (req, res) => {
  await pool.query("DELETE FROM messages WHERE id=$1", [req.params.id]);
  res.json({ success: true });
});

app.get("/api/visitors/count", requireAdmin, async (_, res) => {
  const r = await pool.query("SELECT COUNT(*) FROM visits");
  res.json({ total: r.rows[0].count });
});

app.post("/api/admin/reset-password/:id", requireAdmin, async (req, res) => {
  await pool.query("UPDATE customers SET password=NULL WHERE id=$1", [
    req.params.id
  ]);
  res.json({ success: true });
});

// ==========================
// SERVER
// ==========================
const PORT = process.env.PORT || 10000;
app.listen(PORT, () =>
  console.log("🚀 Server running on port", PORT)
);