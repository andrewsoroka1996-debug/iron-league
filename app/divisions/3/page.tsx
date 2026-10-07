import { connection } from "next/server";
import DivisionPage from "../../../components/DivisionPage";

type PageProps = {
  searchParams: Promise<{
    season?: string;
  }>;
};

export default async function Page({
  searchParams,
}: PageProps) {
  await connection();

  const params = await searchParams;

  const requestedSeason = Number(params.season);

  const season =
    requestedSeason >= 1 && requestedSeason <= 4
      ? (requestedSeason as 1 | 2 | 3 | 4)
      : 3;

  return (
    <DivisionPage
      division={3}
      season={season}
    />
  );
}