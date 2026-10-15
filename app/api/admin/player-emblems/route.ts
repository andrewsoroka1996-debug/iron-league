import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";

import { players } from "../../../../data/players";
import { supabaseAdmin } from "../../../../lib/supabase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BUCKET = "player-emblems";
const TABLE = "player_emblems";
const MAX_FILE_SIZE = 3 * 1024 * 1024;

const allowedMimeTypes: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
};

const knownPlayerIds = new Set(players.map((player) => player.id));

type EmblemRow = {
  player_id: string;
  image_path: string;
  updated_at: string;
};

function authorized(password: unknown): boolean {
  const expected = process.env.ADMIN_PASSWORD;
  return (
    typeof password === "string" &&
    typeof expected === "string" &&
    expected.length > 0 &&
    password === expected
  );
}

function isValidImage(bytes: Uint8Array, mimeType: string): boolean {
  if (mimeType === "image/png") {
    const png = [137, 80, 78, 71, 13, 10, 26, 10];
    return png.every((value, i) => bytes[i] === value);
  }

  if (mimeType === "image/jpeg") {
    return bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
  }

  if (mimeType === "image/webp") {
    return (
      bytes[0] === 82 &&
      bytes[1] === 73 &&
      bytes[2] === 70 &&
      bytes[3] === 70 &&
      bytes[8] === 87 &&
      bytes[9] === 69 &&
      bytes[10] === 66 &&
      bytes[11] === 80
    );
  }

  return false;
}

function getImageUrl(path: string): string {
  return supabaseAdmin.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}

function unauthorizedResponse() {
  return NextResponse.json(
    { error: "Невірний пароль адміністратора" },
    { status: 401 }
  );
}

// Адміністратор отримує список уже завантажених емблем.
export async function GET(request: Request) {
  if (!authorized(request.headers.get("x-admin-password"))) {
    return unauthorizedResponse();
  }

  try {
    const { data, error } = await supabaseAdmin
      .from(TABLE)
      .select("player_id, image_path, updated_at")
      .order("player_id", { ascending: true });

    if (error) {
      console.error("PLAYER EMBLEMS LIST ERROR:", error);
      return NextResponse.json(
        { error: "Не вдалося завантажити список емблем" },
        { status: 500 }
      );
    }

    const emblems = ((data ?? []) as EmblemRow[]).map((row) => ({
      ...row,
      url: getImageUrl(row.image_path),
    }));

    return NextResponse.json(
      { success: true, emblems },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("PLAYER EMBLEMS LIST ERROR:", error);
    return NextResponse.json(
      { error: "Помилка завантаження емблем" },
      { status: 500 }
    );
  }
}

// Адміністратор завантажує нову емблему або замінює попередню.
export async function POST(request: Request) {
  try {
    const formData = await request.formData();

    if (!authorized(formData.get("password"))) {
      return unauthorizedResponse();
    }

    const playerId = formData.get("player_id");
    const file = formData.get("file");

    if (typeof playerId !== "string" || !knownPlayerIds.has(playerId)) {
      return NextResponse.json(
        { error: "Оберіть гравця з каталогу Iron League" },
        { status: 400 }
      );
    }

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "Оберіть файл емблеми" },
        { status: 400 }
      );
    }

    const extension = allowedMimeTypes[file.type];
    if (!extension) {
      return NextResponse.json(
        { error: "Дозволені лише PNG, JPG та WebP" },
        { status: 400 }
      );
    }

    if (file.size === 0 || file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "Розмір емблеми має бути від 1 байта до 3 МБ" },
        { status: 400 }
      );
    }

    const bytes = new Uint8Array(await file.arrayBuffer());
    if (!isValidImage(bytes, file.type)) {
      return NextResponse.json(
        { error: "Вміст файлу не відповідає формату зображення" },
        { status: 400 }
      );
    }

    const { data: previous, error: previousError } = await supabaseAdmin
      .from(TABLE)
      .select("image_path")
      .eq("player_id", playerId)
      .maybeSingle();

    if (previousError) {
      console.error("PLAYER EMBLEM LOOKUP ERROR:", previousError);
      return NextResponse.json(
        { error: "Не вдалося перевірити поточну емблему" },
        { status: 500 }
      );
    }

    // Унікальна назва запобігає показу старої версії через кеш.
    const path = `${playerId}/${randomUUID()}.${extension}`;

    const { error: uploadError } = await supabaseAdmin.storage
      .from(BUCKET)
      .upload(path, bytes, {
        contentType: file.type,
        cacheControl: "31536000",
        upsert: false,
      });

    if (uploadError) {
      console.error("PLAYER EMBLEM UPLOAD ERROR:", uploadError);
      return NextResponse.json(
        { error: "Не вдалося завантажити файл емблеми" },
        { status: 500 }
      );
    }

    const { error: saveError } = await supabaseAdmin.from(TABLE).upsert(
      {
        player_id: playerId,
        image_path: path,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "player_id" }
    );

    if (saveError) {
      console.error("PLAYER EMBLEM SAVE ERROR:", saveError);
      await supabaseAdmin.storage.from(BUCKET).remove([path]);
      return NextResponse.json(
        { error: "Не вдалося зберегти емблему гравця" },
        { status: 500 }
      );
    }

    // Старий файл видаляємо тільки ПІСЛЯ успішного збереження нового.
    if (previous?.image_path && previous.image_path !== path) {
      const { error: cleanupError } = await supabaseAdmin.storage
        .from(BUCKET)
        .remove([previous.image_path]);
      if (cleanupError) {
        console.warn("PLAYER EMBLEM OLD FILE CLEANUP:", cleanupError);
      }
    }

    return NextResponse.json({
      success: true,
      player_id: playerId,
      image_path: path,
      url: getImageUrl(path),
      message: "Емблему гравця збережено",
    });
  } catch (error) {
    console.error("PLAYER EMBLEM UPLOAD ERROR:", error);
    return NextResponse.json(
      { error: "Помилка завантаження емблеми" },
      { status: 500 }
    );
  }
}

