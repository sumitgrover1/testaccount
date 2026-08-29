import { Router } from 'express';
import authRoutes from '../modules/auth/auth.routes';
import catalogRoutes from '../modules/catalog/catalog.routes';
import cityRoutes from '../modules/cities/city.routes';
import dashboardRoutes from '../modules/dashboard/dashboard.routes';
import financeRoutes from '../modules/finance/finance.routes';
import insuranceRoutes from '../modules/insurance/insurance.routes';
import leadRoutes from '../modules/leads/lead.routes';
import pricingRoutes from '../modules/pricing/pricing.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/catalog', catalogRoutes);
router.use('/cities', cityRoutes);
router.use('/pricing', pricingRoutes);
router.use('/leads', leadRoutes);
router.use('/finance', financeRoutes);
router.use('/insurance', insuranceRoutes);
router.use('/dashboard', dashboardRoutes);

export default router;
