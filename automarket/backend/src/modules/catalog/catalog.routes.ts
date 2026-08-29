import { Router } from 'express';
import { validate } from '../../middlewares/validate.middleware';
import * as catalogController from './catalog.controller';
import {
  compareQuerySchema,
  listBrandsQuerySchema,
  listModelsQuerySchema,
  modelPathParamSchema,
  searchQuerySchema,
  vehicleTypeParamSchema,
} from './catalog.validation';

const router = Router();

// The whole catalog is public — discovery is the top of the lead funnel and
// must not sit behind a login.
router.get('/home-feed', catalogController.getHomeFeed);
router.get('/brands', validate({ query: listBrandsQuerySchema }), catalogController.listBrands);
router.get('/models', validate({ query: listModelsQuerySchema }), catalogController.listModels);
router.get('/search', validate({ query: searchQuerySchema }), catalogController.search);
router.get('/compare', validate({ query: compareQuerySchema }), catalogController.compare);
router.get(
  '/filters/:vehicleType',
  validate({ params: vehicleTypeParamSchema }),
  catalogController.getFilters,
);
router.get('/models/:id/similar', catalogController.getSimilar);
router.get(
  '/models/:brandSlug/:modelSlug',
  validate({ params: modelPathParamSchema }),
  catalogController.getModel,
);

export default router;
