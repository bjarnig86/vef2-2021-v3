/* eslint-disable object-curly-newline */
/* eslint-disable comma-dangle */
import express from 'express';
import { body, validationResult } from 'express-validator';
import xss from 'xss';
import dotenv from 'dotenv';
import { list, insert, listCount } from './db.js';

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

async function index(req, res) {
  const errors = [];
  const formData = {
    name: '',
    nationalId: '',
    anonymous: false,
    comment: '',
  };

  let { offset = 0, limit = 50 } = req.query;
  offset = Number(offset);
  limit = Number(limit);
  const isUser = false;

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

  res.render('index', {
    errors,
    formData,
    registrations,
    isUser,
    count: count[0].count,
    result,
    title: 'Undirskrifarlisti',
  });
}

const nationalIdPattern = '^[0-9]{6}-?[0-9]{4}$';

const validationMiddleware = [
  body('name').isLength({ min: 1 }).withMessage('Nafn má ekki vera tómt'),
  body('name')
    .isLength({ max: 128 })
    .withMessage('Nafn má að hámarki vera 128 stafir'),
  body('nationalId')
    .isLength({ min: 1 })
    .withMessage('Kennitala má ekki vera tóm'),
  body('nationalId')
    .matches(new RegExp(nationalIdPattern))
    .withMessage('Kennitala verður að vera á formi 000000-0000 eða 0000000000'),
  body('comment')
    .isLength({ max: 400 })
    .withMessage('Athugasemd má að hámarki vera 400 stafir'),
];

// Viljum keyra sér og með validation, ver gegn „self XSS“
const xssSanitizationMiddleware = [
  body('name').customSanitizer((v) => xss(v)),
  body('nationalId').customSanitizer((v) => xss(v)),
  body('comment').customSanitizer((v) => xss(v)),
  body('anonymous').customSanitizer((v) => xss(v)),
];

const sanitizationMiddleware = [
  body('name').trim().escape(),
  body('nationalId').blacklist('-'),
];

async function validationCheck(req, res, next) {
  const { name, nationalId, comment, anonymous } = req.body;
  let { offset = 0, limit = 50 } = req.query;
  offset = Number(offset);
  limit = Number(limit);
  const isUser = false;

  const formData = {
    name,
    nationalId,
    comment,
    anonymous,
  };

  const registrations = await list(offset, limit);
  const count = await listCount();

  const validation = validationResult(req);

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

  if (!validation.isEmpty()) {
    return res.render('index', {
      formData,
      errors: validation.errors,
      registrations,
      isUser,
      count: count[0].count,
      result,
      title: 'Undirskriftalisti',
    });
  }

  return next();
}

async function register(req, res) {
  const { name, nationalId, comment, anonymous } = req.body;

  let success = true;

  try {
    success = await insert({
      name,
      nationalId,
      comment,
      anonymous,
    });
  } catch (e) {
    console.error(e);
  }

  if (success) {
    return res.redirect('/');
  }

  return res.render('error', {
    title: 'Gat ekki skráð!',
    text: 'Hafðir þú skrifað undir áður?',
  });
}

router.get('/', catchErrors(index));

router.post(
  '/',
  validationMiddleware,
  xssSanitizationMiddleware,
  catchErrors(validationCheck),
  sanitizationMiddleware,
  catchErrors(register),
);
