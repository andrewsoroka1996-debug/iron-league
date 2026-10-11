import { NextResponse } from "next/server";

import { players } from "../../../../data/players";

import { season1 } from "../../../../data/seasons/season-1";
import { season2 } from "../../../../data/seasons/season-2";
import { season3 } from "../../../../data/seasons/season-3";
import { season4 } from "../../../../data/seasons/season-4";

import { supabaseAdmin } from "../../../../lib/supabase-admin";

import {
  applyPlayerReplacements,
  getDivisionReplacements,
  type PlayerReplacement,
} from "../../../../lib/player-replacements";

type ReplacementBody = {
  password?: string;

  season?: number;
  division?: number;

  outgoing_player_id?: string;
  incoming_player_id?: string;
};

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
  GET
  ========================================

  Завантажує актуальний склад дивізіону
  та історію замін.

  Нічого в БД не змінює.
  ========================================
*/

export async function GET(
  request: Request
) {
  try {
    const password =
      request.headers.get(
        "x-admin-password"
      );

    /*
      ========================================
      ADMIN PASSWORD
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
      QUERY PARAMS
      ========================================
    */

    const {
      searchParams,
    } = new URL(request.url);

    const season =
      Number(
        searchParams.get(
          "season"
        )
      );

    const division =
      Number(
        searchParams.get(
          "division"
        )
      );

    /*
      ========================================
      SEASON
      ========================================
    */

    if (
      !Number.isInteger(season) ||
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

    const seasonNumber =
      season as SeasonNumber;

    const divisionNumber =
      division as DivisionNumber;

    /*
      ========================================
      REPLACEMENTS
      ========================================
    */

    const replacements =
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
        replacements
      );

    /*
      ========================================
      RESPONSE
      ========================================
    */

    return NextResponse.json({
      success: true,

      season:
        seasonNumber,

      division:
        divisionNumber,

      base_player_ids:
        basePlayerIds,

      current_player_ids:
        currentPlayerIds,

      replacements,
    });
  } catch (error) {
    console.error(
      "PLAYER REPLACEMENT GET ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to load player replacements",
      },
      {
        status: 500,
      }
    );
  }
}

/*
  ========================================
  POST
  ========================================

  Реальна заміна гравця.

  Правило:

  finished
  -> історичний матч не змінюється

  unfinished
  -> переходить новому гравцеві
  ========================================
*/

export async function POST(
  request: Request
) {
  try {
    const body =
      (await request.json()) as ReplacementBody;

    const {
      password,

      season,
      division,

      outgoing_player_id,
      incoming_player_id,
    } = body;

    /*
      ========================================
      ADMIN PASSWORD
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

    /*
      Season 1 had only
      three divisions.
    */

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

    const incomingPlayer =
      players.find(
        (player) =>
          player.id ===
          incomingId
      );

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

    /*
      ========================================
      CURRENT DIVISION ROSTER
      ========================================
    */

    const seasonNumber =
      season as SeasonNumber;

    const divisionNumber =
      division as DivisionNumber;

    const existingReplacements =
      await getDivisionReplacements(
        seasonNumber,
        divisionNumber
      );

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
      Outgoing player must currently
      own a division slot.
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
            `${outgoingPlayer.nickname} is not an active player in this division`,
        },
        {
          status: 400,
        }
      );
    }

    /*
      Incoming player cannot already
      own another division slot.
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
            `${incomingPlayer.nickname} is already an active player in this division`,
        },
        {
          status: 400,
        }
      );
    }

    /*
      ========================================
      REPLACEMENT CHAIN SAFETY
      ========================================
    */

    const testReplacement:
      PlayerReplacement = {
        id:
          "validation",

        season:
          seasonNumber,

        division:
          divisionNumber,

        outgoing_player_id:
          outgoingId,

        incoming_player_id:
          incomingId,

        /*
          Legacy field.

          Round no longer controls
          replacement behavior.
        */

        inherit_standings:
          true,

        created_at:
          new Date().toISOString(),
      };

    let futurePlayerIds:
      string[];

    try {
      futurePlayerIds =
        applyPlayerReplacements(
          basePlayerIds,
          [
            ...existingReplacements,
            testReplacement,
          ]
        );
    } catch (error) {
      return NextResponse.json(
        {
          success: false,
          error:
            error instanceof Error
              ? error.message
              : "Invalid player replacement chain",
        },
        {
          status: 400,
        }
      );
    }

    /*
      Number of division slots
      must stay unchanged.
    */

    if (
      futurePlayerIds.length !==
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

    /*
      Incoming player must become
      the real owner of the slot.
    */

    if (
      !futurePlayerIds.includes(
        incomingId
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Incoming player resolves to another existing replacement and cannot own this slot",
        },
        {
          status: 400,
        }
      );
    }

    /*
      ========================================
      DATABASE FUNCTION
      ========================================

      SQL no longer uses the round
      to determine which matches move.
      ========================================
    */

    const {
      data,
      error,
    } =
      await supabaseAdmin.rpc(
  "replace_player_in_division",
  {
    p_season:
      seasonNumber,

    p_division:
      divisionNumber,

    p_outgoing_player_id:
      outgoingId,

    p_incoming_player_id:
      incomingId,
  }
);

    if (error) {
      console.error(
        "PLAYER REPLACEMENT RPC ERROR:",
        error
      );

      return NextResponse.json(
        {
          success: false,
          error:
            error.message,
        },
        {
          status: 400,
        }
      );
    }

    /*
      ========================================
      RESPONSE
      ========================================
    */

    return NextResponse.json({
      success: true,

      message:
        `${outgoingPlayer.nickname} -> ${incomingPlayer.nickname}`,

      replacement_mode:
        "all_unfinished_matches",

      replacement:
        data,

      outgoing_player: {
        id:
          outgoingPlayer.id,

        nickname:
          outgoingPlayer.nickname,
      },

      incoming_player: {
        id:
          incomingPlayer.id,

        nickname:
          incomingPlayer.nickname,
      },
    });
  } catch (error) {
    console.error(
      "PLAYER REPLACEMENT POST ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Player replacement failed",
      },
      {
        status: 500,
      }
    );
  }
}