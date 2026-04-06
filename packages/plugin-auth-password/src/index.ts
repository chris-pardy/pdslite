import * as crypto from "node:crypto";
import { promisify } from "node:util";
import { SignJWT, jwtVerify } from "jose";

const scryptAsync = promisify(crypto.scrypt);
import type {
  Plugin,
  PluginContext,
  AuthProvider,
  CreateAccountOpts,
  AccountManager,
} from "@pdslite/pds";

interface PasswordAuthConfig {
  jwtSecret?: string;
  /** Lower cost for tests. Default 16384. */
  scryptCost?: number;
}

const SECRET_PASSWORD_HASH = "passwordHash";
const SECRET_PASSWORD_SALT = "passwordSalt";

export function pluginAuthPassword(config?: PasswordAuthConfig): Plugin {
  const jwtSecretStr =
    config?.jwtSecret ?? crypto.randomBytes(32).toString("hex");
  const jwtSecret = new TextEncoder().encode(jwtSecretStr);
  const scryptCost = config?.scryptCost ?? 16384;

  let accountManager: AccountManager;

  async function hashPassword(
    password: string,
    salt: string,
  ): Promise<string> {
    const key = (await scryptAsync(password, salt, 64, {
      N: scryptCost,
      r: 8,
      p: 1,
    })) as Buffer;
    return key.toString("hex");
  }

  async function verifyPassword(
    password: string,
    salt: string,
    hash: string,
  ): Promise<boolean> {
    const computed = await hashPassword(password, salt);
    return crypto.timingSafeEqual(
      Buffer.from(computed, "hex"),
      Buffer.from(hash, "hex"),
    );
  }

  async function signTokens(did: string) {
    const accessJwt = await new SignJWT({ sub: did })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("1h")
      .sign(jwtSecret);

    const refreshJwt = await new SignJWT({ sub: did, scope: "refresh" })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("90d")
      .sign(jwtSecret);

    return { accessJwt, refreshJwt };
  }

  const auth: AuthProvider = {
    async createAccount(opts: CreateAccountOpts) {
      if (!opts.password) {
        throw new Error("Password is required");
      }

      // Check handle uniqueness via account manager
      const existing = await accountManager.getAccountByHandle(opts.handle);
      if (existing) {
        throw new Error("Handle already taken");
      }

      // Generate placeholder DID
      const did = `did:plc:${crypto.randomBytes(16).toString("hex").slice(0, 24)}`;

      // Hash password and store via account manager secrets
      const salt = crypto.randomBytes(16).toString("hex");
      const passwordHash = await hashPassword(opts.password, salt);

      await accountManager.createAccount({
        did,
        handle: opts.handle,
        email: opts.email,
      });
      await accountManager.setSecret(did, SECRET_PASSWORD_HASH, passwordHash);
      await accountManager.setSecret(did, SECRET_PASSWORD_SALT, salt);

      const tokens = await signTokens(did);
      return { did, ...tokens };
    },

    async createSession(opts: { identifier: string; password: string }) {
      const account = await accountManager.getAccountByHandle(opts.identifier);
      if (!account) {
        throw new Error("Invalid identifier or password");
      }

      const hash = await accountManager.getSecret(
        account.did,
        SECRET_PASSWORD_HASH,
      );
      const salt = await accountManager.getSecret(
        account.did,
        SECRET_PASSWORD_SALT,
      );
      if (!hash || !salt) {
        throw new Error("Invalid identifier or password");
      }

      const valid = await verifyPassword(opts.password, salt, hash);
      if (!valid) {
        throw new Error("Invalid identifier or password");
      }

      const tokens = await signTokens(account.did);
      return { did: account.did, handle: account.handle, ...tokens };
    },

    async verifyToken(token: string) {
      const { payload } = await jwtVerify(token, jwtSecret);
      if (!payload.sub) {
        throw new Error("Invalid token: missing sub");
      }
      if (payload.scope === "refresh") {
        throw new Error("Refresh tokens cannot be used for authentication");
      }
      return { did: payload.sub };
    },
  };

  return {
    id: "auth-password",
    name: "Password Authentication",
    auth,
    async initialize(_config: unknown, ctx: PluginContext) {
      accountManager = ctx.accountManager;
    },
  };
}
