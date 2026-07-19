import { apiClient } from './client';
import type { ApiEnvelope, CommunicationChannel, TimelineEntry } from '@/types';

export async function createCommunicationLog(input: {
  leadId?: string;
  patientId?: string;
  channel: CommunicationChannel;
  direction?: 'INBOUND' | 'OUTBOUND';
  content?: string;
}) {
  const res = await apiClient.post('/communications', input);
  return res.data.data;
}

export async function getPatientTimeline(patientId: string) {
  const res = await apiClient.get<ApiEnvelope<TimelineEntry[]>>(`/communications/patients/${patientId}/timeline`);
  return res.data.data;
}

export async function getLeadTimeline(leadId: string) {
  const res = await apiClient.get<ApiEnvelope<TimelineEntry[]>>(`/communications/leads/${leadId}/timeline`);
  return res.data.data;
}
