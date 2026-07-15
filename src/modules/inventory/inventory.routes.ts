import { Router } from 'express';
import { Role } from '@prisma/client';
import { ADMIN_ROLES } from '../../common/constants/roles';
import { authenticate } from '../../middlewares/auth.middleware';
import { authorize } from '../../middlewares/rbac.middleware';
import { validate } from '../../middlewares/validate.middleware';
import * as supplierController from './supplier.controller';
import * as productController from './product.controller';
import * as purchaseController from './purchase.controller';
import {
  createSupplierSchema,
  idParamSchema as supplierIdParamSchema,
  listSuppliersQuerySchema,
  updateSupplierSchema,
} from './supplier.validation';
import {
  addConsumptionRuleSchema,
  adjustStockSchema,
  batchIdParamSchema,
  createBatchSchema,
  createProductSchema,
  idParamSchema as productIdParamSchema,
  listProductsQuerySchema,
  ruleIdParamSchema,
  updateProductSchema,
} from './product.validation';
import {
  addPurchaseInvoiceItemSchema,
  confirmPurchaseInvoiceItemSchema,
  createPurchaseInvoiceSchema,
  idParamSchema as invoiceIdParamSchema,
  itemIdParamSchema as invoiceItemIdParamSchema,
  listPurchaseInvoicesQuerySchema,
} from './purchase.validation';

const router = Router();

const INVENTORY_MANAGERS = [...ADMIN_ROLES, Role.INVENTORY_MANAGER] as const;
const INVENTORY_READERS = [...INVENTORY_MANAGERS, Role.DOCTOR, Role.ACCOUNTANT] as const;

router.use(authenticate);

// --- Suppliers ---
router.post(
  '/suppliers',
  authorize(...INVENTORY_MANAGERS),
  validate({ body: createSupplierSchema }),
  supplierController.createSupplier,
);
router.get(
  '/suppliers',
  authorize(...INVENTORY_READERS),
  validate({ query: listSuppliersQuerySchema }),
  supplierController.listSuppliers,
);
router.get(
  '/suppliers/:id',
  authorize(...INVENTORY_READERS),
  validate({ params: supplierIdParamSchema }),
  supplierController.getSupplier,
);
router.patch(
  '/suppliers/:id',
  authorize(...INVENTORY_MANAGERS),
  validate({ params: supplierIdParamSchema, body: updateSupplierSchema }),
  supplierController.updateSupplier,
);

// --- Products & batches ---
router.post(
  '/products',
  authorize(...INVENTORY_MANAGERS),
  validate({ body: createProductSchema }),
  productController.createProduct,
);
router.get(
  '/products',
  authorize(...INVENTORY_READERS),
  validate({ query: listProductsQuerySchema }),
  productController.listProducts,
);
router.get(
  '/products/low-stock',
  authorize(...INVENTORY_MANAGERS),
  productController.listLowStockProducts,
);
router.get(
  '/products/:id',
  authorize(...INVENTORY_READERS),
  validate({ params: productIdParamSchema }),
  productController.getProduct,
);
router.patch(
  '/products/:id',
  authorize(...INVENTORY_MANAGERS),
  validate({ params: productIdParamSchema, body: updateProductSchema }),
  productController.updateProduct,
);

router.post(
  '/products/:id/batches',
  authorize(...INVENTORY_MANAGERS),
  validate({ params: productIdParamSchema, body: createBatchSchema }),
  productController.createBatch,
);
router.get(
  '/products/:id/batches',
  authorize(...INVENTORY_READERS),
  validate({ params: productIdParamSchema }),
  productController.listBatchesForProduct,
);
router.post(
  '/products/:id/batches/:batchId/adjust',
  authorize(...INVENTORY_MANAGERS),
  validate({ params: batchIdParamSchema, body: adjustStockSchema }),
  productController.adjustBatchStock,
);
router.get(
  '/products/:id/batches/:batchId/movements',
  authorize(...INVENTORY_READERS),
  validate({ params: batchIdParamSchema }),
  productController.listBatchMovements,
);

// --- Product consumption rules (per treatment) ---
router.post(
  '/treatments/:id/consumption-rules',
  authorize(...INVENTORY_MANAGERS, Role.DOCTOR),
  validate({ params: productIdParamSchema, body: addConsumptionRuleSchema }),
  productController.addConsumptionRule,
);
router.get(
  '/treatments/:id/consumption-rules',
  authorize(...INVENTORY_READERS),
  validate({ params: productIdParamSchema }),
  productController.listConsumptionRules,
);
router.delete(
  '/treatments/:id/consumption-rules/:ruleId',
  authorize(...INVENTORY_MANAGERS, Role.DOCTOR),
  validate({ params: ruleIdParamSchema }),
  productController.removeConsumptionRule,
);

// --- Purchase invoices (OCR-assisted entry) ---
router.post(
  '/purchase-invoices',
  authorize(...INVENTORY_MANAGERS),
  validate({ body: createPurchaseInvoiceSchema }),
  purchaseController.createPurchaseInvoice,
);
router.get(
  '/purchase-invoices',
  authorize(...INVENTORY_MANAGERS),
  validate({ query: listPurchaseInvoicesQuerySchema }),
  purchaseController.listPurchaseInvoices,
);
router.get(
  '/purchase-invoices/:id',
  authorize(...INVENTORY_MANAGERS),
  validate({ params: invoiceIdParamSchema }),
  purchaseController.getPurchaseInvoice,
);
router.post(
  '/purchase-invoices/:id/items',
  authorize(...INVENTORY_MANAGERS),
  validate({ params: invoiceIdParamSchema, body: addPurchaseInvoiceItemSchema }),
  purchaseController.addPurchaseInvoiceItem,
);
router.post(
  '/purchase-invoices/:id/items/:itemId/confirm',
  authorize(...INVENTORY_MANAGERS),
  validate({ params: invoiceItemIdParamSchema, body: confirmPurchaseInvoiceItemSchema }),
  purchaseController.confirmPurchaseInvoiceItem,
);

export default router;
