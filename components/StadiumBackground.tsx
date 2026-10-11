import Image from "next/image";

type Props = {
  opacity?: "20" | "25" | "30";
  preload?: boolean;
  sizes?: string;
};

export default function StadiumBackground({
  opacity = "20",
  preload = false,
  sizes = "100vw",
}: Props) {
  const opacityClass =
    opacity === "30"
      ? "opacity-30"
      : opacity === "25"
        ? "opacity-25"
        : "opacity-20";

  return (
    <Image
      src="/stadium-bg.jpg"
      alt=""
      fill
      preload={preload}
      sizes={sizes}
      quality={70}
      className={`object-cover object-center ${opacityClass}`}
    />
  );
}