import express from 'express';
import dotenv from 'dotenv';
import { deleteUser, getUsername, list, listCount } from './db.js';

dotenv.config();

export const router = express.Router();

/**
 * Higher-order fall sem umlykur async middleware með villumeðhöndlun.
 *
 * @param {function} fn Middleware sem grípa á villur fyrir
 * @returns {function} Middleware með villumeðhöndlun
 */
function catchErrors(fn) {
  return (req, res, next) => fn(req, res, next).catch(next);
}

async function admin(req, res) {
  let { offset = 0, limit = 50 } = req.query;
  offset = Number(offset);
  limit = Number(limit);

  const isUser = true;
  const whoAmI = await getUsername();

  const count = await listCount();
  const registrations = await list(offset, limit);

  const result = {
    links: {
      self: {
        href: `/?offset=${offset}&limit=${limit}`,
      },
    },
    items: registrations,
    offset,
    limit,
  };

  if (offset > 0) {
    result.links.prev = {
      href: `/?offset=${offset - limit}&limit=${limit}`,
    };
  } else {
    result.links.prev = { href: '' };
  }

  if (registrations.length <= limit) {
    result.links.next = {
      href: `/?offset=${Number(offset) + limit}&limit=${limit}`,
    };
  }
  res.render('admin', {
    registrations,
    count: count[0].count,
    result,
    isUser,
    whoAmI: whoAmI[0].username,
    title: 'Undirskrifarlisti - admin',
  });
}

function ensureLoggedIn(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }

  return res.redirect('/login');
}

router.get('/admin', ensureLoggedIn, catchErrors(admin));

router.get('/logout', (req, res) => {
  req.logout();
  res.redirect('/');
});

router.post('/delete', ensureLoggedIn, (req, res) => {
  const userId = parseInt(req.body.delete, 10);
  deleteUser(userId);

  res.redirect('/admin');
});
