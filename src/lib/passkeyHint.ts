/**
 * Whether this browser has made or used a passkey for the site.
 *
 * Only decides whether the login shows its "no passkey yet?" hint; it never
 * hides the passkey button, and it is not a security signal. Stored without
 * the "aivory_" prefix on purpose: the dashboard sweeps every "aivory_" key
 * at logout, and this is a device preference that must survive it. The
 * landing and the dashboard share an origin, so a passkey added in the
 * dashboard's Settings is seen here.
 */
const KEY = "passkey_hint";

export function hasPasskeyHint(): boolean {
  try {
    return localStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}

export function setPasskeyHint(): void {
  try {
    localStorage.setItem(KEY, "1");
  } catch {
    /* private mode or storage disabled: the hint just stays visible */
  }
}
