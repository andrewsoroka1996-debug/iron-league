"use client";

import { useState } from "react";

type MatchRef = {
  id: string;
  status: string;
};

type ApiResponse = {
  success?: boolean;
  can_close?: boolean;
  blockers?: string[];
  error?: string;
};

type Props = {
  password: string;
  match: MatchRef | null;
  disabled?: boolean;
  onMessage: (message: string) => void;
  onUpdated: () => void | Promise<void>;
};

export default function UnplayedMatchActions({
  password,
  match,
  disabled = false,
  onMessage,
  onUpdated,
}: Props) {
  const [busy, setBusy] = useState(false);

  if (!match || match.status !== "scheduled") {
    return null;
  }

  async function closeMatch() {
    if (!match || busy || disabled) return;

    setBusy(true);

    try {
      const sendRequest = async (dry_run: boolean) => {
        const response = await fetch(
          "/api/admin/match-close-unplayed",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              password,
              match_id: match.id,
              dry_run,
            }),
          }
        );

        const data =
          (await response.json()) as ApiResponse;

        if (!response.ok || !data.success) {
          throw new Error(
            data.error ||
              data.blockers?.join("; ") ||
              "Помилка виконання операції"
          );
        }

        return data;
      };

      // Спочатку перевіряємо без змін у базі.
      const preview = await sendRequest(true);

      if (!preview.can_close) {
        onMessage(
          preview.blockers?.join("; ") ||
            "Матч не можна закрити"
        );
        return;
      }

      const confirmed = window.confirm(
        "Завершити матч без результату?\n\n" +
          "Очки та голи не зараховуватимуться."
      );

      if (!confirmed) return;

      // Реальне закриття через SQL-функцію.
      await sendRequest(false);

      onMessage("Матч завершено без результату");

      await onUpdated();
    } catch (error) {
      onMessage(
        error instanceof Error
          ? error.message
          : "Не вдалося закрити матч"
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={closeMatch}
      disabled={busy || disabled}
      className="w-full rounded-xl border border-amber-500/30 bg-amber-500/10 px-6 py-4 font-black text-amber-200 transition hover:bg-amber-500/20 disabled:opacity-40"
    >
      {busy
        ? "Обробка..."
        : "Завершити без результату"}
    </button>
  );
}