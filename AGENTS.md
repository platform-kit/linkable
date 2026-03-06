# Tech Stack

- You are building a Vue application.
- Use TypeScript.
- Use Vite.
- Always put source code in the src folder.
- Put pages into src/pages/
- Put components into src/components/
- The main page (default page) is src/pages/Index.tsx
- UPDATE the main page to include the new components. OTHERWISE, the user can NOT see any components!
- ALWAYS try to use the PrimeVue UI library.
- Tailwind CSS: always use Tailwind CSS for styling components. Utilize Tailwind classes extensively for layout, spacing, colors, and other design aspects.

Available packages and libraries:

- The lucide-react package is installed for icons.
- Use prebuilt components from the shadcn/ui library after importing them. Note that these files shouldn't be edited, so make new components if you need to change them.

---

# Content Schema & Migration System

The content data model lives in `src/lib/model.ts` (`BioModel` type). Every persisted JSON file carries a `schemaVersion` number. When the app loads data, `sanitizeModel()` calls `migrateToLatest()` (from `src/lib/migrations.ts`) to auto-upgrade old data to the current schema.

## Rules for changing the data model

Whenever you add, rename, or remove a field on `BioModel`, `BioProfile`, `BioLink`, or `SocialLink`:

1. **Bump `CURRENT_SCHEMA_VERSION`** in `src/lib/migrations.ts` (increment by 1).
2. **Add a migration entry** to the `migrations` array in the same file. The migration function receives the raw JSON object at the previous version and must return it at the new version. Example:

   ```ts
   {
     toVersion: 3,
     migrate: (data) => {
       // add the new field with a sensible default
       data.profile.newField = "default";
       data.schemaVersion = 3;
       return data;
     },
   }
   ```
3. **Update `sanitizeModel()`** in `src/lib/model.ts` so it reads/validates the new field.
4. **Update `defaultModel()`** in `src/lib/model.ts` to include the new field.
5. **Update `default-data.json`** (the template seed file) with the new field and the new `schemaVersion`.
6. **Never delete a migration** — old users may jump multiple versions.

## Content file separation

- `default-data.json` — committed to the repo; generic placeholder content for new users.
- `cms-data.json` / `public/data.json` / `public/uploads/` — gitignored; personal content that lives locally or in a private repo.
- `npm run push` exports local content to a private GitHub repo; `npm run import` pulls it back.

---

# Supabase Database Rules

- **NEVER** use `supabase db reset` or `npm run supabase:reset` — it destroys all data.
- To apply new migrations, **always** use `npm run supabase:migrate:up` (`npx supabase migration up --local`). This applies only pending migrations without touching existing data.
- Never run destructive database commands (DROP TABLE, TRUNCATE, DELETE without WHERE, etc.) without explicit user confirmation.
- When creating new migrations, use `npm run supabase:migrate <name>` to generate the file, then edit it.