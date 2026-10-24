"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type Quarterfinal = {
  slot: number;
  homeAssociationId: string;
  awayAssociationId: string;
  winnerId: string | null;
  complete: boolean;
};

type PlannedSeries = {
  slot: number;
  homeAssociationId: string | null;
  awayAssociationId: string | null;
  ready: boolean;
  already_created: boolean;
  sourceSlots?: number[];
};

type AdvancePreview = {
  success: true;
  preview: true;
  season: number;
  quarterfinal_complete: boolean;
  semifinal_complete: boolean;
  quarterfinals: Quarterfinal[];
  semifinal_plans: PlannedSeries[];
  final_plan: PlannedSeries;
  third_place_plan: PlannedSeries;
};

type AdvanceResult = {
  success: boolean;
  created?: string[];
  message?: string;
  error?: string;
};

type Props = {
  password: string;
  season: number;
  onCreated?: () => void | Promise<void>;
};

const associationNames: Record<string, string> = {
  arg: "Аргентина",
  bra: "Бразилія",
  eng: "Англія",
  esp: "Іспанія",
  fra: "Франція",
  ita: "Італія",
  ned: "Нідерланди",
  por: "Португалія",
};

function displayAssociation(value: string | null | undefined) {
  if (!value) return "ще не визначено";
  return associationNames[value] ?? value.toUpperCase();
}

function getErrorMessage(value: unknown): string {
  if (value && typeof value === "object" && "error" in value) {
    const error = (value as { error?: unknown }).error;
    if (typeof error === "string" && error.length > 0) return error;
  }
  return "Не вдалося виконати операцію. Перевір журнал локального сервера.";
}

async function sendAdvanceRequest(
  password: string,
  season: number,
  preview: boolean
): Promise<{ ok: boolean; status: number; data: unknown }> {
  const response = await fetch("/api/admin/association-advance", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
    body: JSON.stringify({ password, season, preview }),
  });

  const data: unknown = await response.json().catch(() => null);
  return { ok: response.ok, status: response.status, data };
}

