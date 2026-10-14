import { randomBytes } from "node:crypto";
import { beforeAll, describe, expect, it } from "vitest";

beforeAll(() => {
  process.env.STEADY_DATA_KEY = randomBytes(32).toString("base64");
});

describe("field encryption", () => {
  it("round-trips and never stores plain text", async () => {
    const { encrypt, decrypt } = await import("./crypto");
    const stored = encrypt("attorney meeting made me anxious");
    expect(stored).not.toContain("attorney");
    expect(stored.startsWith("v1:")).toBe(true);
    expect(encrypt("same")).not.toBe(encrypt("same"));
    expect(decrypt(stored)).toBe("attorney meeting made me anxious");
  });

  it("rejects tampered values", async () => {
    const { encrypt, decrypt } = await import("./crypto");
    const [v, iv, tag, body] = encrypt("hello").split(":");
    // Flip a bit in the decoded bytes. Editing the last base64 character can touch only padding bits and change nothing.
    const bytes = Buffer.from(body, "base64url");
    bytes[0] ^= 1;
    const flipped = bytes.toString("base64url");
    expect(() => decrypt([v, iv, tag, flipped].join(":"))).toThrow();
  });
});
