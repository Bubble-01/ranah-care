import { Router } from 'express';
import { chatController } from './chat.controller';
import { authenticate } from '../../middlewares/auth.middleware';
import { authorize } from '../../middlewares/role.middleware';
import { validate } from '../../middlewares/validate.middleware';
import { sendMessageSchema } from './chat.schema';

const router = Router();

router.use(authenticate, authorize('PASIEN')); // RBAC: hanya pasien

router.post('/messages', validate(sendMessageSchema), chatController.sendMessage);
router.get('/sessions', chatController.listSessions);
router.get('/sessions/:id', chatController.getSession);
router.post('/sessions/:id/summarize', chatController.summarize);

export default router;