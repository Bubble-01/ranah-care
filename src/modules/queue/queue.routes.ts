import { Router } from 'express';
import { queueController as c } from './queue.controller';
import { authenticate } from '../../middlewares/auth.middleware';
import { authorize } from '../../middlewares/role.middleware';
import { validate } from '../../middlewares/validate.middleware';
import { bookQueueSchema } from './queue.schema';

const router = Router();
router.use(authenticate);

// Pasien
router.post('/', authorize('PASIEN'), validate(bookQueueSchema), c.book);
router.get('/me', authorize('PASIEN'), c.mine);
router.patch('/:id/cancel', authorize('PASIEN'), c.cancel);

// Resepsionis
router.get('/today', authorize('RESEPSIONIS'), c.today);
router.patch('/:id/check-in', authorize('RESEPSIONIS'), c.checkIn);

// Dokter
router.get('/doctor/today', authorize('DOKTER'), c.doctorToday);
router.get('/:id/detail', authorize('DOKTER'), c.doctorDetail);
router.post('/:id/call', authorize('DOKTER'), c.call);

export default router;