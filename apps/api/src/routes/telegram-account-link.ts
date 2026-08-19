import { Router } from 'express';
import { authRequired } from '../auth.js';
import {
  createTelegramAccountLink,
  telegramConnectionForUser,
  unlinkTelegramAccount
} from '../services/telegram-account-link.js';
import { asyncRoute } from '../utils/helpers.js';

export const telegramAccountLinkRouter = Router();

telegramAccountLinkRouter.get(
  '/telegram/account-link',
  authRequired,
  asyncRoute(async (req, res) => {
    res.json(await telegramConnectionForUser(req.user!.id, req.user!.role));
  })
);

telegramAccountLinkRouter.post(
  '/telegram/account-link',
  authRequired,
  asyncRoute(async (req, res) => {
    res.status(201).json(await createTelegramAccountLink(req.user!.id, req.user!.role));
  })
);

telegramAccountLinkRouter.delete(
  '/telegram/account-link',
  authRequired,
  asyncRoute(async (req, res) => {
    await unlinkTelegramAccount(req.user!.id, req.user!.role);
    res.status(204).end();
  })
);
