'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import * as packagesApi from '@/lib/api/packages';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { Table } from '@/components/ui/Table';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import { useToast } from '@/components/ui/Toast';
import { getApiErrorMessage } from '@/lib/api/client';
import { formatCurrency } from '@/lib/utils/format';
import { PackageForm } from './_components/PackageForm';

export default function PackagesPage() {
  const [createOpen, setCreateOpen] = useState(false);
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToast();

  const { data, isLoading } = useQuery({
    queryKey: ['packages'],
    queryFn: () => packagesApi.listPackages({ limit: 100 }),
  });

  const createMutation = useMutation({
    mutationFn: packagesApi.createPackage,
    onSuccess: () => {
      showSuccess('Package created');
      setCreateOpen(false);
      void queryClient.invalidateQueries({ queryKey: ['packages'] });
    },
    onError: (err) => showError(getApiErrorMessage(err, 'Failed to create package')),
  });

  return (
    <div>
      <PageHeader
        title="Packages"
        description="Bundled treatments"
        action={
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" /> New Package
          </Button>
        }
      />

      <Card>
        <Table
          columns={[
            { header: 'Name', accessor: (r) => r.name },
            { header: 'Treatments', accessor: (r) => r.items.map((i) => i.treatment.name).join(', ') },
            { header: 'Price', accessor: (r) => formatCurrency(r.defaultPrice) },
            { header: 'Discount', accessor: (r) => (r.discountPercent ? `${r.discountPercent}%` : '—') },
            { header: 'Status', accessor: (r) => <Badge status={r.isActive ? 'ACTIVE' : 'INACTIVE'} /> },
          ]}
          rows={data?.data ?? []}
          keyField={(r) => r.id}
          isLoading={isLoading}
          emptyMessage="No packages yet"
        />
      </Card>

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="New package" size="lg">
        <PackageForm onSubmit={(values) => createMutation.mutateAsync(values).then(() => {})} isSubmitting={createMutation.isPending} />
      </Modal>
    </div>
  );
}
