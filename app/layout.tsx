
import type { Metadata } from "next";
import "./globals.css";

const siteDescription =
  "Iron League — українська ліга eFootball. Дивізіони, турніри, розклад і результати матчів, турнірні таблиці, статистика гравців та історія сезонів.";

export const metadata: Metadata = {
  metadataBase: new URL("https://ironleague.com.ua"),

  applicationName: "Iron League",

  title: {
    default: "Iron League — Українська ліга eFootball",
    template: "%s | Iron League",
  },

  description: siteDescription,

  openGraph: {
    type: "website",
    locale: "uk_UA",
    siteName: "Iron League",
    title: "Iron League — Українська ліга eFootball",
    description: siteDescription,
  },

  twitter: {
    card: "summary",
    title: "Iron League — Українська ліга eFootball",
    description: siteDescription,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="uk" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        {children}
      </body>
    </html>
  );
}
