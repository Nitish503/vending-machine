import express from "express";
import pkg from "pg";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import path from "path";

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
app.get("/", (req, res) => {
  res.sendFile(__dirname + "/public/index.html");
});

// Admin login page
app.get("/login", (req, res) => {
  res.sendFile(__dirname + "/public/login.html");
});

// Customer login page
app.get("/customer-login", (req, res) => {
  res.sendFile(__dirname + "/public/customer-login.html");
});

// Customer register page
app.get("/customer-register", (req, res) => {
  res.sendFile(__dirname + "/public/customer-register.html");
});

// Admin panel
app.get("/admin", (req, res) => {
  res.sendFile(__dirname + "/public/admin.html");
});

// Customer panel
app.get("/customer", (req, res) => {
  res.sendFile(__dirname + "/public/customer.html");
});

/* ========== ADMIN LOGIN ========== */
app.post("/admin-login", (req, res) => {
  const { username, password } = req.body;

  if (username === "admin" && password === "admin123") {
    res.redirect("/admin");
  } else {
    res.send("Invalid admin credentials");
  }
});

/* ========== CUSTOMER REGISTER ========== */
app.post("/customer-register", async (req, res) => {
  const { name, mobile, password } = req.body;

  const hash = await bcrypt.hash(password, 10);

  await pool.query(
    `INSERT INTO customers(name, mobile, password, must_register)
     VALUES($1,$2,$3,false)
     ON CONFLICT (mobile)
     DO UPDATE SET password=$3, must_register=false`,
    [name, mobile, hash]
  );

  res.redirect("/customer-login");
});

/* ========== CUSTOMER LOGIN ========== */
app.post("/customer-login", async (req, res) => {
  const { mobile, password } = req.body;

  const r = await pool.query(
    "SELECT * FROM customers WHERE mobile=$1",
    [mobile]
  );

  if (r.rowCount === 0)
    return res.send("User not found. Please register.");

  const user = r.rows[0];

  if (user.must_register)
    return res.send("Password reset by admin. Please register again.");

  const ok = await bcrypt.compare(password, user.password);
  if (!ok) return res.send("Invalid password");

  res.send(`
    <script>
      localStorage.setItem("customer_id","${user.id}");
      window.location.href="/customer";
    </script>
  `);
});

/* ========== PAYMENT ========== */
app.post("/payment", async (req, res) => {
  const { customer_id, item, amount } = req.body;

  await pool.query(
    "INSERT INTO payments(customer_id,item,amount) VALUES($1,$2,$3)",
    [customer_id, item, amount]
  );

  res.json({ success: true });
});

/* ========== ADMIN DATA ========== */
app.get("/admin-data", async (req, res) => {
  const customers = await pool.query("SELECT * FROM customers");
  const payments = await pool.query(
    "SELECT p.*, c.name FROM payments p JOIN customers c ON p.customer_id=c.id"
  );

  res.json({
    customers: customers.rows,
    payments: payments.rows
  });
});

/* ========== RESET CUSTOMER ========== */
app.post("/reset-customer", async (req, res) => {
  const { id } = req.body;

  await pool.query(
    "UPDATE customers SET password=NULL, must_register=true WHERE id=$1",
    [id]
  );

  res.redirect("/admin");
});

app.listen(10000, () =>
  console.log("Server running on port 10000")
);