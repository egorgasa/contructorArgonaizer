import type { PrintRequestData } from "@/lib/validations/print-request";

/** Server-side representation of a stored request. */
export interface StoredPrintRequest {
  id: string;
  publicNumber: string;
  status: string;
  productType: string;
  clientName: string;
  clientEmail: string | null;
  clientPhone: string | null;
  payload: PrintRequestData;
  createdAt: string;
  updatedAt: string;
}

export interface StoredOperatorNote {
  id: string;
  requestId: string;
  body: string;
  createdAt: string;
}

export interface StoredStatusHistoryItem {
  id: string;
  requestId: string;
  fromStatus: string;
  toStatus: string;
  reason: string | null;
  createdAt: string;
}

export interface StoredRequestFile {
  id: string;
  requestId: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  uploadedAt: string;
}

export interface StoredRequestQuote {
  id: string;
  requestId: string;
  priceCents: number | null;
  currency: string;
  productionDays: number | null;
  validUntil: string | null;
  operatorComment: string | null;
  internalCostNote: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface PrintRequestDetail extends StoredPrintRequest {
  notes: StoredOperatorNote[];
  statusHistory: StoredStatusHistoryItem[];
  files: StoredRequestFile[];
}
