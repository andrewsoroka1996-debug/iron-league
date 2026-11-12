/**
 * Iron League Pro — monochrome gold trophy silhouettes, revision V6.
 *
 * Drawn as lightweight, scalable inline SVG. No external assets, network
 * requests, animations, gradients or new packages. The caller determines
 * the colour through Tailwind's `text-*` classes (currentColor).
 *
 * All division winners share one league model; every division cup shares
 * a separate domestic cup model, regardless of division number.
 * European cup shapes are custom stylised silhouettes of the real trophies,
 * not copied photographs, logos or official vector artwork.
 */

type HonourCategory =
  | "division"
  | "cup"
  | "europe"
  | "super-cup"
  | "association"
  | "coop";

type TrophyShape =
  | "league"
  | "division-cup"
  | "champions"
  | "europa"
  | "conference"
  | "supercup"
  | "association"
  | "coop";

function getTrophyShape(category: HonourCategory, title: string): TrophyShape {
  if (category === "division") return "league";
  if (category === "cup") return "division-cup";
  if (category === "super-cup") return "supercup";
  if (category === "association") return "association";
  if (category === "coop") return "coop";

  const name = title.toLocaleLowerCase("uk-UA");
  if (name.includes("конференц")) return "conference";
  if (name.includes("європ") || name.includes("europa")) return "europa";
  if (name.includes("чемпіон") || name.includes("champions")) return "champions";
  return "champions";
}

