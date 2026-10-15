"use client";

import { useState } from "react";

type PlayerEmblemProps = {
  nickname: string;
  initials: string;
  src?: string | null;
  variant?: "card" | "profile";
};

export default function PlayerEmblem({
  nickname,
  initials,
  src,
  variant = "card",
}: PlayerEmblemProps) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const imageUrl = src?.trim() ?? "";
  const hasImage = imageUrl.length > 0 && failedSrc !== imageUrl;
  const isProfile = variant === "profile";

  return (
    <div
      className={
        isProfile
          ? "flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-blue-400/30 bg-blue-500/10 text-xl font-black text-blue-300 shadow-[0_0_40px_rgba(59,130,246,0.08)] sm:h-24 sm:w-24 sm:rounded-3xl sm:text-3xl"
          : "flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-blue-400/25 bg-blue-500/10 text-base font-black text-blue-300 transition group-hover:border-blue-400/45 group-hover:bg-blue-500/15"
      }
    >
      {hasImage ? (
        <img
          src={imageUrl}
          alt={`Емблема гравця ${nickname}`}
          width={isProfile ? 96 : 48}
          height={isProfile ? 96 : 48}
          loading="lazy"
          decoding="async"
          className="h-full w-full object-contain"
          onError={() => setFailedSrc(imageUrl)}
        />
      ) : (
        <span>{initials}</span>
      )}
    </div>
  );
}
