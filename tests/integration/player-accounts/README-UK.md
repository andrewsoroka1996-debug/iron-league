# Iron League — повторювані локальні PostgreSQL інтеграційні тести v2

Цю папку збережено в Git для відтворення **успішного тесту SQL-схеми акаунтів**. Це локальне тестове оточення, **не** повноцінний Supabase Auth або Discord OAuth E2E.

## Мета й середовище

- Локальний PostgreSQL **17.12**, `127.0.0.1:55432`, data directory `C:\Program Files\PostgreSQL\17-IronLeagueTest\data`.
- Робочий репозиторій `C:\Users\Admin\iron-league` (гілка `main`).
- Міграція завантажується **лише з локального** `sql/REVIEW-ONLY-iron-league-player-accounts-prepared.sql`. Він має залишитися **поза Git**, із SHA256 реєстру `data/players.ts`.
- Скрипт створює власну випадкову тимчасову БД `il_smoke_*`, ізольовано від `iron_league_sql_test`; у разі успіху видаляє її, у разі збою залишає для перевірки.
- Скрипт запитує **пароль ЛОКАЛЬНОГО** `postgres`. Жодних Production Supabase ключів чи секретів у файлах немає.

## Запуск після встановлення в репозиторій

Зі звичайного PowerShell 5.1, без прав адміністратора:

```powershell
cd C:\Users\Admin\iron-league
node --test .\tests\integration\player-accounts\03-kit-selfcheck.test.mjs
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\tests\integration\player-accounts\run-local-tests.ps1 -Repo 'C:\Users\Admin\iron-league'
```

Використовуй `-ResumeDatabase` лише при **явно підтвердженій** чистій збереженій `il_smoke_*` БД після невдалого запуску, за інструкцією діагностики. Раніше використана `il_smoke_20261120_180804_87067eee` вже видалена — її **не можна** відновлювати.

## Що перевірено 20.11.2026

Тести з цієї версії пройшли в локальному PostgreSQL 17.12: створення п'яти таблиць, RLS та GRANT, власність заявок, ізоляція користувачів, адміністративні RPC, прив'язка історичних гравців, атомарне схвалення новачка, відмова при дублях ID/нікнеймів і Discord ID, неможливість повторного схвалення, читання лише публічних колонок. Усі інтеграційні перевірки пройшли; тимчасова база після успіху видалена.

## Обмеження й заборони

- `auth.users`, `auth.identities`, `auth.uid()` та ролі **імітуються** скриптом `00-bootstrap.sql`. Це не доказ працездатності реального Discord OAuth, Auth Hook або наскрізного Supabase SDK.
- **Не виконувати** `sql/REVIEW-ONLY-iron-league-player-accounts-prepared.sql` у Production на підставі цих тестів.
- Публічну реєстрацію, Discord Provider, feature flags і міграцію Production **не активовано**. Перед активацією потрібен окремий узгоджений preflight, контрольована інтеграційна перевірка та план резервування/відкату.
- Не додавати до Git `.iron-league-backups/`, `sql/REVIEW-ONLY-iron-league-player-accounts-prepared.sql`, паролі, `.env` або будь-які реальні user IDs.

## Що в папці

`00-bootstrap.sql` — локальний макет Supabase Auth; `02-verify.sql` — перевірки RLS і схвалень; `03-kit-selfcheck.test.mjs` — статичні тести самого набору; `run-local-tests.ps1` — захищений локальний автоматичний запуск.
