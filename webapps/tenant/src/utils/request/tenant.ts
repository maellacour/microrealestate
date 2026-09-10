import * as Mocks from '@/mocks/api';
import getApiFetcher from '../fetch/server';
import getServerEnv from '../env/server';
import { Lease } from '@/types';
import { TenantAPI } from '@microrealestate/types';
import { toUILease } from '..';

export async function fetchOneTenant(tenantId: string): Promise<Lease | null> {
  let data;
  if (getServerEnv('DEMO_MODE') === 'true') {
    data = Mocks.getOneTenant;
  } else {
    const response = await getApiFetcher().get<TenantAPI.GetOneTenant.Response>(
      `/tenantapi/tenant/${tenantId}`
    );
    data = response.data;
  }

  if (data.error) {
    console.error(data.error);
    throw new Error(data.error);
  }

  if (!data.results?.length) {
    return null;
  }

  return toUILease(data.results[0]);
}

export type SharedChargeRegularization = {
  id: string;
  periodStart: string;
  periodEnd: string;
  lines: { label: string; amount: number }[];
  provisionsCalled: number;
  recoverableTotal: number;
  balance: number;
  note: string;
};

export async function fetchTenantRegularizations(
  tenantId: string
): Promise<SharedChargeRegularization[]> {
  if (getServerEnv('DEMO_MODE') === 'true') {
    return [];
  }
  const response = await getApiFetcher().get<{
    results?: SharedChargeRegularization[];
    error?: string;
  }>(`/tenantapi/tenant/${tenantId}/regularizations`);
  const data = response.data;

  if (data.error) {
    console.error(data.error);
    return [];
  }

  return data.results || [];
}

export async function fetchAllTenants(): Promise<Lease[]> {
  let data;
  if (getServerEnv('DEMO_MODE') === 'true') {
    data = Mocks.getAllTenants;
  } else {
    const response =
      await getApiFetcher().get<TenantAPI.GetAllTenants.Response>(
        `/tenantapi/tenants`
      );
    data = response.data;
  }

  if (data.error) {
    console.error(data.error);
    throw new Error(data.error);
  }

  if (!data.results) {
    return [];
  }

  const leases: Lease[] = data.results.map(toUILease) || [];

  return leases;
}
