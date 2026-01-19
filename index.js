import express from "express";
import session from "express-session";
import pg from "pg";
import path from "path";

const app = express();
const PORT = process.env.PORT || 10000;
const __dirname = path.resolve();

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

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

// DB init
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

// Home
app.get("/", (req, res) =>
  res.sendFile(path.join(__dirname, "public/index.html"))
);

/* -------- CUSTOMER -------- */

// Pages
app.get("/customer-login", (req, res) =>
  res.sendFile(path.join(__dirname, "public/customer-login.html"))
);

app.get("/customer-register", (req, res) =>
  res.sendFile(path.join(__dirname, "public/customer-register.html"))
);

// Register
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

// Login
app.post("/customer/login", async (req, res) => {
  const { mobile, password } = req.body;
  const r = await pool.query(
    "SELECT * FROM customers WHERE mobile=$1 AND password=$2",
    [mobile, password]
  );
  if (r.rows.length) {
    req.session.customerId = r.rows[0].id;
    return res.redirect("/customer");
  }
  res.redirect("/customer-login?error=1");
});

// Logout
app.get("/customer/logout", (req, res) => {
  req.session.customerId = null;
  res.redirect("/");
});

// Protected customer page
app.get("/customer", (req, res) => {
  if (!req.session.customerId) return res.redirect("/customer-login");
  res.sendFile(path.join(__dirname, "public/customer.html"));
});

// Payment API (protected)
app.post("/api/pay", async (req, res) => {
  if (!req.session.customerId)
    return res.status(401).json({ error: "Login required" });

  const { item, amount } = req.body;
  await pool.query(
    "INSERT INTO payments (customer_id, item, amount) VALUES ($1,$2,$3)",
    [req.session.customerId, item, amount]
  );
  res.json({ success: true });
});

/* -------- ADMIN -------- */

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

app.get("/api/payments", async (req, res) => {
  if (!req.session.admin) return res.status(401).json([]);
  const r = await pool.query(
    "SELECT * FROM payments ORDER BY created_at DESC"
  );
  res.json(r.rows);
});

app.listen(PORT, () => console.log(`Server running on ${PORT}`));