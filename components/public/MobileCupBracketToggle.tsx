"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

type View = "bracket" | "list";

const STAGES = [
  { short: "1/8", full: "1/8 фіналу" },
  { short: "1/4", full: "1/4 фіналу" },
  { short: "1/2", full: "1/2 фіналу" },
  { short: "Фінал", full: "фіналу" },
] as const;

export default function MobileCupBracketToggle({
  bracket,
  list,
}: {
  bracket: ReactNode;
  list: ReactNode;
}) {
  const [view, setView] = useState<View>("bracket");
  const [activeStage, setActiveStage] = useState(0);
  const bracketRootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (view !== "bracket") return;

    const scroller = bracketRootRef.current?.querySelector<HTMLElement>(
      "[data-mobile-bracket-scroll]"
    );
    if (!scroller) return;

    const updateActiveStage = () => {
      const sections = scroller.querySelectorAll<HTMLElement>(
        "[data-mobile-bracket-stage]"
      );
      const viewport = scroller.getBoundingClientRect();
      const viewportCenter = viewport.left + viewport.width / 2;

      let nearestIndex = 0;
      let nearestDistance = Infinity;

      sections.forEach((section, index) => {
        const bounds = section.getBoundingClientRect();
        const distance = Math.abs(
          (bounds.left + bounds.right) / 2 - viewportCenter
        );

        if (distance < nearestDistance) {
          nearestDistance = distance;
          nearestIndex = index;
        }
      });

      if (sections.length) setActiveStage(nearestIndex);
    };

    scroller.addEventListener("scroll", updateActiveStage, {
      passive: true,
    });
    updateActiveStage();

    return () => scroller.removeEventListener("scroll", updateActiveStage);
  }, [view]);

  function goToStage(index: number) {
    const scroller = bracketRootRef.current?.querySelector<HTMLElement>(
      "[data-mobile-bracket-scroll]"
    );
    const sections = scroller?.querySelectorAll<HTMLElement>(
      "[data-mobile-bracket-stage]"
    );
    const stage = sections?.[index];
    if (!scroller || !stage) return;

    // Враховує фактичну ширину карток та відступ контейнера.
    // На останній стадії браузер сам обмежить scrollLeft.
    const target =
      scroller.scrollLeft +
      stage.getBoundingClientRect().left -
      scroller.getBoundingClientRect().left -
      12;

    scroller.scrollTo({ left: target, behavior: "smooth" });
  }

  return (
    <div className="xl:hidden">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div
          className="inline-flex rounded-xl border border-white/10 bg-[#030b17] p-1"
          role="group"
          aria-label="Режим перегляду Кубка дивізіону"
        >
          <button
            type="button"
            aria-pressed={view === "bracket"}
            onClick={() => setView("bracket")}
            className={`min-h-10 rounded-lg px-3 text-xs font-bold transition-colors ${
              view === "bracket"
                ? "bg-blue-600 text-white shadow-sm"
                : "text-white/55 hover:text-white"
            }`}
          >
            Сітка
          </button>
          <button
            type="button"
            aria-pressed={view === "list"}
            onClick={() => setView("list")}
            className={`min-h-10 rounded-lg px-3 text-xs font-bold transition-colors ${
              view === "list"
                ? "bg-blue-600 text-white shadow-sm"
                : "text-white/55 hover:text-white"
            }`}
          >
            Список
          </button>
        </div>
      </div>

      {view === "bracket" ? (
        <div ref={bracketRootRef}>
          <div
            className="mb-2 grid grid-cols-4 gap-1"
            role="group"
            aria-label="Перехід між раундами кубка"
          >
            {STAGES.map((stage, index) => (
              <button
                key={stage.short}
                type="button"
                aria-label={`Перейти до ${stage.full}`}
                aria-pressed={activeStage === index}
                onClick={() => goToStage(index)}
                className={`min-h-9 rounded-lg border px-1 text-[11px] font-bold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-400 ${
                  activeStage === index
                    ? "border-blue-400/60 bg-blue-500/20 text-blue-200"
                    : "border-white/10 bg-white/[0.03] text-white/65 hover:border-blue-400/30 hover:text-white"
                }`}
              >
                {stage.short}
              </button>
            ))}
          </div>

          <p className="mb-2 flex items-center gap-1.5 text-[11px] text-blue-200/65">
            <span aria-hidden="true">↔</span>
            {activeStage === STAGES.length - 1
              ? "Гортай вправо, щоб повернутися до попередніх пар"
              : "Гортай сітку вліво або обери потрібний раунд"}
          </p>

          {bracket}
        </div>
      ) : (
        list
      )}
    </div>
  );
}
