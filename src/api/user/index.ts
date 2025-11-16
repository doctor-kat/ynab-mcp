import type { UserResponse } from "./User.js";
import { makeRequest } from "../client.js";

export * from './User.js';

/**
 * Returns authenticated user information
 */
export async function getUser(): Promise<UserResponse> {
  return makeRequest<UserResponse>("GET", "/user");
}
