require('dotenv').config();
const express = require('express');
const session = require('express-session');
const SqliteStore = require('better-sqlite3-session-store')(session);
const flash = require('connect-flash');
const path = require('path');
const db = require('./db');
const { passport } = require('./auth');

const app = express();
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '..', 'views'));
app.use(express.static(path.join(__dirname, '..', 'public')));
app.use(express.urlencoded({ extended: false }));

app.use(session({
  store: new SqliteStore({ client: db }),
  secret: process.env.SESSION_SECRET || 'change-me',
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true, sameSite: 'lax', maxAge: 1000 * 60 * 60 * 24 * 7 },
}));
app.use(flash());
app.use(passport.initialize());
app.use(passport.session());

app.use((req, res, next) => {
  res.locals.user = req.user;
  res.locals.errors = req.flash('error');
  res.locals.successes = req.flash('success');
  next();
});

app.get('/', (req, res) => res.redirect(req.user ? '/dashboard' : '/login'));
app.use(require('./routes/auth'));
app.use(require('./routes/app'));

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Energy app running on http://localhost:${port}`));
