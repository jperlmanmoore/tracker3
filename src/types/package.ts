// Package tracking event
export interface TrackingEvent {
  date: string;
  status: string;
  location?: string;
  description?: string;
}

// Package data structure
export interface Package {
  _id: string;
  trackingNumber: string;
  carrier: 'USPS' | 'FedEx';
  customer: string;
  clientName: string; // alias for customer
  clientEmail?: string;
  packageType: 'LOR' | 'demand' | 'spol' | 'AL' | 'other';
  status: 'In Transit' | 'Out for Delivery' | 'Delivered' | 'Exception' | 'Unknown';
  dateSent: string;
  dateAdded: string; // alias for createdAt
  deliveryDate?: string;
  notes?: string;
  description?: string; // alias for notes
  trackingHistory: TrackingEvent[];
  lastUpdated: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

// Package creation data
export interface PackageCreateData {
  trackingNumbers: string;
  customer: string;
  packageType: 'LOR' | 'demand' | 'spol' | 'AL' | 'other';
  dateSent: string;
  notes?: string;
}

// Package filters
export interface PackageFilters {
  customer?: string;
  carrier?: string;
  packageType?: string;
  status?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

// Bulk tracking URLs response
export interface BulkTrackingResponse {
  carrier: 'USPS' | 'FedEx';
  bulkTrackingUrl: string;
  packageCount: number;
  packages: {
    trackingNumber: string;
    customer: string;
    url: string;
  }[];
}
