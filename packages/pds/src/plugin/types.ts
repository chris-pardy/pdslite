import type { Hono } from "hono";
import type {
  WriteOperation,
  BlobUploadOperation,
  FilterResult,
} from "../write-filter/types.js";
import type { AccountManager } from "../account/types.js";

export interface Plugin {
  id: string;
  name: string;
  initialize?(config: unknown, ctx: PluginContext): Promise<void>;
  routes?(app: Hono): void;
  auth?: AuthProvider;
  filter?(op: WriteOperation): Promise<FilterResult>;
  blobFilter?(op: BlobUploadOperation): Promise<FilterResult>;
  accountFilter?(op: AccountOperation): Promise<AccountFilterResult>;
  destroy?(): Promise<void>;
}

export interface PluginContext {
  accountManager: AccountManager;
}

export interface AuthProvider {
  createAccount(
    opts: CreateAccountOpts,
  ): Promise<{ did: string; accessJwt: string; refreshJwt: string }>;
  createSession(opts: {
    identifier: string;
    password: string;
  }): Promise<{
    did: string;
    accessJwt: string;
    refreshJwt: string;
    handle: string;
  }>;
  verifyToken(token: string): Promise<{ did: string }>;
}

export interface CreateAccountOpts {
  handle: string;
  email?: string;
  password?: string;
  inviteCode?: string;
  [key: string]: unknown;
}

export interface AccountOperation {
  action: "create" | "delete";
  handle: string;
  email?: string;
  inviteCode?: string;
  metadata?: Record<string, unknown>;
  clientId?: string;
  ip?: string;
}

export type AccountFilterResult =
  | { decision: "allow" }
  | { decision: "reject"; reason: string }
  | { decision: "pass" };

export type AccountFilter = (
  op: AccountOperation,
) => Promise<AccountFilterResult>;
