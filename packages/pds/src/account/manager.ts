import type { Account, AccountManager } from "./types.js";

export class InMemoryAccountManager implements AccountManager {
  private accounts = new Map<string, Account>();
  private handleIndex = new Map<string, string>();
  private secrets = new Map<string, Map<string, string>>();

  async createAccount(opts: {
    did: string;
    handle: string;
    email?: string;
  }): Promise<Account> {
    if (this.accounts.has(opts.did)) {
      throw new Error(`Account already exists: ${opts.did}`);
    }
    if (this.handleIndex.has(opts.handle)) {
      throw new Error(`Handle already taken: ${opts.handle}`);
    }
    const account: Account = {
      did: opts.did,
      handle: opts.handle,
      email: opts.email,
      createdAt: new Date().toISOString(),
    };
    this.accounts.set(opts.did, account);
    this.handleIndex.set(opts.handle, opts.did);
    return account;
  }

  async getAccount(did: string): Promise<Account | null> {
    return this.accounts.get(did) ?? null;
  }

  async getAccountByHandle(handle: string): Promise<Account | null> {
    const did = this.handleIndex.get(handle);
    if (!did) return null;
    return this.accounts.get(did) ?? null;
  }

  async deleteAccount(did: string): Promise<void> {
    const account = this.accounts.get(did);
    if (account) {
      this.handleIndex.delete(account.handle);
      this.accounts.delete(did);
      this.secrets.delete(did);
    }
  }

  async setSecret(did: string, key: string, value: string): Promise<void> {
    let secrets = this.secrets.get(did);
    if (!secrets) {
      secrets = new Map();
      this.secrets.set(did, secrets);
    }
    secrets.set(key, value);
  }

  async getSecret(did: string, key: string): Promise<string | null> {
    return this.secrets.get(did)?.get(key) ?? null;
  }

  async deleteSecret(did: string, key: string): Promise<void> {
    this.secrets.get(did)?.delete(key);
  }
}
