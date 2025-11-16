import type {
  PayeeLocationsResponse,
  PayeeLocationResponse,
} from "./PayeeLocation.js";
import { makeRequest } from "../client.js";

export * from './PayeeLocation.js';

/**
 * Returns all payee locations
 */
export async function getPayeeLocations(params: {
  budgetId: string;
}): Promise<PayeeLocationsResponse> {
  return makeRequest<PayeeLocationsResponse>(
    "GET",
    `/budgets/${encodeURIComponent(params.budgetId)}/payee_locations`,
  );
}

/**
 * Returns a single payee location
 */
export async function getPayeeLocationById(params: {
  budgetId: string;
  payeeLocationId: string;
}): Promise<PayeeLocationResponse> {
  return makeRequest<PayeeLocationResponse>(
    "GET",
    `/budgets/${encodeURIComponent(params.budgetId)}/payee_locations/${encodeURIComponent(params.payeeLocationId)}`,
  );
}

/**
 * Returns all payee locations for a specified payee
 */
export async function getPayeeLocationsByPayee(params: {
  budgetId: string;
  payeeId: string;
}): Promise<PayeeLocationsResponse> {
  return makeRequest<PayeeLocationsResponse>(
    "GET",
    `/budgets/${encodeURIComponent(params.budgetId)}/payees/${encodeURIComponent(params.payeeId)}/payee_locations`,
  );
}
