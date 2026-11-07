import { Router } from 'express';
import authRoutes from '../modules/auth/auth.routes';
import chatRoutes from '../modules/chat/chat.routes';
import queueRoutes from '../modules/queue/queue.routes';
import medicalRecordRoutes from '../modules/medical-records/medical-records.routes';
import faskesRoutes from '../modules/faskes/faskes.routes';
import userRoutes from '../modules/users/users.routes';


const router = Router();

router.get('/health', (_req, res) => {
  res.json({ success: true, message: 'API berjalan normal', timestamp: new Date().toISOString() });
});

router.use('/auth', authRoutes);
router.use('/chat', chatRoutes);
router.use('/queues', queueRoutes);
router.use('/medical-records', medicalRecordRoutes);
router.use('/faskes', faskesRoutes);
router.use('/users', userRoutes);

export default router;