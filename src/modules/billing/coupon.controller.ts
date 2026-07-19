import type { Request, Response } from 'express';
import { asyncHandler } from '../../common/utils/asyncHandler';
import * as couponService from './coupon.service';
import type {
  CreateCouponInput,
  IdParam,
  ListCouponsQuery,
  UpdateCouponInput,
} from './coupon.validation';

export const createCoupon = asyncHandler(async (req: Request, res: Response) => {
  const input = req.body as CreateCouponInput;
  const coupon = await couponService.createCoupon(input, req.user!.id);
  res.status(201).json({ data: coupon });
});

export const listCoupons = asyncHandler(async (req: Request, res: Response) => {
  const query = req.query as unknown as ListCouponsQuery;
  const result = await couponService.listCoupons(query);
  res.status(200).json({ data: result.items, pagination: result.pagination });
});

export const updateCoupon = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params as unknown as IdParam;
  const input = req.body as UpdateCouponInput;
  const coupon = await couponService.updateCoupon(id, input, req.user!.id);
  res.status(200).json({ data: coupon });
});
