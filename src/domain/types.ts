/** Core business types. Money is always integer cents (ZAR), dates are ISO `YYYY-MM-DD`. */

export type BranchId = 'pta' | 'kdp';
export type CollectionId = 'furniture' | 'linen' | 'decor' | 'props' | 'games';
export type Cents = number;
export type ISODate = string;

export type Item = {
  id: string;
  code: string;
  name: string;
  collection: CollectionId;
  category: string;
  size?: string;
  /** Hire price per booking. [ASSUMED] per event, not per day — confirm with Eastco. */
  price: Cents;
  replacementCost: Cents;
  cleaningFee: Cents;
  /** Days after return before the item can go out again (washing, checking). */
  turnaroundDays: number;
  stock: Record<BranchId, number>;
  outOfService: Record<BranchId, number>;
  /** Where it lives in the store room — used to group the picking list. */
  location: string;
};

export type ClientTag = 'Wedding planner' | 'Venue' | 'Corporate' | 'Repeat' | 'Private';

export type Client = {
  id: string;
  kind: 'person' | 'company';
  name: string;
  company?: string;
  phone: string;
  email: string;
  vatNo?: string;
  tags: ClientTag[];
  branch: BranchId;
  notes?: string;
  addresses: {label: string; line: string}[];
  createdAt: ISODate;
  consent: {at: ISODate; via: 'WhatsApp' | 'Email' | 'Phone' | 'Walk-in' | 'Website'};
};

/** One job runs the whole way: quote → order → delivery → return → closed. */
export type JobStatus =
  | 'draft'
  | 'quote_sent'
  | 'accepted'
  | 'confirmed'
  | 'packing'
  | 'out_for_delivery'
  | 'on_hire'
  | 'returned'
  | 'issues'
  | 'closed'
  | 'cancelled';

export type Line = {
  itemId: string;
  qty: number;
  unitPrice: Cents;
  discountPct: number;
  /** Set when this line's stock is borrowed from the other branch (a branch transfer). */
  source?: BranchId;
};

export type PaymentMethod = 'Cash' | 'EFT' | 'Card';
export type Payment = {id: string; at: ISODate; amount: Cents; method: PaymentMethod; kind: 'deposit' | 'hire' | 'refund' | 'charge'};

export type ReturnState = 'ok' | 'short' | 'damaged' | 'dirty';

export type Signature = {
  signedBy: string;
  role: 'Client' | 'Venue staff' | 'Planner';
  signedAt: string; // ISO date-time
  image: string; // PNG data URL
  hash: string; // SHA-256 of the signed note's content
};

export type DeliveryNote = {
  number: string;
  counts: Record<string, number>; // itemId -> qty handed over
  shortReasons: Record<string, string>;
  signature: Signature;
};

export type ReturnNote = {
  number: string;
  lines: Record<string, {state: ReturnState; qty: number}>; // qty affected when not ok
  signature?: Signature;
  checkedAt: string;
};

export type Charge = {id: string; label: string; amount: Cents; approved: boolean};

export type HistoryEntry = {at: string; by: string; text: string};

export type Job = {
  id: string;
  quoteNo: string;
  invoiceNo?: string;
  clientId: string;
  branch: BranchId;
  eventName: string;
  eventType: 'Wedding' | 'Birthday' | 'Baby shower' | 'Corporate' | 'Conference' | 'Private dinner' | 'Other';
  eventDate: ISODate;
  /** Hire window: goes out on `outDate`, comes back on `backDate`. */
  outDate: ISODate;
  backDate: ISODate;
  fulfilment: 'delivery' | 'collection';
  venue: string;
  deliveryWindow?: string;
  lines: Line[];
  deliveryFee: Cents;
  setupFee: Cents;
  discountPct: number;
  depositDue: Cents;
  validUntil: ISODate;
  /** Soft hold on stock for accepted-but-unpaid quotes. */
  holdUntil?: string;
  status: JobStatus;
  createdAt: ISODate;
  createdBy: string;
  driver?: string;
  notes?: string;
  payments: Payment[];
  /** The client's online acceptance of the quote (name, tick, signature). */
  acceptance?: Signature;
  deliveryNote?: DeliveryNote;
  returnNote?: ReturnNote;
  charges: Charge[];
  history: HistoryEntry[];
};

export type Settings = {
  vatRegistered: boolean;
  vatNo: string;
  vatRate: number; // 0.15
  depositPct: number; // of hire total
  depositMin: Cents;
  bankFeePct: number; // taken off EFT deposits on refund
  cancellationPct: number;
  softHoldHours: number;
  quoteValidDays: number;
  bank: {name: string; account: string; branchCode: string; holder: string};
};
