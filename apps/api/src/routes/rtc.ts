import { Router } from 'express';
import { authRequired } from '../auth.js';
import { getPublicIceServers } from '../constants/rtc.constants.js';

export const rtcRouter = Router();

rtcRouter.get('/rtc/ice-servers', authRequired, (_req, res) => {
  res.json({ iceServers: getPublicIceServers() });
});
