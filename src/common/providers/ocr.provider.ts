// Pluggable OCR interface for supplier-invoice ingestion (see spec section 8:
// "OCR Based Purchase Entry"). No real OCR engine is wired up here — that
// requires a real provider (Google Document AI, AWS Textract, Azure Form
// Recognizer, etc.) and its API credentials, neither of which are available in
// this environment. MockOcrProvider always defers to manual entry so the
// purchase-invoice flow (see purchase.service.ts) works end-to-end today, and
// swapping in a real provider later is a one-file change — no callers need to
// know which implementation is active.

export interface OcrExtractedItem {
  productNameRaw: string;
  batchNumber?: string;
  quantity?: number;
  mrp?: number;
  purchasePrice?: number;
  expiryDate?: Date;
  gstPercent?: number;
}

export interface OcrExtractionResult {
  supplierName?: string;
  invoiceNumber?: string;
  invoiceDate?: Date;
  totalAmount?: number;
  items: OcrExtractedItem[];
  rawResponse: unknown;
  succeeded: boolean;
}

export interface OcrProvider {
  extractPurchaseInvoice(fileUrl: string): Promise<OcrExtractionResult>;
}

export class MockOcrProvider implements OcrProvider {
  async extractPurchaseInvoice(fileUrl: string): Promise<OcrExtractionResult> {
    return {
      items: [],
      rawResponse: {
        provider: 'mock',
        fileUrl,
        note: 'No OCR engine configured — manual entry required',
      },
      succeeded: false,
    };
  }
}

export const ocrProvider: OcrProvider = new MockOcrProvider();
