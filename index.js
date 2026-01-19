const express = require("express");
const session = require("express-session");
const path = require("path");
const { Pool } = require("pg");

const app = express();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use(session({
    secret: "vending_secret",
    resave: false,
    saveUninitialized: true
}));

app.use(express.static("public"));

/* ---------- ROUTES ---------- */

// Home
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "public/index.html"));
});

// Pages
app.get("/customer-login", (req, res) =>
    res.sendFile(path.join(__dirname, "public/customer-login.html"))
);

app.get("/customer-register", (req, res) =>
    res.sendFile(path.join(__dirname, "public/customer-register.html"))
);

app.get("/customer", (req, res) => {
    if (!req.session.customer) return res.redirect("/customer-login");
    res.sendFile(path.join(__dirname, "public/customer.html"));
});

app.get("/admin", (req, res) =>
    res.sendFile(path.join(__dirname, "public/admin.html"))
);

/* ---------- CUSTOMER REGISTER ---------- */
app.post("/customer-register", async (req, res) => {
    const { mobile, password } = req.body;

    await pool.query(
        `INSERT INTO customers (mobile, password)
         VALUES ($1,$2)
         ON CONFLICT (mobile)
         DO UPDATE SET password=$2`,
        [mobile, password]
    );

    res.send(`
        <script>
            alert("Registration successful. Please login.");
            location.href="/customer-login";
        </script>
    `);
});

/* ---------- CUSTOMER LOGIN ---------- */
app.post("/customer-login", async (req, res) => {
    const { mobile, password } = req.body;

    const result = await pool.query(
        "SELECT * FROM customers WHERE mobile=$1",
        [mobile]
    );

    if (result.rows.length === 0)
        return res.send("User not found");

    const user = result.rows[0];

    if (user.password === null) {
        return res.send(`
            <script>
                alert("Password reset by admin. Please re-register.");
                location.href="/customer-register";
            </script>
        `);
    }

    if (user.password !== password)
        return res.send("Invalid password");

    req.session.customer = user;
    res.redirect("/customer");
});

/* ---------- BUY ITEM ---------- */
app.post("/buy", async (req, res) => {
    if (!req.session.customer)
        return res.status(401).send("Login required");

    const { item, amount } = req.body;

    await pool.query(
        "INSERT INTO payments (customer_id,item,amount) VALUES ($1,$2,$3)",
        [req.session.customer.id, item, amount]
    );

    res.send("Payment successful");
});

/* ---------- ADMIN DATA ---------- */
app.get("/api/payments", async (req, res) => {
    const data = await pool.query("SELECT * FROM payments ORDER BY time DESC");
    res.json(data.rows);
});

app.get("/api/customers", async (req, res) => {
    const data = await pool.query("SELECT * FROM customers");
    res.json(data.rows);
});

/* ---------- ADMIN RESET PASSWORD ---------- */
app.post("/admin/reset-password", async (req, res) => {
    const { mobile } = req.body;

    await pool.query(
        "UPDATE customers SET password=NULL WHERE mobile=$1",
        [mobile]
    );

    res.send("Password reset");
});

app.listen(10000, () => console.log("Server running"));