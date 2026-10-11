import { NextResponse } from "next/server";

import { players } from "../../../../data/players";

import { season1 } from "../../../../data/seasons/season-1";
import { season2 } from "../../../../data/seasons/season-2";
import { season3 } from "../../../../data/seasons/season-3";
import { season4 } from "../../../../data/seasons/season-4";

import { supabaseAdmin } from "../../../../lib/supabase-admin";

import { buildStandings } from "../../../../lib/standings";

import {
  applyPlayerReplacements,
  getDivisionReplacements,
  resolveReplacementPlayerId,
  type PlayerReplacement,
} from "../../../../lib/player-replacements";

type DivisionNumber =
  | 1
  | 2
  | 3
  | 4;

type SeasonNumber =
  | 1
  | 2
  | 3
  | 4;

type PreviewBody = {
  password?: string;

  season?: number;
  division?: number;

  outgoing_player_id?: string;
  incoming_player_id?: string;
};

type MatchRow = {
  id: string;

  round: number | null;

  home_id: string;
  away_id: string;

  home_goals: number | null;
  away_goals: number | null;

  status: string;
};

/*
  ========================================
  BASE DIVISION ROSTER
  ========================================
*/

function getDivisionPlayers(
  season: SeasonNumber,
  division: DivisionNumber
): readonly string[] {
  if (season === 1) {
    if (division === 1) {
      return season1.division1.players;
    }

    if (division === 2) {
      return season1.division2.players;
    }

    if (division === 3) {
      return season1.division3.players;
    }

    return [];
  }

  if (season === 2) {
    if (division === 1) {
      return season2.division1.players;
    }

    if (division === 2) {
      return season2.division2.players;
    }

    if (division === 3) {
      return season2.division3.players;
    }

    return season2.division4.players;
  }

  if (season === 3) {
    if (division === 1) {
      return season3.division1.players;
    }

    if (division === 2) {
      return season3.division2.players;
    }

    if (division === 3) {
      return season3.division3.players;
    }

    return season3.division4.players;
  }

  if (division === 1) {
    return season4.division1.players;
  }

  if (division === 2) {
    return season4.division2.players;
  }

  if (division === 3) {
    return season4.division3.players;
  }

  return season4.division4.players;
}

/*
  ========================================
  PLAYER NAME
  ========================================
*/

function getNickname(
  playerId: string
) {
  return (
    players.find(
      (player) =>
        player.id === playerId
    )?.nickname ??
    playerId
  );
}

/*
  ========================================
  POST
  ========================================
*/

