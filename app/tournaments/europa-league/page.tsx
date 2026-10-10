import GroupStagePage from "../../../components/GroupStagePage";
import EuropeanCupCalendar from "../../../components/EuropeanCupCalendar";

type PageProps = {
  searchParams: Promise<{
    season?: string;
  }>;
};

export default async function Page({
  searchParams,
}: PageProps) {
  const params =
    await searchParams;

  const requestedSeason =
    Number(params.season);

  const season =
    requestedSeason >= 1 &&
    requestedSeason <= 4
      ? (requestedSeason as
          | 1
          | 2
          | 3
          | 4)
      : 3;

  return (
    <>
      <GroupStagePage
        competition="europaLeague"
        season={season}
      />

      <EuropeanCupCalendar
        season={season}
        competition="europa-league"
      />
    </>
  );
}