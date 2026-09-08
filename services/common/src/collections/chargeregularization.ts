import { CollectionTypes } from '@microrealestate/types';
import mongoose from 'mongoose';
import Realm from './realm.js';
import Tenant from './tenant.js';

const ChargeRegularizationSchema =
  new mongoose.Schema<CollectionTypes.ChargeRegularization>({
    realmId: { type: String, ref: Realm },
    tenantId: { type: String, ref: Tenant },

    periodStart: Date,
    periodEnd: Date,

    lines: [
      {
        label: String,
        amount: Number,
        recoverable: { type: Boolean, default: true }
      }
    ],

    note: String,

    createdDate: Date,
    updatedDate: Date
  });

ChargeRegularizationSchema.pre('save', function (next) {
  const now = new Date();
  if (!this.createdDate) {
    this.createdDate = now;
  }
  this.updatedDate = now;
  next();
});

export default mongoose.model<CollectionTypes.ChargeRegularization>(
  'ChargeRegularization',
  ChargeRegularizationSchema
);
