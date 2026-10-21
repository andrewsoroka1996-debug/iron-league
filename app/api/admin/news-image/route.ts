import { randomUUID } from "node:crypto";

import { NextResponse } from "next/server";
import sharp from "sharp";

import { supabaseAdmin } from "../../../../lib/supabase-admin";

export const runtime = "nodejs";

const BUCKET = "news-images";
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const MAX_INPUT_PIXELS = 40_000_000;
const MAX_OUTPUT_SIDE = 1920;

const allowedFormats: Record<string, string> = {
  "image/jpeg": "jpeg",
  "image/png": "png",
  "image/webp": "webp",
};

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const password = formData.get("password");
    const expected = process.env.ADMIN_PASSWORD;

    if (typeof password !== "string" || !expected || password !== expected) {
      return NextResponse.json(
        { error: "Невірний пароль адміністратора" },
        { status: 401 }
      );
    }

    const file = formData.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "Оберіть зображення" },
        { status: 400 }
      );
    }

    const expectedFormat = allowedFormats[file.type];
    if (!expectedFormat) {
      return NextResponse.json(
        { error: "Дозволені лише JPG, PNG та WebP" },
        { status: 400 }
      );
    }

    if (file.size === 0 || file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "Розмір зображення має бути від 1 байта до 10 МБ" },
        { status: 400 }
      );
    }

    const input = Buffer.from(await file.arrayBuffer());
    let optimized: Buffer;

    try {
      const settings = {
        limitInputPixels: MAX_INPUT_PIXELS,
        failOn: "error" as const,
      };
      const metadata = await sharp(input, settings).metadata();
      if (
        metadata.format !== expectedFormat ||
        !metadata.width ||
        !metadata.height ||
        metadata.width * metadata.height > MAX_INPUT_PIXELS ||
        (metadata.pages ?? 1) > 1
      ) {
        return NextResponse.json(
          { error: "Невірний формат або завелика роздільність зображення" },
          { status: 400 }
        );
      }

      optimized = await sharp(input, settings)
        .rotate()
        .resize({
          width: MAX_OUTPUT_SIDE,
          height: MAX_OUTPUT_SIDE,
          fit: "inside",
          withoutEnlargement: true,
        })
        .webp({ quality: 88, alphaQuality: 95, effort: 4 })
        .toBuffer();
    } catch (error) {
      console.warn("NEWS IMAGE PROCESS ERROR:", error);
      return NextResponse.json(
        { error: "Не вдалося обробити зображення. Перевірте файл." },
        { status: 400 }
      );
    }

    // Не збільшуємо трафік, якщо оригінал уже компактніший.
    const useOptimized = optimized.length < input.length;
    const bytes = useOptimized ? optimized : input;
    const extension = useOptimized
      ? "webp"
      : expectedFormat === "jpeg"
        ? "jpg"
        : expectedFormat;
    const contentType = useOptimized ? "image/webp" : file.type;

    // Унікальний шлях дозволяє безпечно встановити тривале кешування.
    const path = `news/${Date.now()}-${randomUUID()}.${extension}`;
    const { error: uploadError } = await supabaseAdmin.storage
      .from(BUCKET)
      .upload(path, bytes, {
        contentType,
        cacheControl: "31536000",
        upsert: false,
      });

    if (uploadError) {
      console.error("NEWS IMAGE UPLOAD ERROR:", uploadError);
      return NextResponse.json(
        { error: "Не вдалося завантажити зображення" },
        { status: 500 }
      );
    }

    const { data } = supabaseAdmin.storage.from(BUCKET).getPublicUrl(path);
    return NextResponse.json({
      success: true,
      bucket: BUCKET,
      path,
      url: data.publicUrl,
      optimized: useOptimized,
      originalBytes: input.length,
      savedBytes: bytes.length,
    });
  } catch (error) {
    console.error("NEWS IMAGE API ERROR:", error);
    return NextResponse.json(
      { error: "Помилка завантаження зображення" },
      { status: 500 }
    );
  }
}
