'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Boxes } from 'lucide-react';
import * as inventoryApi from '@/lib/api/inventory';
import { Card } from '@/components/ui/Card';
import { Table } from '@/components/ui/Table';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import { useToast } from '@/components/ui/Toast';
import { getApiErrorMessage } from '@/lib/api/client';
import { formatCurrency, formatDate } from '@/lib/utils/format';
import type { Product } from '@/types';

interface ProductFormValues {
  name: string;
  category: string;
  brand: string;
  unit: string;
  minimumStock: string;
  sellingPrice: string;
}

interface BatchFormValues {
  batchNumber: string;
  expiryDate: string;
  purchasePrice: string;
  mrp: string;
  currentStock: string;
}

function BatchesModal({ product, onClose }: { product: Product; onClose: () => void }) {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToast();
  const { data: batches, isLoading } = useQuery({
    queryKey: ['inventory', 'batches', product.id],
    queryFn: () => inventoryApi.listBatchesForProduct(product.id),
  });
  const { register, handleSubmit, reset } = useForm<BatchFormValues>();

  const addBatch = useMutation({
    mutationFn: (values: BatchFormValues) =>
      inventoryApi.createBatch(product.id, {
        batchNumber: values.batchNumber,
        expiryDate: new Date(values.expiryDate).toISOString(),
        purchasePrice: Number(values.purchasePrice),
        mrp: values.mrp ? Number(values.mrp) : undefined,
        currentStock: values.currentStock ? Number(values.currentStock) : 0,
      }),
    onSuccess: () => {
      showSuccess('Batch added');
      reset();
      void queryClient.invalidateQueries({ queryKey: ['inventory', 'batches', product.id] });
      void queryClient.invalidateQueries({ queryKey: ['inventory', 'products'] });
    },
    onError: (err) => showError(getApiErrorMessage(err, 'Failed to add batch')),
  });

  return (
    <Modal open onClose={onClose} title={`Batches — ${product.name}`} size="lg">
      <div className="space-y-6">
        <Table
          columns={[
            { header: 'Batch #', accessor: (b) => b.batchNumber },
            { header: 'Expiry', accessor: (b) => formatDate(b.expiryDate) },
            { header: 'Purchase price', accessor: (b) => formatCurrency(b.purchasePrice) },
            { header: 'Current stock', accessor: (b) => String(b.currentStock) },
          ]}
          rows={batches ?? []}
          keyField={(b) => b.id}
          isLoading={isLoading}
          emptyMessage="No batches yet"
        />

        <form onSubmit={handleSubmit((values) => addBatch.mutate(values))} className="space-y-3 border-t border-slate-100 pt-4">
          <p className="text-sm font-medium text-slate-700">Add a new batch</p>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Batch number" {...register('batchNumber', { required: true })} />
            <Input label="Expiry date" type="date" {...register('expiryDate', { required: true })} />
            <Input label="Purchase price (₹)" type="number" step="0.01" {...register('purchasePrice', { required: true })} />
            <Input label="MRP (₹)" type="number" step="0.01" {...register('mrp')} />
            <Input label="Initial stock" type="number" {...register('currentStock')} />
          </div>
          <Button type="submit" size="sm" isLoading={addBatch.isPending}>
            Add batch
          </Button>
        </form>
      </div>
    </Modal>
  );
}

export function ProductsTab() {
  const [createOpen, setCreateOpen] = useState(false);
  const [batchesFor, setBatchesFor] = useState<Product | null>(null);
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToast();

  const { data, isLoading } = useQuery({ queryKey: ['inventory', 'products'], queryFn: () => inventoryApi.listProducts({ limit: 100 }) });

  const { register, handleSubmit, reset } = useForm<ProductFormValues>();
  const createMutation = useMutation({
    mutationFn: (values: ProductFormValues) =>
      inventoryApi.createProduct({
        name: values.name,
        category: values.category,
        brand: values.brand || undefined,
        unit: values.unit || undefined,
        minimumStock: values.minimumStock ? Number(values.minimumStock) : undefined,
        sellingPrice: values.sellingPrice ? Number(values.sellingPrice) : undefined,
      }),
    onSuccess: () => {
      showSuccess('Product created');
      reset();
      setCreateOpen(false);
      void queryClient.invalidateQueries({ queryKey: ['inventory', 'products'] });
    },
    onError: (err) => showError(getApiErrorMessage(err, 'Failed to create product')),
  });

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4" /> New Product
        </Button>
      </div>
      <Card>
        <Table
          columns={[
            { header: 'Name', accessor: (r) => r.name },
            { header: 'Category', accessor: (r) => r.category },
            { header: 'Brand', accessor: (r) => r.brand ?? '—' },
            { header: 'Min. stock', accessor: (r) => String(r.minimumStock) },
            { header: 'Status', accessor: (r) => <Badge status={r.isActive ? 'ACTIVE' : 'INACTIVE'} /> },
            {
              header: '',
              accessor: (r) => (
                <Button size="sm" variant="secondary" onClick={() => setBatchesFor(r)}>
                  <Boxes className="h-3.5 w-3.5" /> Batches
                </Button>
              ),
            },
          ]}
          rows={data?.data ?? []}
          keyField={(r) => r.id}
          isLoading={isLoading}
          emptyMessage="No products yet"
        />
      </Card>

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="New product">
        <form onSubmit={handleSubmit((values) => createMutation.mutate(values))} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input label="Name" {...register('name', { required: true })} />
            <Input label="Category" {...register('category', { required: true })} />
            <Input label="Brand" {...register('brand')} />
            <Input label="Unit (ml, pcs...)" {...register('unit')} />
            <Input label="Minimum stock" type="number" {...register('minimumStock')} />
            <Input label="Selling price (₹)" type="number" step="0.01" {...register('sellingPrice')} />
          </div>
          <div className="flex justify-end">
            <Button type="submit" isLoading={createMutation.isPending}>
              Save product
            </Button>
          </div>
        </form>
      </Modal>

      {batchesFor && <BatchesModal product={batchesFor} onClose={() => setBatchesFor(null)} />}
    </div>
  );
}
