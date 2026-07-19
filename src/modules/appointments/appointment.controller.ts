import type { Request, Response } from 'express';
import { asyncHandler } from '../../common/utils/asyncHandler';
import * as appointmentService from './appointment.service';
import type {
  CancelAppointmentInput,
  CreateAppointmentInput,
  IdParam,
  ListAppointmentsQuery,
  RescheduleAppointmentInput,
  UpdateAppointmentInput,
} from './appointment.validation';

export const createAppointment = asyncHandler(async (req: Request, res: Response) => {
  const input = req.body as CreateAppointmentInput;
  const appointment = await appointmentService.createAppointment(input, req.user!.id);
  res.status(201).json({ data: appointment });
});

export const getAppointment = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params as unknown as IdParam;
  const appointment = await appointmentService.getAppointmentById(id);
  res.status(200).json({ data: appointment });
});

export const listAppointments = asyncHandler(async (req: Request, res: Response) => {
  const query = req.query as unknown as ListAppointmentsQuery;
  const result = await appointmentService.listAppointments(query);
  res.status(200).json({ data: result.items, pagination: result.pagination });
});

export const updateAppointment = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params as unknown as IdParam;
  const input = req.body as UpdateAppointmentInput;
  const appointment = await appointmentService.updateAppointment(id, input, req.user!.id);
  res.status(200).json({ data: appointment });
});

export const checkInAppointment = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params as unknown as IdParam;
  const appointment = await appointmentService.checkInAppointment(id, req.user!.id);
  res.status(200).json({ data: appointment });
});

export const completeAppointment = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params as unknown as IdParam;
  const appointment = await appointmentService.completeAppointment(id, req.user!.id);
  res.status(200).json({ data: appointment });
});

export const cancelAppointment = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params as unknown as IdParam;
  const input = req.body as CancelAppointmentInput;
  const appointment = await appointmentService.cancelAppointment(id, input, req.user!.id);
  res.status(200).json({ data: appointment });
});

export const markNoShow = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params as unknown as IdParam;
  const appointment = await appointmentService.markNoShow(id, req.user!.id);
  res.status(200).json({ data: appointment });
});

export const rescheduleAppointment = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params as unknown as IdParam;
  const input = req.body as RescheduleAppointmentInput;
  const appointment = await appointmentService.rescheduleAppointment(id, input, req.user!.id);
  res.status(201).json({ data: appointment });
});
