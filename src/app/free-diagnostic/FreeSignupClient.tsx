'use client';

/**
 * Free AI Readiness Analysis entry point.
 *
 * Since 2026-11-12 the free analysis runs inside the user dashboard (a free
 * account gets 2 diagnostics there, avry-backend FREE_GRANTS). Every
 * "free analysis" CTA on the site points at /free-diagnostic, so this page
 * creates (or signs in to) the account and hands the visitor to
 * /dashboard/diagnostics. Already signed in → straight to the dashboard.
 *
 * Dark UI: the form on near-black on the left, a baked floral panel
 * (scripts/hero-renders/floral/bake-signin.cjs) with the account summary on
 * the right. Indigo + orchid + peach, the page's own palette.
 */

import { useEffect, useState, type FormEvent } from 'react';
import { isAuthenticated, login, signup } from '@/lib/auth';
import { trackEvent } from '@/lib/analytics';
import { useLanguage } from '@/components/context/LanguageContext';
import { RollButton } from '@/components/ui/RollButton';
import { PasswordInput } from '@/components/ui/PasswordInput';
import TurnstileWidget from '@/components/payment/TurnstileWidget';

export const DASHBOARD_DIAGNOSTICS = '/dashboard/diagnostics';

const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? '';
/** Must match EXPECTED_ACTION in avry-backend app/services/turnstile.py. */
const TURNSTILE_ACTION = 'signup';

const COPY = {
  en: {
    signupTitle: 'Start your free analysis',
    signinTitle: 'Sign in to continue',
    subtitle: 'Free account',
    subtitleStrong: 'AI readiness analysis included',
    signupTab: 'Create account',
    signinTab: 'Sign in',
    email: 'Email',
    company: 'Company',
    password: 'Password',
    confirm: 'Confirm password',
    submitSignup: 'Create free account',
    submitSignin: 'Sign in',
    wait: 'Please wait…',
    legal: 'By creating an account you agree to our',
    terms: 'Terms',
    and: 'and',
    privacy: 'Privacy Policy',
    forgot: 'Forgot password?',
    errCompany: 'Enter your company name',
    errEmail: 'Enter a valid email address',
    errPassword: 'Use at least 8 characters',
    errPasswordEmpty: 'Enter your password',
    errConfirm: 'The passwords do not match',
    errExists: 'This email already has an account. Sign in instead',
    errSignin: 'Email or password is incorrect',
    errGeneric: 'Something went wrong. Please try again',
    errVerify: 'Please complete the verification check',
    errVerifyFailed: 'Verification failed. Please try the check again',
    showPassword: 'Show password',
    hidePassword: 'Hide password',
    redirecting: 'Opening your dashboard…',
    panelTitle: 'Your free account',
    panelNote: 'No card needed',
    itemName: 'AI Readiness Analysis',
    itemKind: 'Free account',
    itemPrice: 'Free',
    itemDescription:
      'See where your operations are ready for AI, where the bottlenecks are, and what to automate first',
    features: ['Free AI readiness analysis', 'Full dashboard preview', 'Upgrade any time, no lock-in'],
    total: 'Total due today',
    totalValue: 'Free',
    after: 'Your analysis runs in the Aivory dashboard. Paid plans unlock the Deep Diagnostic, workflows, AI agents and integrations',
  },
  id: {
    signupTitle: 'Mulai analisis gratis',
    signinTitle: 'Masuk untuk melanjutkan',
    subtitle: 'Akun gratis',
    subtitleStrong: 'termasuk analisis kesiapan AI',
    signupTab: 'Buat akun',
    signinTab: 'Masuk',
    email: 'Email',
    company: 'Perusahaan',
    password: 'Kata sandi',
    confirm: 'Ulangi kata sandi',
    submitSignup: 'Buat akun gratis',
    submitSignin: 'Masuk',
    wait: 'Mohon tunggu…',
    legal: 'Dengan membuat akun, kamu setuju dengan',
    terms: 'Ketentuan',
    and: 'dan',
    privacy: 'Kebijakan Privasi',
    forgot: 'Lupa kata sandi?',
    errCompany: 'Isi nama perusahaan',
    errEmail: 'Masukkan alamat email yang valid',
    errPassword: 'Gunakan minimal 8 karakter',
    errPasswordEmpty: 'Masukkan kata sandi',
    errConfirm: 'Kata sandi tidak sama',
    errExists: 'Email ini sudah punya akun. Silakan masuk',
    errSignin: 'Email atau kata sandi salah',
    errGeneric: 'Terjadi kesalahan. Coba lagi',
    errVerify: 'Selesaikan pemeriksaan verifikasi dulu',
    errVerifyFailed: 'Verifikasi gagal. Coba pemeriksaannya lagi',
    showPassword: 'Tampilkan kata sandi',
    hidePassword: 'Sembunyikan kata sandi',
    redirecting: 'Membuka dashboard…',
    panelTitle: 'Akun gratis kamu',
    panelNote: 'Tanpa kartu',
    itemName: 'Analisis Kesiapan AI',
    itemKind: 'Akun gratis',
    itemPrice: 'Gratis',
    itemDescription:
      'Lihat bagian operasional mana yang siap untuk AI, di mana hambatannya, dan apa yang perlu diotomasi lebih dulu',
    features: ['Analisis kesiapan AI gratis', 'Pratinjau dashboard lengkap', 'Upgrade kapan saja, tanpa ikatan'],
    total: 'Total hari ini',
    totalValue: 'Gratis',
    after: 'Analisis berjalan di dashboard Aivory. Paket berbayar membuka Deep Diagnostic, workflow, AI agent, dan integrasi',
  },
} as const;

