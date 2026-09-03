"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { LocalePath, SuggestableLocale } from "./LocaleSuggestionBanner";

const COPY: Record<SuggestableLocale, { message: string; cta: string }> = {
  ar: {
    message: "يبدو أنك تزور من منطقة تتحدث العربية. هل تريد عرض هذه الصفحة بالعربية؟",
    cta: "عرض بالعربية",
  },
  ja: {
    message: "日本からのアクセスですね。このページを日本語で表示しますか?",
    cta: "日本語で表示",
  },
  ko: {
    message: "한국에서 접속하셨군요. 이 페이지를 한국어로 보시겠어요?",
    cta: "한국어로 보기",
  },
  zh: {
    message: "看起来您来自中国。要查看此页面的中文版本吗?",
    cta: "查看中文版",
  },
  de: {
    message: "Sie besuchen diese Seite aus Deutschland. Möchten Sie sie auf Deutsch ansehen?",
    cta: "Auf Deutsch ansehen",
  },
  nl: {
    message: "Bezoekt u vanuit Nederland? Bekijk deze pagina in het Nederlands.",
    cta: "Bekijk in het Nederlands",
  },
  es: {
    message: "Parece que nos visitas desde España. ¿Quieres ver esta página en español?",
    cta: "Ver en español",
  },
  pt: {
    message: "Parece que nos visita de Portugal. Pretende ver esta página em português?",
    cta: "Ver em português",
  },
  fr: {
    message: "Il semble que vous nous rendiez visite depuis la France. Afficher cette page en français ?",
    cta: "Afficher en français",
  },
};

export function LocaleSuggestionBannerClient({
  target,
  path,
}: {
  target: SuggestableLocale;
  path: LocalePath;
}) {
  const storageKey = `aivory-locale-banner-dismissed:${path}:${target}`;
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    setDismissed(window.localStorage.getItem(storageKey) === "1");
  }, [storageKey]);

  if (dismissed) return null;

  const copy = COPY[target];
  const dir = target === "ar" ? "rtl" : "ltr";

  return (
    <div
      dir={dir}
      className="flex items-center justify-center gap-4 border-b border-white/10 bg-[#11110f] px-4 py-2.5 text-center text-[13px] font-light text-white/85"
    >
      <span>{copy.message}</span>
      <Link
        href={`/${target}/${path}`}
        className="whitespace-nowrap border-b border-white/50 pb-0.5 text-white transition-opacity hover:opacity-70"
      >
        {copy.cta}
      </Link>
      <button
        type="button"
        aria-label="Dismiss"
        onClick={() => {
          window.localStorage.setItem(storageKey, "1");
          setDismissed(true);
        }}
        className="text-white/40 transition-colors hover:text-white/80"
      >
        ×
      </button>
    </div>
  );
}
