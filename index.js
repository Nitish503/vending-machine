const express = require("express");
const path = require("path");
const { Pool } = require("pg");

const app = express();
const PORT = process.env.PORT || 10000;

/* -------------------- MIDDLEWARE -------------------- */
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

/* -------------------- DATABASE -------------------- */
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

/* -------------------- INIT DATABASE -------------------- */
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
        amount INTEGER NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS admins (
        id SERIAL PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL
      );
    `);

    // Insert default admin if not exists
    await pool.query(`
      INSERT INTO admins (username, password)
      VALUES ('admin', 'admin123')
      ON CONFLICT (username) DO NOTHING;
    `);

    console.log("✅ Database tables created / verified");
  } catch (err) {
    console.error("❌ DB INIT ERROR:", err);
    process.exit(1);
  }
}

/* -------------------- ROUTES -------------------- */

/* Home */
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

/* Customer Register */
app.post("/api/customer/register", async (req, res) => {
  const { name, mobile, password } = req.body;
  try {
    await pool.query(
      "INSERT INTO customers (name, mobile, password) VALUES ($1,$2,$3)",
      [name, mobile, password]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: "Mobile already registered" });
  }
});

/* Customer Login */
app.post("/api/customer/login", async (req, res) => {
  const { mobile, password } = req.body;
  const result = await pool.query(
    "SELECT * FROM customers WHERE mobile=$1 AND password=$2",
    [mobile, password]
  );
  if (result.rows.length === 0) {
    return res.status(401).json({ error: "Invalid login" });
  }
  res.json({ success: true, customer: result.rows[0] });
});

/* Admin Login */
app.post("/api/admin/login", async (req, res) => {
  const { username, password } = req.body;
  const result = await pool.query(
    "SELECT * FROM admins WHERE username=$1 AND password=$2",
    [username, password]
  );
  if (result.rows.length === 0) {
    return res.status(401).json({ error: "Invalid admin login" });
  }
  res.json({ success: true });
});

/* Admin – View Customers */
app.get("/api/admin/customers", async (req, res) => {
  const result = await pool.query(
    "SELECT id,name,mobile,created_at FROM customers ORDER BY id DESC"
  );
  res.json(result.rows);
});

/* Admin – Reset Customer Password */
app.post("/api/admin/reset-customer", async (req, res) => {
  const { customerId } = req.body;
  await pool.query(
    "UPDATE customers SET password=NULL WHERE id=$1",
    [customerId]
  );
  res.json({ success: true });
});

/* Payment */
app.post("/api/payment", async (req, res) => {
  const { customerId, item, amount } = req.body;
  await pool.query(
    "INSERT INTO payments (customer_id,item,amount) VALUES ($1,$2,$3)",
    [customerId, item, amount]
  );
  res.json({ success: true });
});

/* -------------------- START SERVER -------------------- */
initDB().then(() => {
  app.listen(PORT, () => {
    console.log("✅ Server running on port", PORT);
  });
});