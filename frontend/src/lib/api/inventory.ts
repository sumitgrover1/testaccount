import { apiClient } from './client';
import type {
  ApiEnvelope,
  OcrStatus,
  Paginated,
  Product,
  ProductBatch,
  PurchaseInvoice,
  StockMovementType,
  Supplier,
} from '@/types';

// --- Suppliers ---
export interface SupplierInput {
  name: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  address?: string;
  gstNumber?: string;
}

export async function createSupplier(input: SupplierInput) {
  const res = await apiClient.post<ApiEnvelope<Supplier>>('/inventory/suppliers', input);
  return res.data.data;
}
export async function listSuppliers(params: { page?: number; limit?: number; isActive?: boolean; search?: string }) {
  const res = await apiClient.get<Paginated<Supplier>>('/inventory/suppliers', { params });
  return res.data;
}
export async function updateSupplier(id: string, input: Partial<SupplierInput> & { isActive?: boolean }) {
  const res = await apiClient.patch<ApiEnvelope<Supplier>>(`/inventory/suppliers/${id}`, input);
  return res.data.data;
}

// --- Products & batches ---
export interface ProductInput {
  name: string;
  category: string;
  brand?: string;
  unit?: string;
  minimumStock?: number;
  sellingPrice?: number;
}

export async function createProduct(input: ProductInput) {
  const res = await apiClient.post<ApiEnvelope<Product>>('/inventory/products', input);
  return res.data.data;
}
export async function listProducts(params: {
  page?: number;
  limit?: number;
  category?: string;
  isActive?: boolean;
  search?: string;
}) {
  const res = await apiClient.get<Paginated<Product>>('/inventory/products', { params });
  return res.data;
}
export async function getProduct(id: string) {
  const res = await apiClient.get<ApiEnvelope<Product>>(`/inventory/products/${id}`);
  return res.data.data;
}
export async function updateProduct(id: string, input: Partial<ProductInput> & { isActive?: boolean }) {
  const res = await apiClient.patch<ApiEnvelope<Product>>(`/inventory/products/${id}`, input);
  return res.data.data;
}
export async function listLowStockProducts() {
  const res = await apiClient.get<ApiEnvelope<(Product & { totalStock: number })[]>>('/inventory/products/low-stock');
  return res.data.data;
}

export interface BatchInput {
  batchNumber: string;
  expiryDate: string;
  purchasePrice: number;
  mrp?: number;
  sellingPrice?: number;
  gstPercent?: number;
  currentStock?: number;
  supplierId?: string;
  location?: string;
}

export async function createBatch(productId: string, input: BatchInput) {
  const res = await apiClient.post<ApiEnvelope<ProductBatch>>(`/inventory/products/${productId}/batches`, input);
  return res.data.data;
}
export async function listBatchesForProduct(productId: string) {
  const res = await apiClient.get<ApiEnvelope<ProductBatch[]>>(`/inventory/products/${productId}/batches`);
  return res.data.data;
}
export async function adjustBatchStock(
  productId: string,
  batchId: string,
  input: { type: StockMovementType; quantity: number; notes?: string },
) {
  const res = await apiClient.post(`/inventory/products/${productId}/batches/${batchId}/adjust`, input);
  return res.data.data;
}
export async function listBatchMovements(productId: string, batchId: string) {
  const res = await apiClient.get(`/inventory/products/${productId}/batches/${batchId}/movements`);
  return res.data.data;
}

// --- Consumption rules ---
export async function addConsumptionRule(treatmentId: string, input: { productId: string; quantityPerSession: number }) {
  const res = await apiClient.post(`/inventory/treatments/${treatmentId}/consumption-rules`, input);
  return res.data.data;
}
export async function listConsumptionRules(treatmentId: string) {
  const res = await apiClient.get(`/inventory/treatments/${treatmentId}/consumption-rules`);
  return res.data.data;
}
export async function removeConsumptionRule(treatmentId: string, ruleId: string) {
  await apiClient.delete(`/inventory/treatments/${treatmentId}/consumption-rules/${ruleId}`);
}

// --- Purchase invoices (OCR-assisted entry) ---
export async function createPurchaseInvoice(input: {
  supplierId?: string;
  rawFileUrl: string;
  invoiceNumber?: string;
  invoiceDate?: string;
}) {
  const res = await apiClient.post<ApiEnvelope<PurchaseInvoice>>('/inventory/purchase-invoices', input);
  return res.data.data;
}
export async function listPurchaseInvoices(params: {
  page?: number;
  limit?: number;
  ocrStatus?: OcrStatus;
  supplierId?: string;
}) {
  const res = await apiClient.get<Paginated<PurchaseInvoice>>('/inventory/purchase-invoices', { params });
  return res.data;
}
export async function getPurchaseInvoice(id: string) {
  const res = await apiClient.get<ApiEnvelope<PurchaseInvoice>>(`/inventory/purchase-invoices/${id}`);
  return res.data.data;
}
export async function addPurchaseInvoiceItem(
  invoiceId: string,
  input: {
    productNameRaw: string;
    matchedProductId?: string;
    batchNumber?: string;
    quantity: number;
    mrp?: number;
    purchasePrice?: number;
    expiryDate?: string;
    gstPercent?: number;
  },
) {
  const res = await apiClient.post(`/inventory/purchase-invoices/${invoiceId}/items`, input);
  return res.data.data;
}
export async function confirmPurchaseInvoiceItem(
  invoiceId: string,
  itemId: string,
  input: {
    matchedProductId: string;
    batchNumber: string;
    quantity: number;
    purchasePrice: number;
    mrp?: number;
    expiryDate: string;
    gstPercent?: number;
    location?: string;
  },
) {
  const res = await apiClient.post(`/inventory/purchase-invoices/${invoiceId}/items/${itemId}/confirm`, input);
  return res.data.data;
}
