const express = require("express");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

// =====================
// MIDDLEWARE
// =====================
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ✅ SERVE STATIC FILES
app.use(express.static(path.join(__dirname, "public")));

// =====================
// GET ROUTES (PAGES)
// =====================

// Home page
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Admin login page
app.get("/login", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "login.html"));
});

// Customer login page
app.get("/customer-login", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "customer-login.html"));
});

// Customer register page
app.get("/customer-register", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "customer-register.html"));
});

// Admin panel
app.get("/admin", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "admin.html"));
});

// =====================
// POST ROUTES (FORMS / API)
// =====================

// Admin login (example)
app.post("/login", (req, res) => {
  const { username, password } = req.body;

  if (username === "admin" && password === "admin123") {
    res.json({ success: true });
  } else {
    res.status(401).json({ success: false, message: "Invalid credentials" });
  }
});

// Customer login (example)
app.post("/customer-login", (req, res) => {
  const { mobile, password } = req.body;

  if (!mobile || !password) {
    return res.status(400).json({ success: false });
  }

  // Replace with DB check later
  res.json({ success: true });
});

// =====================
// START SERVER
// =====================
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});