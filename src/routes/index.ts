import { Router } from 'express';

const router = Router();

router.get('/health', (_req, res) => {
  res.json({ success: true, message: 'API berjalan normal', timestamp: new Date().toISOString() });
});

export default router;