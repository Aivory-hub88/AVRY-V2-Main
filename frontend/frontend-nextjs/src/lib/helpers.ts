/**
 * Pure helper utilities
 *
 * These functions are side-effect free. Output encoding (URL/HTML escaping) is
 * the caller's responsibility — nothing here performs encoding.
 */

/**
 * Constrain a numeric value to the inclusive range [lo, hi].
 *
 * @param value - The value to clamp
 * @param lo - The lower bound (inclusive)
 * @param hi - The upper bound (inclusive)
 * @returns `lo` if `value` is `NaN`; otherwise `value` constrained to [lo, hi]
 */
export function clamp(value: number, lo: number, hi: number): number {
  if (Number.isNaN(value)) {
    return lo;
  }
  if (value < lo) {
    return lo;
  }
  if (value > hi) {
    return hi;
  }
  return value;
}

/**
 * Replace all `{key}` tokens in a template with the corresponding value from
 * `vars`. Tokens whose key has no matching entry in `vars` are left intact in
 * the output.
 *
 * No encoding is applied to the substituted values; the caller is responsible
 * for any URL/HTML escaping required by the target channel.
 *
 * @param tpl - The template string containing `{key}` tokens
 * @param vars - A map of token keys to their replacement values
 * @returns The interpolated string
 */
export function interpolate(
  tpl: string,
  vars: Record<string, string | number>
): string {
  return tpl.replace(/\{(\w+)\}/g, (match, key: string) => {
    if (Object.prototype.hasOwnProperty.call(vars, key)) {
      return String(vars[key]);
    }
    return match;
  });
}
