import { describe, expect, it } from "vitest";
import { devLoginAllowed, devLoginEnabled } from "./dev-login";

const on = { NODE_ENV: "development", STEADY_DEV_LOGIN: "1" };

describe("dev login", () => {
  it("needs next dev and the opt-in flag", () => {
    expect(devLoginEnabled(on)).toBe(true);
    expect(devLoginEnabled({ ...on, STEADY_DEV_LOGIN: undefined })).toBe(false);
    expect(devLoginEnabled({ ...on, STEADY_DEV_LOGIN: "true" })).toBe(false);
    expect(devLoginEnabled({ ...on, NODE_ENV: "production" })).toBe(false);
    expect(devLoginEnabled({ ...on, NODE_ENV: "test" })).toBe(false);
  });

  it("is never on for Vercel", () => {
    expect(devLoginEnabled({ ...on, VERCEL: "1" })).toBe(false);
  });

  it("only answers requests addressed to this machine", () => {
    expect(devLoginAllowed("localhost", on)).toBe(true);
    expect(devLoginAllowed("127.0.0.1", on)).toBe(true);
    expect(devLoginAllowed("[::1]", on)).toBe(true);
    expect(devLoginAllowed("192.168.1.20", on)).toBe(false);
    expect(devLoginAllowed("steady.vercel.app", on)).toBe(false);
    expect(devLoginAllowed("localhost", { ...on, STEADY_DEV_LOGIN: "0" })).toBe(false);
  });
});
