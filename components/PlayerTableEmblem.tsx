"use client";

import { useState } from "react";

type Props = {
  src?: string | null;
  // Optional smaller variants for compact homepage match cards.
  // The default preserves the original size in tournament tables.
  size?: "default" | "compact" | "featured";
};

// A compact, strictly constrained profile emblem inside the EXISTING name cell.
// 28px on compact screens, up to 34px on desktop. No extra table column.
const EMBLEM_SIZES = {
  default: "clamp(28px, 2.2vw, 34px)",
  compact: "clamp(20px, 1.8vw, 26px)",
  featured: "clamp(26px, 2vw, 32px)",
} as const;

export default function PlayerTableEmblem({ src, size = "default" }: Props) {
  const emblemSize = EMBLEM_SIZES[size];
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const url = src?.trim() ?? "";

  if (!url || failedSrc === url) {
    return null;
  }

  return (
    <span
      aria-hidden="true"
      className="inline-flex shrink-0 items-center justify-center overflow-hidden rounded-md border border-white/10 bg-white/[0.04]"
      style={{
        display: "inline-flex",
        boxSizing: "border-box",
        width: emblemSize,
        height: emblemSize,
        minWidth: emblemSize,
        minHeight: emblemSize,
        maxWidth: emblemSize,
        maxHeight: emblemSize,
        flex: `0 0 ${emblemSize}`,
        overflow: "hidden",
      }}
    >
      <img
        src={url}
        alt=""
        width={34}
        height={34}
        loading="lazy"
        decoding="async"
        onError={() => setFailedSrc(url)}
        style={{
          display: "block",
          boxSizing: "border-box",
          width: "100%",
          height: "100%",
          minWidth: 0,
          minHeight: 0,
          maxWidth: "100%",
          maxHeight: "100%",
          objectFit: "contain",
        }}
      />
    </span>
  );
}
