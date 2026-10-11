import { NextResponse } from "next/server";

import { supabaseAdmin } from "../../../../lib/supabase-admin";

type RevertBody = {
  password?: string;
  replacement_id?: string;
};

export async function POST(
  request: Request
) {
  try {
    const body =
      (await request.json()) as RevertBody;

    const {
      password,
      replacement_id,
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
      REPLACEMENT ID
      ========================================
    */

    if (
      !replacement_id ||
      typeof replacement_id !==
        "string" ||
      replacement_id.trim() ===
        ""
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Replacement ID is required",
        },
        {
          status: 400,
        }
      );
    }

    const replacementId =
      replacement_id.trim();

    /*
      ========================================
      DATABASE FUNCTION
      ========================================
    */

    const {
      data,
      error,
    } =
      await supabaseAdmin.rpc(
        "revert_player_replacement",
        {
          p_replacement_id:
            replacementId,
        }
      );

    if (error) {
      console.error(
        "PLAYER REPLACEMENT REVERT RPC ERROR:",
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
      revert: data,
    });
  } catch (error) {
    console.error(
      "PLAYER REPLACEMENT REVERT ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Player replacement revert failed",
      },
      {
        status: 500,
      }
    );
  }
}