'use client';

import { useParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import * as patientsApi from '@/lib/api/patients';
import * as communicationsApi from '@/lib/api/communications';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card, CardBody } from '@/components/ui/Card';
import { Tabs } from '@/components/ui/Tabs';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Table } from '@/components/ui/Table';
import { useToast } from '@/components/ui/Toast';
import { getApiErrorMessage } from '@/lib/api/client';
import { formatDate, formatDateTime, titleCase } from '@/lib/utils/format';
import { FullPageSpinner } from '@/components/ui/Spinner';
import { PatientForm } from '../_components/PatientForm';

function ProfileTab({ patientId }: { patientId: string }) {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToast();
  const { data: patient } = useQuery({ queryKey: ['patients', patientId], queryFn: () => patientsApi.getPatient(patientId) });

  const updateMutation = useMutation({
    mutationFn: (values: patientsApi.PatientInput) => patientsApi.updatePatient(patientId, values),
    onSuccess: () => {
      showSuccess('Patient updated');
      void queryClient.invalidateQueries({ queryKey: ['patients', patientId] });
    },
    onError: (err) => showError(getApiErrorMessage(err, 'Failed to update patient')),
  });

  if (!patient) return null;

  return (
    <Card>
      <CardBody>
        <PatientForm defaultValues={patient} onSubmit={(values) => updateMutation.mutateAsync(values).then(() => {})} isSubmitting={updateMutation.isPending} />
      </CardBody>
    </Card>
  );
}

function DocumentsTab({ patientId }: { patientId: string }) {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToast();
  const [fileUrl, setFileUrl] = useState('');
  const [fileName, setFileName] = useState('');
  const [type, setType] = useState('DOCUMENT');

  const { data: documents, isLoading } = useQuery({
    queryKey: ['patients', patientId, 'documents'],
    queryFn: () => patientsApi.listPatientDocuments(patientId),
  });

  const addMutation = useMutation({
    mutationFn: () => patientsApi.addPatientDocument(patientId, { type, fileUrl, fileName }),
    onSuccess: () => {
      showSuccess('Document added');
      setFileUrl('');
      setFileName('');
      void queryClient.invalidateQueries({ queryKey: ['patients', patientId, 'documents'] });
    },
    onError: (err) => showError(getApiErrorMessage(err, 'Failed to add document')),
  });

  return (
    <Card>
      <CardBody className="space-y-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
          <Select
            label="Type"
            value={type}
            onChange={(e) => setType(e.target.value)}
            options={[
              { label: 'Before image', value: 'BEFORE_IMAGE' },
              { label: 'After image', value: 'AFTER_IMAGE' },
              { label: 'Consent form', value: 'CONSENT_FORM' },
              { label: 'Document', value: 'DOCUMENT' },
              { label: 'Other', value: 'OTHER' },
            ]}
          />
          <Input label="File name" value={fileName} onChange={(e) => setFileName(e.target.value)} />
          <div className="sm:col-span-2">
            <Input label="File URL (from your upload provider)" value={fileUrl} onChange={(e) => setFileUrl(e.target.value)} />
          </div>
        </div>
        <Button size="sm" disabled={!fileUrl || !fileName} isLoading={addMutation.isPending} onClick={() => addMutation.mutate()}>
          Add document
        </Button>

        <Table
          columns={[
            { header: 'Type', accessor: (d) => titleCase(d.type) },
            { header: 'File', accessor: (d) => <a href={d.fileUrl} target="_blank" rel="noreferrer" className="text-brand-600 hover:underline">{d.fileName}</a> },
            { header: 'Uploaded', accessor: (d) => formatDateTime(d.uploadedAt) },
          ]}
          rows={documents ?? []}
          keyField={(d) => d.id}
          isLoading={isLoading}
          emptyMessage="No documents uploaded yet"
        />
      </CardBody>
    </Card>
  );
}

function TimelineTab({ patientId }: { patientId: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ['patients', patientId, 'timeline'],
    queryFn: () => communicationsApi.getPatientTimeline(patientId),
  });

  if (isLoading) return <FullPageSpinner />;

  return (
    <Card>
      <CardBody>
        <ol className="space-y-4 border-l border-slate-200 pl-4">
          {(data ?? []).map((entry, i) => (
            <li key={i} className="relative">
              <span className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full bg-brand-500" />
              <p className="text-sm font-medium text-slate-800">{entry.summary}</p>
              <p className="text-xs text-slate-400">{formatDateTime(entry.occurredAt)}</p>
            </li>
          ))}
          {(data ?? []).length === 0 && <p className="text-sm text-slate-400">No history yet</p>}
        </ol>
      </CardBody>
    </Card>
  );
}

export default function PatientDetailPage() {
  const params = useParams<{ id: string }>();
  const patientId = params.id;
  const { data: patient } = useQuery({ queryKey: ['patients', patientId], queryFn: () => patientsApi.getPatient(patientId) });

  return (
    <div>
      <PageHeader
        title={patient ? patient.fullName : 'Patient'}
        description={patient ? `${patient.patientCode} · ${patient.mobileNumber} · Registered ${formatDate(patient.createdAt)}` : undefined}
        action={patient && <Badge status={patient.status} />}
      />
      <Tabs
        tabs={[
          { label: 'Profile', content: <ProfileTab patientId={patientId} /> },
          { label: 'Documents', content: <DocumentsTab patientId={patientId} /> },
          { label: 'Timeline', content: <TimelineTab patientId={patientId} /> },
        ]}
      />
    </div>
  );
}
