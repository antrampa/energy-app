const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const bcrypt = require('bcryptjs');
const db = require('./db');

passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser((id, done) => {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
  done(null, user || false);
});

// Email + password
passport.use(new LocalStrategy({ usernameField: 'email' }, (email, password, done) => {
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email.toLowerCase().trim());
  if (!user || !user.password_hash) return done(null, false, { message: 'Invalid email or password' });
  if (!bcrypt.compareSync(password, user.password_hash)) return done(null, false, { message: 'Invalid email or password' });
  done(null, user);
}));

// Google login (enabled only when keys are set in .env)
const googleEnabled = !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
if (googleEnabled) {
  passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: `${process.env.BASE_URL || 'http://localhost:3000'}/auth/google/callback`,
  }, (accessToken, refreshToken, profile, done) => {
    const email = profile.emails?.[0]?.value?.toLowerCase();
    if (!email) return done(null, false, { message: 'Google account has no email' });

    let user = db.prepare('SELECT * FROM users WHERE google_id = ?').get(profile.id)
            || db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    if (user) {
      if (!user.google_id) db.prepare('UPDATE users SET google_id = ? WHERE id = ?').run(profile.id, user.id);
    } else {
      const info = db.prepare('INSERT INTO users (email, google_id, full_name) VALUES (?, ?, ?)')
        .run(email, profile.id, profile.displayName);
      user = db.prepare('SELECT * FROM users WHERE id = ?').get(info.lastInsertRowid);
    }
    done(null, user);
  }));
}

function ensureAuth(req, res, next) {
  if (req.isAuthenticated()) return next();
  res.redirect('/login');
}

module.exports = { passport, ensureAuth, googleEnabled };
