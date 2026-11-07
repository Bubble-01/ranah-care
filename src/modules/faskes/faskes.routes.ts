import { Router } from 'express';
import { faskesController as c } from './faskes.controller';
import { authenticate } from '../../middlewares/auth.middleware';
import { authorize } from '../../middlewares/role.middleware';
import { validate } from '../../middlewares/validate.middleware';
import { createFaskesSchema, poliSchema, updateFaskesSchema, updatePoliSchema } from './faskes.schema';

const router = Router();
router.use(authenticate);

// Semua role yang login boleh melihat daftar faskes
router.get('/', c.list);
router.get('/:id', c.get);

// Hanya Admin
router.post('/', authorize('ADMIN'), validate(createFaskesSchema), c.create);
router.patch('/:id', authorize('ADMIN'), validate(updateFaskesSchema), c.update);
router.post('/:id/poli', authorize('ADMIN'), validate(poliSchema), c.createPoli);
router.patch('/poli/:poliId', authorize('ADMIN'), validate(updatePoliSchema), c.updatePoli);

export default router;