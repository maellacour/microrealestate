import { flow, makeObservable, observable } from 'mobx';

import { apiFetcher } from '../utils/fetch';
import { updateItems } from './utils';

export default class Colocation {
  constructor() {
    this.items = [];

    makeObservable(this, {
      items: observable,
      fetch: flow,
      create: flow,
      update: flow,
      delete: flow,
      regularize: flow
    });
  }

  *fetch(propertyId) {
    try {
      const response = yield apiFetcher().get('/colocations', {
        params: propertyId ? { propertyId } : undefined
      });
      this.items = response.data;
      return { status: 200, data: response.data };
    } catch (error) {
      return { status: error?.response?.status };
    }
  }

  *create(colocation) {
    try {
      const response = yield apiFetcher().post('/colocations', colocation);
      this.items = updateItems(response.data, this.items);
      return { status: 200, data: response.data };
    } catch (error) {
      return { status: error?.response?.status };
    }
  }

  *update(colocation) {
    try {
      const response = yield apiFetcher().patch(
        `/colocations/${colocation._id}`,
        colocation
      );
      this.items = updateItems(response.data, this.items);
      return { status: 200, data: response.data };
    } catch (error) {
      return { status: error?.response?.status };
    }
  }

  *delete(ids) {
    try {
      yield apiFetcher().delete(`/colocations/${ids.join(',')}`);
      this.items = this.items.filter((item) => !ids.includes(item._id));
      return { status: 200 };
    } catch (error) {
      return { status: error?.response?.status };
    }
  }

  *regularize(id, payload) {
    try {
      const response = yield apiFetcher().post(
        `/colocations/${id}/regularize`,
        payload
      );
      return { status: 200, data: response.data };
    } catch (error) {
      return { status: error?.response?.status };
    }
  }
}