// Видалення емблеми повертає на сайті стандартні ініціали гравця.
export async function DELETE(request: Request) {
  try {
    const body = (await request.json()) as Record<string, unknown>;

    if (!authorized(body.password)) {
      return unauthorizedResponse();
    }

    const playerId = body.player_id;
    if (typeof playerId !== "string" || !knownPlayerIds.has(playerId)) {
      return NextResponse.json(
        { error: "Невідомий гравець" },
        { status: 400 }
      );
    }

    const { data: current, error: lookupError } = await supabaseAdmin
      .from(TABLE)
      .select("image_path")
      .eq("player_id", playerId)
      .maybeSingle();

    if (lookupError) {
      console.error("PLAYER EMBLEM LOOKUP ERROR:", lookupError);
      return NextResponse.json(
        { error: "Не вдалося знайти емблему" },
        { status: 500 }
      );
    }

    if (!current) {
      return NextResponse.json({ success: true, message: "Емблеми немає" });
    }

    const { error: deleteError } = await supabaseAdmin
      .from(TABLE)
      .delete()
      .eq("player_id", playerId);

    if (deleteError) {
      console.error("PLAYER EMBLEM DELETE ERROR:", deleteError);
      return NextResponse.json(
        { error: "Не вдалося прибрати емблему гравця" },
        { status: 500 }
      );
    }

    const { error: storageError } = await supabaseAdmin.storage
      .from(BUCKET)
      .remove([current.image_path]);

    if (storageError) {
      console.warn("PLAYER EMBLEM FILE CLEANUP:", storageError);
    }

    return NextResponse.json({
      success: true,
      message: "Емблему прибрано",
      ...(storageError ? { warning: "Файл потребує очищення у Storage" } : {}),
    });
  } catch (error) {
    console.error("PLAYER EMBLEM DELETE ERROR:", error);
    return NextResponse.json(
      { error: "Помилка видалення емблеми" },
      { status: 500 }
    );
  }
}
