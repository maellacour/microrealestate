import { flow, makeObservable, observable } from 'mobx';

import { apiFetcher } from '../utils/fetch';
import { updateItems } from './utils';

export default class ChargeRegularization {
  constructor() {
    this.items = [];

    makeObservable(this, {
      items: observable,
      fetch: flow,
      create: flow,
      update: flow,
      delete: flow,
      apply: flow,
      unapply: flow
    });
  }

  *fetch(tenantId) {
    try {
      const response = yield apiFetcher().get('/chargeregularizations', {
        params: tenantId ? { tenantId } : undefined
      });
      this.items = response.data;
      return { status: 200, data: response.data };
    } catch (error) {
      return { status: error?.response?.status };
    }
  }

  *create(regularization) {
    try {
      const response = yield apiFetcher().post(
        '/chargeregularizations',
        regularization
      );
      this.items = updateItems(response.data, this.items);
      return { status: 200, data: response.data };
    } catch (error) {
      return { status: error?.response?.status };
    }
  }

  *update(regularization) {
    try {
      const response = yield apiFetcher().patch(
        `/chargeregularizations/${regularization._id}`,
        regularization
      );
      this.items = updateItems(response.data, this.items);
      return { status: 200, data: response.data };
    } catch (error) {
      return { status: error?.response?.status };
    }
  }

  *delete(ids) {
    try {
      yield apiFetcher().delete(`/chargeregularizations/${ids.join(',')}`);
      this.items = this.items.filter((item) => !ids.includes(item._id));
      return { status: 200 };
    } catch (error) {
      return { status: error?.response?.status };
    }
  }

  *apply(id, term) {
    try {
      const response = yield apiFetcher().post(
        `/chargeregularizations/${id}/apply`,
        { term }
      );
      this.items = updateItems(response.data, this.items);
      return { status: 200, data: response.data };
    } catch (error) {
      return { status: error?.response?.status };
    }
  }

  *unapply(id) {
    try {
      const response = yield apiFetcher().post(
        `/chargeregularizations/${id}/unapply`
      );
      this.items = updateItems(response.data, this.items);
      return { status: 200, data: response.data };
    } catch (error) {
      return { status: error?.response?.status };
    }
  }
}
