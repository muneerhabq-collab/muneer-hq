"use client";
import { useStore } from "./Store";

export default function Toasts() {
  const { toasts } = useStore();
  return (
    <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-[90] flex flex-col gap-2 items-center pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          className="pop pointer-events-auto flex items-center gap-3 rounded-2xl border border-white/12 bg-[#2A1531]/95 px-4 py-2.5 text-sm shadow-[0_16px_40px_rgba(0,0,0,.5)] backdrop-blur"
        >
          <span>{t.text}</span>
          {t.undo && (
            <button
              onClick={t.undo}
              className="rounded-lg border border-(--color-accent)/40 px-2 py-0.5 text-xs text-(--color-accent) hover:bg-(--color-accent)/15"
            >
              تراجع
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
