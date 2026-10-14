import { describe, expect, it } from "vitest";
import { greeting } from "./greeting";

describe("greeting", () => {
  it("picks a salutation, with the name when one is set", () => {
    expect(greeting("", () => 0)).toBe("Hello");
    expect(greeting("Sam", () => 0)).toBe("Hello, Sam");
    expect(greeting("", () => 0.25)).toBe("Hey there, stranger");
    expect(greeting("  ", () => 0.99)).toBe("Bonjour");
    expect(greeting("Sam", () => 4 / 12)).toBe("Hi there, Sam");
    expect(greeting("Sam", () => 10 / 12)).toBe("Hiya, Sam");
  });

  it("varies across loads", () => {
    const seen = new Set(Array.from({ length: 12 }, (_, i) => greeting("", () => i / 12)));
    expect(seen.size).toBe(12);
  });
});
