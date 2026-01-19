import express from "express";
import pkg from "pg";
import path from "path";
import bcrypt from "bcrypt";
import dotenv from "dotenv";

dotenv.config();
const { Pool } = pkg;

const app = express();
const __dirname = path.resolve();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

/* ================= ROUTES ================= */

// Home
app.get("/", (_, res) => res.sendFile(__dirname + "/public/index.html"));

// Pages
app.get("/login", (_, res) => res.sendFile(__dirname + "/public/login.html"));
app.get("/customer-login", (_, res) => res.sendFile(__dirname + "/public/customer-login.html"));
app.get("/customer-register", (_, res) => res.sendFile(__dirname + "/public/customer-register.html"));
app.get("/customer", (_, res) => res.sendFile(__dirname + "/public/customer.html"));
app.get("/admin", (_, res) => res.sendFile(__dirname + "/public/admin.html"));

/* ========== ADMIN LOGIN ========== */
app.post("/admin-login", (req, res) => {
  const { username, password } = req.body;
  if (username === "admin" && password === "admin123") {
    res.json({ success: true });
  } else {
    res.json({ success: false });
  }
});

/* ========== CUSTOMER REGISTER ========== */
app.post("/customer-register", async (req, res) => {
  const { name, mobile, password } = req.body;
  const hash = await bcrypt.hash(password, 10);

  await pool.query(
    `INSERT INTO customers (name, mobile, password, must_register)
     VALUES ($1,$2,$3,false)
     ON CONFLICT (mobile)
     DO UPDATE SET password=$3, must_register=false`,
    [name, mobile, hash]
  );

  res.json({ success: true });
});

/* ========== CUSTOMER LOGIN ========== */
app.post("/customer-login", async (req, res) => {
  const { mobile, password } = req.body;
  const result = await pool.query("SELECT * FROM customers WHERE mobile=$1", [mobile]);

  if (result.rows.length === 0)
    return res.json({ success: false, msg: "Register first" });

  const user = result.rows[0];

  if (user.must_register)
    return res.json({ success: false, msg: "Password reset by admin. Re-register." });

  const ok = await bcrypt.compare(password, user.password);
  if (!ok) return res.json({ success: false, msg: "Invalid password" });

  res.json({ success: true, customerId: user.id });
});

/* ========== PAYMENTS ========== */
app.post("/pay", async (req, res) => {
  const { customerId, item, amount } = req.body;

  await pool.query(
    "INSERT INTO payments (customer_id,item,amount) VALUES ($1,$2,$3)",
    [customerId, item, amount]
  );

  res.json({ success: true });
});

/* ========== ADMIN DATA ========== */
app.get("/api/customers", async (_, res) => {
  const r = await pool.query("SELECT id,name,mobile,must_register FROM customers ORDER BY id");
  res.json(r.rows);
});

app.get("/api/payments", async (_, res) => {
  const r = await pool.query(`
    SELECT payments.id, customers.name, item, amount, payments.created_at
    FROM payments
    JOIN customers ON customers.id = payments.customer_id
    ORDER BY payments.id DESC
  `);
  res.json(r.rows);
});

/* ========== ADMIN RESET CUSTOMER ========== */
app.post("/admin-reset", async (req, res) => {
  const { customerId } = req.body;
  await pool.query(
    "UPDATE customers SET password=NULL, must_register=true WHERE id=$1",
    [customerId]
  );
  res.json({ success: true });
});

/* ================= SERVER ================= */
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log("Server running on", PORT));