"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importStar(require("mongoose"));
const TrackingEventSchema = new mongoose_1.Schema({
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
const PackageSchema = new mongoose_1.Schema({
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
        transform: function (doc, ret) {
            delete ret.__v;
            return ret;
        }
    }
});
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
PackageSchema.pre('save', function (next) {
    this.lastUpdated = new Date();
    next();
});
const Package = mongoose_1.default.model('Package', PackageSchema);
exports.default = Package;
//# sourceMappingURL=Package.js.map