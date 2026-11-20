import { NextRequest } from "next/server";
import { handleApplicantRequest } from "../../../../lib/player-profile-request-server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: NextRequest) {
  return handleApplicantRequest(request, "GET");
}

export async function POST(request: NextRequest) {
  return handleApplicantRequest(request, "POST");
}
