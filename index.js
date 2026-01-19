import express from "express";
import pkg from "pg";
import path from "path";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";

dotenv.config();

const { Pool } = pkg;
const app = express();
const __dirname = path.resolve();

/* ===================== MIDDLEWARE ===================== */
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));

/* ===================== DATABASE ===================== */
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

pool.connect()
  .then(() => console.log("✅ PostgreSQL connected"))
  .catch(err => {
    console.error("❌ Database connection failed", err);
    process.exit(1);
  });

/* ===================== BASIC ROUTES ===================== */
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public/index.html"));
});

app.get("/login", (req, res) => {
  res.sendFile(path.join(__dirname, "public/login.html"));
});

app.get("/customer-login", (req, res) => {
  res.sendFile(path.join(__dirname, "public/customer-login.html"));
});

app.get("/customer-register", (req, res) => {
  res.sendFile(path.join(__dirname, "public/customer-register.html"));
});

app.get("/admin", (req, res) => {
  res.sendFile(path.join(__dirname, "public/admin.html"));
});

/* ===================== ADMIN LOGIN ===================== */
app.post("/admin-login", (req, res) => {
  const { username, password } = req.body;

  if (
    username === process.env.ADMIN_USER &&
    password === process.env.ADMIN_PASS
  ) {
    return res.json({ success: true });
  }

  res.status(401).json({ success: false, message: "Invalid credentials" });
});

/* ===================== CUSTOMER REGISTER ===================== */
app.post("/customer-register", async (req, res) => {
  const { name, mobile, password } = req.body;

  try {
    const hash = await bcrypt.hash(password, 10);

    await pool.query(
      `INSERT INTO customers (name, mobile, password, reset_required)
       VALUES ($1,$2,$3,false)
       ON CONFLICT (mobile)
       DO UPDATE SET password=$3, reset_required=false`,
      [name, mobile, hash]
    );

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false });
  }
});

/* ===================== CUSTOMER LOGIN ===================== */
app.post("/customer-login", async (req, res) => {
  const { mobile, password } = req.body;

  try {
    const result = await pool.query(
      "SELECT * FROM customers WHERE mobile=$1",
      [mobile]
    );

    if (result.rows.length === 0)
      return res.status(401).json({ message: "User not found" });

    const user = result.rows[0];

    if (user.reset_required)
      return res.status(403).json({ message: "RESET_REQUIRED" });

    const match = await bcrypt.compare(password, user.password);
    if (!match)
      return res.status(401).json({ message: "Invalid password" });

    res.json({ success: true, customer_id: user.id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

/* ===================== ADMIN RESET CUSTOMER ===================== */
app.post("/admin-reset-customer", async (req, res) => {
  const { customer_id } = req.body;

  try {
    await pool.query(
      "UPDATE customers SET password=NULL, reset_required=true WHERE id=$1",
      [customer_id]
    );
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false });
  }
});

/* ===================== PAYMENTS ===================== */
app.post("/payment", async (req, res) => {
  const { customer_id, item, amount } = req.body;

  try {
    await pool.query(
      `INSERT INTO payments (customer_id, item, amount)
       VALUES ($1,$2,$3)`,
      [customer_id, item, amount]
    );

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false });
  }
});

/* ===================== ADMIN DATA ===================== */
app.get("/admin/customers", async (req, res) => {
  const data = await pool.query("SELECT id,name,mobile,reset_required FROM customers");
  res.json(data.rows);
});

app.get("/admin/payments", async (req, res) => {
  const data = await pool.query(
    `SELECT p.id,c.name,c.mobile,p.item,p.amount,p.created_at
     FROM payments p
     JOIN customers c ON c.id=p.customer_id
     ORDER BY p.id DESC`
  );
  res.json(data.rows);
});

/* ===================== SERVER ===================== */
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});