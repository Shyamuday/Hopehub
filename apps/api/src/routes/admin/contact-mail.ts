import { Router } from 'express';
import { z } from 'zod';
import { asyncRoute, routeParam, writeAuditLog } from '../../utils/helpers.js';
import {
  getContactMail,
  keyForContactMailId,
  listContactMail
} from '../../services/contact-mailbox.js';
import { sendEmail } from '../../services/mail.js';

const CONTACT_REPLY_FROM = process.env.CONTACT_REPLY_FROM || 'contact@hopehub.in';

const replySchema = z.object({
  body: z.string().trim().min(1).max(8000)
});

export function registerAdminContactMailRoutes(router: Router) {
  router.get(
    '/admin/contact-mail',
    asyncRoute(async (req, res) => {
      const limit = Math.min(100, Math.max(1, Number(req.query.limit || 50)));
      const messages = await listContactMail(limit);
      res.json({ messages, from: CONTACT_REPLY_FROM });
    })
  );

  router.get(
    '/admin/contact-mail/:id',
    asyncRoute(async (req, res) => {
      const key = keyForContactMailId(routeParam(req, 'id'));
      const message = await getContactMail(key);
      res.json({ message, from: CONTACT_REPLY_FROM });
    })
  );

  router.post(
    '/admin/contact-mail/:id/reply',
    asyncRoute(async (req, res) => {
      const body = replySchema.parse(req.body);
      const key = keyForContactMailId(routeParam(req, 'id'));
      const message = await getContactMail(key);
      if (!message.fromEmail) {
        return res.status(400).json({ message: 'Sender email is missing.' });
      }

      const subject = message.subject.toLowerCase().startsWith('re:')
        ? message.subject
        : `Re: ${message.subject}`;
      await sendEmail({
        from: CONTACT_REPLY_FROM,
        to: message.fromEmail,
        subject,
        text: `${body.body}\n\n--- Original message ---\nFrom: ${message.from}\nDate: ${
          message.date || ''
        }\nSubject: ${message.subject}\n\n${message.text}`,
        replyTo: CONTACT_REPLY_FROM
      });

      await writeAuditLog({
        actorId: req.user!.id,
        actorRole: req.user!.role,
        action: 'contact_mail.reply',
        targetType: 'ContactMail',
        targetId: message.id,
        summary: `Replied to ${message.fromEmail}`,
        metadata: { key, subject: message.subject }
      });

      res.json({ message: 'Reply sent.' });
    })
  );
}
