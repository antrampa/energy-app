const router = require('express').Router();
const bcrypt = require('bcryptjs');
const db = require('../db');
const { passport, googleEnabled } = require('../auth');

router.get('/register', (req, res) => res.render('register', { googleEnabled }));

router.post('/register', (req, res, next) => {
  const email = (req.body.email || '').toLowerCase().trim();
  const { password, confirm } = req.body;
  if (!/^\S+@\S+\.\S+$/.test(email)) { req.flash('error', 'Enter a valid email'); return res.redirect('/register'); }
  if (!password || password.length < 8) { req.flash('error', 'Password must be at least 8 characters'); return res.redirect('/register'); }
  if (password !== confirm) { req.flash('error', 'Passwords do not match'); return res.redirect('/register'); }
  if (db.prepare('SELECT 1 FROM users WHERE email = ?').get(email)) {
    req.flash('error', 'An account with this email already exists'); return res.redirect('/register');
  }
  const info = db.prepare('INSERT INTO users (email, password_hash) VALUES (?, ?)')
    .run(email, bcrypt.hashSync(password, 12));
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(info.lastInsertRowid);
  req.login(user, err => err ? next(err) : res.redirect('/profile'));
});

router.get('/login', (req, res) => res.render('login', { googleEnabled }));
router.post('/login', passport.authenticate('local', {
  successRedirect: '/dashboard', failureRedirect: '/login', failureFlash: true,
}));

if (googleEnabled) {
  router.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
  router.get('/auth/google/callback',
    passport.authenticate('google', { failureRedirect: '/login', failureFlash: true }),
    (req, res) => res.redirect(req.user.full_name ? '/dashboard' : '/profile'));
}

router.post('/logout', (req, res, next) => req.logout(err => err ? next(err) : res.redirect('/login')));

module.exports = router;
