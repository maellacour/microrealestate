import { CollectionTypes } from '@bayle/types';
import mongoose from 'mongoose';
import Property from './property.js';
import Realm from './realm.js';
import Tenant from './tenant.js';

const ColocationSchema = new mongoose.Schema<CollectionTypes.Colocation>({
  realmId: { type: String, ref: Realm },
  propertyId: { type: String, ref: Property },
  name: String,

  members: [
    {
      tenantId: { type: String, ref: Tenant },
      sharePercent: Number
    }
  ],

  createdDate: Date,
  updatedDate: Date
});

ColocationSchema.pre('save', function (next) {
  const now = new Date();
  if (!this.createdDate) {
    this.createdDate = now;
  }
  this.updatedDate = now;
  next();
});

export default mongoose.model<CollectionTypes.Colocation>(
  'Colocation',
  ColocationSchema
);
