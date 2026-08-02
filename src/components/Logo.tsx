"use client";
import { useEffect, useState } from "react";

/**
 * لوقو منير. الملف الاصلي public/logo.png (شعار الاسم بالخط العربي).
 * size = ارتفاع الشعار بالبكسل، والعرض يتحسب تلقائي عشان النسبة تبقى صحيحة.
 * لو حطيت رابط شعار ثاني في الاعدادات يستخدمه بدل الملف.
 */
export default function Logo({
  size = 26,
  withName = true,
  url,
}: { size?: number; withName?: boolean; url?: string | null }) {
  const [src, setSrc] = useState(url || "/logo.png");
  useEffect(() => { setSrc(url || "/logo.png"); }, [url]);

  return (
    <span className="inline-flex select-none items-center gap-2.5">
      <img
        src={src}
        alt="منير"
        onError={() => setSrc("/logo.png")}
        className="w-auto object-contain"
        style={{ height: size, filter: "drop-shadow(0 4px 14px rgba(0,0,0,.35))" }}
      />
      {withName && (
        <span
          className="rounded-lg border border-(--color-accent)/35 bg-(--color-accent)/12 px-1.5 py-0.5 text-[.62rem] font-extrabold tracking-[.14em] text-(--color-accent)"
          style={{ direction: "ltr" }}
        >
          HQ
        </span>
      )}
    </span>
  );
}
