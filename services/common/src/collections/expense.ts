import { CollectionTypes } from '@bayle/types';
import mongoose from 'mongoose';
import Property from './property.js';
import Realm from './realm.js';

const ExpenseSchema = new mongoose.Schema<CollectionTypes.Expense>({
  realmId: { type: String, ref: Realm },
  propertyId: { type: String, ref: Property },

  category: {
    type: String,
    enum: [
      'works',
      'insurance',
      'property_tax',
      'condo_charges',
      'management_fees',
      'loan_interest',
      'other'
    ],
    default: 'other'
  },
  amount: Number,
  date: Date,
  description: String,
  documentId: String,

  createdDate: Date,
  updatedDate: Date
});

ExpenseSchema.pre('save', function (next) {
  const now = new Date();
  if (!this.createdDate) {
    this.createdDate = now;
  }
  this.updatedDate = now;
  next();
});

export default mongoose.model<CollectionTypes.Expense>(
  'Expense',
  ExpenseSchema
);
