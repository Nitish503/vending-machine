import express from "express";
import session from "express-session";
import pg from "pg";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const { Pool } = pg;

/* ---------- DATABASE ---------- */
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

/* ---------- MIDDLEWARE ---------- */
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));

app.use(
  session({
    secret: "vending-secret",
    resave: false,
    saveUninitialized: true
  })
);

/* ---------- ROUTES ---------- */

// Home
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public/index.html"));
});

/* ===== ADMIN LOGIN ===== */
app.post("/login", async (req, res) => {
  const { username, password } = req.body;

  if (username === "admin" && password === "admin123") {
    req.session.admin = true;
    return res.json({ success: true });
  }

  res.json({ success: false });
});

app.get("/admin", (req, res) => {
  if (!req.session.admin) return res.redirect("/login.html");
  res.sendFile(path.join(__dirname, "public/admin.html"));
});

/* ===== CUSTOMER REGISTER ===== */
app.post("/customer-register", async (req, res) => {
  const { name, mobile, password } = req.body;

  await pool.query(
    `INSERT INTO customers (name, mobile, password)
     VALUES ($1,$2,$3)
     ON CONFLICT (mobile)
     DO UPDATE SET password = EXCLUDED.password`,
    [name, mobile, password]
  );

  res.json({ success: true });
});

/* ===== CUSTOMER LOGIN (FIXED) ===== */
app.post("/customer-login", async (req, res) => {
  const { mobile, password } = req.body;

  const result = await pool.query(
    "SELECT * FROM customers WHERE mobile=$1",
    [mobile]
  );

  if (result.rows.length === 0) {
    return res.json({ success: false, message: "Customer not found" });
  }

  const customer = result.rows[0];

  // 🔴 BLOCK LOGIN IF ADMIN RESET PASSWORD
  if (customer.password === null) {
    return res.json({
      success: false,
      message: "Password reset by admin. Please re-register."
    });
  }

  if (customer.password !== password) {
    return res.json({ success: false, message: "Invalid credentials" });
  }

  req.session.customer = customer.id;
  res.json({ success: true });
});

/* ===== ADMIN: VIEW CUSTOMERS ===== */
app.get("/api/customers", async (req, res) => {
  const data = await pool.query(
    "SELECT id,name,mobile,password FROM customers ORDER BY id"
  );
  res.json(data.rows);
});

/* ===== ADMIN: RESET CUSTOMER PASSWORD ===== */
app.post("/api/reset-customer/:id", async (req, res) => {
  await pool.query(
    "UPDATE customers SET password=NULL WHERE id=$1",
    [req.params.id]
  );
  res.json({ success: true });
});

/* ---------- START SERVER ---------- */
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Server running on port", PORT);
});