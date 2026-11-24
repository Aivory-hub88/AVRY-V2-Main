'use client';

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { createPasskeyAfterLogin, login } from '@/lib/auth';
import SignInModal from './SignInModal';

vi.mock('@/lib/auth', () => ({
  login: vi.fn(),
  createPasskeyAfterLogin: vi.fn(),
  loginWithPasskey: vi.fn(),
  passkeysSupported: () => true,
  PasskeyCancelledError: class PasskeyCancelledError extends Error {},
  PaymentRequiredError: class PaymentRequiredError extends Error {
    deadlineAt = '';
  },
}));

vi.mock('next/image', () => ({
  // eslint-disable-next-line @next/next/no-img-element
  default: (props: Record<string, unknown>) => <img {...props} alt={(props.alt as string) ?? ''} />,
}));

beforeEach(() => {
  document.body.style.overflow = '';
  document.body.style.paddingRight = '';
});

describe('SignInModal overlay', () => {
  it('renders nothing when closed', () => {
    const { container } = render(<SignInModal isOpen={false} onClose={() => {}} />);
    expect(container).toBeEmptyDOMElement();
    expect(screen.queryByText('Welcome back')).toBeNull();
  });

  it('portals the overlay to document.body so it escapes the nav stacking context', () => {
    const { container } = render(
      <div data-testid="nav-host">
        <SignInModal isOpen onClose={() => {}} />
      </div>
    );
    expect(screen.getByText('Welcome back')).toBeTruthy();
    // The overlay must not live inside the rendering host (the fixed <nav>).
    expect(container.querySelector('[data-testid="nav-host"]')?.textContent).not.toContain('Welcome back');
    const overlay = document.body.querySelector('.signin-modal-card');
    expect(overlay).toBeTruthy();
  });

  it('keeps the card opaque (no spotlight-card bleed-through of the hero)', () => {
    render(<SignInModal isOpen onClose={() => {}} />);
    const card = document.body.querySelector('.signin-modal-card');
    expect(card).toBeTruthy();
    expect(card?.className).not.toContain('spotlight-card');
    expect(card?.className).toContain('bg-[#0a0a0a]');
  });

  it('locks body scroll while open and restores the exact previous values on close', () => {
    document.body.style.overflow = 'clip';
    const { unmount } = render(<SignInModal isOpen onClose={() => {}} />);
    expect(document.body.style.overflow).toBe('hidden');
    unmount();
    expect(document.body.style.overflow).toBe('clip');
    expect(document.body.style.paddingRight).toBe('');
  });

  it('links "Create a free account" to the free analysis signup', () => {
    render(<SignInModal isOpen onClose={() => {}} />);
    expect(screen.getByText(/Create a free account/).closest('a')?.getAttribute('href')).toBe('/free-diagnostic');
  });

  it('closes on Escape and on backdrop click', () => {    const onClose = vi.fn();
    render(<SignInModal isOpen onClose={onClose} />);
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
    (document.body.querySelector('.signin-modal-backdrop') as HTMLElement).click();
    expect(onClose).toHaveBeenCalledTimes(2);
  });
});

describe('SignInModal passkey sign-in', () => {
  it('offers a passkey button next to the password form', () => {
    render(<SignInModal isOpen onClose={() => {}} />);
    expect(screen.getByRole('button', { name: /sign in with a passkey/i })).toBeInTheDocument();
  });

  it('tells a first-time user how to get a passkey, and stops once this browser has one', () => {
    localStorage.removeItem('passkey_hint');
    const { unmount } = render(<SignInModal isOpen onClose={() => {}} />);
    expect(screen.getByText(/no passkey yet\?/i)).toBeInTheDocument();
    unmount();

    localStorage.setItem('passkey_hint', '1');
    render(<SignInModal isOpen onClose={() => {}} />);
    expect(screen.queryByText(/no passkey yet\?/i)).toBeNull();
    // The button itself is never hidden by the hint.
    expect(screen.getByRole('button', { name: /sign in with a passkey/i })).toBeInTheDocument();
    localStorage.removeItem('passkey_hint');
  });
});

describe('SignInModal create-a-passkey option', () => {
  const fill = () => {
    fireEvent.change(screen.getByLabelText(/email address/i), { target: { name: 'email', value: 'a@b.co' } });
    fireEvent.change(screen.getByLabelText(/^password$/i), { target: { name: 'password', value: 'hunter2hunter2' } });
  };

  it('offers to create a passkey on this device, unchecked by default', () => {
    render(<SignInModal isOpen onClose={() => {}} />);
    const box = screen.getByRole('checkbox', { name: /create a passkey on this device/i });
    expect(box).not.toBeChecked();
  });

  it('creates the passkey right after the password login when ticked', async () => {
    vi.mocked(login).mockResolvedValue({} as never);
    vi.mocked(createPasskeyAfterLogin).mockClear();
    render(<SignInModal isOpen onClose={() => {}} />);
    fill();
    fireEvent.click(screen.getByRole('checkbox', { name: /create a passkey on this device/i }));
    fireEvent.submit(screen.getByRole('button', { name: /sign in$/i }).closest('form')!);
    await waitFor(() => expect(createPasskeyAfterLogin).toHaveBeenCalledTimes(1));
    expect(vi.mocked(login).mock.invocationCallOrder[0]).toBeLessThan(
      vi.mocked(createPasskeyAfterLogin).mock.invocationCallOrder[0],
    );
  });

  it('does not touch passkeys on a plain password login', async () => {
    vi.mocked(login).mockResolvedValue({} as never);
    vi.mocked(createPasskeyAfterLogin).mockClear();
    render(<SignInModal isOpen onClose={() => {}} />);
    fill();
    fireEvent.submit(screen.getByRole('button', { name: /sign in$/i }).closest('form')!);
    await waitFor(() => expect(login).toHaveBeenCalled());
    expect(createPasskeyAfterLogin).not.toHaveBeenCalled();
  });
});
