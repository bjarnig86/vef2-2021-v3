import express from 'express';
import passport from 'passport';
import session from 'express-session';
import dotenv from 'dotenv';
import { Strategy } from 'passport-local';

import { comparePasswords, findByUsername, findById } from './users.js';
// Hægt að útfæra passport virkni hér til að létta á app.js

export default passport;

export const router = express.Router();

dotenv.config();

const {
  PORT: port = 3000,
  SESSION_SECRET: sessionSecret,
  DATABASE_URL: connectionString,
} = process.env;

if (!connectionString || !sessionSecret) {
  console.error('Vantar gögn í env -- login.js');
  process.exit(1);
}

router.use(express.urlencoded({ extended: true }));
router.use(
  session({
    secret: sessionSecret,
    resave: false,
    saveUninitialized: false,
    maxAge: 20 * 1000, // 20 sek
  }),
);

async function strat(username, password, done) {
  try {
    const user = await findByUsername(username);

    if (!user) {
      return done(null, false);
    }

    // Verður annaðhvort notanda hlutur ef lykilorð er rétt, eða false
    const result = await comparePasswords(password, user.password);

    return done(null, result ? user : false);
  } catch (err) {
    console.error(err);
    return done(err);
  }
}

passport.use(new Strategy(strat));

passport.serializeUser((user, done) => {
  console.log('user :>> ', user);
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await findById(id);
    return done(null, user);
  } catch (err) {
    return done(err);
  }
});

router.use(passport.initialize());
router.use(passport.session());

// router.use((req, res, next) => {
//   if (req.isAuthenticated()) {
//     router.locals.user = req.user;
//   }

//   next();
// });

// Hjálpar middleware sem athugar hvort notandi sé innskráður og hleypir okkur
// þá áfram, annars sendir á /login
// function ensureLoggedIn(req, res, next) {
//   if (req.isAuthenticated()) {
//     return next();
//   }

//   return res.redirect('/login');
// }

// kannski búa til
// router.get('/admin', (req, res) => {
//   if (req.isAuthenticated()) {
//     return res.render('admin', {
//       title: 'Admin',
//       username: req.user.username,
//     });
//   }

//   return res.redirect('/login');
// });

router.get('/login', (req, res) => {
  if (req.isAuthenticated()) {
    return res.redirect('/admin');
  }

  let message = '';

  if (req.session.message && req.session.message.length > 0) {
    message = req.session.message.join(', ');
    req.session.message = [];
  }

  return res.render('login', {
    title: 'Innskráning',
    message,
  });
});

router.post(
  '/admin',
  passport.authenticate('local', {
    failureMessage: 'Notendanafn eða lykilorð vitlaust',
    failureRedirect: '/login',
  }),
  (req, res) => {
    res.redirect('/admin');
  },
);

// router.get('/logout', (req, res) => {
//   req.logout();
//   res.redirect('/');
// });

// router.get('/admin', ensureLoggedIn, (req, res) => {
//   res.render('admin', {
//     title: 'Admin',
//   });
// });

/**
 * Higher-order fall sem umlykur async middleware með villumeðhöndlun.
 *
 * @param {function} fn Middleware sem grípa á villur fyrir
 * @returns {function} Middleware með villumeðhöndlun
 */
function catchErrors(fn) {
  return (req, res, next) => fn(req, res, next).catch(next);
}

// async function login(req, res) {
//   const errors = [];
//   const loginData = {
//     username: '',
//     password: '',
//   };
// }
