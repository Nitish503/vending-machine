import express from "express";
import pkg from "pg";
import path from "path";
import bcrypt from "bcryptjs";
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

/* ===================== PAGES ===================== */

// Admin login page
app.get("/login", (req, res) => {
  res.sendFile(path.join(__dirname, "public/login.html"));
});

// Customer login page
app.get("/customer-login", (req, res) => {
  res.sendFile(path.join(__dirname, "public/customer-login.html"));
});

// Admin panel
app.get("/admin", (req, res) => {
  res.sendFile(path.join(__dirname, "public/admin.html"));
});

// Customer page
app.get("/customer", (req, res) => {
  res.sendFile(path.join(__dirname, "public/customer.html"));
});

/* ===================== ADMIN LOGIN ===================== */

app.post("/login", async (req, res) => {
  const { username, password } = req.body;

  if (
    username === process.env.ADMIN_USER &&
    password === process.env.ADMIN_PASS
  ) {
    return res.redirect("/admin");
  }

  res.send("Invalid admin credentials");
});

/* ===================== CUSTOMER LOGIN ===================== */

app.post("/customer-login", async (req, res) => {
  const { mobile, password } = req.body;

  const user = await pool.query(
    "SELECT * FROM customers WHERE mobile=$1",
    [mobile]
  );

  if (user.rowCount === 0) {
    return res.send("User not found. Please register.");
  }

  if (user.rows[0].must_register) {
    return res.send("Password reset by admin. Please register again.");
  }

  const match = await bcrypt.compare(password, user.rows[0].password);
  if (!match) {
    return res.send("Invalid password");
  }

  res.redirect("/customer");
});

/* ===================== CUSTOMER REGISTER ===================== */

app.post("/register", async (req, res) => {
  const { name, mobile, password } = req.body;
  const hash = await bcrypt.hash(password, 10);

  await pool.query(
    `INSERT INTO customers (name, mobile, password, must_register)
     VALUES ($1,$2,$3,false)
     ON CONFLICT (mobile)
     DO UPDATE SET password=$3, must_register=false`,
    [name, mobile, hash]
  );

  res.redirect("/customer-login");
});

/* ===================== ADMIN RESET CUSTOMER ===================== */

app.post("/admin/reset/:mobile", async (req, res) => {
  await pool.query(
    "UPDATE customers SET must_register=true WHERE mobile=$1",
    [req.params.mobile]
  );

  res.redirect("/admin");
});

/* ===================== SERVER ===================== */

const PORT = process.env.PORT || 10000;
app.listen(PORT, () =>
  console.log(`Server running on port ${PORT}`)
);