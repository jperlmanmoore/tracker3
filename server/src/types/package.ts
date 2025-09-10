import { Document } from 'mongoose';

// Package input interface
export interface IPackageInput {
  trackingNumber: string;
  carrier: 'USPS' | 'FedEx';
  customer: string;
  packageType: 'LOR' | 'demand' | 'spol' | 'AL' | 'other';
  dateSent: Date;
  notes?: string;
}

// Package response interface
export interface IPackageResponse {
  id: string;
  trackingNumber: string;
  carrier: 'USPS' | 'FedEx';
  customer: string;
  packageType: 'LOR' | 'demand' | 'spol' | 'AL' | 'other';
  status: string;
  dateSent: Date;
  deliveryDate?: Date;
  notes?: string;
  trackingHistory?: TrackingEvent[];
  proofOfDelivery?: ProofOfDelivery;
  lastUpdated: Date;
  createdAt: Date;
  updatedAt: Date;
}

// Tracking event interface
export interface TrackingEvent {
  date: Date;
  status: string;
  location?: string;
  description?: string;
}

// Proof of delivery interface
export interface ProofOfDelivery {
  deliveredTo?: string;
  deliveryLocation?: string;
  signatureRequired?: boolean;
  signatureObtained?: boolean;
  signedBy?: string;
  deliveryPhoto?: string; // PPOD image URL or base64
  spodPdfUrl?: string;    // SPOD PDF URL or base64
  spodPdfBase64?: string; // SPOD PDF as base64 (optional)
  deliveryInstructions?: string;
  proofOfDeliveryUrl?: string;
  lastUpdated?: Date;
}

// Package document interface for Mongoose
export interface IPackage extends Document {
  trackingNumber: string;
  carrier: 'USPS' | 'FedEx';
  customer: string;
  packageType: 'LOR' | 'demand' | 'spol' | 'AL' | 'other';
  status: string;
  dateSent: Date;
  deliveryDate?: Date;
  notes?: string;
  trackingHistory: TrackingEvent[];
  proofOfDelivery?: ProofOfDelivery;
  spodEmailSent: boolean;
  lastUpdated: Date;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
}
