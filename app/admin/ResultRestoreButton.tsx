"use client";

import {
  useEffect,
  useState,
} from "react";

type RestoreMatch = {
  id: string;

  status: string;

  home_goals:
    | number
    | null;

  away_goals:
    | number
    | null;
};

type RestoreResult = {
  home_goals: number;

  away_goals: number;

  status: string;

  played_at:
    | string
    | null;
};

type RestorePreview = {
  success?: boolean;

  dry_run?: boolean;

  can_restore?: boolean;

  restore_result?:
    RestoreResult;

  snapshot?: {
    id: string;

    reverted_at:
      string;
  };

  error?: string;
};

type Props = {
  password: string;

  match:
    | RestoreMatch
    | null
    | undefined;

  disabled?: boolean;

  onMessage: (
    message: string
  ) => void;

  onRestored:
    () =>
      | void
      | Promise<void>;
};

/*
  ========================================
  RESULT RESTORE BUTTON
  ========================================

  Компонент сам перевіряє,
  чи існує активний snapshot.

  Кнопка показується ЛИШЕ якщо:

  - матч scheduled;
  - рахунок null:null;
  - Restore dry_run повернув
    can_restore = true.

  Тобто звичайні незіграні матчі
  кнопку Restore не отримають.
  ========================================
*/

export default function ResultRestoreButton({
  password,
  match,
  disabled = false,
  onMessage,
  onRestored,
}: Props) {
  const [
    preview,
    setPreview,
  ] =
    useState<RestorePreview | null>(
      null
    );

  const [
    checking,
    setChecking,
  ] = useState(false);

  const [
    restoring,
    setRestoring,
  ] = useState(false);

  /*
    ========================================
    CHECK RESTORE AVAILABILITY
    ========================================
  */

  useEffect(() => {
    let cancelled =
      false;

    async function checkRestore() {
      setPreview(null);

      /*
        Finished матч не потребує Restore.

        Звичайний scheduled матч
        перевіряємо лише якщо він
        має чистий рахунок.
      */

      if (
        !password ||
        !match ||
        match.status !==
          "scheduled" ||
        match.home_goals !==
          null ||
        match.away_goals !==
          null
      ) {
        setChecking(false);

        return;
      }

      setChecking(true);

      try {
        const response =
          await fetch(
            "/api/admin/match-result-restore",
            {
              method:
                "POST",

              headers: {
                "Content-Type":
                  "application/json",
              },

              body:
                JSON.stringify({
                  password,

                  match_id:
                    match.id,

                  dry_run:
                    true,
                }),
            }
          );

        const result =
          (await response.json()) as
            RestorePreview;

        if (cancelled) {
          return;
        }

        /*
          404 тут є нормальним:

          це просто scheduled матч,
          для якого немає snapshot.
        */

        if (
          response.status ===
          404
        ) {
          setPreview(null);

          return;
        }

        /*
          Невірний пароль.
        */

        if (
          response.status ===
          401
        ) {
          setPreview(null);

          return;
        }

        /*
          Серверна помилка —
          вже варто повідомити
          адміністратора.
        */

        if (
          !response.ok
        ) {
          setPreview(null);

          if (
            response.status >=
            500
          ) {
            onMessage(
              result.error ??
                "Не вдалося перевірити можливість відновлення результату"
            );
          }

          return;
        }

        if (
          result.success ===
            true &&
          result.can_restore ===
            true &&
          result.restore_result
        ) {
          setPreview(
            result
          );

          return;
        }

        setPreview(null);
      } catch {
        if (!cancelled) {
          setPreview(null);

          onMessage(
            "Помилка з'єднання під час перевірки відновлення результату"
          );
        }
      } finally {
        if (!cancelled) {
          setChecking(
            false
          );
        }
      }
    }

    void checkRestore();

    return () => {
      cancelled = true;
    };
  }, [
    password,
    match?.id,
    match?.status,
    match?.home_goals,
    match?.away_goals,
    onMessage,
  ]);

  /*
    ========================================
    RESTORE RESULT
    ========================================
  */

  async function restoreResult() {
    if (
      !password
    ) {
      onMessage(
        "Enter administrator password"
      );

      return;
    }

    if (
      !match ||
      !preview?.restore_result
    ) {
      onMessage(
        "Немає результату, доступного для відновлення"
      );

      return;
    }

    const oldResult =
      preview.restore_result;

    /*
      ========================================
      CONFIRMATION
      ========================================
    */

    const confirmed =
      window.confirm(
        [
          "Відновити попередній результат матчу?",
          "",
          `${oldResult.home_goals} : ${oldResult.away_goals}`,
          "",
          "Також буде відновлено попередній статус матчу та дату й час його проведення.",
        ].join("\n")
      );

    if (!confirmed) {
      return;
    }

    setRestoring(true);

    onMessage("");

    try {
      /*
        ========================================
        REAL RESTORE
        ========================================
      */

      const response =
        await fetch(
          "/api/admin/match-result-restore",
          {
            method:
              "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                password,

                match_id:
                  match.id,
              }),
          }
        );

      const result =
        await response.json();

      if (
        !response.ok
      ) {
        onMessage(
          result.error ??
            "Не вдалося відновити результат"
        );

        return;
      }

      onMessage(
        "✅ Результат успішно відновлено"
      );

      /*
        Батьківська сторінка
        перезавантажує матчі /
        таблиці / summary.
      */

      await onRestored();

      /*
        Snapshot уже закритий,
        тому кнопку прибираємо
        одразу.
      */

      setPreview(null);
    } catch {
      onMessage(
        "Помилка з'єднання під час відновлення результату"
      );
    } finally {
      setRestoring(false);
    }
  }

  /*
    Поки перевіряємо —
    нічого не показуємо.

    Так звичайні scheduled матчі
    не мерехтять кнопкою Restore.
  */

  if (
    checking ||
    !preview?.can_restore ||
    !preview.restore_result
  ) {
    return null;
  }

  const restoreResultData =
    preview.restore_result;

    return (
    <button
      type="button"
      onClick={restoreResult}
      disabled={disabled || restoring}
      className="mt-3 w-full min-w-0 rounded-xl border border-green-500/30 bg-green-500/10 px-3 py-4 text-sm font-black text-green-300 transition hover:bg-green-500/20 disabled:cursor-not-allowed disabled:opacity-40 sm:px-6 sm:text-base"
    >
      {restoring
        ? "Відновлення результату..."
        : `Відновити результат (${restoreResultData.home_goals} : ${restoreResultData.away_goals})`}
    </button>
  );
}