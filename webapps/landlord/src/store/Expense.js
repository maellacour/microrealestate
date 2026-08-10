import { flow, makeObservable, observable } from 'mobx';

import { apiFetcher } from '../utils/fetch';
import { updateItems } from './utils';

export default class Expense {
  constructor() {
    this.items = [];

    makeObservable(this, {
      items: observable,
      fetch: flow,
      create: flow,
      update: flow,
      delete: flow
    });
  }

  *fetch(propertyId) {
    try {
      const response = yield apiFetcher().get('/expenses', {
        params: propertyId ? { propertyId } : undefined
      });
      this.items = response.data;
      return { status: 200, data: response.data };
    } catch (error) {
      return { status: error?.response?.status };
    }
  }

  *create(expense) {
    try {
      const response = yield apiFetcher().post('/expenses', expense);
      this.items = updateItems(response.data, this.items);
      return { status: 200, data: response.data };
    } catch (error) {
      return { status: error?.response?.status };
    }
  }

  *update(expense) {
    try {
      const response = yield apiFetcher().patch(
        `/expenses/${expense._id}`,
        expense
      );
      this.items = updateItems(response.data, this.items);
      return { status: 200, data: response.data };
    } catch (error) {
      return { status: error?.response?.status };
    }
  }

  *delete(ids) {
    try {
      yield apiFetcher().delete(`/expenses/${ids.join(',')}`);
      this.items = this.items.filter((item) => !ids.includes(item._id));
      return { status: 200 };
    } catch (error) {
      return { status: error?.response?.status };
    }
  }
}
