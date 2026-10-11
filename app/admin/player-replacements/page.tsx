"use client";

import {
  useCallback,
  useMemo,
  useState,
  type FormEvent,
} from "react";

import { players } from "../../../data/players";

type SeasonNumber =
  | 1
  | 2
  | 3
  | 4;

type DivisionNumber =
  | 1
  | 2
  | 3
  | 4;

type PlayerReplacement = {
  id: string;

  season: number;
  division: number;

  outgoing_player_id: string;
  incoming_player_id: string;

  inherit_standings: boolean;

  created_at: string;
};

type StandingsRow = {
  playerId: string;

  played: number;

  wins: number;
  draws: number;
  losses: number;

  goalsFor: number;
  goalsAgainst: number;

  goalDifference: number;

  points: number;
};

type PreviewMatch = {
  id: string;

  round: number | null;

  status: string;

  before: {
    home_id: string;
    away_id: string;

    home_goals: number | null;
    away_goals: number | null;
  };

  after: {
    home_id: string;
    away_id: string;

    home_goals: number | null;
    away_goals: number | null;
  };
};

type HistoricalMatch = {
  id: string;

  round: number | null;

  home_id: string;
  away_id: string;

  home_goals: number | null;
  away_goals: number | null;
};

type LoadResponse = {
  success?: boolean;

  season?: number;
  division?: number;

  base_player_ids?: string[];
  current_player_ids?: string[];

  replacements?: PlayerReplacement[];

  error?: string;
};

type PreviewResponse = {
  success?: boolean;

  preview?: boolean;

  replacement_mode?: string;

  season?: number;
  division?: number;

  outgoing_player?: {
    id: string;
    nickname: string;
  };

  incoming_player?: {
    id: string;
    nickname: string;
  };

  affected_future_matches?: number;

  affected_unfinished_matches?: number;

  affected_matches?: PreviewMatch[];

  finished_historical_matches?:
    HistoricalMatch[];

  standings_before?:
    | StandingsRow
    | null;

  standings_after?:
    | StandingsRow
    | null;

  points_inherited?: number;

  current_player_count?: number;
  preview_player_count?: number;

  error?: string;
};

type LoadingAction =
  | "load"
  | "preview"
  | "apply"
  | "revert"
  | null;

