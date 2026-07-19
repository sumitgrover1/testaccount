import { Router } from 'express';
import { Role } from '@prisma/client';
import { ADMIN_ROLES } from '../../common/constants/roles';
import { authenticate } from '../../middlewares/auth.middleware';
import { authorize } from '../../middlewares/rbac.middleware';
import { validate } from '../../middlewares/validate.middleware';
import * as blogController from './blog.controller';
import {
  createBlogPostSchema,
  idParamSchema,
  listBlogPostsQuerySchema,
  publicListBlogPostsQuerySchema,
  slugParamSchema,
  updateBlogPostSchema,
} from './blog.validation';

const router = Router();

const BLOG_EDITORS = [...ADMIN_ROLES, Role.MARKETING_TEAM] as const;

// Public, unauthenticated — the marketing website's Blog list and article
// pages. Registered before authenticate so they stay open, and mounted
// ahead of the authenticated /:id route so /public-list can never be
// shadowed by it.
router.get(
  '/public-list',
  validate({ query: publicListBlogPostsQuerySchema }),
  blogController.listPublicBlogPosts,
);
router.get('/public-tags', blogController.listPublicBlogTags);
router.get(
  '/public/:slug',
  validate({ params: slugParamSchema }),
  blogController.getPublicBlogPostBySlug,
);

router.use(authenticate);

router.post(
  '/',
  authorize(...BLOG_EDITORS),
  validate({ body: createBlogPostSchema }),
  blogController.createBlogPost,
);
router.get(
  '/',
  authorize(...BLOG_EDITORS),
  validate({ query: listBlogPostsQuerySchema }),
  blogController.listBlogPosts,
);
router.get(
  '/:id',
  authorize(...BLOG_EDITORS),
  validate({ params: idParamSchema }),
  blogController.getBlogPost,
);
router.patch(
  '/:id',
  authorize(...BLOG_EDITORS),
  validate({ params: idParamSchema, body: updateBlogPostSchema }),
  blogController.updateBlogPost,
);
router.delete(
  '/:id',
  authorize(...BLOG_EDITORS),
  validate({ params: idParamSchema }),
  blogController.deleteBlogPost,
);

export default router;
