import { NextResponse } from "next/server";

import { supabaseAdmin } from "../../../../lib/supabase-admin";

/*
  ========================================
  TYPES
  ========================================
*/

type NewsBody = {
  password?: string;

  id?: string;

  title?: string;

  slug?: string;

  excerpt?: string;

  content?: string;

  category?: string;

  image_url?: string;

  published?: boolean;
};

/*
  ========================================
  КАТЕГОРІЇ
  ========================================
*/

const allowedCategories = [
  "Сезон",
  "Дивізіони",
  "Єврокубки",
  "Кубки",
  "Кубок асоціацій",
  "Iron Co-op Cup",
  "Матч дня",
  "Оголошення",
];

/*
  ========================================
  ПЕРЕВІРКА ПАРОЛЯ
  ========================================
*/

function isValidPassword(
  password: string | null | undefined
) {
  return (
    Boolean(process.env.ADMIN_PASSWORD) &&
    password === process.env.ADMIN_PASSWORD
  );
}

/*
  ========================================
  SLUG
  ========================================

  Працює також з українськими літерами.
*/

function createSlug(title: string) {
  return title
    .trim()
    .toLowerCase()
    .normalize("NFKC")
    .replace(/[’']/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "");
}

/*
  ========================================
  GET

  Завантажує всі новини для адмінки,
  включно з чернетками.
  ========================================
*/

export async function GET(
  request: Request
) {
  try {
    const password =
      request.headers.get(
        "x-admin-password"
      );

    if (
      !isValidPassword(password)
    ) {
      return NextResponse.json(
        {
          error:
            "Невірний пароль адміністратора",
        },
        {
          status: 401,
        }
      );
    }

    const {
      data,
      error,
    } = await supabaseAdmin
      .from("news")
      .select(
        `
          id,
          title,
          slug,
          excerpt,
          content,
          category,
          image_url,
          published,
          published_at,
          created_at,
          updated_at
        `
      )
      .order(
        "created_at",
        {
          ascending: false,
        }
      );

    if (error) {
      return NextResponse.json(
        {
          error:
            error.message,
        },
        {
          status: 500,
        }
      );
    }

    return NextResponse.json({
      success: true,

      news:
        data ?? [],
    });
  } catch (error) {
    console.error(
      "ADMIN NEWS GET ERROR:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Помилка завантаження новин",
      },
      {
        status: 500,
      }
    );
  }
}

/*
  ========================================
  POST

  Створення новини.
  ========================================
*/

export async function POST(
  request: Request
) {
  try {
    const body =
      (await request.json()) as NewsBody;

    const {
      password,
      title,
      excerpt,
      content,
      category,
      image_url,
      published,
    } = body;

    /*
      ПАРОЛЬ
    */

    if (
      !isValidPassword(password)
    ) {
      return NextResponse.json(
        {
          error:
            "Невірний пароль адміністратора",
        },
        {
          status: 401,
        }
      );
    }

    /*
      НАЗВА
    */

    if (
      !title ||
      !title.trim()
    ) {
      return NextResponse.json(
        {
          error:
            "Введіть заголовок новини",
        },
        {
          status: 400,
        }
      );
    }

    /*
      ТЕКСТ
    */

    if (
      !content ||
      !content.trim()
    ) {
      return NextResponse.json(
        {
          error:
            "Введіть текст новини",
        },
        {
          status: 400,
        }
      );
    }

    /*
      КАТЕГОРІЯ
    */

    const newsCategory =
      category &&
      allowedCategories.includes(
        category
      )
        ? category
        : "Оголошення";

    /*
      SLUG
    */

    let slug =
      body.slug?.trim() ||
      createSlug(title);

    if (!slug) {
      slug =
        `news-${Date.now()}`;
    }

    /*
      Перевіряємо,
      чи slug вже існує.
    */

    const {
      data: existingNews,
      error: existingError,
    } = await supabaseAdmin
      .from("news")
      .select("id")
      .eq(
        "slug",
        slug
      )
      .maybeSingle();

    if (existingError) {
      return NextResponse.json(
        {
          error:
            existingError.message,
        },
        {
          status: 500,
        }
      );
    }

    if (existingNews) {
      slug =
        `${slug}-${Date.now()}`;
    }

    const now =
      new Date().toISOString();

    const {
      data,
      error,
    } = await supabaseAdmin
      .from("news")
      .insert({
        title:
          title.trim(),

        slug,

        excerpt:
          excerpt?.trim() ||
          null,

        content:
          content.trim(),

        category:
          newsCategory,

        image_url:
          image_url?.trim() ||
          null,

        published:
          Boolean(
            published
          ),

        published_at:
          published
            ? now
            : null,

        updated_at:
          now,
      })
      .select(
        `
          id,
          title,
          slug,
          excerpt,
          content,
          category,
          image_url,
          published,
          published_at,
          created_at,
          updated_at
        `
      )
      .single();

    if (error) {
      return NextResponse.json(
        {
          error:
            error.message,
        },
        {
          status: 500,
        }
      );
    }

    return NextResponse.json({
      success: true,

      message:
        published
          ? "Новину опубліковано"
          : "Чернетку збережено",

      news:
        data,
    });
  } catch (error) {
    console.error(
      "ADMIN NEWS POST ERROR:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Помилка створення новини",
      },
      {
        status: 500,
      }
    );
  }
}

