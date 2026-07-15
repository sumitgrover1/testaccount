import type { Request, Response } from 'express';
import { asyncHandler } from '../../common/utils/asyncHandler';
import * as packageService from './package.service';
import type {
  AddPackageItemInput,
  CreatePackageInput,
  IdParam,
  ItemIdParam,
  ListPackagesQuery,
  UpdatePackageInput,
  UpdatePackageItemInput,
} from './package.validation';

export const createPackage = asyncHandler(async (req: Request, res: Response) => {
  const input = req.body as CreatePackageInput;
  const pkg = await packageService.createPackage(input, req.user!.id);
  res.status(201).json({ data: pkg });
});

export const getPackage = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params as unknown as IdParam;
  const pkg = await packageService.getPackageById(id);
  res.status(200).json({ data: pkg });
});

export const listPackages = asyncHandler(async (req: Request, res: Response) => {
  const query = req.query as unknown as ListPackagesQuery;
  const result = await packageService.listPackages(query);
  res.status(200).json({ data: result.items, pagination: result.pagination });
});

export const updatePackage = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params as unknown as IdParam;
  const input = req.body as UpdatePackageInput;
  const pkg = await packageService.updatePackage(id, input, req.user!.id);
  res.status(200).json({ data: pkg });
});

export const addPackageItem = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params as unknown as IdParam;
  const input = req.body as AddPackageItemInput;
  const item = await packageService.addPackageItem(id, input, req.user!.id);
  res.status(201).json({ data: item });
});

export const updatePackageItem = asyncHandler(async (req: Request, res: Response) => {
  const { id, itemId } = req.params as unknown as ItemIdParam;
  const input = req.body as UpdatePackageItemInput;
  const item = await packageService.updatePackageItem(id, itemId, input, req.user!.id);
  res.status(200).json({ data: item });
});

export const removePackageItem = asyncHandler(async (req: Request, res: Response) => {
  const { id, itemId } = req.params as unknown as ItemIdParam;
  await packageService.removePackageItem(id, itemId, req.user!.id);
  res.status(204).send();
});
