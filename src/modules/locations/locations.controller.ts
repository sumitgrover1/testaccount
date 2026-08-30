import type { Request, Response } from 'express';
import { asyncHandler } from '../../common/utils/asyncHandler';
import * as locationsService from './locations.service';
import type { PincodeParam } from './locations.validation';

export const getPincodeLookup = asyncHandler(async (req: Request, res: Response) => {
  const { pincode } = req.params as unknown as PincodeParam;
  const data = await locationsService.lookupPincode(pincode);
  res.status(200).json({ data });
});
