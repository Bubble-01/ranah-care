import { Router } from 'express';
import { userController as c } from './users.controller';
import { authenticate } from '../../middlewares/auth.middleware';
import { authorize } from '../../middlewares/role.middleware';
import { validate } from '../../middlewares/validate.middleware';
import { createUserSchema, updateStatusSchema } from './users.schema';

const router = Router();
router.use(authenticate, authorize('ADMIN')); // seluruh modul ini khusus Admin

router.get('/', c.list);
router.post('/', validate(createUserSchema), c.create);
router.patch('/:id/status', validate(updateStatusSchema), c.setStatus);

export default router;