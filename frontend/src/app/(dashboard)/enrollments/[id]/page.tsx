'use client';

import { useParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as enrollmentsApi from '@/lib/api/enrollments';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { getApiErrorMessage } from '@/lib/api/client';
import { formatCurrency, formatDate } from '@/lib/utils/format';

export default function EnrollmentDetailPage() {
  const params = useParams<{ id: string }>();
  const enrollmentId = params.id;
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToast();

  const { data: enrollment } = useQuery({
    queryKey: ['enrollments', enrollmentId],
    queryFn: () => enrollmentsApi.getEnrollment(enrollmentId),
  });

  const recordSessionMutation = useMutation({
    mutationFn: (itemId: string) => enrollmentsApi.recordSession(enrollmentId, itemId, {}),
    onSuccess: () => {
      showSuccess('Session recorded');
      void queryClient.invalidateQueries({ queryKey: ['enrollments', enrollmentId] });
    },
    onError: (err) => showError(getApiErrorMessage(err, 'Failed to record session')),
  });

  if (!enrollment) return null;

  return (
    <div>
      <PageHeader
        title={enrollment.patient?.fullName ?? 'Enrollment'}
        description={`${enrollment.package?.name ?? 'Custom treatments'} · Enrolled ${formatDate(enrollment.enrollmentDate)} · ${formatCurrency(enrollment.totalPrice)}`}
        action={<Badge status={enrollment.status} />}
      />

      <Card>
        <CardHeader title="Treatment sessions" />
        <CardBody className="space-y-4">
          {enrollment.items.map((item) => (
            <div key={item.id} className="flex items-center justify-between rounded-lg border border-slate-100 p-4">
              <div>
                <p className="text-sm font-medium text-slate-800">{item.treatment.name}</p>
                <p className="text-xs text-slate-500">
                  {item.sessionsCompleted} of {item.sessionsTotal} sessions completed
                </p>
                <div className="mt-2 h-1.5 w-48 rounded-full bg-slate-100">
                  <div
                    className="h-1.5 rounded-full bg-brand-500"
                    style={{ width: `${Math.min(100, (item.sessionsCompleted / item.sessionsTotal) * 100)}%` }}
                  />
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Badge status={item.status} />
                <Button
                  size="sm"
                  disabled={item.sessionsCompleted >= item.sessionsTotal}
                  isLoading={recordSessionMutation.isPending}
                  onClick={() => recordSessionMutation.mutate(item.id)}
                >
                  Record session
                </Button>
              </div>
            </div>
          ))}
        </CardBody>
      </Card>
    </div>
  );
}
