import type { AccountType } from "./AccountType.js";

export interface PostAccountWrapper {
  account: SaveAccount;
}

export interface SaveAccount {
  name: string;
  type: AccountType;
  balance: number;
}
