"use client";

import { useEffect, useState } from "react";
import type { PlayerMatchGroup } from "../../lib/player-account-match-groups";
import PlayerAccountMatches from "./PlayerAccountMatches";

type Tab = "matches" | "result" | "emblem" | "settings";

type VerifiedData = {
  groups: PlayerMatchGroup[];
  playerNames: Record<string, string>;
};

type PanelState =
  | { kind: "checking" }
  | { kind: "hidden" }
  | { kind: "verified"; data: VerifiedData };

const actions: ReadonlyArray<{ id: Tab; title: string }> = [
  { id: "matches", title: "Мої матчі" },
  { id: "result", title: "Подати результат" },
  { id: "emblem", title: "Моя емблема" },
  { id: "settings", title: "Налаштування" },
];

/**
 * Unlike PlayerAccountPanelPreview, this panel has no "Guest/Owner" switch.
 * It stays hidden until the server returns data AFTER verified ownership.
 * The main profile page mounts it only when the server feature flag is true.
 */
export default function PlayerAccountPanel({ playerId }: { playerId: string }) {
  const [active, setActive] = useState<Tab>("matches");
  const [state, setState] = useState<PanelState>({ kind: "checking" });

  useEffect(() => {
    const controller = new AbortController();
    let alive = true;
    setState({ kind: "checking" });

    async function verifyAndLoad() {
      try {
        const response = await fetch(
          `/api/player-account/matches?playerId=${encodeURIComponent(playerId)}`,
          {
            credentials: "same-origin",
            cache: "no-store",
            signal: controller.signal,
          },
        );
        if (!response.ok) {
          if (alive) setState({ kind: "hidden" });
          return;
        }
        const payload: unknown = await response.json();
        if (
          !payload || typeof payload !== "object" ||
          !Array.isArray((payload as Partial<VerifiedData>).groups) ||
          typeof (payload as Partial<VerifiedData>).playerNames !== "object" ||
          (payload as Partial<VerifiedData>).playerNames === null
        ) {
          throw new Error("Invalid account response");
        }
        if (alive) {
          setState({ kind: "verified", data: payload as VerifiedData });
        }
      } catch {
        if (alive) setState({ kind: "hidden" });
      }
    }

    void verifyAndLoad();
    return () => {
      alive = false;
      controller.abort();
    };
  }, [playerId]);

  // No private UI for guests, unlinked users, forbidden profiles or API errors.
  if (state.kind !== "verified") return null;

  return (
    <section aria-label="Особистий кабінет" className="mx-auto max-w-7xl px-4 pt-5 sm:px-6">
      <div className="rounded-2xl border border-blue-400/25 bg-gradient-to-br from-[#122b49] to-[#081626] p-4 sm:p-6">
        <div className="mb-4">
          <p className="text-xs font-bold uppercase tracking-wider text-blue-300">
            ПЕРСОНАЛЬНИЙ ДОСТУП
          </p>
          <h2 className="mt-1 text-xl font-black text-white">Мій кабінет</h2>
        </div>

        <nav aria-label="Розділи особистого кабінету" className="grid grid-cols-2 gap-2 sm:grid-cols-4">
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
        </nav>

        <div className="mt-3 rounded-xl border border-white/10 bg-[#06101e]/70 p-4">
          {active === "matches" ? (
            <>
              <h3 className="mb-3 font-bold text-blue-200">Мої матчі</h3>
              <PlayerAccountMatches
                playerId={playerId}
                groups={state.data.groups}
                playerNames={state.data.playerNames}
              />
              <p className="mt-4 text-xs text-white/45">
                Наразі відображаються прямі матчі сезону 4. Co-op та участь від асоціацій
                додамо після перевірки їхніх правил ідентифікації гравців.
              </p>
            </>
          ) : active === "result" ? (
            <>
              <h3 className="font-bold text-blue-200">Подати результат</h3>
              <p className="mt-1 text-sm text-white/60">
                Подання результатів поки не активоване. Спочатку реалізуємо захищені
                заявки з окремими скриншотами або поясненнями для кожного матчу та
                обов'язковим затвердженням адміністратором.
              </p>
            </>
          ) : active === "emblem" ? (
            <>
              <h3 className="font-bold text-blue-200">Моя емблема</h3>
              <p className="mt-1 text-sm text-white/60">
                Самостійне завантаження емблеми ще готується. Зміни не виконуються.
              </p>
            </>
          ) : (
            <>
              <h3 className="font-bold text-blue-200">Налаштування</h3>
              <p className="mt-1 text-sm text-white/60">
                Профіль підтверджено серверною перевіркою. Керування Discord-сесією,
                повідомленнями та допомогою додамо під час підключення авторизації.
              </p>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
