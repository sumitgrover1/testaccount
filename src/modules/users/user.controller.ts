import type { Request, Response } from 'express';
import { asyncHandler } from '../../common/utils/asyncHandler';
import * as userService from './user.service';
import type {
  IdParam,
  ListUsersQuery,
  UpdateProfileInput,
  UpdateUserAdminInput,
} from './user.validation';

export const getMe = asyncHandler(async (req: Request, res: Response) => {
  const user = await userService.getUserById(req.user!.id);
  res.status(200).json({ data: user });
});

export const updateMe = asyncHandler(async (req: Request, res: Response) => {
  const input = req.body as UpdateProfileInput;
  const user = await userService.updateProfile(req.user!.id, input);
  res.status(200).json({ data: user });
});

export const getUser = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params as unknown as IdParam;
  const user = await userService.getUserById(id);
  res.status(200).json({ data: user });
});

export const listUsers = asyncHandler(async (req: Request, res: Response) => {
  const query = req.query as unknown as ListUsersQuery;
  const result = await userService.listUsers(query);
  res.status(200).json({ data: result.items, pagination: result.pagination });
});

export const updateUserAsAdmin = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params as unknown as IdParam;
  const input = req.body as UpdateUserAdminInput;
  const user = await userService.updateUserAsAdmin(id, input, req.user!.id);
  res.status(200).json({ data: user });
});
