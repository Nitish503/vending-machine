const express = require('express');
const session = require('express-session');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const app = express();
const PORT = process.env.PORT || 10000;

/* ---------- DATABASE ---------- */
const db = new sqlite3.Database('./payments.db');

db.run(`
  CREATE TABLE IF NOT EXISTS payments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    item TEXT,
    amount INTEGER,
    time TEXT
  )
`);

/* ---------- MIDDLEWARE ---------- */
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use(
  session({
    secret: 'vending-secret',
    resave: false,
    saveUninitialized: true,
  })
);

app.use(express.static(path.join(__dirname, 'public')));

/* ---------- ROUTES ---------- */

/* Home */
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/index.html'));
});

/* Customer page */
app.get('/customer', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/customer.html'));
});

/* Buy item */
app.post('/buy/:item', (req, res) => {
  const item = req.params.item;
  const amount = item === 'chips' ? 20 : 40;

  db.run(
    `INSERT INTO payments (item, amount, time)
     VALUES (?, ?, datetime('now'))`,
    [item, amount],
    () => res.redirect('/customer')
  );
});

/* ---------- ADMIN AUTH ---------- */

const ADMIN_USER = process.env.ADMIN_USER || 'admin';
const ADMIN_PASS = process.env.ADMIN_PASS || '1234';

app.get('/admin', (req, res) => {
  if (!req.session.admin) {
    return res.sendFile(path.join(__dirname, 'public/admin-login.html'));
  }
  res.sendFile(path.join(__dirname, 'public/admin.html'));
});

app.post('/admin/login', (req, res) => {
  const { username, password } = req.body;

  if (username === ADMIN_USER && password === ADMIN_PASS) {
    req.session.admin = true;
    return res.redirect('/admin');
  }

  res.send('❌ Invalid username or password');
});

app.get('/admin/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/'));
});

/* ---------- PAYMENTS API (FIXED) ---------- */
app.get('/api/payments', (req, res) => {
  if (!req.session.admin) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  db.all(
    `SELECT id, item, amount, time
     FROM payments
     ORDER BY id DESC`,
    [],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows);
    }
  );
});

/* ---------- START SERVER ---------- */
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});