import { time } from 'console';
import mongoose, { Document, Schema } from 'mongoose';
import { customAlphabet } from "nanoid";

export interface IHubSpotContact extends Document {
  identifier?: string;
  email: string;
  firstName?: string;
  lastName?: string;
  phone: string;
  company?: string;
  formId?: string;
  formName?: string;
  source: 'hubspot' | 'manual' | 'api';
  whatsappTemplateSent: boolean;
  whatsappMessageId?: string;
  whatsappStatus?: 'pending' | 'sent' | 'delivered' | 'failed';
  metadata?: any;
  retryCount: number;
  createdAt: Date;
  country?: string;
  updatedAt: Date;
}

const hubspotContactSchema = new Schema<IHubSpotContact>(
  {
     identifier: {
        type: String,
        required: true,
        unique: true,
        default: () => customAlphabet("0123456789", 5)()
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    firstName: {
      type: String,
      trim: true,
    },
    lastName: {
      type: String,
      trim: true,
    },
    phone: {
      type: String,
      required: true,
      index: true,
    },
    country: {
      type: String,
      trim: true,
    },
    company: {
      type: String,
      trim: true,
    },
    formId: {
      type: String,
    },
    formName: {
      type: String,
    },
    source: {
      type: String,
      enum: ['hubspot', 'manual', 'api'],
      default: 'hubspot',
    },
    whatsappTemplateSent: {
      type: Boolean,
      default: false,
    },
    whatsappMessageId: {
      type: String,
    },
    whatsappStatus: {
      type: String,
      enum: ['pending', 'sent', 'delivered', 'failed'],
      default: 'pending',
    },
    metadata: [{
      type: Object,
    }],
    retryCount: {
      type: Number,
      default: 3
    }
  },
  {
    timestamps: true,
  }
);

hubspotContactSchema.index({ email: 1, phone: 1 }, { unique: true });
export const hubspotContactModel = mongoose.model('HubSpotContact', hubspotContactSchema);