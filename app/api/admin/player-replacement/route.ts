import { NextResponse } from "next/server";

import { players } from "../../../../data/players";

import { season1 } from "../../../../data/seasons/season-1";
import { season2 } from "../../../../data/seasons/season-2";
import { season3 } from "../../../../data/seasons/season-3";
import { season4 } from "../../../../data/seasons/season-4";

import { supabaseAdmin } from "../../../../lib/supabase-admin";

import {
  applyPlayerReplacements,
  getSeasonPlayerReplacements,
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
  SEASON DIVISIONS
  ========================================

  Season 1:
  Divisions 1-3

  Seasons 2-4:
  Divisions 1-4
  ========================================
*/

function getSeasonDivisions(
  season: SeasonNumber
): DivisionNumber[] {
  if (season === 1) {
    return [
      1,
      2,
      3,
    ];
  }

  return [
    1,
    2,
    3,
    4,
  ];
}

/*
  ========================================
  CURRENT DIVISION SLOT OWNERS
  ACROSS THE WHOLE SEASON
  ========================================

  This is important even before
  a season calendar exists.

  Example:

  Division 1:
  Player A

  Division 2:
  Player B

  Player B cannot be selected as
  incoming replacement for Division 1,
  even if Player B has not played
  any matches yet.

  Replacement chains are also applied:

  A -> B
  B -> C

  Final owner:
  C
  ========================================
*/

function getCurrentSeasonDivisionPlayerIds(
  season: SeasonNumber,
  replacements:
    readonly PlayerReplacement[]
): string[] {
  const playerIds =
    new Set<string>();

  const divisions =
    getSeasonDivisions(
      season
    );

  for (
    const division
    of divisions
  ) {
    const basePlayerIds =
      getDivisionPlayers(
        season,
        division
      );

    const currentPlayerIds =
      applyPlayerReplacements(
        basePlayerIds,
        replacements
      );

    for (
      const playerId
      of currentPlayerIds
    ) {
      playerIds.add(
        playerId
      );
    }
  }

  return [
    ...playerIds,
  ];
}

/*
  ========================================
  GET

  Loads:

  - current selected division roster
  - all season replacement history
  - eligible incoming players

  Nothing is written to the database.
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
    } =
      new URL(
        request.url
      );

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
      !Number.isInteger(
        season
      ) ||
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
      !Number.isInteger(
        division
      ) ||
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
      ALL REPLACEMENTS OF SEASON
      ========================================
    */

    const replacements =
      await getSeasonPlayerReplacements(
        seasonNumber
      );

    /*
      ========================================
      CURRENT SELECTED DIVISION ROSTER
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
      CURRENT SLOT OWNERS
      ACROSS ALL DIVISIONS OF SEASON
      ========================================
    */

    const currentSeasonDivisionPlayerIds =
      getCurrentSeasonDivisionPlayerIds(
        seasonNumber,
        replacements
      );

    const currentSeasonDivisionPlayerSet =
      new Set(
        currentSeasonDivisionPlayerIds
      );

    /*
      ========================================
      ALL PLAYERS WITH MATCH HISTORY
      IN THIS SEASON
      ========================================

      Incoming player must have no
      player-match history at all:

      - finished
      - scheduled
      - any other status

      We use pagination because one season
      can contain more than 1000 matches.
      ========================================
    */

    const seasonMatchPlayerIds =
      new Set<string>();

    const pageSize =
      1000;

    let from =
      0;

    while (true) {
      const {
        data:
          matchPageData,

        error:
          matchPageError,
      } =
        await supabaseAdmin
          .from("matches")
          .select(
            `
              id,
              home_id,
              away_id
            `
          )
          .eq(
            "season",
            seasonNumber
          )
          .eq(
            "participant_type",
            "player"
          )
          .order(
            "id",
            {
              ascending:
                true,
            }
          )
          .range(
            from,
            from +
              pageSize -
              1
          );

      if (
        matchPageError
      ) {
        return NextResponse.json(
          {
            success: false,

            error:
              matchPageError.message,
          },
          {
            status: 500,
          }
        );
      }

      const page =
        matchPageData ??
        [];

      for (
        const match
        of page
      ) {
        if (
          typeof match.home_id ===
            "string" &&
          match.home_id
        ) {
          seasonMatchPlayerIds.add(
            match.home_id
          );
        }

        if (
          typeof match.away_id ===
            "string" &&
          match.away_id
        ) {
          seasonMatchPlayerIds.add(
            match.away_id
          );
        }
      }

      if (
        page.length <
        pageSize
      ) {
        break;
      }

      from +=
        pageSize;
    }

    /*
      ========================================
      PLAYERS USED IN REPLACEMENT CHAINS
      ========================================

      Example:

      A -> B
      B -> C

      Previous replacement participants
      are not offered as fresh incoming
      players.

      Returning a previous player is done
      through Revert.
      ========================================
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

    /*
      ========================================
      ELIGIBLE INCOMING PLAYERS
      ========================================

      Candidate must:

      1. Have no player-match history
         in this season.

      2. Not own a division slot
         anywhere in this season.

      3. Not already participate
         in replacement history.

      Final validation is repeated by:

      - Preview API
      - POST API
      - SQL RPC
      ========================================
    */

    const eligibleIncomingPlayerIds =
      players
        .filter(
          (player) =>
            !seasonMatchPlayerIds.has(
              player.id
            ) &&
            !currentSeasonDivisionPlayerSet.has(
              player.id
            ) &&
            !replacementPlayerIds.has(
              player.id
            )
        )
        .map(
          (player) =>
            player.id
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

      current_season_division_player_ids:
        currentSeasonDivisionPlayerIds,

      eligible_incoming_player_ids:
        eligibleIncomingPlayerIds,

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

  Performs real GLOBAL SEASON replacement.

  Rules:

  finished
  -> historical match is never rewritten

  unfinished player-match
  -> transferred to incoming player

  Iron Co-op
  -> outgoing is removed
  -> slot becomes NULL
  -> incoming is NOT inserted automatically

  Incoming player:
  -> must have no player-match history
  -> must not own any division slot
     in this season
  ========================================
*/

export async function POST(
  request: Request
) {
  try {
    const body =
      (await request.json()) as
        ReplacementBody;

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
      season ===
        undefined ||
      !Number.isInteger(
        season
      ) ||
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
      division ===
        undefined ||
      !Number.isInteger(
        division
      ) ||
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
      outgoingId ===
      incomingId
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

    const seasonNumber =
      season as SeasonNumber;

    const divisionNumber =
      division as DivisionNumber;

    /*
      ========================================
      ALL EXISTING SEASON REPLACEMENTS
      ========================================
    */

    const existingReplacements =
      await getSeasonPlayerReplacements(
        seasonNumber
      );

    /*
      ========================================
      CURRENT SELECTED DIVISION ROSTER
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
      ========================================
      CURRENT DIVISION SLOT OWNERS
      ACROSS WHOLE SEASON
      ========================================
    */

    const currentSeasonDivisionPlayerIds =
      getCurrentSeasonDivisionPlayerIds(
        seasonNumber,
        existingReplacements
      );

    /*
      ========================================
      OUTGOING MUST OWN CURRENT SLOT
      ========================================
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
      ========================================
      INCOMING MUST NOT OWN ANY
      DIVISION SLOT IN THIS SEASON
      ========================================

      This protects future seasons
      before calendars are generated.

      Example:

      Incoming belongs to Division 2,
      but Division 2 has no matches yet.

      Match-history validation alone
      would not detect that.

      This check does.
      ========================================
    */

    if (
      currentSeasonDivisionPlayerIds.includes(
        incomingId
      )
    ) {
      return NextResponse.json(
        {
          success: false,

          error:
            `${incomingPlayer.nickname} already owns a division slot in Season ${seasonNumber}`,
        },
        {
          status: 400,
        }
      );
    }

    /*
      ========================================
      INCOMING MUST BE CLEAN THIS SEASON
      ========================================

      No finished matches.
      No scheduled matches.
      No other player-match statuses.
      ========================================
    */

    const {
      data:
        incomingSeasonMatches,

      error:
        incomingSeasonMatchesError,
    } =
      await supabaseAdmin
        .from("matches")
        .select("id")
        .eq(
          "season",
          seasonNumber
        )
        .eq(
          "participant_type",
          "player"
        )
        .or(
          `home_id.eq.${incomingId},away_id.eq.${incomingId}`
        )
        .limit(1);

    if (
      incomingSeasonMatchesError
    ) {
      return NextResponse.json(
        {
          success: false,

          error:
            incomingSeasonMatchesError.message,
        },
        {
          status: 500,
        }
      );
    }

    if (
      (
        incomingSeasonMatches ??
        []
      ).length > 0
    ) {
      return NextResponse.json(
        {
          success: false,

          error:
            `${incomingPlayer.nickname} already has match history in Season ${seasonNumber}`,
        },
        {
          status: 400,
        }
      );
    }

    /*
      ========================================
      OUTGOING CANNOT ALREADY HAVE
      ITS OWN REPLACEMENT
      ========================================
    */

    const outgoingAlreadyReplaced =
      existingReplacements.some(
        (replacement) =>
          replacement
            .outgoing_player_id ===
          outgoingId
      );

    if (
      outgoingAlreadyReplaced
    ) {
      return NextResponse.json(
        {
          success: false,

          error:
            `${outgoingPlayer.nickname} already has a replacement in Season ${seasonNumber}`,
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

      Virtually apply replacement before
      writing anything.

      Supports:

      A -> B
      B -> C

      Also detects invalid cycles.
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

        inherit_standings:
          true,

        coop_removed_team_id:
          null,

        coop_removed_slot:
          null,

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
      ========================================
      DIVISION SLOT COUNT MUST STAY SAME
      ========================================
    */

    if (
      futurePlayerIds.length !==
      currentPlayerIds.length
    ) {
      return NextResponse.json(
        {
          success: false,

          error:
            "Replacement would create a duplicate or invalid player slot",
        },
        {
          status: 400,
        }
      );
    }

    /*
      ========================================
      INCOMING MUST BECOME SLOT OWNER
      ========================================
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

      Real global replacement.

      SQL RPC:

      - updates all unfinished
        participant_type = player matches

      - preserves finished matches

      - saves replacement history

      - removes outgoing from Co-op
        if necessary

      - does NOT add incoming to Co-op
      ========================================
    */

    const {
      data,
      error,
    } =
      await supabaseAdmin.rpc(
        "replace_player_in_season",
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
        "global_season",

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