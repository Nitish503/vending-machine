import express from "express";
import session from "express-session";
import pg from "pg";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 10000;

/* ---------- DATABASE ---------- */
const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

/* ---------- MIDDLEWARE ---------- */
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(
  session({
    secret: "vending-secret",
    resave: false,
    saveUninitialized: false,
  })
);

app.use(express.static(path.join(__dirname, "public")));

/* ---------- PAGE ROUTES ---------- */
app.get("/", (_, res) => res.sendFile(path.join(__dirname, "public/index.html")));
app.get("/login", (_, res) => res.sendFile(path.join(__dirname, "public/login.html")));
app.get("/admin", (_, res) => res.sendFile(path.join(__dirname, "public/admin.html")));
app.get("/customer", (_, res) => res.sendFile(path.join(__dirname, "public/customer.html")));
app.get("/customer-login", (_, res) => res.sendFile(path.join(__dirname, "public/customer-login.html")));
app.get("/customer-register", (_, res) => res.sendFile(path.join(__dirname, "public/customer-register.html")));

/* ---------- ADMIN AUTH ---------- */
app.post("/login", (req, res) => {
  const { username, password } = req.body;
  if (username === "admin" && password === "admin123") {
    req.session.admin = true;
    return res.json({ success: true });
  }
  res.status(401).json({ success: false });
});

/* ---------- CUSTOMER REGISTER ---------- */
app.post("/customer-register", async (req, res) => {
  const { name, mobile, password } = req.body;

  await pool.query(
    `INSERT INTO customers (name, mobile, password)
     VALUES ($1,$2,$3)
     ON CONFLICT (mobile)
     DO UPDATE SET password=$3`,
    [name, mobile, password]
  );

  res.json({ success: true });
});

/* ---------- CUSTOMER LOGIN ---------- */
app.post("/customer-login", async (req, res) => {
  const { mobile, password } = req.body;

  const user = await pool.query(
    "SELECT * FROM customers WHERE mobile=$1",
    [mobile]
  );

  if (!user.rows.length)
    return res.json({ success: false, message: "User not found" });

  if (!user.rows[0].password)
    return res.json({
      success: false,
      message: "Password reset by admin. Please re-register.",
    });

  if (user.rows[0].password !== password)
    return res.json({ success: false, message: "Wrong password" });

  req.session.customerId = user.rows[0].id;
  res.json({ success: true });
});

/* ---------- PAYMENT ---------- */
app.post("/buy", async (req, res) => {
  if (!req.session.customerId)
    return res.status(401).json({ success: false });

  const { item, amount } = req.body;

  await pool.query(
    "INSERT INTO payments (customer_id,item,amount) VALUES ($1,$2,$3)",
    [req.session.customerId, item, amount]
  );

  res.json({ success: true });
});

/* ---------- ADMIN APIs ---------- */
app.get("/api/payments", async (_, res) => {
  const data = await pool.query(
    "SELECT id,item,amount,created_at FROM payments ORDER BY id DESC"
  );
  res.json(data.rows);
});

app.get("/api/customers", async (_, res) => {
  const data = await pool.query(
    "SELECT id,name,mobile,password FROM customers ORDER BY id DESC"
  );
  res.json(data.rows);
});

app.post("/api/reset-password", async (req, res) => {
  const { customerId } = req.body;
  await pool.query(
    "UPDATE customers SET password=NULL WHERE id=$1",
    [customerId]
  );
  res.json({ success: true });
});

/* ---------- START ---------- */
app.listen(PORT, () => {
  console.log("Server running on port", PORT);
});