export async function POST(
  request: Request
) {
  try {
    const body =
      (await request.json()) as PreviewBody;

    const {
      password,

      season,
      division,

      outgoing_player_id,
      incoming_player_id,
    } = body;

    /*
      ========================================
      PASSWORD
      ========================================
    */

    if (
      !process.env.ADMIN_PASSWORD ||
      password !==
        process.env.ADMIN_PASSWORD
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Invalid administrator password",
        },
        {
          status: 401,
        }
      );
    }

    /*
      ========================================
      SEASON
      ========================================
    */

    if (
      !Number.isInteger(season) ||
      season === undefined ||
      season < 1 ||
      season > 4
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Invalid season",
        },
        {
          status: 400,
        }
      );
    }

    /*
      ========================================
      DIVISION
      ========================================
    */

    if (
      !Number.isInteger(division) ||
      division === undefined ||
      division < 1 ||
      division > 4
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Invalid division",
        },
        {
          status: 400,
        }
      );
    }

    if (
      season === 1 &&
      division === 4
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Division 4 did not exist in Season 1",
        },
        {
          status: 400,
        }
      );
    }

    /*
      ========================================
      PLAYER IDS
      ========================================
    */

    if (
      !outgoing_player_id ||
      typeof outgoing_player_id !==
        "string" ||
      outgoing_player_id.trim() ===
        ""
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Outgoing player is required",
        },
        {
          status: 400,
        }
      );
    }

    if (
      !incoming_player_id ||
      typeof incoming_player_id !==
        "string" ||
      incoming_player_id.trim() ===
        ""
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Incoming player is required",
        },
        {
          status: 400,
        }
      );
    }

    const outgoingId =
      outgoing_player_id.trim();

    const incomingId =
      incoming_player_id.trim();

    if (
      outgoingId === incomingId
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Outgoing and incoming players must be different",
        },
        {
          status: 400,
        }
      );
    }

    /*
      ========================================
      PLAYERS EXIST
      ========================================
    */

    const outgoingPlayer =
      players.find(
        (player) =>
          player.id ===
          outgoingId
      );

    const incomingPlayer =
      players.find(
        (player) =>
          player.id ===
          incomingId
      );

    if (!outgoingPlayer) {
      return NextResponse.json(
        {
          success: false,
          error:
            `Player ${outgoingId} was not found`,
        },
        {
          status: 400,
        }
      );
    }

    if (!incomingPlayer) {
      return NextResponse.json(
        {
          success: false,
          error:
            `Player ${incomingId} was not found`,
        },
        {
          status: 400,
        }
      );
    }

    const seasonNumber =
      season as SeasonNumber;

    const divisionNumber =
      division as DivisionNumber;

    /*
      ========================================
      EXISTING REPLACEMENTS
      ========================================
    */

    const existingReplacements =
      await getDivisionReplacements(
        seasonNumber,
        divisionNumber
      );

    /*
      ========================================
      CURRENT ROSTER
      ========================================
    */

    const basePlayerIds =
      getDivisionPlayers(
        seasonNumber,
        divisionNumber
      );

    const currentPlayerIds =
      applyPlayerReplacements(
        basePlayerIds,
        existingReplacements
      );

    /*
      Outgoing must currently own
      a division slot.
    */

    if (
      !currentPlayerIds.includes(
        outgoingId
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            `${getNickname(
              outgoingId
            )} is not an active player in this division`,
        },
        {
          status: 400,
        }
      );
    }

    /*
      Incoming cannot already own
      another active slot.
    */

    if (
      currentPlayerIds.includes(
        incomingId
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            `${getNickname(
              incomingId
            )} is already an active player in this division`,
        },
        {
          status: 400,
        }
      );
    }

    /*
      ========================================
      DIVISION MATCHES
      ========================================
    */

    const {
      data,
      error,
    } = await supabaseAdmin
      .from("matches")
      .select(
        `
          id,
          round,
          home_id,
          away_id,
          home_goals,
          away_goals,
          status
        `
      )
      .eq(
        "season",
        seasonNumber
      )
      .eq(
        "competition",
        "division"
      )
      .eq(
        "division",
        divisionNumber
      )
      .order(
        "round",
        {
          ascending: true,
        }
      );

    if (error) {
      return NextResponse.json(
        {
          success: false,
          error:
            error.message,
        },
        {
          status: 500,
        }
      );
    }

    const matches =
      (data ?? []) as MatchRow[];

    /*
      ========================================
      ALL MATCHES OF OUTGOING PLAYER
      ========================================
    */

    const outgoingMatches =
      matches.filter(
        (match) =>
          match.home_id ===
            outgoingId ||
          match.away_id ===
            outgoingId
      );

    /*
      ========================================
      ALL UNFINISHED MATCHES TO TRANSFER
      ========================================

      Round number DOES NOT matter.

      finished  -> stays historical
      unfinished -> moves to incoming player
    */

    const affectedMatches =
      outgoingMatches.filter(
        (match) =>
          match.status !==
          "finished"
      );

    if (
      affectedMatches.length ===
      0
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            `${outgoingPlayer.nickname} has no unfinished matches to transfer`,
        },
        {
          status: 400,
        }
      );
    }

    /*
      ========================================
      CURRENT STANDINGS
      ========================================
    */

    const currentStandings =
      buildStandings({
        participantIds:
          currentPlayerIds,

        matches:
          matches.map(
            (match) => ({
              home_id:
                resolveReplacementPlayerId(
                  match.home_id,
                  existingReplacements
                ),

              away_id:
                resolveReplacementPlayerId(
                  match.away_id,
                  existingReplacements
                ),

              home_goals:
                match.home_goals,

              away_goals:
                match.away_goals,

              status:
                match.status,
            })
          ),

        format:
          "division-qualification",
      });

    const outgoingCurrentRow =
      currentStandings.find(
        (row) =>
          row.playerId ===
          outgoingId
      ) ?? null;

    /*
      ========================================
      VIRTUAL REPLACEMENT
      ========================================

      It no longer controls replacement logic.
    */

    const previewReplacement:
      PlayerReplacement = {
        id:
          "preview",

        season:
          seasonNumber,

        division:
          divisionNumber,

        outgoing_player_id:
          outgoingId,

        incoming_player_id:
          incomingId,

        inherit_standings:
          true,

        created_at:
          new Date().toISOString(),
      };

    const previewReplacements = [
      ...existingReplacements,
      previewReplacement,
    ];

    /*
      ========================================
      CHAIN SAFETY
      ========================================
    */

    let previewPlayerIds:
      string[];

    try {
      previewPlayerIds =
        applyPlayerReplacements(
          basePlayerIds,
          previewReplacements
        );
    } catch (error) {
      return NextResponse.json(
        {
          success: false,
          error:
            error instanceof Error
              ? error.message
              : "Invalid replacement chain",
        },
        {
          status: 400,
        }
      );
    }

    if (
      previewPlayerIds.length !==
      currentPlayerIds.length
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Replacement would create a duplicate or invalid player chain",
        },
        {
          status: 400,
        }
      );
    }

    if (
      !previewPlayerIds.includes(
        incomingId
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Incoming player cannot become the current owner of this division slot",
        },
        {
          status: 400,
        }
      );
    }

    /*
      ========================================
      PREVIEW STANDINGS
      ========================================
    */

    const previewStandings =
      buildStandings({
        participantIds:
          previewPlayerIds,

        matches:
          matches.map(
            (match) => ({
              home_id:
                resolveReplacementPlayerId(
                  match.home_id,
                  previewReplacements
                ),

              away_id:
                resolveReplacementPlayerId(
                  match.away_id,
                  previewReplacements
                ),

              home_goals:
                match.home_goals,

              away_goals:
                match.away_goals,

              status:
                match.status,
            })
          ),

        format:
          "division-qualification",
      });

    const incomingPreviewRow =
      previewStandings.find(
        (row) =>
          row.playerId ===
          incomingId
      ) ?? null;

    /*
      ========================================
      RESPONSE
      ========================================
    */

    return NextResponse.json({
      success: true,
      preview: true,

      message:
        "Preview only. No database changes have been made.",

      replacement_mode:
        "all_unfinished_matches",

      season:
        seasonNumber,

      division:
        divisionNumber,

      outgoing_player: {
        id:
          outgoingId,

        nickname:
          outgoingPlayer.nickname,
      },

      incoming_player: {
        id:
          incomingId,

        nickname:
          incomingPlayer.nickname,
      },

      /*
        Keep this field temporarily for
        compatibility with the current UI.
      */

      affected_future_matches:
        affectedMatches.length,

      affected_unfinished_matches:
        affectedMatches.length,

      affected_match_ids:
        affectedMatches.map(
          (match) =>
            match.id
        ),

      affected_matches:
        affectedMatches.map(
          (match) => ({
            id:
              match.id,

            round:
              match.round,

            status:
              match.status,

            before: {
              home_id:
                match.home_id,

              away_id:
                match.away_id,

              home_goals:
                match.home_goals,

              away_goals:
                match.away_goals,
            },

            after: {
              home_id:
                match.home_id ===
                outgoingId
                  ? incomingId
                  : match.home_id,

              away_id:
                match.away_id ===
                outgoingId
                  ? incomingId
                  : match.away_id,

              home_goals:
                match.home_goals,

              away_goals:
                match.away_goals,
            },
          })
        ),

      finished_historical_matches:
        outgoingMatches
          .filter(
            (match) =>
              match.status ===
              "finished"
          )
          .map(
            (match) => ({
              id:
                match.id,

              round:
                match.round,

              home_id:
                match.home_id,

              away_id:
                match.away_id,

              home_goals:
                match.home_goals,

              away_goals:
                match.away_goals,
            })
          ),

      standings_before:
        outgoingCurrentRow,

      standings_after:
        incomingPreviewRow,

      points_inherited:
        outgoingCurrentRow?.points ??
        0,

      current_player_count:
        currentPlayerIds.length,

      preview_player_count:
        previewPlayerIds.length,
    });
  } catch (error) {
    console.error(
      "PLAYER REPLACEMENT PREVIEW ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Player replacement preview failed",
      },
      {
        status: 500,
      }
    );
  }
}