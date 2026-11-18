import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const TEST_HOST = "knrdsraydifnnbqycird.supabase.co";
const LOCAL_ORIGIN = "http://localhost:3001";

export async function GET(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  const failure = NextResponse.redirect(
    `${LOCAL_ORIGIN}/auth-test?oauth=error`
  );

  failure.headers.set("Cache-Control", "no-store");

  // This callback is exclusively for local testing.
  if (
    process.env.NODE_ENV !== "development" ||
    process.env.PLAYER_ACCOUNTS_ENABLED !== "true" ||
    process.env.IRON_LEAGUE_E2E_TEST_ONLY !== "true" ||
    request.nextUrl.origin !== LOCAL_ORIGIN ||
    !url ||
    !key ||
    new URL(url).hostname !== TEST_HOST
  ) {
    return new NextResponse(null, { status: 404, headers: { "Cache-Control": "no-store" } });
  }

  const code = request.nextUrl.searchParams.get("code");

  if (!code) {
    return failure;
  }

  const response = NextResponse.redirect(
    `${LOCAL_ORIGIN}/auth-test?oauth=success`
  );

  response.headers.set("Cache-Control", "private, no-store");

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },

      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          request.cookies.set(name, value);
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  try {
    const { error } =
      await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      return failure;
    }

    // Confirm identity against Supabase Auth.
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return failure;
    }

    return response;
  } catch {
    return failure;
  }
}