type Lang = keyof typeof COPY;
type Mode = 'signup' | 'signin';
type FieldKey = 'errCompany' | 'errEmail' | 'errPassword' | 'errPasswordEmpty' | 'errConfirm';
type FormKey = 'errExists' | 'errSignin' | 'errGeneric' | 'errVerify' | 'errVerifyFailed';
/** Copy keys (so the text follows a language switch); `form` may also carry a backend message. */
type Errors = Partial<Record<'company' | 'email' | 'password' | 'confirm', FieldKey>> & {
  form?: FormKey | { raw: string };
};

const inputClass =
  'w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-[15px] text-white placeholder:text-white/30 transition focus:border-[#8b7cf6] focus:bg-white/[0.06] focus:outline-none focus:ring-1 focus:ring-[#8b7cf6] aria-[invalid=true]:border-red-400/70';
const labelClass = 'mb-1.5 block text-xs font-medium uppercase tracking-[0.08em] text-white/50';
const fieldError = 'mt-1.5 block text-xs text-red-300';
const WORDMARK_MASK = 'url(/aivory-wordmark.svg) center / contain no-repeat';

export default function FreeSignupClient() {
  const { language, setLanguage } = useLanguage();
  const lang: Lang = language === 'id' ? 'id' : 'en';
  const t = COPY[lang];

  const [mode, setMode] = useState<Mode>('signup');
  const [email, setEmail] = useState('');
  const [company, setCompany] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState<Errors>({});
  const [busy, setBusy] = useState(false);
  const [redirecting, setRedirecting] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  // Turnstile (signup only). Tokens are single-use: any failed attempt bumps
  // resetSignal for a fresh challenge.
  const turnstileEnabled = TURNSTILE_SITE_KEY.length > 0;
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [turnstileReset, setTurnstileReset] = useState(0);

  // Signed in already: the analysis is in the dashboard.
  useEffect(() => {
    if (isAuthenticated()) {
      setRedirecting(true);
      window.location.replace(DASHBOARD_DIAGNOSTICS);
    }
  }, []);

  const switchMode = (next: Mode) => {
    setMode(next);
    setErrors({});
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const next: Errors = {};
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) next.email = 'errEmail';
    if (mode === 'signup') {
      if (company.trim().length < 2) next.company = 'errCompany';
      if (password.length < 8) next.password = 'errPassword';
      else if (confirm !== password) next.confirm = 'errConfirm';
    } else if (!password) {
      next.password = 'errPasswordEmpty';
    }
    if (!Object.keys(next).length && mode === 'signup' && turnstileEnabled && !turnstileToken) {
      next.form = 'errVerify';
    }
    setErrors(next);
    if (Object.keys(next).length) return;

    setBusy(true);
    try {
      if (mode === 'signup') {
        await signup(email.trim(), password, company.trim(), turnstileToken ?? undefined);
        trackEvent('free_signup_completed', { source: 'free-diagnostic' });
      } else {
        await login(email.trim(), password);
      }
      setRedirecting(true);
      window.location.assign(DASHBOARD_DIAGNOSTICS);
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      if (mode === 'signup' && turnstileEnabled) {
        setTurnstileToken(null);
        setTurnstileReset((n) => n + 1);
      }
      if (mode === 'signup' && /human verification/i.test(msg)) {
        setErrors({ form: 'errVerifyFailed' });
      } else if (mode === 'signup' && /already registered|already exists/i.test(msg)) {
        // Keep the email and password: one click on "Sign in" finishes it.
        setMode('signin');
        setErrors({ form: 'errExists' });
      } else if (mode === 'signin') {
        setErrors({
          form: /invalid|incorrect|credentials|login failed/i.test(msg) ? 'errSignin' : msg ? { raw: msg } : 'errGeneric',
        });
      } else {
        setErrors({ form: msg && !/registration failed/i.test(msg) ? { raw: msg } : 'errGeneric' });
      }
      setBusy(false);
    }
  };

  const formError = errors.form ? (typeof errors.form === 'string' ? t[errors.form] : errors.form.raw) : null;

  return (
    <div className="min-h-screen bg-[#07080c] font-sans text-white">
      <div className="grid min-h-screen grid-cols-1 lg:grid-cols-12">
        {/* ---- Form ---- */}
        <div className="bg-[#07080c] lg:col-span-7 xl:col-span-8">
          <div className="relative isolate flex min-h-screen w-full flex-col p-6 sm:p-8 lg:p-12">
            <div className="mb-12 flex items-center justify-between">
              <a href="/" aria-label="Aivory home" className="block">
                <div
                  role="img"
                  aria-label="Aivory"
                  className="aspect-[205/30] h-6 bg-white"
                  style={{ WebkitMask: WORDMARK_MASK, mask: WORDMARK_MASK }}
                />
              </a>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setLangOpen((v) => !v)}
                  aria-haspopup="listbox"
                  aria-expanded={langOpen}
                  className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.05] px-3.5 py-1.5 text-sm font-medium text-white/85 transition hover:bg-white/10"
                >
                  {lang === 'id' ? 'Bahasa Indonesia' : 'English'}
                  <svg className="h-4 w-4 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {langOpen && (
                  <div role="listbox" className="absolute right-0 z-10 mt-2 w-44 overflow-hidden rounded-xl border border-white/10 bg-[#101218] shadow-[0_18px_40px_-12px_rgba(0,0,0,0.8)]">
                    {(['en', 'id'] as const).map((lng) => (
                      <button
                        key={lng}
                        type="button"
                        role="option"
                        aria-selected={lang === lng}
                        onClick={() => {
                          setLanguage(lng);
                          setLangOpen(false);
                        }}
                        className={`block w-full px-4 py-2.5 text-left text-sm transition hover:bg-white/[0.06] ${
                          lang === lng ? 'font-semibold text-[#b9b0ff]' : 'text-white/70'
                        }`}
                      >
                        {lng === 'en' ? 'English' : 'Bahasa Indonesia'}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="mx-auto flex w-full max-w-md flex-grow flex-col items-center justify-center">
              {redirecting ? (
                <p className="text-white/60" role="status">
                  {t.redirecting}
                </p>
              ) : (
                <div className="w-full">
                  <h1 className="mb-1.5 text-center text-[28px] font-medium tracking-[-0.02em]">
                    {mode === 'signup' ? t.signupTitle : t.signinTitle}
                  </h1>
                  <p className="mb-8 text-center text-sm text-white/50">
                    {t.subtitle} · <span className="font-medium text-white/85">{t.subtitleStrong}</span>
                  </p>

                  <div className="mb-6 flex rounded-full border border-white/10 bg-white/[0.04] p-1" role="tablist">
                    {(['signup', 'signin'] as const).map((m) => (
                      <button
                        key={m}
                        type="button"
                        role="tab"
                        aria-selected={mode === m}
                        onClick={() => switchMode(m)}
                        className={`flex-1 rounded-full py-2 text-sm font-medium transition-colors ${
                          mode === m ? 'bg-white/[0.12] text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)]' : 'text-white/45 hover:text-white/75'
                        }`}
                      >
                        {m === 'signup' ? t.signupTab : t.signinTab}
                      </button>
                    ))}
                  </div>

                  <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
                    <div>
                      <label htmlFor="free-email" className={labelClass}>
                        {t.email}
                      </label>
                      <input
                        id="free-email"
                        type="email"
                        autoComplete="email"
                        placeholder="you@company.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        aria-invalid={!!errors.email}
                        className={inputClass}
                      />
                      {errors.email && <span className={fieldError}>{t[errors.email]}</span>}
                    </div>
                    {mode === 'signup' && (
                      <div>
                        <label htmlFor="free-company" className={labelClass}>
                          {t.company}
                        </label>
                        <input
                          id="free-company"
                          type="text"
                          autoComplete="organization"
                          placeholder="Acme LLC"
                          value={company}
                          onChange={(e) => setCompany(e.target.value)}
                          aria-invalid={!!errors.company}
                          className={inputClass}
                        />
                        {errors.company && <span className={fieldError}>{t[errors.company]}</span>}
                      </div>
                    )}
                    <div>
                      <label htmlFor="free-password" className={labelClass}>
                        {t.password}
                      </label>
                      <PasswordInput
                        id="free-password"
                        showLabel={t.showPassword}
                        hideLabel={t.hidePassword}
                        autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        aria-invalid={!!errors.password}
                        className={inputClass}
                      />
                      {errors.password && <span className={fieldError}>{t[errors.password]}</span>}
                    </div>
                    {mode === 'signup' && (
                      <div>
                        <label htmlFor="free-confirm" className={labelClass}>
                          {t.confirm}
                        </label>
                        <PasswordInput
                          id="free-confirm"
                          showLabel={t.showPassword}
                          hideLabel={t.hidePassword}
                          autoComplete="new-password"
                          placeholder="••••••••"
                          value={confirm}
                          onChange={(e) => setConfirm(e.target.value)}
                          aria-invalid={!!errors.confirm}
                          className={inputClass}
                        />
                        {errors.confirm && <span className={fieldError}>{t[errors.confirm]}</span>}
                      </div>
                    )}

                    {mode === 'signup' && turnstileEnabled && (
                      <div className="flex justify-center">
                        <TurnstileWidget
                          siteKey={TURNSTILE_SITE_KEY}
                          action={TURNSTILE_ACTION}
                          theme="dark"
                          onToken={setTurnstileToken}
                          onExpire={() => setTurnstileToken(null)}
                          resetSignal={turnstileReset}
                        />
                      </div>
                    )}

                    {formError && (
                      <p className="rounded-xl border border-red-400/30 bg-red-500/10 px-3.5 py-2.5 text-sm text-red-200" role="alert">
                        {formError}
                      </p>
                    )}

                    <div className="mt-2 w-full">
                      <RollButton type="submit" disabled={busy} tone="light" className="py-3.5 text-[15px]">
                        {busy ? t.wait : mode === 'signup' ? t.submitSignup : t.submitSignin}
                      </RollButton>
                    </div>
                  </form>

                  {mode === 'signup' ? (
                    <p className="mt-5 text-center text-xs text-white/40">
                      {t.legal}{' '}
                      <a href="/terms" className="underline underline-offset-2 transition hover:text-white/75">
                        {t.terms}
                      </a>{' '}
                      {t.and}{' '}
                      <a href="/privacy" className="underline underline-offset-2 transition hover:text-white/75">
                        {t.privacy}
                      </a>
                    </p>
                  ) : (
                    <p className="mt-5 text-center text-xs text-white/40">
                      <a href="/forgot-password" className="underline underline-offset-2 transition hover:text-white/75">
                        {t.forgot}
                      </a>
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ---- Summary: baked floral art, copy on top ---- */}
        <div className="relative isolate flex min-h-[560px] flex-col overflow-hidden bg-[#05060d] lg:col-span-5 lg:min-h-screen xl:col-span-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/landing/signin/signin-floral-v3.webp"
            alt=""
            aria-hidden="true"
            width={800}
            height={1280}
            decoding="async"
            draggable={false}
            className="absolute inset-0 -z-10 h-full w-full select-none object-cover object-bottom"
          />
          {/* Keeps the copy readable where the ASCII noise and the first petals reach it. */}
          <div
            aria-hidden="true"
            className="absolute inset-0 -z-10"
            style={{ background: 'linear-gradient(180deg,rgba(5,6,13,.94) 0%,rgba(5,6,13,.88) 32%,rgba(5,6,13,.4) 50%,rgba(5,6,13,0) 66%)' }}
          />
          <div className="p-8 pb-6 lg:p-12 lg:pb-6">
            <h2 className="mb-2 text-2xl font-medium tracking-[-0.02em]">{t.panelTitle}</h2>
            <p className="mb-8 text-sm text-white/70">{t.panelNote}</p>

            <div className="mb-2 flex items-start justify-between border-t border-white/15 pt-8">
              <div className="pr-4">
                <span className="block font-medium">{t.itemName}</span>
                <span className="text-xs font-medium uppercase tracking-[0.08em] text-white/60">{t.itemKind}</span>
              </div>
              <span className="whitespace-nowrap font-medium">{t.itemPrice}</span>
            </div>

            <p className="mb-4 text-sm leading-relaxed text-white/70">{t.itemDescription}</p>
            <ul className="space-y-1.5">
              {t.features.map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm text-white/85">
                  <svg className="mt-0.5 h-4 w-4 shrink-0 text-[#b9b0ff]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  {f}
                </li>
              ))}
            </ul>
          </div>

          {/* The total sits in glass over the bloom. */}
          <div className="px-6 pb-6 lg:px-8 lg:pb-8">
            <div className="rounded-2xl border border-white/15 bg-black/30 p-5 shadow-[0_20px_50px_-20px_rgba(0,0,0,0.7)] backdrop-blur-xl">
              <div className="flex items-center justify-between">
                <span className="font-medium text-white/90">{t.total}</span>
                <span className="whitespace-nowrap text-xl font-semibold">{t.totalValue}</span>
              </div>
              <p className="mt-3 text-xs leading-relaxed text-white/70">{t.after}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