/*
  ========================================
  PUT

  Редагування існуючої новини.
  ========================================
*/

export async function PUT(
  request: Request
) {
  try {
    const body =
      (await request.json()) as NewsBody;

    const {
      password,
      id,
      title,
      excerpt,
      content,
      category,
      image_url,
      published,
    } = body;

    /*
      ПАРОЛЬ
    */

    if (
      !isValidPassword(password)
    ) {
      return NextResponse.json(
        {
          error:
            "Невірний пароль адміністратора",
        },
        {
          status: 401,
        }
      );
    }

    /*
      ID
    */

    if (!id) {
      return NextResponse.json(
        {
          error:
            "Не вказано ID новини",
        },
        {
          status: 400,
        }
      );
    }

    /*
      НАЗВА
    */

    if (
      !title ||
      !title.trim()
    ) {
      return NextResponse.json(
        {
          error:
            "Введіть заголовок новини",
        },
        {
          status: 400,
        }
      );
    }

    /*
      ТЕКСТ
    */

    if (
      !content ||
      !content.trim()
    ) {
      return NextResponse.json(
        {
          error:
            "Введіть текст новини",
        },
        {
          status: 400,
        }
      );
    }

    /*
      ПОТОЧНА НОВИНА
    */

    const {
      data: currentNews,
      error: currentError,
    } = await supabaseAdmin
      .from("news")
      .select(
        `
          id,
          slug,
          published,
          published_at
        `
      )
      .eq(
        "id",
        id
      )
      .single();

    if (
      currentError ||
      !currentNews
    ) {
      return NextResponse.json(
        {
          error:
            "Новину не знайдено",
        },
        {
          status: 404,
        }
      );
    }

    /*
      КАТЕГОРІЯ
    */

    const newsCategory =
      category &&
      allowedCategories.includes(
        category
      )
        ? category
        : "Оголошення";

    /*
      SLUG
    */

    let slug =
      body.slug?.trim() ||
      createSlug(title);

    if (!slug) {
      slug =
        currentNews.slug;
    }

    /*
      Перевіряємо slug.
    */

    const {
      data: duplicateSlug,
      error: duplicateError,
    } = await supabaseAdmin
      .from("news")
      .select("id")
      .eq(
        "slug",
        slug
      )
      .neq(
        "id",
        id
      )
      .maybeSingle();

    if (duplicateError) {
      return NextResponse.json(
        {
          error:
            duplicateError.message,
        },
        {
          status: 500,
        }
      );
    }

    if (duplicateSlug) {
      slug =
        `${slug}-${Date.now()}`;
    }

    const now =
      new Date().toISOString();

    /*
      Якщо новина вперше
      стає опублікованою —
      ставимо дату публікації.

      Якщо вже була опублікована —
      дату зберігаємо.
    */

    let publishedAt =
      currentNews.published_at;

    if (
      published &&
      !currentNews.published
    ) {
      publishedAt =
        now;
    }

    if (!published) {
      publishedAt =
        null;
    }

    const {
      data,
      error,
    } = await supabaseAdmin
      .from("news")
      .update({
        title:
          title.trim(),

        slug,

        excerpt:
          excerpt?.trim() ||
          null,

        content:
          content.trim(),

        category:
          newsCategory,

        image_url:
          image_url?.trim() ||
          null,

        published:
          Boolean(
            published
          ),

        published_at:
          publishedAt,

        updated_at:
          now,
      })
      .eq(
        "id",
        id
      )
      .select(
        `
          id,
          title,
          slug,
          excerpt,
          content,
          category,
          image_url,
          published,
          published_at,
          created_at,
          updated_at
        `
      )
      .single();

    if (error) {
      return NextResponse.json(
        {
          error:
            error.message,
        },
        {
          status: 500,
        }
      );
    }

    return NextResponse.json({
      success: true,

      message:
        published
          ? "Новину оновлено та опубліковано"
          : "Чернетку оновлено",

      news:
        data,
    });
  } catch (error) {
    console.error(
      "ADMIN NEWS PUT ERROR:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Помилка оновлення новини",
      },
      {
        status: 500,
      }
    );
  }
}

/*
  ========================================
  DELETE

  Видалення новини.
  ========================================
*/

export async function DELETE(
  request: Request
) {
  try {
    const body =
      (await request.json()) as NewsBody;

    const {
      password,
      id,
    } = body;

    /*
      ПАРОЛЬ
    */

    if (
      !isValidPassword(password)
    ) {
      return NextResponse.json(
        {
          error:
            "Невірний пароль адміністратора",
        },
        {
          status: 401,
        }
      );
    }

    /*
      ID
    */

    if (!id) {
      return NextResponse.json(
        {
          error:
            "Не вказано ID новини",
        },
        {
          status: 400,
        }
      );
    }

    const {
      error,
    } = await supabaseAdmin
      .from("news")
      .delete()
      .eq(
        "id",
        id
      );

    if (error) {
      return NextResponse.json(
        {
          error:
            error.message,
        },
        {
          status: 500,
        }
      );
    }

    return NextResponse.json({
      success: true,

      message:
        "Новину видалено",
    });
  } catch (error) {
    console.error(
      "ADMIN NEWS DELETE ERROR:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Помилка видалення новини",
      },
      {
        status: 500,
      }
    );
  }
}