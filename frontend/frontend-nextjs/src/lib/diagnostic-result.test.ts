import { describe, it, expect } from "vitest";
import { normalizeDiagnosticResult } from "./diagnostic-result";

describe("normalizeDiagnosticResult", () => {
  describe("score normalization (Requirement 12.3)", () => {
    it("defaults to 0 when score is missing", () => {
      expect(normalizeDiagnosticResult({}).score).toBe(0);
    });

    it("defaults to 0 when score is null", () => {
      expect(normalizeDiagnosticResult({ score: null }).score).toBe(0);
    });

    it("defaults to 0 when score is a non-numeric string", () => {
      expect(normalizeDiagnosticResult({ score: "abc" }).score).toBe(0);
    });

    it("defaults to 0 when score is NaN", () => {
      expect(normalizeDiagnosticResult({ score: NaN }).score).toBe(0);
    });

    it("clamps a score above the range down to 100", () => {
      expect(normalizeDiagnosticResult({ score: 150 }).score).toBe(100);
    });

    it("clamps a negative score up to 0", () => {
      expect(normalizeDiagnosticResult({ score: -5 }).score).toBe(0);
    });

    it("preserves an in-range numeric score", () => {
      expect(normalizeDiagnosticResult({ score: 42 }).score).toBe(42);
    });
  });

  describe("string field normalization (Requirements 12.4, 12.5)", () => {
    const stringFields = [
      "category",
      "recommendation",
      "category_explanation",
    ] as const;

    for (const field of stringFields) {
      describe(field, () => {
        it("defaults to an empty string when missing", () => {
          expect(normalizeDiagnosticResult({})[field]).toBe("");
        });

        it("defaults to an empty string when null", () => {
          expect(normalizeDiagnosticResult({ [field]: null })[field]).toBe("");
        });

        it("defaults to an empty string when a number", () => {
          expect(normalizeDiagnosticResult({ [field]: 123 })[field]).toBe("");
        });

        it("preserves a valid string value", () => {
          expect(
            normalizeDiagnosticResult({ [field]: "valid" })[field]
          ).toBe("valid");
        });
      });
    }
  });

  describe("insights normalization (Requirement 12.6)", () => {
    it("defaults to an empty array when missing", () => {
      expect(normalizeDiagnosticResult({}).insights).toEqual([]);
    });

    it("defaults to an empty array when null", () => {
      expect(normalizeDiagnosticResult({ insights: null }).insights).toEqual([]);
    });

    it("defaults to an empty array when a string", () => {
      expect(normalizeDiagnosticResult({ insights: "x" }).insights).toEqual([]);
    });

    it("defaults to an empty array when a non-array object", () => {
      expect(normalizeDiagnosticResult({ insights: {} }).insights).toEqual([]);
    });

    it("preserves a valid array", () => {
      const insights = ["first insight", "second insight"];
      expect(normalizeDiagnosticResult({ insights }).insights).toEqual(insights);
    });

    it("preserves an empty array as-is", () => {
      expect(normalizeDiagnosticResult({ insights: [] }).insights).toEqual([]);
    });
  });

  describe("optional string fields (Requirement 12.1)", () => {
    const optionalFields = ["badge_svg", "diagnostic_id"] as const;

    for (const field of optionalFields) {
      describe(field, () => {
        it("preserves the value when it is a string", () => {
          expect(
            normalizeDiagnosticResult({ [field]: "value" })[field]
          ).toBe("value");
        });

        it("is omitted when missing", () => {
          const result = normalizeDiagnosticResult({});
          expect(result[field]).toBeUndefined();
          expect(field in result).toBe(false);
        });

        it("is omitted when null", () => {
          const result = normalizeDiagnosticResult({ [field]: null });
          expect(result[field]).toBeUndefined();
          expect(field in result).toBe(false);
        });

        it("is omitted when a non-string value", () => {
          const result = normalizeDiagnosticResult({ [field]: 42 });
          expect(result[field]).toBeUndefined();
          expect(field in result).toBe(false);
        });
      });
    }
  });

  describe("non-object input (Requirement 12.1)", () => {
    const fullyDefaulted = {
      score: 0,
      category: "",
      category_explanation: "",
      insights: [],
      recommendation: "",
    };

    const cases: Array<[string, unknown]> = [
      ["null", null],
      ["undefined", undefined],
      ["a number", 7],
      ["a string", "not an object"],
      ["a boolean", true],
    ];

    for (const [label, input] of cases) {
      it(`returns a fully-defaulted result for ${label} without throwing`, () => {
        expect(() => normalizeDiagnosticResult(input)).not.toThrow();
        const result = normalizeDiagnosticResult(input);
        expect(result).toEqual(fullyDefaulted);
        expect(result.badge_svg).toBeUndefined();
        expect(result.diagnostic_id).toBeUndefined();
      });
    }
  });
});
