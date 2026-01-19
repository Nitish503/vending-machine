import express from "express";
import session from "express-session";
import pg from "pg";
import path from "path";

const app = express();
const PORT = process.env.PORT || 10000;
const __dirname = path.resolve();

/* ---------- MIDDLEWARE ---------- */
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));

app.use(
  session({
    secret: "vending-secret",
    resave: false,
    saveUninitialized: false,
  })
);

/* ---------- POSTGRES ---------- */
const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

/* ---------- DB INIT ---------- */
(async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS customers (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      mobile TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS payments (
      id SERIAL PRIMARY KEY,
      customer_id INTEGER,
      item TEXT NOT NULL,
      amount INTEGER NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  console.log("Database ready");
})();

/* ---------- HOME ---------- */
app.get("/", (req, res) =>
  res.sendFile(path.join(__dirname, "public/index.html"))
);

/* =====================================================
   CUSTOMER REGISTRATION & LOGIN (VERIFIED FROM DB)
   ===================================================== */

// Pages
app.get("/customer-login", (req, res) =>
  res.sendFile(path.join(__dirname, "public/customer-login.html"))
);

app.get("/customer-register", (req, res) =>
  res.sendFile(path.join(__dirname, "public/customer-register.html"))
);

// Register customer (STORE DATA)
app.post("/customer/register", async (req, res) => {
  const { name, mobile, password } = req.body;

  try {
    await pool.query(
      "INSERT INTO customers (name, mobile, password) VALUES ($1,$2,$3)",
      [name, mobile, password]
    );
    res.redirect("/customer-login?registered=1");
  } catch {
    res.redirect("/customer-register?error=1");
  }
});

// Login customer (VERIFY FROM DB)
app.post("/customer/login", async (req, res) => {
  const { mobile, password } = req.body;

  const result = await pool.query(
    "SELECT id FROM customers WHERE mobile=$1 AND password=$2",
    [mobile, password]
  );

  if (result.rows.length === 1) {
    req.session.customerId = result.rows[0].id;
    return res.redirect("/customer");
  }

  res.redirect("/customer-login?error=1");
});

// Logout customer
app.get("/customer/logout", (req, res) => {
  req.session.customerId = null;
  res.redirect("/");
});

// Protected customer page
app.get("/customer", (req, res) => {
  if (!req.session.customerId) return res.redirect("/customer-login");
  res.sendFile(path.join(__dirname, "public/customer.html"));
});

// Protected payment API
app.post("/api/pay", async (req, res) => {
  if (!req.session.customerId) {
    return res.status(401).json({ error: "Login required" });
  }

  const { item, amount } = req.body;

  await pool.query(
    "INSERT INTO payments (customer_id, item, amount) VALUES ($1,$2,$3)",
    [req.session.customerId, item, amount]
  );

  res.json({ success: true });
});

/* =====================================================
   ADMIN
   ===================================================== */

app.get("/login", (req, res) =>
  res.sendFile(path.join(__dirname, "public/login.html"))
);

app.post("/login", (req, res) => {
  const { username, password } = req.body;

  if (
    username === process.env.ADMIN_USER &&
    password === process.env.ADMIN_PASS
  ) {
    req.session.admin = true;
    return res.redirect("/admin");
  }

  res.redirect("/login?error=1");
});

app.get("/admin", (req, res) => {
  if (!req.session.admin) return res.redirect("/login");
  res.sendFile(path.join(__dirname, "public/admin.html"));
});

app.get("/logout", (req, res) => {
  req.session.destroy(() => res.redirect("/"));
});

/* ---------- ADMIN APIs ---------- */

// Payments
app.get("/api/payments", async (req, res) => {
  if (!req.session.admin) return res.status(401).json([]);

  const r = await pool.query(
    "SELECT * FROM payments ORDER BY created_at DESC"
  );
  res.json(r.rows);
});

// Registered customers list
app.get("/api/customers", async (req, res) => {
  if (!req.session.admin) return res.status(401).json([]);

  const r = await pool.query(
    "SELECT id, name, mobile, created_at FROM customers ORDER BY created_at DESC"
  );
  res.json(r.rows);
});

// Customer count
app.get("/api/customers/count", async (req, res) => {
  if (!req.session.admin) return res.status(401).json({ count: 0 });

  const r = await pool.query("SELECT COUNT(*) FROM customers");
  res.json({ count: r.rows[0].count });
});

/* ---------- START ---------- */
app.listen(PORT, () =>
  console.log(`Server running on port ${PORT}`)
);