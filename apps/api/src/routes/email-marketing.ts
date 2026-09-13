import { Router, type Request, type Response } from 'express';
import {
  recordMarketingClick,
  recordMarketingOpen,
  unsubscribeWithToken
} from '../services/email-marketing.js';
import { processSesSnsMessage } from '../services/email-marketing-ses-feedback.js';

export const emailMarketingRouter = Router();

const transparentGif = Buffer.from('R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=', 'base64');

function preferencePage(success: boolean) {
  const title = success ? 'You are unsubscribed' : 'This link is invalid';
  const detail = success
    ? 'You will not receive future Hope Hub promotional emails. Essential account and service emails are unaffected.'
    : 'We could not update email preferences from this link. Please contact support@hopehub.in.';
  return `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title></head><body style="margin:0;background:#f5f7f9;font-family:Arial,sans-serif;color:#17202a"><main style="max-width:560px;margin:12vh auto;background:#fff;border-radius:16px;padding:32px;box-shadow:0 8px 30px rgba(15,23,42,.08)"><div style="color:#0f766e;font-weight:700;font-size:20px">Hope Hub</div><h1 style="font-size:28px">${title}</h1><p style="line-height:1.6;color:#475569">${detail}</p><a href="https://hopehub.in" style="color:#0f766e">Return to Hope Hub</a></main></body></html>`;
}

async function unsubscribe(req: Request, res: Response) {
  const success = await unsubscribeWithToken(String(req.query.token || ''));
  res
    .status(success ? 200 : 400)
    .type('html')
    .send(preferencePage(success));
}

emailMarketingRouter.get('/email-marketing/unsubscribe', (req, res, next) => {
  void unsubscribe(req, res).catch(next);
});

emailMarketingRouter.post('/email-marketing/unsubscribe', (req, res, next) => {
  void unsubscribe(req, res).catch(next);
});

emailMarketingRouter.get('/email-marketing/open.gif', (req, res) => {
  void recordMarketingOpen(String(req.query.token || '')).catch(() => false);
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  res.type('image/gif').send(transparentGif);
});

emailMarketingRouter.get('/email-marketing/click', (req, res, next) => {
  void recordMarketingClick(String(req.query.token || ''))
    .then((url) => {
      if (!url) return res.status(400).type('text').send('Invalid tracking link.');
      return res.redirect(302, url);
    })
    .catch(next);
});

emailMarketingRouter.post('/email-marketing/ses-feedback', (req, res, next) => {
  const raw = typeof req.body === 'string' ? req.body : JSON.stringify(req.body || {});
  if (Buffer.byteLength(raw) > 256 * 1024) {
    return res.status(413).json({ message: 'Notification is too large.' });
  }
  let message: unknown;
  try {
    message = JSON.parse(raw);
  } catch {
    return res.status(400).json({ message: 'Invalid notification.' });
  }
  void processSesSnsMessage(message as Parameters<typeof processSesSnsMessage>[0])
    .then((result) => res.json({ ok: true, ...result }))
    .catch((error) => {
      if (error instanceof Error && error.message.startsWith('INVALID_SNS_')) {
        return res.status(403).json({ message: 'Invalid notification signature.' });
      }
      next(error);
    });
});
