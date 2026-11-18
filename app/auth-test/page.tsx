import { headers } from "next/headers";
import { notFound } from "next/navigation";
import AuthTestClient from "./AuthTestClient";

export const dynamic = "force-dynamic";

/** Never mount the local OAuth harness on production or a non-test database. */
export default async function AuthTestPage() {
  const h = await headers();
  const host = h.get("host")?.toLowerCase();
  let dbHost = "";
  try {
    dbHost = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").hostname;
  } catch {
    notFound();
  }
  if (
    process.env.NODE_ENV !== "development" ||
    process.env.PLAYER_ACCOUNTS_ENABLED !== "true" ||
    process.env.IRON_LEAGUE_E2E_TEST_ONLY !== "true" ||
    host !== "localhost:3001" ||
    dbHost !== "knrdsraydifnnbqycird.supabase.co"
  ) {
    notFound();
  }
  return <AuthTestClient />;
}
