const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const session = require('express-session');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 10000;

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use(
  session({
    secret: 'vending-secret',
    resave: false,
    saveUninitialized: true
  })
);

// Static files
app.use(express.static(path.join(__dirname, 'public')));

// Database
const db = new sqlite3.Database('./payments.db');
db.run(`
  CREATE TABLE IF NOT EXISTS payments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    item TEXT,
    amount INTEGER,
    time TEXT
  )
`);

// ---------- ROUTES ----------

// Home
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/index.html'));
});

// Customer page
app.get('/customer', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/customer.html'));
});

// Buy item
app.post('/buy/:item', (req, res) => {
  const item = req.params.item;
  const amount = item === 'chips' ? 20 : 40;

  db.run(
    `INSERT INTO payments (item, amount, time)
     VALUES (?, ?, datetime('now'))`,
    [item, amount],
    function (err) {
      if (err) console.error(err);
      console.log('Payment inserted ID:', this.lastID);
      res.redirect('/customer?success=1');
    }
  );
});

// Admin login page
app.get('/admin', (req, res) => {
  if (req.session.admin) {
    res.sendFile(path.join(__dirname, 'public/admin.html'));
  } else {
    res.sendFile(path.join(__dirname, 'public/admin-login.html'));
  }
});

// Admin login POST
app.post('/admin/login', (req, res) => {
  const { username, password } = req.body;

  if (username === 'admin' && password === '1234') {
    req.session.admin = true;
    res.redirect('/admin');
  } else {
    res.redirect('/admin?error=1');
  }
});

// Logout
app.get('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/admin');
  });
});

// API payments (ADMIN ONLY)
app.get('/api/payments', (req, res) => {
  if (!req.session.admin) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  db.all(`SELECT * FROM payments ORDER BY id DESC`, [], (err, rows) => {
    if (err) return res.status(500).json(err);
    res.json(rows);
  });
});

// Start server
app.listen(PORT, () => {
  console.log('Server running on port', PORT);
});