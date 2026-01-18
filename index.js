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

/* ---------- SESSION ---------- */
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
  ssl: process.env.DATABASE_URL?.includes("render")
    ? { rejectUnauthorized: false }
    : false,
});

/* ---------- CREATE TABLE ---------- */
await pool.query(`
  CREATE TABLE IF NOT EXISTS payments (
    id SERIAL PRIMARY KEY,
    item TEXT NOT NULL,
    amount INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )
`);

/* ---------- ROUTES ---------- */

// Home
app.get("/", (req, res) =>
  res.sendFile(path.join(__dirname, "public/index.html"))
);

// Customer page
app.get("/customer", (req, res) =>
  res.sendFile(path.join(__dirname, "public/customer.html"))
);

// Login page
app.get("/login.html", (req, res) =>
  res.sendFile(path.join(__dirname, "public/login.html"))
);

// Admin page (protected)
app.get("/admin.html", (req, res) => {
  if (!req.session.admin) return res.redirect("/login.html");
  res.sendFile(path.join(__dirname, "public/admin.html"));
});

/* ---------- AUTH ---------- */
app.post("/login", (req, res) => {
  const { username, password } = req.body;

  if (
    username === process.env.ADMIN_USER &&
    password === process.env.ADMIN_PASS
  ) {
    req.session.admin = true;
    return res.redirect("/admin.html");
  }

  res.send("❌ Invalid username or password");
});

app.get("/logout", (req, res) => {
  req.session.destroy(() => res.redirect("/login.html"));
});

/* ---------- PAYMENTS API ---------- */

// Insert payment
app.post("/api/pay", async (req, res) => {
  const { item, amount } = req.body;

  await pool.query(
    "INSERT INTO payments (item, amount) VALUES ($1, $2)",
    [item, amount]
  );

  res.json({ success: true });
});

// Get payments (admin only)
app.get("/api/payments", async (req, res) => {
  if (!req.session.admin) return res.status(401).json([]);

  const result = await pool.query(
    "SELECT * FROM payments ORDER BY id DESC"
  );
  res.json(result.rows);
});

/* ---------- START ---------- */
app.listen(PORT, () =>
  console.log(`Server running on port ${PORT}`)
);