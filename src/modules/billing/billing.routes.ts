import { Router } from 'express';
import { Role } from '@prisma/client';
import { ADMIN_ROLES } from '../../common/constants/roles';
import { authenticate } from '../../middlewares/auth.middleware';
import { authorize } from '../../middlewares/rbac.middleware';
import { validate } from '../../middlewares/validate.middleware';
import * as invoiceController from './invoice.controller';
import * as couponController from './coupon.controller';
import {
  addPaymentSchema,
  cancelInvoiceSchema,
  createInvoiceSchema,
  idParamSchema,
  listInvoicesQuerySchema,
} from './invoice.validation';
import {
  createCouponSchema,
  listCouponsQuerySchema,
  updateCouponSchema,
  idParamSchema as couponIdParamSchema,
} from './coupon.validation';

const router = Router();

const BILLING_STAFF = [...ADMIN_ROLES, Role.ACCOUNTANT, Role.RECEPTIONIST] as const;

router.use(authenticate);

router.post(
  '/invoices',
  authorize(...BILLING_STAFF),
  validate({ body: createInvoiceSchema }),
  invoiceController.createInvoice,
);
router.get(
  '/invoices',
  authorize(...BILLING_STAFF),
  validate({ query: listInvoicesQuerySchema }),
  invoiceController.listInvoices,
);
router.get(
  '/invoices/:id',
  authorize(...BILLING_STAFF),
  validate({ params: idParamSchema }),
  invoiceController.getInvoice,
);
router.post(
  '/invoices/:id/payments',
  authorize(...BILLING_STAFF),
  validate({ params: idParamSchema, body: addPaymentSchema }),
  invoiceController.addPayment,
);
router.post(
  '/invoices/:id/cancel',
  authorize(...ADMIN_ROLES, Role.ACCOUNTANT),
  validate({ params: idParamSchema, body: cancelInvoiceSchema }),
  invoiceController.cancelInvoice,
);

router.post(
  '/coupons',
  authorize(...ADMIN_ROLES),
  validate({ body: createCouponSchema }),
  couponController.createCoupon,
);
router.get(
  '/coupons',
  authorize(...BILLING_STAFF),
  validate({ query: listCouponsQuerySchema }),
  couponController.listCoupons,
);
router.patch(
  '/coupons/:id',
  authorize(...ADMIN_ROLES),
  validate({ params: couponIdParamSchema, body: updateCouponSchema }),
  couponController.updateCoupon,
);

export default router;
