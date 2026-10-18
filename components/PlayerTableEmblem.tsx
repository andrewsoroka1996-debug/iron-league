"use client";

import { useState } from "react";

type Props = {
  src?: string | null;
};

// A compact, strictly constrained profile emblem inside the EXISTING name cell.
// 28px on compact screens, up to 34px on desktop. No extra table column.
const EMBLEM_SIZE = "clamp(28px, 2.2vw, 34px)";

export default function PlayerTableEmblem({ src }: Props) {
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
        width: EMBLEM_SIZE,
        height: EMBLEM_SIZE,
        minWidth: EMBLEM_SIZE,
        minHeight: EMBLEM_SIZE,
        maxWidth: EMBLEM_SIZE,
        maxHeight: EMBLEM_SIZE,
        flex: `0 0 ${EMBLEM_SIZE}`,
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