export default function AssociationAdvancePanel({
  password,
  season,
  onCreated,
}: Props) {
  const [preview, setPreview] = useState<AdvancePreview | null>(null);
  const [busy, setBusy] = useState(false);
  const requestLock = useRef(false);
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);

  // A preview from an earlier login/password must never authorize a new click.
  useEffect(() => {
    setPreview(null);
    setMessage("");
    setIsError(false);
  }, [password, season]);

  const plans = useMemo(() => {
    if (!preview) return [];
    return [
      ...preview.semifinal_plans.map((plan) => ({
        ...plan,
        label: `1/2 фіналу — пара №${plan.slot}`,
      })),
      { ...preview.final_plan, label: "Фінал" },
      { ...preview.third_place_plan, label: "Матч за третє місце" },
    ];
  }, [preview]);

  const pending = plans.filter((plan) => plan.ready && !plan.already_created);

  async function refreshPreview() {
    if (requestLock.current) return;
    if (!password.trim()) {
      setIsError(true);
      setMessage("Спочатку введи пароль адміністратора вище.");
      setPreview(null);
      return;
    }
    requestLock.current = true;
    setBusy(true);
    setIsError(false);
    setMessage("");
    try {
      const result = await sendAdvanceRequest(password, season, true);
      if (!result.ok) {
        throw new Error(getErrorMessage(result.data));
      }
      const data = result.data as AdvancePreview | null;
      if (
        !data || !data.success || !data.preview ||
        !Array.isArray(data.semifinal_plans) ||
        !data.final_plan || !data.third_place_plan
      ) {
        throw new Error("Сервер ще не підтримує повний попередній перегляд. Онови API разом із цим модулем.");
      }
      setPreview(data);
      setMessage("Готовність стадій перевірено. Це не змінює матчі.");
    } catch (error) {
      setPreview(null);
      setIsError(true);
      setMessage(error instanceof Error ? error.message : "Помилка з’єднання.");
    } finally {
      requestLock.current = false;
      setBusy(false);
    }
  }

  async function createReadySeries() {
    if (!preview || pending.length === 0 || busy || requestLock.current || season !== 3) return;
    const labels = pending.map((plan) =>
      `${plan.label}: ${displayAssociation(plan.homeAssociationId)} — ${displayAssociation(plan.awayAssociationId)}`
    );
    if (!window.confirm(
      `Створити тільки ці готові протистояння?\n\n${labels.join("\n")}\n\n` +
      "Дія запише нові матчі у підключену Supabase, можливо бойову."
    )) return;

    requestLock.current = true;
    setBusy(true);
    setIsError(false);
    setMessage("");
    try {
      const result = await sendAdvanceRequest(password, season, false);
      if (!result.ok) throw new Error(getErrorMessage(result.data));
      const data = result.data as AdvanceResult | null;
      if (!data || !data.success) throw new Error(getErrorMessage(data));
      const created = data.created ?? [];
      setMessage(created.length
        ? `Створено: ${created.join(", ")}. Перевір R1–R6 перед внесенням результатів.`
        : "Нових пар не створено. Можливо, вони вже існують або умови змінилися.");
      setPreview(null);
      await onCreated?.();
      // Re-fetch after application: the next click always needs a fresh preview.
      const updated = await sendAdvanceRequest(password, season, true);
      const value = updated.data as AdvancePreview | null;
      if (updated.ok && value?.success && value?.preview && value.final_plan && value.third_place_plan) {
        setPreview(value);
      }
    } catch (error) {
      setIsError(true);
      setMessage(
        (error instanceof Error ? error.message : "Помилка з’єднання.") +
        " Не повторюй створення, доки не перевіриш наявні матчі."
      );
      setPreview(null);
    } finally {
      requestLock.current = false;
      setBusy(false);
    }
  }

  if (season !== 3) return null;

  return (
    <section className="rounded-3xl border border-blue-400/20 bg-[#07101d] p-6 md:p-7" aria-label="Перехід між стадіями Кубка асоціацій">
      <div className="text-xs font-bold uppercase tracking-[0.2em] text-blue-400">Кубок асоціацій · сезон 3</div>
      <h2 className="mt-2 text-2xl font-black">Сформувати наступний етап</h2>
      <p className="mt-3 text-sm leading-6 text-white/60">
        Спочатку перевір готовність. Півфінальні пари створюються незалежно,
        а фінал і матч за третє місце — після визначення обох півфінальних результатів.
        Уже створені протистояння повторно не формуються.
      </p>

      <button
        type="button"
        onClick={() => void refreshPreview()}
        disabled={busy || !password.trim()}
        className="mt-5 rounded-xl border border-blue-400/40 bg-blue-500/15 px-5 py-3 font-bold text-blue-100 hover:bg-blue-500/25 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {busy ? "Перевірка..." : "Перевірити готовність стадій"}
      </button>

      {preview && (
        <div className="mt-5 space-y-4">
          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 text-sm text-white/70">
            <div className="font-bold text-white">1/4 фіналу</div>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {preview.quarterfinals.map((qf) => (
                <div key={qf.slot}>
                  №{qf.slot}: {displayAssociation(qf.homeAssociationId)} — {displayAssociation(qf.awayAssociationId)} · {qf.complete ? `Переможець: ${displayAssociation(qf.winnerId)}` : "ще триває"}
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            {plans.map((plan) => (
              <div key={plan.label} className="rounded-xl border border-white/10 bg-[#030711] p-4 sm:flex sm:items-center sm:justify-between sm:gap-4">
                <div>
                  <div className="font-bold">{plan.label}</div>
                  <div className="mt-1 text-sm text-white/60">
                    {displayAssociation(plan.homeAssociationId)} — {displayAssociation(plan.awayAssociationId)}
                  </div>
                </div>
                <div className="mt-2 text-sm font-semibold sm:mt-0">
                  {plan.already_created ? (
                    <span className="text-emerald-300">Уже створено</span>
                  ) : plan.ready ? (
                    <span className="text-blue-300">Готовий до створення</span>
                  ) : (
                    <span className="text-amber-300">Очікує результатів</span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {pending.length > 0 ? (
            <button
              type="button"
              onClick={() => void createReadySeries()}
              disabled={busy || !password.trim()}
              className="rounded-xl bg-blue-600 px-5 py-3 font-bold text-white hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {busy ? "Створення..." : `Сформувати готові пари (${pending.length})`}
            </button>
          ) : (
            <p className="text-sm text-white/50">Наразі немає нових готових пар для створення.</p>
          )}
          <p className="text-xs text-amber-200/75">Перед підтвердженням звір учасників із затвердженою турнірною сіткою.</p>
        </div>
      )}

      {message && (
        <div role="status" className={`mt-4 rounded-xl border px-4 py-3 text-sm ${isError ? "border-red-400/30 bg-red-500/10 text-red-200" : "border-blue-400/20 bg-blue-500/10 text-blue-100"}`}>
          {message}
        </div>
      )}
    </section>
  );
}
