import { Router } from 'express';
import { medicalRecordController as c } from './medical-records.controller';
import { authenticate } from '../../middlewares/auth.middleware';
import { authorize } from '../../middlewares/role.middleware';
import { validate } from '../../middlewares/validate.middleware';
import { createRecordSchema } from './medical-records.schema';

const router = Router();
router.use(authenticate);

router.post('/', authorize('DOKTER'), validate(createRecordSchema), c.create);
router.get('/me', authorize('PASIEN'), c.mine);
router.get('/patient/:patientId', authorize('DOKTER'), c.patientHistory);

export default router;