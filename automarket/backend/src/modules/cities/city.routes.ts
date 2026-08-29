import { Router } from 'express';
import { validate } from '../../middlewares/validate.middleware';
import * as cityController from './city.controller';
import { citySlugParamSchema, listCitiesQuerySchema } from './city.validation';

const router = Router();

router.get('/', validate({ query: listCitiesQuerySchema }), cityController.listCities);
router.get('/:slug', validate({ params: citySlugParamSchema }), cityController.getCity);

export default router;
