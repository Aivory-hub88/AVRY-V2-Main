import { describe, it, expect } from "vitest";
import { clamp, interpolate } from "./helpers";

describe("clamp", () => {
  it("returns lo when the value is below the range", () => {
    expect(clamp(-10, 0, 100)).toBe(0);
    expect(clamp(4, 5, 9)).toBe(5);
  });

  it("returns hi when the value is above the range", () => {
    expect(clamp(150, 0, 100)).toBe(100);
    expect(clamp(12, 5, 9)).toBe(9);
  });

  it("returns the value unchanged when it is within the range", () => {
    expect(clamp(42, 0, 100)).toBe(42);
    expect(clamp(7, 5, 9)).toBe(7);
  });

  it("returns lo when the value is NaN", () => {
    expect(clamp(NaN, 0, 100)).toBe(0);
    expect(clamp(NaN, 5, 9)).toBe(5);
  });

  it("returns the boundary value when the value equals lo", () => {
    expect(clamp(0, 0, 100)).toBe(0);
    expect(clamp(5, 5, 9)).toBe(5);
  });

  it("returns the boundary value when the value equals hi", () => {
    expect(clamp(100, 0, 100)).toBe(100);
    expect(clamp(9, 5, 9)).toBe(9);
  });
});

describe("interpolate", () => {
  it("replaces all tokens with their corresponding values", () => {
    expect(interpolate("{greeting}, {name}!", { greeting: "Hello", name: "Ada" })).toBe(
      "Hello, Ada!"
    );
  });

  it("replaces every occurrence of a repeated token", () => {
    expect(interpolate("{x} and {x} and {x}", { x: "go" })).toBe("go and go and go");
  });

  it("leaves unknown tokens intact", () => {
    expect(interpolate("{known} {unknown}", { known: "here" })).toBe("here {unknown}");
  });

  it("stringifies numeric values", () => {
    expect(interpolate("score: {score}/{max}", { score: 72, max: 100 })).toBe(
      "score: 72/100"
    );
  });

  it("returns the template unchanged when it contains no tokens", () => {
    expect(interpolate("plain text with no tokens", { foo: "bar" })).toBe(
      "plain text with no tokens"
    );
  });
});
