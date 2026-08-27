import { CollectionTypes } from '@microrealestate/types';
import mongoose from 'mongoose';
import Realm from './realm.js';

const LeaseSchema = new mongoose.Schema<CollectionTypes.Lease>({
  realmId: { type: String, ref: Realm },
  name: String,
  description: String,
  numberOfTerms: Number,
  timeRange: { type: String, enum: ['days', 'weeks', 'months', 'years'] },
  active: Boolean,
  // tacit renewal (reconduction tacite): when true, a tenant's end date rolls
  // forward by the contract duration so the rent schedule keeps flowing.
  renewable: { type: Boolean, default: false },

  // ui state
  stepperMode: { type: Boolean, default: false }
});

export default mongoose.model<CollectionTypes.Lease>('Lease', LeaseSchema);
