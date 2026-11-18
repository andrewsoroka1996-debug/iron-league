"use client";

import { useState } from "react";

const actions = [
  {
    id: "matches",
    title: "Мої матчі",
    description: "Тут будуть найближчі матчі гравця, суперники та статуси.",
  },
  {
    id: "result",
    title: "Подати результат",
    description: "Тут гравець зможе надіслати рахунок на підтвердження.",
  },
  {
    id: "emblem",
    title: "Моя емблема",
    description: "Тут можна буде керувати власною емблемою.",
  },
  {
    id: "settings",
    title: "Налаштування",
    description: "Тут будуть параметри акаунта та безпеки.",
  },
] as const;

type ActionId = (typeof actions)[number]["id"];

export default function PlayerAccountPanelPreview() {
  const [isOwner, setIsOwner] = useState(true);
  const [active, setActive] = useState<ActionId>("matches");

  const selected = actions.find((action) => action.id === active);

  return (
    <section className="mx-auto max-w-7xl px-4 pt-5 sm:px-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-blue-300">
            ТЕСТОВИЙ РЕЖИМ
          </p>
          <p className="text-xs text-white/50">
            Перегляд персональних функцій профілю
          </p>
        </div>

        <div className="flex gap-1 rounded-xl border border-blue-400/20 bg-[#081728] p-1">
          <button
            type="button"
            onClick={() => setIsOwner(false)}
            className={`rounded-lg px-4 py-2 text-sm font-bold ${
              !isOwner ? "bg-blue-500 text-white" : "text-white/60"
            }`}
          >
            Гість
          </button>

          <button
            type="button"
            onClick={() => setIsOwner(true)}
            className={`rounded-lg px-4 py-2 text-sm font-bold ${
              isOwner ? "bg-blue-500 text-white" : "text-white/60"
            }`}
          >
            Власник
          </button>
        </div>
      </div>

      {isOwner && (
        <div className="rounded-2xl border border-blue-400/25 bg-gradient-to-br from-[#122b49] to-[#081626] p-4 sm:p-6">
          <div className="mb-4">
            <p className="text-xs font-bold uppercase tracking-wider text-blue-300">
              ПЕРСОНАЛЬНИЙ ДОСТУП
            </p>

            <h2 className="mt-1 text-xl font-black text-white">
              Мій кабінет
            </h2>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {actions.map((action) => (
              <button
                key={action.id}
                type="button"
                onClick={() => setActive(action.id)}
                aria-pressed={active === action.id}
                className={`min-h-20 rounded-xl border px-3 py-3 text-sm font-bold transition ${
                  active === action.id
                    ? "border-blue-300/60 bg-blue-500/25 text-white"
                    : "border-white/10 bg-white/5 text-white/70 hover:bg-white/10"
                }`}
              >
                {action.title}
              </button>
            ))}
          </div>

          <div
            aria-live="polite"
            className="mt-3 rounded-xl border border-white/10 bg-[#06101e]/70 p-4"
          >
            <h3 className="font-bold text-blue-200">
              {selected?.title}
            </h3>

            <p className="mt-1 text-sm text-white/60">
              {selected?.description}
            </p>
          </div>
        </div>
      )}
    </section>
  );
}
