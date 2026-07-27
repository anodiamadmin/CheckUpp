import crypto from "crypto";
import { env } from "../../config/env";

export interface TokenPayload {
  sub: string;
  email?: string;
  role?: string;
  sessionId?: string;
  tokenType: "access" | "refresh";
  iat?: number;
  exp?: number;
}

const base64UrlEncode = (value: Buffer | string) =>
  Buffer.from(value)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");

const base64UrlDecode = (value: string) => {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padding = "=".repeat((4 - (normalized.length % 4)) % 4);
  return Buffer.from(normalized + padding, "base64").toString("utf8");
};

const signHmac = (payload: string, secret: string) =>
  base64UrlEncode(crypto.createHmac("sha256", secret).update(payload).digest());

export const signToken = (
  payload: Omit<TokenPayload, "iat" | "exp">,
  secret: string,
  ttlMs: number
) => {
  const nowSeconds = Math.floor(Date.now() / 1000);
  const body: TokenPayload = {
    ...payload,
    iat: nowSeconds,
    exp: nowSeconds + Math.max(60, Math.floor(ttlMs / 1000)),
  };

  const header = base64UrlEncode(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const encodedPayload = base64UrlEncode(JSON.stringify(body));
  const unsignedToken = `${header}.${encodedPayload}`;
  return `${unsignedToken}.${signHmac(unsignedToken, secret)}`;
};

export const verifyToken = (token: string, secret: string): TokenPayload | null => {
  const parts = token.split(".");
  if (parts.length !== 3) return null;

  const [header, payload, signature] = parts;
  const unsignedToken = `${header}.${payload}`;
  const expectedSignature = signHmac(unsignedToken, secret);
  const provided = Buffer.from(signature);
  const expected = Buffer.from(expectedSignature);

  if (provided.length !== expected.length || !crypto.timingSafeEqual(provided, expected)) {
    return null;
  }

  try {
    const decoded = JSON.parse(base64UrlDecode(payload)) as TokenPayload;
    if (!decoded.exp || decoded.exp * 1000 < Date.now()) return null;
    return decoded;
  } catch {
    return null;
  }
};

export const hashOpaqueValue = (value: string) =>
  crypto.createHmac("sha256", env.jwtSecret).update(value).digest("hex");

export const hashPassword = async (password: string) => {
  const salt = crypto.randomBytes(16).toString("hex");
  const derived = await new Promise<Buffer>((resolve, reject) => {
    crypto.scrypt(password, salt, 64, { N: 16384, r: 8, p: 1 }, (error, key) => {
      if (error) reject(error);
      else resolve(key);
    });
  });

  return `scrypt$${salt}$${derived.toString("hex")}`;
};

export const verifyPassword = async (password: string, passwordHash: string | null) => {
  if (!passwordHash) return false;

  const [scheme, salt, storedHash] = passwordHash.split("$");
  if (scheme !== "scrypt" || !salt || !storedHash) return false;

  const derived = await new Promise<Buffer>((resolve, reject) => {
    crypto.scrypt(password, salt, 64, { N: 16384, r: 8, p: 1 }, (error, key) => {
      if (error) reject(error);
      else resolve(key);
    });
  });

  const provided = Buffer.from(derived.toString("hex"));
  const expected = Buffer.from(storedHash);
  return provided.length === expected.length && crypto.timingSafeEqual(provided, expected);
};

export const createSixDigitCode = () => crypto.randomInt(100000, 1000000).toString();

export const hashVerificationCode = (contact: string, code: string) =>
  crypto
    .createHmac("sha256", env.refreshJwtSecret)
    .update(`${contact.trim().toLowerCase()}:${code}`)
    .digest("hex");
