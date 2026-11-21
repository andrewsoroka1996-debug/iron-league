"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

type FrameProps = {
  children: ReactNode;
  admin?: boolean;
  historicalApplicationsAvailable?: boolean;
  newApplicationsAvailable?: boolean;
};

type NavItem = { href: string; label: string; admin?: boolean };

/** Presentation only. No user session, approval, ownership or service-role logic lives here. */
export default function AccountExperienceFrame({
  children,
  admin = false,
  historicalApplicationsAvailable = false,
  newApplicationsAvailable = false,
}: FrameProps) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  // Never expose demo routes or links to disabled application flows.
  const pages: NavItem[] = [
    { href: "/", label: "Головна" },
    { href: "/players", label: "Гравці" },
    { href: "/account", label: "Мій акаунт" },
  ];
  if (historicalApplicationsAvailable) {
    pages.push({ href: "/account/link-player", label: "Прив'язка" });
  }
  if (newApplicationsAvailable) {
    pages.push({ href: "/account/new-player", label: "Новачок" });
  }
  if (admin) {
    pages.push({ href: "/admin/player-accounts", label: "Адмінпанель", admin: true });
  }

  const currentPage = pages.find((page) => page.href === pathname)?.label ??
    (admin ? "Адмінпанель" : "Мій акаунт");

  return (
    <div className={`il-preview-root il-account-ui ${admin ? "il-preview-admin" : "il-preview-public"}`}>
      <header className="il-preview-header">
        <div className="il-preview-header-inner">
          <Link href="/" className="il-preview-brand" aria-label="Iron League — головна сторінка">
            <span className="il-preview-brand-logo" aria-hidden="true" />
            <span className="il-preview-brand-text">
              <strong>IRON LEAGUE</strong>
              <small>БІЛЬШЕ НІЖ ГРА</small>
            </span>
          </Link>
          <div className="il-preview-header-right">
            <span className="il-preview-context">{admin ? "ПАНЕЛЬ ОРГАНІЗАТОРА" : "АКАУНТ ГРАВЦЯ"}</span>
            <span className="il-preview-local-pill">{admin ? "АДМІН" : "АКАУНТ"}</span>
          </div>
        </div>
      </header>
      <nav className="il-preview-tabs" aria-label="Навігація акаунта Iron League">
        <div className="il-preview-mobile-nav-bar">
          <span className="il-preview-mobile-location">
            <span className="il-preview-mobile-eyebrow">ПОТОЧНИЙ РОЗДІЛ</span>
            <strong>{currentPage}</strong>
          </span>
          <button
            type="button"
            className="il-preview-mobile-menu-button"
            aria-label={mobileMenuOpen ? "Закрити меню розділів" : "Відкрити меню розділів"}
            aria-expanded={mobileMenuOpen}
            aria-controls="il-account-ui-section-links"
            onClick={() => setMobileMenuOpen((previous) => !previous)}
          >
            <span>{mobileMenuOpen ? "Закрити" : "Усі сторінки"}</span>
            <span className={`il-preview-mobile-chevron ${mobileMenuOpen ? "is-open" : ""}`} aria-hidden="true" />
          </button>
        </div>
        <div id="il-account-ui-section-links" className={`il-preview-tabs-inner ${mobileMenuOpen ? "is-open" : ""}`}>
          {pages.map((page) => {
            const selected = pathname === page.href;
            return (
              <Link
                key={page.href}
                href={page.href}
                aria-current={selected ? "page" : undefined}
                onClick={() => setMobileMenuOpen(false)}
                className={`il-preview-tab ${selected ? "is-current" : ""} ${page.admin ? "is-admin-tab" : ""}`}
              >
                {page.label}
              </Link>
            );
          })}
        </div>
      </nav>
      <div className="il-mainstage">{children}</div>
    </div>
  );
}
