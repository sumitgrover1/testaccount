import { apiClient } from './client';
import type { ApiEnvelope, Appointment, AppointmentStatus, Paginated } from '@/types';

export interface AppointmentInput {
  patientId: string;
  doctorId: string;
  treatmentId?: string;
  scheduledDate: string;
  notes?: string;
}

export async function createAppointment(input: AppointmentInput) {
  const res = await apiClient.post<ApiEnvelope<Appointment>>('/appointments', input);
  return res.data.data;
}

export async function listAppointments(params: {
  page?: number;
  limit?: number;
  patientId?: string;
  doctorId?: string;
  status?: AppointmentStatus;
  fromDate?: string;
  toDate?: string;
}) {
  const res = await apiClient.get<Paginated<Appointment>>('/appointments', { params });
  return res.data;
}

export async function getAppointment(id: string) {
  const res = await apiClient.get<ApiEnvelope<Appointment>>(`/appointments/${id}`);
  return res.data.data;
}

export async function updateAppointment(id: string, input: Partial<AppointmentInput>) {
  const res = await apiClient.patch<ApiEnvelope<Appointment>>(`/appointments/${id}`, input);
  return res.data.data;
}

export async function checkInAppointment(id: string) {
  const res = await apiClient.post<ApiEnvelope<Appointment>>(`/appointments/${id}/check-in`);
  return res.data.data;
}

export async function completeAppointment(id: string) {
  const res = await apiClient.post<ApiEnvelope<Appointment>>(`/appointments/${id}/complete`);
  return res.data.data;
}

export async function cancelAppointment(id: string, reason?: string) {
  const res = await apiClient.post<ApiEnvelope<Appointment>>(`/appointments/${id}/cancel`, { reason });
  return res.data.data;
}

export async function markNoShow(id: string) {
  const res = await apiClient.post<ApiEnvelope<Appointment>>(`/appointments/${id}/no-show`);
  return res.data.data;
}

export async function rescheduleAppointment(
  id: string,
  input: { scheduledDate: string; doctorId?: string; notes?: string },
) {
  const res = await apiClient.post<ApiEnvelope<Appointment>>(`/appointments/${id}/reschedule`, input);
  return res.data.data;
}