export default function PlayerReplacementsPage() {
  /*
    ========================================
    SETTINGS
    ========================================
  */

  const [
    password,
    setPassword,
  ] =
    useState("");

  const [
    season,
    setSeason,
  ] =
    useState<SeasonNumber>(
      3
    );

  const [
    division,
    setDivision,
  ] =
    useState<DivisionNumber>(
      1
    );

  /*
    ========================================
    DATA
    ========================================
  */

  const [
    loaded,
    setLoaded,
  ] =
    useState(false);

  const [
    currentPlayerIds,
    setCurrentPlayerIds,
  ] =
    useState<string[]>(
      []
    );

  const [
    replacements,
    setReplacements,
  ] =
    useState<
      PlayerReplacement[]
    >([]);

  /*
    ========================================
    NEW REPLACEMENT
    ========================================
  */

  const [
    outgoingId,
    setOutgoingId,
  ] =
    useState("");

  const [
    incomingId,
    setIncomingId,
  ] =
    useState("");

  const [
    preview,
    setPreview,
  ] =
    useState<
      PreviewResponse | null
    >(null);

  /*
    ========================================
    UI
    ========================================
  */

  const [
    message,
    setMessage,
  ] =
    useState("");

  const [
    loadingAction,
    setLoadingAction,
  ] =
    useState<LoadingAction>(
      null
    );

  const busy =
    loadingAction !== null;

  /*
    ========================================
    PLAYER NAME
    ========================================
  */

  function getPlayerName(
    playerId: string
  ) {
    return (
      players.find(
        (player) =>
          player.id ===
          playerId
      )?.nickname ??
      playerId
    );
  }

  /*
    ========================================
    CURRENT PLAYERS
    ========================================
  */

  const currentPlayers =
    useMemo(() => {
      return currentPlayerIds
        .map((id) =>
          players.find(
            (player) =>
              player.id === id
          )
        )
        .filter(
          (
            player
          ): player is (typeof players)[number] =>
            player !==
            undefined
        );
    }, [
      currentPlayerIds,
    ]);

  /*
    ========================================
    INCOMING PLAYER CANDIDATES
    ========================================
  */

  const incomingPlayers =
    useMemo(() => {
      const currentSet =
        new Set(
          currentPlayerIds
        );

      /*
        Не пропонуємо гравців,
        які вже є активними.

        Також не пропонуємо гравців,
        які вже беруть участь у поточному
        replacement chain.

        Повернення попереднього гравця
        робиться через Revert.
      */

      const replacementPlayerIds =
        new Set<string>();

      for (
        const replacement
        of replacements
      ) {
        replacementPlayerIds.add(
          replacement
            .outgoing_player_id
        );

        replacementPlayerIds.add(
          replacement
            .incoming_player_id
        );
      }

      return [...players]
        .filter(
          (player) =>
            !currentSet.has(
              player.id
            ) &&
            !replacementPlayerIds.has(
              player.id
            )
        )
        .sort(
          (a, b) =>
            a.nickname.localeCompare(
              b.nickname
            )
        );
    }, [
      currentPlayerIds,
      replacements,
    ]);

  /*
    ========================================
    HISTORY
    ========================================
  */

  const sortedReplacements =
    useMemo(() => {
      return [
        ...replacements,
      ].sort(
        (a, b) =>
          new Date(
            b.created_at
          ).getTime() -
          new Date(
            a.created_at
          ).getTime()
      );
    }, [
      replacements,
    ]);

  /*
    ========================================
    CAN REVERT
    ========================================
  */

  function canRevertReplacement(
    replacement:
      PlayerReplacement
  ) {
    return !replacements.some(
      (other) =>
        other.outgoing_player_id ===
          replacement
            .incoming_player_id &&
        new Date(
          other.created_at
        ).getTime() >
          new Date(
            replacement.created_at
          ).getTime()
    );
  }

  /*
    ========================================
    RESET PREVIEW
    ========================================
  */

  function clearPreview() {
    setPreview(null);

    setMessage("");
  }

  /*
    ========================================
    LOAD DIVISION
    ========================================
  */

  const loadDivision =
    useCallback(
      async (
        showMessage =
          true
      ) => {
        if (!password) {
          setMessage(
            "Enter administrator password"
          );

          return;
        }

        setLoadingAction(
          "load"
        );

        if (showMessage) {
          setMessage("");
        }

        try {
          const params =
            new URLSearchParams();

          params.set(
            "season",
            String(season)
          );

          params.set(
            "division",
            String(division)
          );

          const response =
            await fetch(
              `/api/admin/player-replacement?${params.toString()}`,
              {
                method:
                  "GET",

                cache:
                  "no-store",

                headers: {
                  "x-admin-password":
                    password,
                },
              }
            );

          const result =
            (await response.json()) as
              LoadResponse;

          if (!response.ok) {
            setLoaded(false);

            setCurrentPlayerIds(
              []
            );

            setReplacements(
              []
            );

            setMessage(
              result.error ??
                "Failed to load division"
            );

            return;
          }

          const nextPlayerIds =
            result
              .current_player_ids ??
            [];

          const nextReplacements =
            result
              .replacements ??
            [];

          setCurrentPlayerIds(
            nextPlayerIds
          );

          setReplacements(
            nextReplacements
          );

          setLoaded(true);

          setPreview(null);

          setOutgoingId(
            (current) =>
              nextPlayerIds.includes(
                current
              )
                ? current
                : nextPlayerIds[0] ??
                  ""
          );

          setIncomingId("");

          if (showMessage) {
            setMessage(
              "✅ Division loaded"
            );
          }
        } catch {
          setLoaded(false);

          setCurrentPlayerIds(
            []
          );

          setReplacements(
            []
          );

          setMessage(
            "Connection error"
          );
        } finally {
          setLoadingAction(
            null
          );
        }
      },
      [
        password,
        season,
        division,
      ]
    );

  /*
    ========================================
    CHANGE SEASON
    ========================================
  */

  function changeSeason(
    newSeason:
      SeasonNumber
  ) {
    setSeason(
      newSeason
    );

    if (
      newSeason === 1 &&
      division === 4
    ) {
      setDivision(1);
    }

    setLoaded(false);

    setCurrentPlayerIds(
      []
    );

    setReplacements(
      []
    );

    setOutgoingId("");

    setIncomingId("");

    setPreview(null);

    setMessage("");
  }

  /*
    ========================================
    CHANGE DIVISION
    ========================================
  */

  function changeDivision(
    newDivision:
      DivisionNumber
  ) {
    setDivision(
      newDivision
    );

    setLoaded(false);

    setCurrentPlayerIds(
      []
    );

    setReplacements(
      []
    );

    setOutgoingId("");

    setIncomingId("");

    setPreview(null);

    setMessage("");
  }

  /*
    ========================================
    PREVIEW
    ========================================
  */

  async function previewReplacement(
    event:
      FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (!password) {
      setMessage(
        "Enter administrator password"
      );

      return;
    }

    if (!outgoingId) {
      setMessage(
        "Select outgoing player"
      );

      return;
    }

    if (!incomingId) {
      setMessage(
        "Select incoming player"
      );

      return;
    }

    setLoadingAction(
      "preview"
    );

    setMessage("");

    setPreview(null);

    try {
      const response =
        await fetch(
          "/api/admin/player-replacement-preview",
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

                season,

                division,

                outgoing_player_id:
                  outgoingId,

                incoming_player_id:
                  incomingId,
              }),
          }
        );

      const result =
        (await response.json()) as
          PreviewResponse;

      if (!response.ok) {
        setMessage(
          result.error ??
            "Preview failed"
        );

        return;
      }

      setPreview(
        result
      );

      setMessage(
        "✅ Preview ready. No database changes have been made."
      );
    } catch {
      setMessage(
        "Connection error"
      );
    } finally {
      setLoadingAction(
        null
      );
    }
  }

  /*
    ========================================
    APPLY
    ========================================
  */

  async function applyReplacement() {
    if (!preview) {
      return;
    }

    const affectedMatches =
      preview
        .affected_unfinished_matches ??
      preview
        .affected_future_matches ??
      0;

    const confirmed =
      window.confirm(
        `Replace ${getPlayerName(
          outgoingId
        )} with ${getPlayerName(
          incomingId
        )}?

All ${affectedMatches} unfinished matches will move to the new player.

Finished historical matches will remain unchanged.`
      );

    if (!confirmed) {
      return;
    }

    setLoadingAction(
      "apply"
    );

    setMessage("");

    try {
      const response =
        await fetch(
          "/api/admin/player-replacement",
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

                season,

                division,

                outgoing_player_id:
                  outgoingId,

                incoming_player_id:
                  incomingId,
              }),
          }
        );

      const result =
        await response.json();

      if (!response.ok) {
        setMessage(
          result.error ??
            "Replacement failed"
        );

        return;
      }

      const updatedMatches =
        result.replacement
          ?.updated_matches ??
        0;

      setPreview(null);

      setIncomingId("");

      await loadDivision(
        false
      );

      setMessage(
        `✅ Replacement completed. Updated unfinished matches: ${updatedMatches}`
      );
    } catch {
      setMessage(
        "Connection error"
      );
    } finally {
      setLoadingAction(
        null
      );
    }
  }

  /*
    ========================================
    REVERT
    ========================================
  */

  async function revertReplacement(
    replacement:
      PlayerReplacement
  ) {
    const confirmed =
      window.confirm(
        `Revert ${getPlayerName(
          replacement
            .outgoing_player_id
        )} → ${getPlayerName(
          replacement
            .incoming_player_id
        )}?

All unfinished matches will return to the previous player.

If the replacement player has already played a finished match, the server will block the revert.`
      );

    if (!confirmed) {
      return;
    }

    setLoadingAction(
      "revert"
    );

    setMessage("");

    try {
      const response =
        await fetch(
          "/api/admin/player-replacement-revert",
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

                replacement_id:
                  replacement.id,
              }),
          }
        );

      const result =
        await response.json();

      if (!response.ok) {
        setMessage(
          result.error ??
            "Revert failed"
        );

        return;
      }

      const updatedMatches =
        result.revert
          ?.updated_matches ??
        0;

      await loadDivision(
        false
      );

      setMessage(
        `✅ Replacement reverted. Restored unfinished matches: ${updatedMatches}`
      );
    } catch {
      setMessage(
        "Connection error"
      );
    } finally {
      setLoadingAction(
        null
      );
    }
  }

  /*
    ========================================
    STANDINGS CARD
    ========================================
  */

  function standingsCard(
    title: string,
    row:
      | StandingsRow
      | null
      | undefined
  ) {
    if (!row) {
      return (
        <div className="rounded-2xl border border-white/10 bg-[#030711] p-5">
          <div className="text-sm font-bold text-white/40">
            {title}
          </div>

          <div className="mt-4 text-white/30">
            No standings data
          </div>
        </div>
      );
    }

    return (
      <div className="rounded-2xl border border-white/10 bg-[#030711] p-5">
        <div className="text-sm font-bold text-white/40">
          {title}
        </div>

        <div className="mt-2 text-xl font-black">
          {getPlayerName(
            row.playerId
          )}
        </div>

        <div className="mt-5 grid grid-cols-4 gap-3 text-center">
          <div>
            <div className="text-xs text-white/35">
              P
            </div>

            <div className="mt-1 font-black">
              {row.played}
            </div>
          </div>

          <div>
            <div className="text-xs text-white/35">
              W
            </div>

            <div className="mt-1 font-black">
              {row.wins}
            </div>
          </div>

          <div>
            <div className="text-xs text-white/35">
              D
            </div>

            <div className="mt-1 font-black">
              {row.draws}
            </div>
          </div>

          <div>
            <div className="text-xs text-white/35">
              L
            </div>

            <div className="mt-1 font-black">
              {row.losses}
            </div>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-4 gap-3 text-center">
          <div>
            <div className="text-xs text-white/35">
              GF
            </div>

            <div className="mt-1 font-black">
              {row.goalsFor}
            </div>
          </div>

          <div>
            <div className="text-xs text-white/35">
              GA
            </div>

            <div className="mt-1 font-black">
              {row.goalsAgainst}
            </div>
          </div>

          <div>
            <div className="text-xs text-white/35">
              GD
            </div>

            <div className="mt-1 font-black">
              {row.goalDifference >
              0
                ? "+"
                : ""}
              {
                row.goalDifference
              }
            </div>
          </div>

          <div>
            <div className="text-xs text-blue-300">
              PTS
            </div>

            <div className="mt-1 text-xl font-black text-blue-300">
              {row.points}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[#030711] text-white">
      {/* HEADER */}

      <header className="border-b border-white/10 bg-[#030711]">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <div>
            <div className="font-black tracking-[0.18em]">
              IRON LEAGUE
            </div>

            <div className="mt-1 text-xs text-white/40">
              Player Management
            </div>
          </div>

          <div className="flex items-center gap-4">
            <a
              href="/admin"
              className="font-bold text-blue-300 transition hover:text-blue-200"
            >
              ← Admin
            </a>

            <a
              href="/"
              className="font-bold text-white/40 transition hover:text-white/70"
            >
              Website
            </a>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-6 py-14">
        <div className="text-xs font-bold uppercase tracking-[0.25em] text-blue-400">
          Roster Management
        </div>

        <h1 className="mt-3 text-4xl font-black">
          Player Replacements
        </h1>

        <p className="mt-4 max-w-3xl leading-7 text-white/40">
          Replace an active player while preserving
          inherited standings.
        </p>

        <div className="mt-6 rounded-2xl border border-blue-400/20 bg-blue-500/[0.06] p-5 text-sm leading-6 text-blue-100/70">
          Finished matches remain historical under
          the previous player. Every unfinished
          division match is transferred to the new
          player regardless of round number.
        </div>

        {/* SETTINGS */}

        <div className="mt-8 grid gap-5 rounded-3xl border border-white/10 bg-[#07101d] p-7 lg:grid-cols-3">
          <div>
            <label className="text-sm font-bold text-white/60">
              Administrator password
            </label>

            <input
              type="password"
              value={
                password
              }
              onChange={(
                event
              ) => {
                setPassword(
                  event.target
                    .value
                );

                setLoaded(
                  false
                );

                setCurrentPlayerIds(
                  []
                );

                setReplacements(
                  []
                );

                setOutgoingId("");

                setIncomingId("");

                setPreview(
                  null
                );

                setMessage("");
              }}
              placeholder="Password"
              className="mt-2 w-full rounded-xl border border-white/10 bg-[#030711] px-4 py-3"
            />
          </div>

          <div>
            <label className="text-sm font-bold text-white/60">
              Season
            </label>

            <select
              value={
                season
              }
              onChange={(
                event
              ) =>
                changeSeason(
                  Number(
                    event.target
                      .value
                  ) as SeasonNumber
                )
              }
              className="mt-2 w-full rounded-xl border border-white/10 bg-[#030711] px-4 py-3"
            >
              <option value={1}>
                Season 1
              </option>

              <option value={2}>
                Season 2
              </option>

              <option value={3}>
                Season 3
              </option>

              <option value={4}>
                Season 4
              </option>
            </select>
          </div>

          <div>
            <label className="text-sm font-bold text-white/60">
              Division
            </label>

            <select
              value={
                division
              }
              onChange={(
                event
              ) =>
                changeDivision(
                  Number(
                    event.target
                      .value
                  ) as DivisionNumber
                )
              }
              className="mt-2 w-full rounded-xl border border-white/10 bg-[#030711] px-4 py-3"
            >
              <option value={1}>
                Division 1
              </option>

              <option value={2}>
                Division 2
              </option>

              <option value={3}>
                Division 3
              </option>

              <option
                value={4}
                disabled={
                  season === 1
                }
              >
                Division 4
              </option>
            </select>
          </div>

          <button
            type="button"
            onClick={() =>
              void loadDivision()
            }
            disabled={
              busy ||
              !password
            }
            className="rounded-xl bg-blue-500 px-6 py-4 font-black transition hover:bg-blue-400 disabled:cursor-not-allowed disabled:opacity-40 lg:col-span-3"
          >
            {loadingAction ===
            "load"
              ? "Loading..."
              : "Load Division"}
          </button>
        </div>

        {/* LOADED DATA */}

        {loaded && (
          <>
            {/* CURRENT ROSTER */}

            <div className="mt-8 rounded-3xl border border-white/10 bg-[#07101d] p-7">
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <div className="text-xs font-bold uppercase tracking-[0.25em] text-blue-400">
                    Current Roster
                  </div>

                  <h2 className="mt-2 text-3xl font-black">
                    Division {division}
                  </h2>
                </div>

                <div className="text-sm text-white/35">
                  {
                    currentPlayers.length
                  }{" "}
                  players
                </div>
              </div>

              <div className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {currentPlayers.map(
                  (
                    player,
                    index
                  ) => (
                    <div
                      key={
                        player.id
                      }
                      className="rounded-xl border border-white/10 bg-[#030711] px-4 py-3"
                    >
                      <div className="text-xs font-bold text-white/25">
                        #
                        {index +
                          1}
                      </div>

                      <div className="mt-1 font-black">
                        {
                          player.nickname
                        }
                      </div>
                    </div>
                  )
                )}
              </div>
            </div>

            {/* NEW REPLACEMENT */}

            <form
              onSubmit={
                previewReplacement
              }
              className="mt-8 space-y-6 rounded-3xl border border-white/10 bg-[#07101d] p-7"
            >
              <div>
                <div className="text-xs font-bold uppercase tracking-[0.25em] text-blue-400">
                  New Replacement
                </div>

                <h2 className="mt-2 text-3xl font-black">
                  Replace Player
                </h2>

                <p className="mt-3 max-w-3xl leading-7 text-white/40">
                  Select the player leaving the
                  division and the player taking
                  over the slot. Preview is
                  required before confirmation.
                </p>
              </div>

              <div className="grid gap-5 lg:grid-cols-2">
                <div>
                  <label className="text-sm font-bold text-white/60">
                    Outgoing Player
                  </label>

                  <select
                    value={
                      outgoingId
                    }
                    onChange={(
                      event
                    ) => {
                      setOutgoingId(
                        event.target
                          .value
                      );

                      clearPreview();
                    }}
                    className="mt-2 w-full rounded-xl border border-white/10 bg-[#030711] px-4 py-3"
                  >
                    <option value="">
                      Select player
                    </option>

                    {currentPlayers.map(
                      (
                        player
                      ) => (
                        <option
                          key={
                            player.id
                          }
                          value={
                            player.id
                          }
                        >
                          {
                            player.nickname
                          }
                        </option>
                      )
                    )}
                  </select>
                </div>

                <div>
                  <label className="text-sm font-bold text-white/60">
                    Incoming Player
                  </label>

                  <select
                    value={
                      incomingId
                    }
                    onChange={(
                      event
                    ) => {
                      setIncomingId(
                        event.target
                          .value
                      );

                      clearPreview();
                    }}
                    className="mt-2 w-full rounded-xl border border-white/10 bg-[#030711] px-4 py-3"
                  >
                    <option value="">
                      Select player
                    </option>

                    {incomingPlayers.map(
                      (
                        player
                      ) => (
                        <option
                          key={
                            player.id
                          }
                          value={
                            player.id
                          }
                        >
                          {
                            player.nickname
                          }
                        </option>
                      )
                    )}
                  </select>
                </div>
              </div>

              <div className="rounded-xl border border-white/10 bg-[#030711] p-5 text-sm leading-6 text-white/50">
                <b className="text-white/80">
                  Replacement rule:
                </b>{" "}
                every unfinished match of the outgoing
                player will be reassigned to the incoming
                player. Finished matches remain unchanged.
              </div>

              <button
                type="submit"
                disabled={
                  busy ||
                  !outgoingId ||
                  !incomingId
                }
                className="w-full rounded-xl border border-blue-400/30 bg-blue-500/10 px-6 py-4 font-black text-blue-300 transition hover:bg-blue-500/20 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {loadingAction ===
                "preview"
                  ? "Generating Preview..."
                  : "Preview Replacement"}
              </button>
            </form>

            {/* PREVIEW */}

            {preview && (
              <div className="mt-8 rounded-3xl border border-blue-400/25 bg-blue-500/[0.06] p-7">
                <div className="text-xs font-bold uppercase tracking-[0.25em] text-blue-300">
                  Preview
                </div>

                <h2 className="mt-3 text-3xl font-black">
                  {getPlayerName(
                    outgoingId
                  )}{" "}
                  <span className="text-blue-300">
                    →
                  </span>{" "}
                  {getPlayerName(
                    incomingId
                  )}
                </h2>

                <div className="mt-4 inline-flex rounded-full border border-blue-400/20 bg-blue-500/10 px-4 py-2 text-xs font-black uppercase tracking-[0.15em] text-blue-300">
                  All unfinished matches
                </div>

                {/* STANDINGS */}

                <div className="mt-7 grid gap-5 lg:grid-cols-2">
                  {standingsCard(
                    "Before",
                    preview
                      .standings_before
                  )}

                  {standingsCard(
                    "After",
                    preview
                      .standings_after
                  )}
                </div>

                {/* SUMMARY */}

                <div className="mt-6 grid gap-4 sm:grid-cols-3">
                  <div className="rounded-2xl border border-white/10 bg-[#030711] p-5">
                    <div className="text-xs font-bold uppercase tracking-[0.15em] text-white/35">
                      Unfinished Matches
                    </div>

                    <div className="mt-2 text-4xl font-black">
                      {
                        preview
                          .affected_unfinished_matches ??
                        preview
                          .affected_future_matches ??
                        0
                      }
                    </div>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-[#030711] p-5">
                    <div className="text-xs font-bold uppercase tracking-[0.15em] text-white/35">
                      Points Inherited
                    </div>

                    <div className="mt-2 text-4xl font-black">
                      {
                        preview
                          .points_inherited ??
                        0
                      }
                    </div>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-[#030711] p-5">
                    <div className="text-xs font-bold uppercase tracking-[0.15em] text-white/35">
                      Players
                    </div>

                    <div className="mt-2 text-4xl font-black">
                      {
                        preview
                          .current_player_count ??
                        0
                      }

                      <span className="mx-2 text-xl text-white/25">
                        →
                      </span>

                      {
                        preview
                          .preview_player_count ??
                        0
                      }
                    </div>
                  </div>
                </div>

                {/* HISTORICAL MATCHES */}

                {(preview
                  .finished_historical_matches
                  ?.length ??
                  0) > 0 && (
                  <div className="mt-6 rounded-2xl border border-green-400/15 bg-green-500/[0.05] p-5">
                    <div className="text-xs font-black uppercase tracking-[0.15em] text-green-300">
                      Historical Matches Preserved
                    </div>

                    <div className="mt-2 text-sm text-white/45">
                      These finished matches stay
                      permanently under{" "}
                      <b className="text-white/70">
                        {getPlayerName(
                          outgoingId
                        )}
                      </b>
                      .
                    </div>

                    <div className="mt-4 space-y-2">
                      {preview
                        .finished_historical_matches
                        ?.map(
                          (
                            match
                          ) => (
                            <div
                              key={
                                match.id
                              }
                              className="grid grid-cols-[70px_1fr_auto_1fr] items-center gap-3 rounded-xl border border-white/5 bg-[#030711] px-4 py-3 text-sm"
                            >
                              <div className="font-black text-white/35">
                                R
                                {
                                  match.round
                                }
                              </div>

                              <div className="text-right font-bold">
                                {getPlayerName(
                                  match.home_id
                                )}
                              </div>

                              <div className="font-black text-green-300">
                                {match.home_goals}{" "}
                                :{" "}
                                {match.away_goals}
                              </div>

                              <div className="font-bold">
                                {getPlayerName(
                                  match.away_id
                                )}
                              </div>
                            </div>
                          )
                        )}
                    </div>
                  </div>
                )}

                {/* AFFECTED MATCHES */}

                {(preview
                  .affected_matches
                  ?.length ??
                  0) > 0 && (
                  <details className="mt-6 rounded-2xl border border-white/10 bg-[#030711]">
                    <summary className="cursor-pointer px-5 py-4 font-black">
                      Unfinished Matches to Transfer (
                      {
                        preview
                          .affected_matches
                          ?.length
                      }
                      )
                    </summary>

                    <div className="border-t border-white/10">
                      {preview
                        .affected_matches
                        ?.map(
                          (
                            match
                          ) => (
                            <div
                              key={
                                match.id
                              }
                              className="grid gap-3 border-b border-white/5 px-5 py-4 last:border-b-0 lg:grid-cols-[80px_1fr_auto_1fr]"
                            >
                              <div className="text-sm font-black text-blue-300">
                                R
                                {
                                  match.round
                                }
                              </div>

                              <div className="text-sm text-white/50">
                                {getPlayerName(
                                  match.before
                                    .home_id
                                )}{" "}
                                —{" "}
                                {getPlayerName(
                                  match.before
                                    .away_id
                                )}
                              </div>

                              <div className="text-white/20">
                                →
                              </div>

                              <div className="text-sm font-bold">
                                {getPlayerName(
                                  match.after
                                    .home_id
                                )}{" "}
                                —{" "}
                                {getPlayerName(
                                  match.after
                                    .away_id
                                )}
                              </div>
                            </div>
                          )
                        )}
                    </div>
                  </details>
                )}

                {/* WARNING */}

                <div className="mt-6 rounded-xl border border-yellow-400/20 bg-yellow-500/10 p-4 text-sm leading-6 text-yellow-200">
                  Confirming this action will write
                  the replacement to the database.
                  Finished historical matches will
                  not be rewritten.
                </div>

                <button
                  type="button"
                  onClick={() =>
                    void applyReplacement()
                  }
                  disabled={
                    busy
                  }
                  className="mt-6 w-full rounded-xl bg-blue-500 px-6 py-4 font-black transition hover:bg-blue-400 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {loadingAction ===
                  "apply"
                    ? "Applying..."
                    : "Confirm Replacement"}
                </button>
              </div>
            )}

            {/* HISTORY */}

            <div className="mt-8 rounded-3xl border border-white/10 bg-[#07101d] p-7">
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <div className="text-xs font-bold uppercase tracking-[0.25em] text-blue-400">
                    History
                  </div>

                  <h2 className="mt-2 text-3xl font-black">
                    Replacement History
                  </h2>
                </div>

                <div className="text-sm text-white/35">
                  {
                    replacements.length
                  }{" "}
                  replacements
                </div>
              </div>

              {sortedReplacements.length ===
              0 ? (
                <div className="mt-7 rounded-2xl border border-white/10 bg-[#030711] p-7 text-center text-white/35">
                  No replacements for this division.
                </div>
              ) : (
                <div className="mt-7 space-y-4">
                  {sortedReplacements.map(
                    (
                      replacement
                    ) => {
                      const canRevert =
                        canRevertReplacement(
                          replacement
                        );

                      return (
                        <div
                          key={
                            replacement.id
                          }
                          className="rounded-2xl border border-white/10 bg-[#030711] p-5"
                        >
                          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                            <div>
                              <div className="text-xl font-black">
                                {getPlayerName(
                                  replacement
                                    .outgoing_player_id
                                )}{" "}
                                <span className="text-blue-300">
                                  →
                                </span>{" "}
                                {getPlayerName(
                                  replacement
                                    .incoming_player_id
                                )}
                              </div>

                              <div className="mt-2 flex flex-wrap gap-x-5 gap-y-2 text-sm text-white/35">
                                <span>
                                  All unfinished
                                  matches transferred
                                </span>

                                <span>
                                  Standings inherited:{" "}
                                  {replacement
                                    .inherit_standings
                                    ? "Yes"
                                    : "No"}
                                </span>

                                <span>
                                  {new Date(
                                    replacement
                                      .created_at
                                  ).toLocaleString()}
                                </span>
                              </div>
                            </div>

                            {canRevert ? (
                              <button
                                type="button"
                                onClick={() =>
                                  void revertReplacement(
                                    replacement
                                  )
                                }
                                disabled={
                                  busy
                                }
                                className="rounded-xl border border-red-400/20 bg-red-500/10 px-5 py-3 font-black text-red-300 transition hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-40"
                              >
                                {loadingAction ===
                                "revert"
                                  ? "Reverting..."
                                  : "Revert"}
                              </button>
                            ) : (
                              <div className="rounded-xl border border-white/10 bg-white/[0.03] px-5 py-3 text-sm font-bold text-white/30">
                                Revert later replacement first
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    }
                  )}
                </div>
              )}
            </div>
          </>
        )}

        {/* MESSAGE */}

        {message && (
          <div className="mt-6 rounded-xl border border-white/10 bg-white/[0.04] p-4 text-center">
            {message}
          </div>
        )}
      </section>
    </main>
  );
}