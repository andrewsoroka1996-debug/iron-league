
import Image from "next/image";
import Link from "next/link";

const footerNavigation = [
  { label: "Головна", href: "/" },
  { label: "Матчі", href: "/matches" },
  { label: "Дивізіони", href: "/divisions" },
  { label: "Турніри", href: "/#tournaments" },
  { label: "Гравці", href: "/players" },
  { label: "Коефіцієнти", href: "/coefficients" },
  { label: "Історія", href: "/history" },
  { label: "Новини", href: "/news" },
];

export default function SiteFooter() {
  return (
    <footer className="border-t border-white/10 bg-[#02050b] text-white">
      <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 sm:py-10">

        {/* BRAND */}
        <Link
          href="/"
          className="inline-flex items-center gap-3"
        >
          <Image
            src="/iron-league-logo.jpg"
            alt="Iron League"
            width={48}
            height={48}
            className="h-10 w-10 rounded-lg object-contain sm:h-12 sm:w-12"
          />

          <div>
            <div className="text-base font-black tracking-widest sm:text-lg">
              IRON LEAGUE
            </div>

            <div className="mt-0.5 text-[9px] font-semibold uppercase tracking-widest text-white/50 sm:mt-1 sm:text-[10px]">
              БІЛЬШЕ НІЖ ГРА
            </div>
          </div>
        </Link>

        {/* MOBILE DESCRIPTION */}
        <p className="mt-2 text-xs text-white/50 sm:hidden">
          Українська ліга eFootball
        </p>

        {/* DESKTOP DESCRIPTION */}
        <p className="mt-4 hidden max-w-xl text-sm leading-6 text-white/55 sm:block">
          Українська ліга eFootball. Дивізіони,
          турніри, матчі, статистика та історія
          Iron League.
        </p>

        {/* NAVIGATION */}
        <nav
          aria-label="Навігація внизу сторінки"
          className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 border-t border-white/10 pt-3 sm:mt-6 sm:grid-cols-4 sm:gap-x-6 sm:gap-y-3 sm:pt-5"
        >
          {footerNavigation.map((item, index) => (
            <Link
              key={item.href}
              href={item.href}
              className={`text-xs font-medium leading-5 text-white/65 transition-colors hover:text-blue-300 sm:text-sm ${
                index >= 4 ? "hidden sm:block" : ""
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        {/* COPYRIGHT */}
        <div className="mt-3 border-t border-white/10 pt-3 sm:mt-6 sm:pt-5">
          <p className="text-[11px] text-white/40 sm:text-xs">
            © {new Date().getFullYear()} Iron League.
            All rights reserved.
          </p>
        </div>

      </div>
    </footer>
  );
}
