import type { Payee } from "./Payee.js";

export interface SavePayeeResponse {
  data: {
    payee: Payee;
    server_knowledge: number;
  };
}

export interface PatchPayeeWrapper {
  payee: SavePayee;
}

export interface SavePayee {
  name?: string;
}
