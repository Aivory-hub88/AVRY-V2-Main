import { beforeEach, describe, expect, it } from 'vitest';
import { hasPasskeyHint, setPasskeyHint } from './passkeyHint';

beforeEach(() => localStorage.clear());

describe('passkey hint', () => {
  it('is off until a passkey was made or used on this browser', () => {
    expect(hasPasskeyHint()).toBe(false);
    setPasskeyHint();
    expect(hasPasskeyHint()).toBe(true);
  });

  it('is not an aivory_ key, so the logout sweep of aivory_* keys leaves it', () => {
    setPasskeyHint();
    for (const key of Object.keys(localStorage)) {
      if (key.startsWith('aivory_')) localStorage.removeItem(key);
    }
    expect(hasPasskeyHint()).toBe(true);
  });

  it('does not throw when storage is unavailable', () => {
    const original = Storage.prototype.getItem;
    Storage.prototype.getItem = () => { throw new Error('denied'); };
    try {
      expect(hasPasskeyHint()).toBe(false);
    } finally {
      Storage.prototype.getItem = original;
    }
  });
});
