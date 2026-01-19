const express = require('express');
const path = require('path');
const session = require('express-session');

const app = express();
const PORT = process.env.PORT || 10000;

/* ---------- MIDDLEWARE ---------- */
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(
  session({
    secret: 'vending-secret',
    resave: false,
    saveUninitialized: true,
  })
);

/* ---------- STATIC FILES ---------- */
app.use(express.static(path.join(__dirname, 'public')));

/* ---------- PAGE ROUTES ---------- */

// Home / Menu
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Admin login page
app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// Admin panel (protected)
app.get('/admin', (req, res) => {
  if (!req.session.admin) {
    return res.redirect('/login');
  }
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// Customer login
app.get('/customer-login', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'customer-login.html'));
});

// Customer register
app.get('/customer-register', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'customer-register.html'));
});

// Customer vending page (protected)
app.get('/customer', (req, res) => {
  if (!req.session.customer) {
    return res.redirect('/customer-login');
  }
  res.sendFile(path.join(__dirname, 'public', 'customer.html'));
});

/* ---------- AUTH ROUTES ---------- */

// Admin login
app.post('/admin-login', (req, res) => {
  const { username, password } = req.body;

  if (username === 'admin' && password === 'admin123') {
    req.session.admin = true;
    return res.json({ success: true });
  }

  res.status(401).json({ success: false, message: 'Invalid admin login' });
});

// Admin logout
app.get('/admin-logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/login');
  });
});

// Customer login (placeholder logic)
app.post('/customer-login', (req, res) => {
  const { mobile, password } = req.body;

  // Replace later with DB verification
  if (mobile && password) {
    req.session.customer = mobile;
    return res.json({ success: true });
  }

  res.status(401).json({ success: false });
});

// Customer logout
app.get('/customer-logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/customer-login');
  });
});

/* ---------- SERVER ---------- */
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});