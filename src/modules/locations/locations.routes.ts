import { Router } from 'express';
import { authenticate } from '../../middlewares/auth.middleware';
import { validate } from '../../middlewares/validate.middleware';
import * as locationsController from './locations.controller';
import { pincodeParamSchema } from './locations.validation';

const router = Router();

router.use(authenticate);

// Any authenticated staff member can look up a pincode while filling out a
// patient's address — this isn't a privileged operation.
router.get(
  '/pincode/:pincode',
  validate({ params: pincodeParamSchema }),
  locationsController.getPincodeLookup,
);

export default router;
