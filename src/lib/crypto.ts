import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

/**
 * Field encryption for records at rest. AES-256-GCM with a random 12-byte IV per value.
 * Stored form: "v1:<iv>:<tag>:<ciphertext>", all base64url. The "v1" prefix leaves room for key rotation.
 */

const VERSION = "v1";
let cachedKey: Buffer | null = null;

function key(): Buffer {
  if (cachedKey) return cachedKey;
  const raw = process.env.STEADY_DATA_KEY;
  if (!raw) throw new Error("STEADY_DATA_KEY is not set. Run `npm run setup:env`.");
  const buf = Buffer.from(raw, "base64");
  if (buf.length !== 32) throw new Error("STEADY_DATA_KEY must be 32 bytes, base64-encoded.");
  cachedKey = buf;
  return buf;
}

export function encrypt(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const body = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [VERSION, iv.toString("base64url"), tag.toString("base64url"), body.toString("base64url")].join(":");
}

export function decrypt(stored: string): string {
  const [version, iv, tag, body] = stored.split(":");
  if (version !== VERSION || !iv || !tag || body === undefined) throw new Error("Unrecognized encrypted value");
  const decipher = createDecipheriv("aes-256-gcm", key(), Buffer.from(iv, "base64url"));
  decipher.setAuthTag(Buffer.from(tag, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(body, "base64url")), decipher.final()]).toString("utf8");
}
