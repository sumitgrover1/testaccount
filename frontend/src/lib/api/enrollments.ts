import { apiClient } from './client';
import type { ApiEnvelope, EnrollmentStatus, Paginated, TreatmentEnrollment } from '@/types';

export interface CreateEnrollmentInput {
  patientId: string;
  assignedDoctorId: string;
  assignedTherapistId?: string;
  packageId?: string;
  items?: { treatmentId: string; sessionsTotal?: number; price?: number }[];
  expiryDate?: string;
}

export async function createEnrollment(input: CreateEnrollmentInput) {
  const res = await apiClient.post<ApiEnvelope<TreatmentEnrollment>>('/treatment-enrollments', input);
  return res.data.data;
}

export async function listEnrollments(params: {
  page?: number;
  limit?: number;
  patientId?: string;
  status?: EnrollmentStatus;
  assignedDoctorId?: string;
}) {
  const res = await apiClient.get<Paginated<TreatmentEnrollment>>('/treatment-enrollments', { params });
  return res.data;
}

export async function getEnrollment(id: string) {
  const res = await apiClient.get<ApiEnvelope<TreatmentEnrollment>>(`/treatment-enrollments/${id}`);
  return res.data.data;
}

export async function updateEnrollmentStatus(id: string, status: EnrollmentStatus) {
  const res = await apiClient.patch<ApiEnvelope<TreatmentEnrollment>>(`/treatment-enrollments/${id}/status`, {
    status,
  });
  return res.data.data;
}

export async function recordSession(enrollmentId: string, itemId: string, input: { appointmentId?: string; notes?: string }) {
  const res = await apiClient.post(`/treatment-enrollments/${enrollmentId}/items/${itemId}/sessions`, input);
  return res.data.data;
}
