// ==========================
// BASIC SETUP
// ==========================
const express = require("express");
const bcrypt = require("bcrypt");
const session = require("express-session");
const RedisStore = require("connect-redis").default;
const { createClient } = require("redis");
const rateLimit = require("express-rate-limit");
const { Pool } = require("pg");
const path = require("path");
require("dotenv").config();

const app = express();
const SALT_ROUNDS = 10;

// ==========================
// TRUST PROXY (RENDER REQUIRED)
// ==========================
app.set("trust proxy", 1);

// ==========================
// DATABASE
// ==========================
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// ==========================
// REDIS
// ==========================
const redisClient = createClient({
  url: process.env.REDIS_URL
});

redisClient.connect();
redisClient.on("connect", () => console.log("✅ Redis connected"));
redisClient.on("error", err => console.error("❌ Redis error", err));

// ==========================
// SESSION (REDIS-BACKED)
// ==========================
app.use(
  session({
    store: new RedisStore({ client: redisClient }),
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: true,
      httpOnly: true,
      sameSite: "lax"
    }
  })
);

// ==========================
// MIDDLEWARE
// ==========================
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));

// ==========================
// RATE LIMITERS (REDIS)
// ==========================
const adminLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false
});

const customerLoginLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 5
});

const messageLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 10
});

// ==========================
// AUTH MIDDLEWARE
// ==========================
function requireAdmin(req, res, next) {
  if (!req.session.admin) return res.status(401).json({ error: "Unauthorized" });
  next();
}

function requireCustomer(req, res, next) {
  if (!req.session.customerId)
    return res.status(401).json({ error: "Login required" });
  next();
}

// ==========================
// VISITOR TRACKING
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
    } catch (e) {}
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
      customer_id INTEGER REFERENCES customers(id),
      item TEXT,
      amount NUMERIC(10,2),
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
app.get("/", (_, res) => res.sendFile(path.join(__dirname, "public/index.html")));
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
// ADMIN LOGIN (SAFE + LIMITED)
// ==========================
app.post("/admin-login", adminLimiter, async (req, res) => {
  const { username, password } = req.body;

  if (username !== process.env.ADMIN_USER)
    return res.status(401).send("Invalid credentials");

  if (!process.env.ADMIN_PASS_HASH)
    return res.status(500).send("Admin not configured");

  const ok = await bcrypt.compare(password, process.env.ADMIN_PASS_HASH);
  if (!ok) return res.status(401).send("Invalid credentials");

  req.session.admin = true;
  res.redirect("/admin");
});

// ==========================
// CUSTOMER REGISTER
// ==========================
app.post("/register", async (req, res) => {
  const { name, mobile, password } = req.body;
  if (!name || !mobile || !password)
    return res.status(400).json({ error: "All fields required" });

  const hashed = await bcrypt.hash(password, SALT_ROUNDS);

  const existing = await pool.query(
    "SELECT password FROM customers WHERE mobile=$1",
    [mobile]
  );

  if (existing.rows.length && existing.rows[0].password !== null)
    return res.status(409).json({ error: "Already registered" });

  if (existing.rows.length) {
    await pool.query(
      "UPDATE customers SET name=$1,password=$2 WHERE mobile=$3",
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
app.post("/api/customer-login", customerLoginLimiter, async (req, res) => {
  const { mobile, password } = req.body;

  const r = await pool.query(
    "SELECT id,password FROM customers WHERE mobile=$1",
    [mobile]
  );

  if (!r.rows.length) return res.json({ error: "Invalid mobile" });

  if (r.rows[0].password === null)
    return res.json({ resetRequired: true });

  const ok = await bcrypt.compare(password, r.rows[0].password);
  if (!ok) return res.json({ error: "Invalid password" });

  req.session.customerId = r.rows[0].id;
  res.json({ success: true });
});

// ==========================
// PAYMENTS
// ==========================
app.post("/api/payments", requireCustomer, async (req, res) => {
  const { item, amount, address } = req.body;

  await pool.query(
    "INSERT INTO payments (customer_id,item,amount,address) VALUES ($1,$2,$3,$4)",
    [req.session.customerId, item, amount, address]
  );

  res.json({ success: true });
});

// ==========================
// PUBLIC MESSAGES (LIMITED)
// ==========================
app.post("/api/messages", messageLimiter, async (req, res) => {
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