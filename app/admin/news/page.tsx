"use client";

import {
  FormEvent,
  useState,
} from "react";

/*
  ========================================
  TYPES
  ========================================
*/

type NewsItem = {
  id: string;

  title: string;

  slug: string;

  excerpt:
    | string
    | null;

  content: string;

  category: string;

  image_url:
    | string
    | null;

  published: boolean;

  published_at:
    | string
    | null;

  created_at: string;

  updated_at: string;
};

/*
  ========================================
  КАТЕГОРІЇ
  ========================================
*/

const categories = [
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
  PAGE
  ========================================
*/

export default function AdminNewsPage() {
  /*
    ========================================
    ADMIN
    ========================================
  */

  const [
    password,
    setPassword,
  ] = useState("");

  /*
    ========================================
    СПИСОК НОВИН
    ========================================
  */

  const [
    news,
    setNews,
  ] = useState<
    NewsItem[]
  >([]);

  const [
    listLoaded,
    setListLoaded,
  ] = useState(false);

  /*
    ========================================
    FORM
    ========================================
  */

  const [
    editingId,
    setEditingId,
  ] = useState<
    string | null
  >(null);

  const [
    title,
    setTitle,
  ] = useState("");

  const [
    slug,
    setSlug,
  ] = useState("");

  const [
    excerpt,
    setExcerpt,
  ] = useState("");

  const [
    content,
    setContent,
  ] = useState("");

  const [
    category,
    setCategory,
  ] = useState(
    "Оголошення"
  );

  /*
    ========================================
    IMAGE
    ========================================
  */

  const [
    imageUrl,
    setImageUrl,
  ] = useState("");

  const [
    imageFile,
    setImageFile,
  ] = useState<
    File | null
  >(null);

  const [
    imageUploading,
    setImageUploading,
  ] = useState(false);

  /*
    ========================================
    UI
    ========================================
  */

  const [
    loading,
    setLoading,
  ] = useState(false);

  const [
    message,
    setMessage,
  ] = useState("");

  /*
    ========================================
    ОЧИЩЕННЯ ФОРМИ
    ========================================
  */

  function resetForm() {
    setEditingId(null);

    setTitle("");

    setSlug("");

    setExcerpt("");

    setContent("");

    setCategory(
      "Оголошення"
    );

    setImageUrl("");

    setImageFile(null);
  }

  /*
    ========================================
    ЗАВАНТАЖЕННЯ НОВИН
    ========================================
  */

  async function loadNews(
    showMessage = true
  ) {
    if (!password) {
      setMessage(
        "Введіть пароль адміністратора"
      );

      return;
    }

    setLoading(true);

    if (showMessage) {
      setMessage("");
    }

    try {
      const response =
        await fetch(
          "/api/admin/news",
          {
            method:
              "GET",

            cache:
              "no-store",

            headers: {
              "x-admin-password":
                password,
            },
          }
        );

      const result =
        await response.json();

      if (!response.ok) {
        setMessage(
          result.error ??
            "Не вдалося завантажити новини"
        );

        return;
      }

      setNews(
        result.news ??
          []
      );

      setListLoaded(true);

      if (showMessage) {
        setMessage(
          "✅ Новини завантажено"
        );
      }
    } catch {
      setMessage(
        "Помилка з'єднання із сервером"
      );
    } finally {
      setLoading(false);
    }
  }

  /*
    ========================================
    ЗАВАНТАЖЕННЯ ЗОБРАЖЕННЯ
    ========================================
  */

  async function uploadImage() {
    if (!password) {
      setMessage(
        "Введіть пароль адміністратора"
      );

      return;
    }

    if (!imageFile) {
      setMessage(
        "Спочатку оберіть зображення"
      );

      return;
    }

    setImageUploading(true);

    setMessage("");

    try {
      const formData =
        new FormData();

      formData.append(
        "password",
        password
      );

      formData.append(
        "file",
        imageFile
      );

      const response =
        await fetch(
          "/api/admin/news-image",
          {
            method:
              "POST",

            body:
              formData,
          }
        );

      const result =
        await response.json();

      if (!response.ok) {
        setMessage(
          result.error ??
            "Не вдалося завантажити зображення"
        );

        return;
      }

      setImageUrl(
        result.url
      );

      setImageFile(null);

      setMessage(
        "✅ Зображення завантажено"
      );
    } catch {
      setMessage(
        "Помилка з'єднання із сервером"
      );
    } finally {
      setImageUploading(false);
    }
  }

  /*
    ========================================
    РЕДАГУВАННЯ
    ========================================
  */

  function editNews(
    item: NewsItem
  ) {
    setEditingId(
      item.id
    );

    setTitle(
      item.title
    );

    setSlug(
      item.slug
    );

    setExcerpt(
      item.excerpt ??
        ""
    );

    setContent(
      item.content
    );

    setCategory(
      item.category
    );

    setImageUrl(
      item.image_url ??
        ""
    );

    setImageFile(null);

    setMessage("");

    window.scrollTo({
      top: 0,
      behavior:
        "smooth",
    });
  }

  /*
    ========================================
    CREATE / UPDATE
    ========================================
  */

  async function saveNews(
    published: boolean
  ) {
    if (!password) {
      setMessage(
        "Введіть пароль адміністратора"
      );

      return;
    }

    if (!title.trim()) {
      setMessage(
        "Введіть заголовок новини"
      );

      return;
    }

    if (!content.trim()) {
      setMessage(
        "Введіть текст новини"
      );

      return;
    }

    setLoading(true);

    setMessage("");

    try {
      const response =
        await fetch(
          "/api/admin/news",
          {
            method:
              editingId
                ? "PUT"
                : "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                password,

                id:
                  editingId ??
                  undefined,

                title,

                slug,

                excerpt,

                content,

                category,

                image_url:
                  imageUrl,

                published,
              }),
          }
        );

      const result =
        await response.json();

      if (!response.ok) {
        setMessage(
          result.error ??
            "Не вдалося зберегти новину"
        );

        return;
      }

      const successMessage =
        `✅ ${
          result.message ??
          "Новину збережено"
        }`;

      resetForm();

      await loadNews(
        false
      );

      setMessage(
        successMessage
      );
    } catch {
      setMessage(
        "Помилка з'єднання із сервером"
      );
    } finally {
      setLoading(false);
    }
  }

  /*
    ========================================
    SUBMIT DRAFT
    ========================================
  */

  function submitDraft(
    event:
      FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    void saveNews(
      false
    );
  }

  /*
    ========================================
    DELETE
    ========================================
  */

  async function deleteNews(
    item: NewsItem
  ) {
    if (!password) {
      setMessage(
        "Введіть пароль адміністратора"
      );

      return;
    }

    const confirmed =
      window.confirm(
        `Видалити новину "${item.title}"?`
      );

    if (!confirmed) {
      return;
    }

    setLoading(true);

    setMessage("");

    try {
      const response =
        await fetch(
          "/api/admin/news",
          {
            method:
              "DELETE",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                password,

                id:
                  item.id,
              }),
          }
        );

      const result =
        await response.json();

      if (!response.ok) {
        setMessage(
          result.error ??
            "Не вдалося видалити новину"
        );

        return;
      }

      if (
        editingId ===
        item.id
      ) {
        resetForm();
      }

      await loadNews(
        false
      );

      setMessage(
        "✅ Новину видалено"
      );
    } catch {
      setMessage(
        "Помилка з'єднання із сервером"
      );
    } finally {
      setLoading(false);
    }
  }

  /*
    ========================================
    DATE
    ========================================
  */

  function formatDate(
    date:
      | string
      | null
  ) {
    if (!date) {
      return "—";
    }

    return new Date(
      date
    ).toLocaleString(
      "uk-UA",
      {
        day:
          "2-digit",

        month:
          "2-digit",

        year:
          "numeric",

        hour:
          "2-digit",

        minute:
          "2-digit",
      }
    );
  }

  /*
    ========================================
    RETURN
    ========================================
  */

  return (
    <main className="min-h-screen bg-[#030711] text-white">
      {/* HEADER */}

      <header className="border-b border-white/10 bg-[#030711]">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-5">
          <div>
            <div className="font-black tracking-[0.18em]">
              IRON LEAGUE
            </div>

            <div className="mt-1 text-xs text-white/40">
              Керування новинами
            </div>
          </div>

          <div className="flex flex-wrap gap-4">
            <a
              href="/admin"
              className="font-bold text-blue-300"
            >
              ← Адмінка
            </a>

            <a
              href="/news"
              className="font-bold text-white/40 transition hover:text-white"
            >
              Новини
            </a>

            <a
              href="/"
              className="font-bold text-white/40 transition hover:text-white"
            >
              На сайт
            </a>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl space-y-12 px-6 py-12">
        {/* TITLE */}

        <section>
          <div className="text-xs font-black uppercase tracking-[0.25em] text-blue-400">
            Адміністрування
          </div>

          <h1 className="mt-3 text-4xl font-black">
            Новини Iron League
          </h1>

          <p className="mt-3 max-w-3xl leading-7 text-white/40">
            Створення,
            редагування,
            публікація та
            видалення офіційних
            новин ліги.
          </p>
        </section>

        {/* PASSWORD */}

        <section className="rounded-3xl border border-white/10 bg-[#07101d] p-6">
          <div className="text-sm font-black uppercase tracking-[0.18em] text-blue-300">
            Доступ
          </div>

          <div className="mt-5 flex flex-col gap-4 sm:flex-row">
            <input
              type="password"
              value={
                password
              }
              onChange={(
                event
              ) =>
                setPassword(
                  event.target
                    .value
                )
              }
              placeholder="Пароль адміністратора"
              className="min-w-0 flex-1 rounded-xl border border-white/10 bg-[#030711] px-4 py-3 outline-none transition focus:border-blue-400/50"
            />

            <button
              type="button"
              onClick={() =>
                void loadNews()
              }
              disabled={
                loading
              }
              className="rounded-xl bg-blue-500 px-6 py-3 font-black transition hover:bg-blue-400 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading
                ? "Завантаження..."
                : "Завантажити новини"}
            </button>
          </div>
        </section>

        {/* FORM */}

        <section className="rounded-3xl border border-white/10 bg-[#07101d] p-6 sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="text-xs font-black uppercase tracking-[0.24em] text-blue-400">
                Редактор
              </div>

              <h2 className="mt-2 text-3xl font-black">
                {editingId
                  ? "Редагування новини"
                  : "Створити новину"}
              </h2>
            </div>

            {editingId && (
              <button
                type="button"
                onClick={
                  resetForm
                }
                className="rounded-xl border border-white/10 px-4 py-2 text-sm font-bold text-white/50 transition hover:bg-white/5 hover:text-white"
              >
                Скасувати
                редагування
              </button>
            )}
          </div>

          <form
            className="mt-8 space-y-6"
            onSubmit={
              submitDraft
            }
          >
            {/* TITLE */}

            <div>
              <label className="mb-2 block text-sm font-bold text-white/60">
                Заголовок *
              </label>

              <input
                type="text"
                value={
                  title
                }
                onChange={(
                  event
                ) =>
                  setTitle(
                    event.target
                      .value
                  )
                }
                placeholder="Наприклад: Відбулося жеребкування Ліги чемпіонів"
                className="w-full rounded-xl border border-white/10 bg-[#030711] px-4 py-3 outline-none transition focus:border-blue-400/50"
              />
            </div>

            {/* CATEGORY + SLUG */}

            <div className="grid gap-5 lg:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-bold text-white/60">
                  Категорія
                </label>

                <select
                  value={
                    category
                  }
                  onChange={(
                    event
                  ) =>
                    setCategory(
                      event.target
                        .value
                    )
                  }
                  className="w-full rounded-xl border border-white/10 bg-[#030711] px-4 py-3 outline-none transition focus:border-blue-400/50"
                >
                  {categories.map(
                    (
                      item
                    ) => (
                      <option
                        key={
                          item
                        }
                        value={
                          item
                        }
                      >
                        {item}
                      </option>
                    )
                  )}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-bold text-white/60">
                  URL / slug
                </label>

                <input
                  type="text"
                  value={
                    slug
                  }
                  onChange={(
                    event
                  ) =>
                    setSlug(
                      event.target
                        .value
                    )
                  }
                  placeholder="Можна залишити порожнім"
                  className="w-full rounded-xl border border-white/10 bg-[#030711] px-4 py-3 outline-none transition focus:border-blue-400/50"
                />

                <div className="mt-2 text-xs text-white/25">
                  Якщо поле
                  порожнє, адреса
                  буде сформована
                  автоматично.
                </div>
              </div>
            </div>

            {/* EXCERPT */}

            <div>
              <label className="mb-2 block text-sm font-bold text-white/60">
                Короткий опис
              </label>

              <textarea
                value={
                  excerpt
                }
                onChange={(
                  event
                ) =>
                  setExcerpt(
                    event.target
                      .value
                  )
                }
                rows={3}
                placeholder="Короткий текст для картки новини..."
                className="w-full resize-y rounded-xl border border-white/10 bg-[#030711] px-4 py-3 outline-none transition focus:border-blue-400/50"
              />
            </div>

            {/* CONTENT */}

            <div>
              <label className="mb-2 block text-sm font-bold text-white/60">
                Повний текст *
              </label>

              <textarea
                value={
                  content
                }
                onChange={(
                  event
                ) =>
                  setContent(
                    event.target
                      .value
                  )
                }
                rows={12}
                placeholder="Повний текст новини..."
                className="w-full resize-y rounded-xl border border-white/10 bg-[#030711] px-4 py-3 leading-7 outline-none transition focus:border-blue-400/50"
              />
            </div>

            {/* IMAGE */}

            <div>
              <label className="mb-2 block text-sm font-bold text-white/60">
                Зображення новини
              </label>

              <div className="rounded-2xl border border-white/10 bg-[#030711] p-5">
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(
                    event
                  ) => {
                    const file =
                      event
                        .target
                        .files?.[0] ??
                      null;

                    setImageFile(
                      file
                    );
                  }}
                  className="block w-full text-sm text-white/45 file:mr-4 file:rounded-xl file:border-0 file:bg-blue-500/10 file:px-4 file:py-2.5 file:font-black file:text-blue-300 hover:file:bg-blue-500/20"
                />

                {imageFile && (
                  <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white/50">
                    Обрано:{" "}
                    <span className="font-bold text-white/70">
                      {
                        imageFile.name
                      }
                    </span>

                    <span className="ml-3 text-white/25">
                      {(
                        imageFile.size /
                        1024 /
                        1024
                      ).toFixed(
                        2
                      )}{" "}
                      MB
                    </span>
                  </div>
                )}

                <div className="mt-4 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() =>
                      void uploadImage()
                    }
                    disabled={
                      !imageFile ||
                      imageUploading
                    }
                    className="rounded-xl bg-blue-500 px-5 py-3 font-black transition hover:bg-blue-400 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {imageUploading
                      ? "Завантаження..."
                      : "Завантажити зображення"}
                  </button>

                  {imageFile && (
                    <button
                      type="button"
                      onClick={() =>
                        setImageFile(
                          null
                        )
                      }
                      disabled={
                        imageUploading
                      }
                      className="rounded-xl border border-white/10 px-5 py-3 font-bold text-white/45 transition hover:bg-white/5 hover:text-white"
                    >
                      Скасувати вибір
                    </button>
                  )}

                  {imageUrl && (
                    <button
                      type="button"
                      onClick={() => {
                        setImageUrl(
                          ""
                        );

                        setImageFile(
                          null
                        );
                      }}
                      className="rounded-xl border border-red-400/20 bg-red-500/10 px-5 py-3 font-bold text-red-300 transition hover:bg-red-500/20"
                    >
                      Прибрати зображення
                    </button>
                  )}
                </div>

                <div className="mt-4 text-xs leading-5 text-white/25">
                  JPG, PNG або WEBP.
                  Максимальний розмір —
                  10 MB.
                </div>
              </div>

              {/* PREVIEW */}

              {imageUrl && (
                <div className="mt-5 overflow-hidden rounded-2xl border border-white/10 bg-[#030711]">
                  <div className="border-b border-white/10 px-5 py-3">
                    <div className="text-xs font-black uppercase tracking-[0.18em] text-blue-400">
                      Попередній перегляд
                    </div>
                  </div>

                  <img
                    src={
                      imageUrl
                    }
                    alt="Попередній перегляд"
                    className="max-h-[480px] w-full object-cover"
                  />

                  <div className="border-t border-white/10 px-5 py-3 text-xs text-white/25">
                    Зображення
                    успішно
                    завантажене у
                    Supabase Storage.
                  </div>
                </div>
              )}
            </div>

            {/* BUTTONS */}

            <div className="flex flex-wrap gap-4 border-t border-white/10 pt-6">
              <button
                type="submit"
                disabled={
                  loading ||
                  imageUploading
                }
                className="rounded-xl border border-white/15 bg-white/[0.05] px-6 py-3 font-black transition hover:bg-white/[0.10] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {editingId
                  ? "Зберегти як чернетку"
                  : "Зберегти чернетку"}
              </button>

              <button
                type="button"
                disabled={
                  loading ||
                  imageUploading
                }
                onClick={() =>
                  void saveNews(
                    true
                  )
                }
                className="rounded-xl bg-blue-500 px-7 py-3 font-black shadow-[0_0_25px_rgba(59,130,246,0.20)] transition hover:bg-blue-400 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {editingId
                  ? "Опублікувати зміни"
                  : "Опублікувати"}
              </button>
            </div>
          </form>
        </section>

        {/* MESSAGE */}

        {message && (
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-center font-semibold">
            {message}
          </div>
        )}

        {/* LIST */}

        <section>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <div className="text-xs font-black uppercase tracking-[0.24em] text-blue-400">
                Матеріали
              </div>

              <h2 className="mt-2 text-3xl font-black">
                Усі новини
              </h2>
            </div>

            {listLoaded && (
              <div className="text-sm text-white/30">
                Всього:{" "}
                {news.length}
              </div>
            )}
          </div>

          {!listLoaded ? (
            <div className="mt-8 rounded-3xl border border-dashed border-white/10 bg-white/[0.02] px-8 py-12 text-center text-white/30">
              Введіть пароль і
              натисніть
              «Завантажити
              новини».
            </div>
          ) : news.length ===
            0 ? (
            <div className="mt-8 rounded-3xl border border-white/10 bg-[#07101d] px-8 py-12 text-center">
              <div className="text-2xl font-black">
                Новин ще немає
              </div>

              <div className="mt-3 text-sm text-white/35">
                Створіть першу
                новину Iron
                League.
              </div>
            </div>
          ) : (
            <div className="mt-8 grid gap-5">
              {news.map(
                (item) => (
                  <article
                    key={
                      item.id
                    }
                    className="overflow-hidden rounded-3xl border border-white/10 bg-[#07101d]"
                  >
                    <div className="grid md:grid-cols-[220px_1fr]">
                      {/* IMAGE */}

                      <div className="min-h-[180px] bg-[#030711]">
                        {item.image_url ? (
                          <img
                            src={
                              item.image_url
                            }
                            alt={
                              item.title
                            }
                            className="h-full min-h-[180px] w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full min-h-[180px] items-center justify-center bg-gradient-to-br from-blue-500/10 to-transparent">
                            <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-blue-400/20 bg-blue-500/10 text-xl font-black text-blue-300">
                              IL
                            </div>
                          </div>
                        )}
                      </div>

                      {/* INFO */}

                      <div className="p-6">
                        <div className="flex flex-wrap items-center gap-3">
                          <span className="rounded-full border border-blue-400/20 bg-blue-500/10 px-3 py-1 text-xs font-black text-blue-300">
                            {
                              item.category
                            }
                          </span>

                          {item.published ? (
                            <span className="rounded-full border border-green-400/20 bg-green-500/10 px-3 py-1 text-xs font-black text-green-300">
                              Опубліковано
                            </span>
                          ) : (
                            <span className="rounded-full border border-yellow-400/20 bg-yellow-500/10 px-3 py-1 text-xs font-black text-yellow-300">
                              Чернетка
                            </span>
                          )}
                        </div>

                        <h3 className="mt-4 text-2xl font-black">
                          {
                            item.title
                          }
                        </h3>

                        {item.excerpt && (
                          <p className="mt-3 line-clamp-2 leading-6 text-white/40">
                            {
                              item.excerpt
                            }
                          </p>
                        )}

                        <div className="mt-4 text-xs leading-6 text-white/25">
                          <div>
                            slug:{" "}
                            {
                              item.slug
                            }
                          </div>

                          <div>
                            Створено:{" "}
                            {formatDate(
                              item.created_at
                            )}
                          </div>

                          {item.published_at && (
                            <div>
                              Опубліковано:{" "}
                              {formatDate(
                                item.published_at
                              )}
                            </div>
                          )}
                        </div>

                        <div className="mt-6 flex flex-wrap gap-3 border-t border-white/10 pt-5">
                          <button
                            type="button"
                            onClick={() =>
                              editNews(
                                item
                              )
                            }
                            className="rounded-xl border border-blue-400/20 bg-blue-500/10 px-4 py-2 text-sm font-black text-blue-300 transition hover:bg-blue-500/20"
                          >
                            Редагувати
                          </button>

                          {item.published && (
                            <a
                              href={`/news/${item.slug}`}
                              target="_blank"
                              rel="noreferrer"
                              className="rounded-xl border border-white/10 px-4 py-2 text-sm font-black text-white/50 transition hover:bg-white/5 hover:text-white"
                            >
                              Відкрити
                            </a>
                          )}

                          <button
                            type="button"
                            onClick={() =>
                              void deleteNews(
                                item
                              )
                            }
                            className="rounded-xl border border-red-400/20 bg-red-500/10 px-4 py-2 text-sm font-black text-red-300 transition hover:bg-red-500/20"
                          >
                            Видалити
                          </button>
                        </div>
                      </div>
                    </div>
                  </article>
                )
              )}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}