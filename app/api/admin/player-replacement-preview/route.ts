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
  getSeasonPlayerReplacements,
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

  season: number;

  competition: string;

  division:
    | number
    | null;

  round:
    | number
    | null;

  stage:
    | string
    | null;

  group_name:
    | string
    | null;

  participant_type: string;

  home_id: string;
  away_id: string;

  home_goals:
    | number
    | null;

  away_goals:
    | number
    | null;

  status: string;
};

type CoopTeamRow = {
  id: string;

  name: string;

  player_1_id:
    | string
    | null;

  player_2_id:
    | string
    | null;
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
  SEASON DIVISIONS
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

  Це захищає систему навіть тоді,
  коли календар нового сезону
  ще не створений.

  Наприклад:

  Division 2 player не може стати
  replacement у Division 1 тільки
  тому, що ще не зіграв жодного матчу.

  Replacement chains враховуються.
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
  PLAYER NAME
  ========================================
*/

function getNickname(
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
  POST
  ========================================
*/

export async function POST(
  request: Request
) {
  try {
    const body =
      (await request.json()) as
        PreviewBody;

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
      ALL SEASON REPLACEMENTS
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
      ALL CURRENT DIVISION SLOT OWNERS
      IN THIS SEASON
      ========================================
    */

    const currentSeasonDivisionPlayerIds =
      getCurrentSeasonDivisionPlayerIds(
        seasonNumber,
        existingReplacements
      );

    /*
      ========================================
      OUTGOING MUST CURRENTLY OWN
      SELECTED DIVISION SLOT
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
      ========================================
      INCOMING MUST NOT OWN ANY
      DIVISION SLOT IN THIS SEASON
      ========================================

      Не тільки вибраний Division.

      Перевіряємо всі дивізіони сезону.
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
      ALL PLAYER MATCHES OF SEASON
      ========================================

      Завантажуємо сторінками,
      тому що матчів може бути > 1000.
      ========================================
    */

    const matches:
      MatchRow[] = [];

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
              season,
              competition,
              division,
              round,
              stage,
              group_name,
              participant_type,
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
        (
          matchPageData ??
          []
        ) as MatchRow[];

      matches.push(
        ...page
      );

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
      INCOMING PLAYER GLOBAL MATCH SAFETY
      ========================================

      Incoming не повинен мати
      ЖОДНОГО player-match у сезоні:

      - finished
      - scheduled
      - будь-якого іншого status
      ========================================
    */

    const incomingHasSeasonMatches =
      matches.some(
        (match) =>
          match.home_id ===
            incomingId ||
          match.away_id ===
            incomingId
      );

    if (
      incomingHasSeasonMatches
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
      OUTGOING ALREADY REPLACED
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
      OUTGOING MATCHES
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
    */

    const affectedMatches =
      outgoingMatches.filter(
        (match) =>
          match.status !==
          "finished"
      );

    /*
      ========================================
      COUNTS BY COMPETITION
      ========================================
    */

    const competitionCountMap =
      new Map<
        string,
        number
      >();

    for (
      const match
      of affectedMatches
    ) {
      competitionCountMap.set(
        match.competition,
        (
          competitionCountMap.get(
            match.competition
          ) ?? 0
        ) + 1
      );
    }

    const affectedByCompetition =
      Array.from(
        competitionCountMap.entries()
      )
        .map(
          ([
            competition,
            count,
          ]) => ({
            competition,

            matches:
              count,
          })
        )
        .sort(
          (a, b) =>
            a.competition.localeCompare(
              b.competition
            )
        );

    /*
      ========================================
      IRON CO-OP CUP TEAM
      ========================================

      Co-op matches are not
      player-vs-player.

      Membership is stored separately
      in public.coop_teams.
      ========================================
    */

    const {
      data:
        coopData,

      error:
        coopError,
    } =
      await supabaseAdmin
        .from("coop_teams")
        .select(
          `
            id,
            name,
            player_1_id,
            player_2_id
          `
        )
        .eq(
          "season",
          seasonNumber
        );

    if (
      coopError
    ) {
      return NextResponse.json(
        {
          success: false,

          error:
            coopError.message,
        },
        {
          status: 500,
        }
      );
    }

    const coopTeams =
      (
        coopData ??
        []
      ) as CoopTeamRow[];

    const outgoingCoopTeams =
      coopTeams.filter(
        (team) =>
          team.player_1_id ===
            outgoingId ||
          team.player_2_id ===
            outgoingId
      );

    /*
      ========================================
      CO-OP DUPLICATE SAFETY
      ========================================
    */

    if (
      outgoingCoopTeams.length >
      1
    ) {
      return NextResponse.json(
        {
          success: false,

          error:
            `${outgoingPlayer.nickname} exists in more than one Iron Co-op Cup team`,
        },
        {
          status: 400,
        }
      );
    }

    const coopTeam =
      outgoingCoopTeams[0] ??
      null;

    let coopSlot:
      | 1
      | 2
      | null =
      null;

    let coopTeammateId:
      | string
      | null =
      null;

    if (
      coopTeam
    ) {
      if (
        coopTeam.player_1_id ===
        outgoingId
      ) {
        coopSlot =
          1;

        coopTeammateId =
          coopTeam.player_2_id;
      } else if (
        coopTeam.player_2_id ===
        outgoingId
      ) {
        coopSlot =
          2;

        coopTeammateId =
          coopTeam.player_1_id;
      }
    }

    /*
      ========================================
      CURRENT DIVISION STANDINGS
      ========================================
    */

    const divisionMatches =
      matches.filter(
        (match) =>
          match.competition ===
            "division" &&
          match.division ===
            divisionNumber
      );

    const currentStandings =
      buildStandings({
        participantIds:
          currentPlayerIds,

        matches:
          divisionMatches.map(
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
      ) ??
      null;

    /*
      ========================================
      VIRTUAL GLOBAL REPLACEMENT
      ========================================
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

        coop_removed_team_id:
          coopTeam?.id ??
          null,

        coop_removed_slot:
          coopSlot,

        created_at:
          new Date().toISOString(),
      };

    const previewReplacements = [
      ...existingReplacements,
      previewReplacement,
    ];

    /*
      ========================================
      PREVIEW DIVISION ROSTER
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

    /*
      ========================================
      SLOT COUNT SAFETY
      ========================================
    */

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

    /*
      ========================================
      INCOMING MUST BECOME SLOT OWNER
      ========================================
    */

    if (
      !previewPlayerIds.includes(
        incomingId
      )
    ) {
      return NextResponse.json(
        {
          success: false,

          error:
            "Incoming player cannot become the current owner of this slot",
        },
        {
          status: 400,
        }
      );
    }

    /*
      ========================================
      PREVIEW DIVISION STANDINGS
      ========================================
    */

    const previewStandings =
      buildStandings({
        participantIds:
          previewPlayerIds,

        matches:
          divisionMatches.map(
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
      ) ??
      null;

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
        "global_season",

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
        ======================================
        GLOBAL MATCH SUMMARY
        ======================================
      */

      affected_unfinished_matches:
        affectedMatches.length,

      affected_future_matches:
        affectedMatches.length,

      affected_by_competition:
        affectedByCompetition,

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

            competition:
              match.competition,

            division:
              match.division,

            round:
              match.round,

            stage:
              match.stage,

            group_name:
              match.group_name,

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

      /*
        ======================================
        HISTORICAL MATCHES

        Physical DB rows stay unchanged.
        ======================================
      */

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

              competition:
                match.competition,

              division:
                match.division,

              round:
                match.round,

              stage:
                match.stage,

              group_name:
                match.group_name,

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

      /*
        ======================================
        DIVISION STANDINGS INHERITANCE
        ======================================
      */

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

      /*
        ======================================
        IRON CO-OP CUP

        Outgoing disappears.

        Incoming is NOT inserted.
        ======================================
      */

      coop_removal: {
        required:
          coopTeam !==
          null,

        team_id:
          coopTeam?.id ??
          null,

        team_name:
          coopTeam?.name ??
          null,

        slot:
          coopSlot,

        teammate_id:
          coopTeammateId,

        teammate_nickname:
          coopTeammateId
            ? getNickname(
                coopTeammateId
              )
            : null,

        incoming_player_added:
          false,

        action:
          coopTeam
            ? "remove_outgoing_and_leave_slot_empty"
            : "none",
      },
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