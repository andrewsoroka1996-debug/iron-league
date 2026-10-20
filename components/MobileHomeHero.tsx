import Image from "next/image";

type MobileHomeHeroProps = {
  tournamentCount: number;
};

/**
 * Iron League — mobile/tablet homepage hero only.
 * Desktop's approved hero stays in app/page.tsx with lg:block.
 * The scene asset is cropped from the approved mobile concept, with no baked-in
 * header, labels, description or buttons; those remain accessible HTML.
 */
export default function MobileHomeHero({ tournamentCount }: MobileHomeHeroProps) {
  return (
    <div className="relative -mx-4 -mt-7 isolate overflow-hidden bg-[#020b1d] pt-0 text-center text-white sm:-mx-6 sm:-mt-16 sm:pt-9 lg:hidden">
      {/* Light the left and right sides symmetrically, without a dark mobile edge. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_50%_27%,rgba(23,79,157,0.36),transparent_60%),linear-gradient(90deg,#061831_0%,#04122a_22%,#04122a_78%,#061831_100%)]"
      />

      {/* IRON_LEAGUE_MOBILE_UPPER_BLEND_V1: continuous blue atmosphere above the mobile stadium. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 z-0 h-64 sm:h-80"
        style={{
          backgroundImage: [
            "radial-gradient(ellipse 42% 62% at 0% 87%, rgba(31,116,235,0.24), transparent 90%)",
            "radial-gradient(ellipse 42% 62% at 100% 87%, rgba(31,116,235,0.24), transparent 90%)",
            "radial-gradient(ellipse 65% 65% at 50% 80%, rgba(11,49,108,0.25), transparent 86%)",
            "linear-gradient(to bottom, #020b1d 0%, #031229 22%, #051a39 63%, #061831 100%)",
          ].join(", "),
        }}
      />

      <div className="relative z-10 flex justify-center px-4 pt-7 sm:pt-9">
        <span className="inline-flex max-w-full items-center justify-center gap-2.5 rounded-full border border-blue-400/45 bg-[#082651]/85 px-4 py-2.5 text-[10px] font-extrabold uppercase tracking-[0.16em] text-blue-200 shadow-[0_0_24px_rgba(37,99,235,0.18)] min-[380px]:px-5 min-[380px]:text-[11px] min-[380px]:tracking-[0.22em] sm:text-sm">
          <span aria-hidden="true" className="h-2.5 w-2.5 shrink-0 rounded-full bg-sky-400 shadow-[0_0_13px_rgba(56,189,248,0.95)]" />
          eFootball Competition
        </span>
      </div>

      {/* This artwork is the scene from the selected concept: one evenly lit crest,
          symmetric stadium lights and sparks, and no duplicated text. */}
      <div className="relative mx-auto mt-1 w-full max-w-[760px]">
        <Image
          src="/backgrounds/iron-league-mobile-concept-scene.webp"
          alt="Емблема Iron League на симетрично освітленому футбольному стадіоні"
          width={941}
          height={748}
          sizes="(min-width: 640px) 760px, 100vw"
          fetchPriority="high"
          quality={90}
          className="block h-auto w-full"
          style={{
            maskImage:
              "linear-gradient(to bottom, transparent 0%, black 9%, black 91%, transparent 100%)",
            WebkitMaskImage:
              "linear-gradient(to bottom, transparent 0%, black 9%, black 91%, transparent 100%)",
          }}
        />
      </div>

      <div className="relative z-10 -mt-1 px-4 pb-8 sm:px-8 sm:pb-12">
        <h1 className="text-[clamp(2rem,9vw,3.75rem)] font-black leading-none tracking-[0.025em] text-white drop-shadow-[0_3px_12px_rgba(0,0,0,0.55)]">
          IRON LEAGUE
        </h1>
        <div className="mt-3 flex items-center justify-center gap-3 sm:gap-5">
          <span aria-hidden="true" className="h-px w-8 bg-blue-400/70 sm:w-16" />
          <p className="whitespace-nowrap text-[10px] font-extrabold uppercase tracking-[0.24em] text-blue-200 min-[380px]:text-xs sm:text-sm">
            Більше ніж гра
          </p>
          <span aria-hidden="true" className="h-px w-8 bg-blue-400/70 sm:w-16" />
        </div>

        <p className="mx-auto mt-6 max-w-[520px] text-[13px] leading-[1.75] text-blue-50/85 sm:text-base">
          Єдина платформа Iron League: матчі, дивізіони, єврокубки,
          статистика, результати, турнірні таблиці та історія ліги.
        </p>

        <div className="mx-auto mt-7 grid max-w-[530px] grid-cols-2 gap-2.5 sm:gap-4">
          <a
            href="/matches"
            className="flex min-h-12 items-center justify-center gap-1 rounded-xl border border-sky-400/80 bg-gradient-to-b from-[#198aff] to-[#0944d5] px-1.5 py-3 text-[10px] font-extrabold text-white shadow-[0_0_20px_rgba(37,99,235,0.35)] transition hover:from-[#39a6ff] hover:to-[#1959f4] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-300 min-[390px]:text-[11px] sm:min-h-14 sm:text-base flex-nowrap"
          >
            <svg aria-hidden="true" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4 shrink-0">
              <path d="M7 4.5a1.5 1.5 0 0 1 2.3-1.27l11 7a1.5 1.5 0 0 1 0 2.54l-11 7A1.5 1.5 0 0 1 7 18.5z" />
            </svg>
            <span className="whitespace-nowrap text-center leading-[1.2]">Переглянути матчі</span>
          </a>
          <a
            href="/divisions"
            className="flex min-h-12 items-center justify-center gap-1.5 rounded-xl border border-blue-400/60 bg-[#061327]/90 px-2 py-3 text-[11px] font-extrabold text-white transition hover:bg-[#0d2852] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-300 min-[390px]:text-[13px] sm:min-h-14 sm:text-base"
          >
            <svg aria-hidden="true" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4 shrink-0 text-blue-300">
              <rect x="3" y="13" width="4" height="8" rx="1" />
              <rect x="10" y="8" width="4" height="13" rx="1" />
              <rect x="17" y="3" width="4" height="18" rx="1" />
            </svg>
            Турнірні таблиці
          </a>
        </div>

        {/* Values come from the existing homepage; don't use fictional numbers
            from the AI-generated graphic mockup. */}
        <div className="mx-auto mt-9 grid max-w-[510px] grid-cols-3 items-start divide-x divide-blue-400/25 sm:mt-12">
          <div className="px-1.5">
            <div className="text-2xl font-black leading-none sm:text-3xl">4</div>
            <div className="mt-2 text-[10px] uppercase tracking-wide text-blue-200/80 sm:text-xs">Дивізіони</div>
          </div>
          <div className="px-1.5">
            <div className="text-2xl font-black leading-none sm:text-3xl">{tournamentCount}+</div>
            <div className="mt-2 text-[10px] uppercase tracking-wide text-blue-200/80 sm:text-xs">Турнірів</div>
          </div>
          <div className="px-1.5">
            <div className="text-2xl font-black leading-none sm:text-3xl">∞</div>
            <div className="mt-2 text-[10px] uppercase tracking-wide text-blue-200/80 sm:text-xs">Емоцій</div>
          </div>
        </div>
      </div>
    </div>
  );
}