export default function HonourTrophyIcon({
  category,
  title,
  className = "h-12 w-12",
}: {
  category: HonourCategory;
  title: string;
  className?: string;
}) {
  const shape = getTrophyShape(category, title);

  return (
    <svg
      viewBox="0 0 64 64"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {shape === "division-cup" && (
        <>
          {/* A broad, open, two-handled domestic cup. Same for D1–D4. */}
          <path d="M17 17h30v9c0 12.7-6.4 19.6-15 19.6S17 38.7 17 26v-9Z" fill="currentColor" stroke="none" />
          <path d="M17.2 21C7.5 15.3 5.1 23 10.5 32c2.7 4.5 6.6 6.4 11.8 6.8M46.8 21C56.5 15.3 58.9 23 53.5 32c-2.7 4.5-6.6 6.4-11.8 6.8" strokeWidth="3.7" />
          <path d="M17 14.8h30M30 46v7.3M34 46v7.3" strokeWidth="3.8" />
          <path d="M26 52.5h12v3.2H26zM21 56h22l2.1 3.5H18.9z" fill="currentColor" stroke="none" />
        </>
      )}

      {shape === "league" && (
        <>
          {/* Tall champion's trophy with a small crown; shared by D1–D4. */}
          <path d="m21 14-2.5-8.7 8.1 3.2L32 2.6l5.4 5.9 8.1-3.2L43 14Z" fill="currentColor" stroke="none" />
          <path d="M20.5 17h23l-2.1 15.3C40.1 41.8 36.6 47.4 32 50c-4.6-2.6-8.1-8.2-9.4-17.7L20.5 17Z" fill="currentColor" stroke="none" />
          <path d="M20.5 20.5c-6.5-2.6-9.1 2.6-6 8.7 2 4.1 5.8 6.6 9.6 7.2M43.5 20.5c6.5-2.6 9.1 2.6 6 8.7-2 4.1-5.8 6.6-9.6 7.2" strokeWidth="2.8" />
          <path d="M29 49h6v6h-6zM24 54h16v3H24zM20 57h24v3H20z" fill="currentColor" stroke="none" />
          <path d="M29 23.5 32 42l3-18.5" stroke="#101b28" strokeOpacity=".5" strokeWidth="1.4" />
        </>
      )}

      {shape === "champions" && (
        <>
          {/* High, inward-curving ears, deep body and modest foot of UCL cup. */}
          <path d="M20 18.5c-2.3-3.3-5.4-11.1-8.4-11.9C7.8 5.6 5.5 9.9 7.2 16c2.4 8.5 7.5 17.8 13.3 22.4M44 18.5c2.3-3.3 5.4-11.1 8.4-11.9 3.8-1 6.1 3.3 4.4 9.4-2.4 8.5-7.5 17.8-13.3 22.4" strokeWidth="3.85" />
          <path d="M19 18h26l-2.1 19.8C41.8 46.2 37.8 50 32 50s-9.8-3.8-10.9-12.2L19 18Z" fill="currentColor" stroke="none" />
          <path d="M18.5 18h27" strokeWidth="3.2" />
          <path d="M29.5 49h5v6.1h-5zM22 56h20l1.7 3.5H20.3z" fill="currentColor" stroke="none" />
          <path d="M23.7 23c.9 10.4 2 15.4 4.2 19.2" stroke="#101b28" strokeOpacity=".35" strokeWidth="1.4" />
        </>
      )}

      {shape === "europa" && (
        <>
          {/* Large rim, tapered, faceted Europa League tower silhouette. */}
          <path d="M17 9.5h30l-5 15.1-2.9 17.8L32 52l-7.1-9.6L22 24.6Z" fill="currentColor" stroke="none" />
          <path d="M17 9.6h30M20 7.4h24" strokeWidth="3" />
          <path d="M27.7 51.4h8.6v5H27.7zM22 56h20v3.7H22z" fill="currentColor" stroke="none" />
          <path d="M24 14.5 29 39M29 13.5 31.5 43M36 13.5 33 43M41 14.5 35.5 39" stroke="#101b28" strokeOpacity=".63" strokeWidth="1.55" />
          <circle cx="37.3" cy="21" r="1.8" fill="#101b28" stroke="none" />
        </>
      )}

      {shape === "conference" && (
        <>
          {/* Straight-fluted Conference League vessel with narrow waist. */}
          <path d="M17 8h30l-4.4 14.6-7 29H28.4l-7-29Z" fill="currentColor" stroke="none" />
          <path d="M17 8h30" strokeWidth="3.4" />
          <path d="M27.5 51.6h9v4.5h-9zM22 56h20v3.7H22z" fill="currentColor" stroke="none" />
          <path d="M22.3 12.9 29.5 48M27.1 12.9 31 49M32 12.9v36M36.9 12.9 33 49M41.7 12.9 34.5 48" stroke="#101b28" strokeOpacity=".68" strokeWidth="1.4" />
        </>
      )}

      {shape === "supercup" && (
        <>
          {/* Tall oval European Super Cup with elegant curved flank supports. */}
          <path d="M27 8.5c3-2.5 7-2.5 10 0l-1.3 22.8C35.4 38.5 33.7 44 32 48c-1.7-4-3.4-9.5-3.7-16.7Z" fill="currentColor" stroke="none" />
          <path d="M26.1 13.5c-10.3 3.2-12.7 20.2 1.7 31.6M37.9 13.5c10.3 3.2 12.7 20.2-1.7 31.6" strokeWidth="3" />
          <path d="M29 47h6v7h-6zM21 57c6.8-5.2 15.2-5.2 22 0v3H21z" fill="currentColor" stroke="none" />
        </>
      )}

      {shape === "association" && (
        <>
          <path d="M19 16h26l-2.6 16.1C41.2 40.6 37.3 46 32 46s-9.2-5.4-10.4-13.9Z" fill="currentColor" stroke="none" />
          <path d="M19 20c-6-3.3-9.8 2-6.3 8.5 2.3 4 6.6 6.5 10.3 7M45 20c6-3.3 9.8 2 6.3 8.5-2.3 4-6.6 6.5-10.3 7" strokeWidth="3.2" />
          <path d="M29.7 45h4.6v8h-4.6zM24 53h16v3H24zM21 56h22v3.8H21z" fill="currentColor" stroke="none" />
          <path d="M28 24v10l4 3 4-3V24" stroke="#101b28" strokeOpacity=".6" strokeWidth="1.3" />
        </>
      )}

      {shape === "coop" && (
        <>
          <path d="M9 19h24l-2 12.5C29.6 40 25 43.5 21 43.5S12.4 40 11 31.5ZM31 19h24l-2 12.5C51.6 40 47 43.5 43 43.5S34.4 40 33 31.5Z" fill="currentColor" stroke="none" />
          <path d="M9 22C3 19 3 27 9 32M55 22c6-3 6 5 0 10" strokeWidth="2.8" />
          <path d="M18 43h6v11h-6zM40 43h6v11h-6zM14 54h36l3 5H11z" fill="currentColor" stroke="none" />
        </>
      )}
    </svg>
  );
}
