import { flow, makeObservable, observable } from 'mobx';

import { apiFetcher } from '../utils/fetch';

export default class PropertyAccounting {
  constructor() {
    this.data = {};

    makeObservable(this, {
      data: observable,
      fetch: flow
    });
  }

  *fetch(year, propertyId) {
    try {
      const response = yield apiFetcher().get(
        `/accounting/properties/${year}`,
        {
          params: propertyId ? { propertyId } : undefined
        }
      );
      this.data = response.data;
      return { status: 200, data: response.data };
    } catch (error) {
      return { status: error?.response?.status };
    }
  }
}
