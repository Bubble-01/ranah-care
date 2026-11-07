import { Router } from 'express';
import authRoutes from '../modules/auth/auth.routes';

const router = Router();

router.get('/health', (_req, res) => {
  res.json({ success: true, message: 'API berjalan normal', timestamp: new Date().toISOString() });
});

router.use('/auth', authRoutes);

export default router;