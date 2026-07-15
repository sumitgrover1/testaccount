import { apiClient } from './client';
import type { ApiEnvelope, Paginated, Patient, PatientDocument, PatientStatus } from '@/types';

export interface PatientInput {
  fullName: string;
  mobileNumber: string;
  gender: 'MALE' | 'FEMALE' | 'OTHER';
  dateOfBirth?: string;
  age?: number;
  city: string;
  state: string;
  email?: string;
  address?: string;
  occupation?: string;
  referralSource?: string;
  notes?: string;
  allergies?: string;
  existingDiseases?: string;
  currentMedication?: string;
  previousTreatmentHistory?: string;
  status?: PatientStatus;
}

export async function createPatient(input: PatientInput) {
  const res = await apiClient.post<ApiEnvelope<Patient>>('/patients', input);
  return res.data.data;
}

export async function listPatients(params: {
  page?: number;
  limit?: number;
  search?: string;
  status?: PatientStatus;
}) {
  const res = await apiClient.get<Paginated<Patient>>('/patients', { params });
  return res.data;
}

export async function getPatient(id: string) {
  const res = await apiClient.get<ApiEnvelope<Patient>>(`/patients/${id}`);
  return res.data.data;
}

export async function updatePatient(id: string, input: Partial<PatientInput>) {
  const res = await apiClient.patch<ApiEnvelope<Patient>>(`/patients/${id}`, input);
  return res.data.data;
}

export async function listPatientDocuments(patientId: string) {
  const res = await apiClient.get<ApiEnvelope<PatientDocument[]>>(`/patients/${patientId}/documents`);
  return res.data.data;
}

export async function addPatientDocument(
  patientId: string,
  input: { type: string; fileUrl: string; fileName: string; notes?: string },
) {
  const res = await apiClient.post<ApiEnvelope<PatientDocument>>(`/patients/${patientId}/documents`, input);
  return res.data.data;
}
