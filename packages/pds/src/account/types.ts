export interface Account {
  did: string;
  handle: string;
  email?: string;
  createdAt: string;
}

export interface AccountManager {
  createAccount(opts: {
    did: string;
    handle: string;
    email?: string;
  }): Promise<Account>;
  getAccount(did: string): Promise<Account | null>;
  getAccountByHandle(handle: string): Promise<Account | null>;
  deleteAccount(did: string): Promise<void>;

  /** Store a secret value for an account (e.g. password hash, refresh token). */
  setSecret(did: string, key: string, value: string): Promise<void>;
  /** Retrieve a secret value. Returns null if not set. */
  getSecret(did: string, key: string): Promise<string | null>;
  /** Remove a secret value. */
  deleteSecret(did: string, key: string): Promise<void>;
}
