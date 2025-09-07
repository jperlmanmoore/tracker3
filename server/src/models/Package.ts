import mongoose, { Schema, Model } from 'mongoose';
import { IPackage, TrackingEvent, ProofOfDelivery } from '../types/package';

const TrackingEventSchema = new Schema<TrackingEvent>({
  date: {
    type: Date,
    required: true
  },
  status: {
    type: String,
    required: true
  },
  location: {
    type: String,
    default: ''
  },
  description: {
    type: String,
    default: ''
  }
}, { _id: false });

const ProofOfDeliverySchema = new Schema({
  deliveredTo: {
    type: String,
    default: ''
  },
  deliveryLocation: {
    type: String,
    default: ''
  },
  signatureRequired: {
    type: Boolean,
    default: false
  },
  signatureObtained: {
    type: Boolean,
    default: false
  },
  signedBy: {
    type: String,
    default: ''
  },
  deliveryPhoto: {
    type: String,
    default: ''
  },
  deliveryInstructions: {
    type: String,
    default: ''
  },
  proofOfDeliveryUrl: {
    type: String,
    default: ''
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  }
}, { _id: false });

const PackageSchema = new Schema<IPackage>({
  trackingNumber: {
    type: String,
    required: [true, 'Tracking number is required'],
    trim: true,
    uppercase: true
  },
  carrier: {
    type: String,
    required: [true, 'Carrier is required'],
    enum: ['USPS', 'FedEx']
  },
  customer: {
    type: String,
    required: [true, 'Customer name is required'],
    trim: true
  },
  packageType: {
    type: String,
    required: [true, 'Package type is required'],
    enum: ['LOR', 'demand', 'spol', 'AL', 'other']
  },
  status: {
    type: String,
    default: 'In Transit',
    enum: ['In Transit', 'Out for Delivery', 'Delivered', 'Exception', 'Unknown']
  },
  dateSent: {
    type: Date,
    required: [true, 'Date sent is required']
  },
  deliveryDate: {
    type: Date,
    default: undefined
  },
  notes: {
    type: String,
    maxlength: [500, 'Notes cannot exceed 500 characters'],
    default: ''
  },
  trackingHistory: [TrackingEventSchema],
  proofOfDelivery: {
    type: ProofOfDeliverySchema,
    default: () => ({})
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  },
  userId: {
    type: String,
    required: [true, 'User ID is required'],
    ref: 'User'
  }
}, {
  timestamps: true,
  toJSON: {
    transform: function(doc: any, ret: any) {
      delete ret.__v;
      return ret;
    }
  }
});

// Create indexes
PackageSchema.index({ trackingNumber: 1, userId: 1 }, { unique: true });
PackageSchema.index({ userId: 1 });
PackageSchema.index({ carrier: 1 });
PackageSchema.index({ status: 1 });
PackageSchema.index({ customer: 1 });
PackageSchema.index({ dateSent: -1 });
PackageSchema.index({ createdAt: -1 });
PackageSchema.index({ lastUpdated: -1 });
PackageSchema.index({ userId: 1, customer: 1 });
PackageSchema.index({ userId: 1, carrier: 1 });

// Update lastUpdated before saving
PackageSchema.pre('save', function(next: any) {
  this.lastUpdated = new Date();
  next();
});

const Package: Model<IPackage> = mongoose.model<IPackage>('Package', PackageSchema);

export default Package;
