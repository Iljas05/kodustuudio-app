# KoduStuudio

KoduStuudio is an Estonian-language virtual interior design assistant, built as a university homework project.
Users chat with the assistant about furniture placement, lighting, colours and decoration. The interface is entirely in Estonian.

> **This is a shared, public educational demo.** There is no login. All conversations, messages and custom
> system prompts are visible to, and can be changed or deleted by, every visitor. Do not enter personal or confidential information.

## Features

- **Chat assistant** with saved conversation history (create, open, delete), stored in PostgreSQL and shared across devices.
- **Mock AI**: replies are chosen from 96 prepared interior design tips (`data/kodustuudio_sisustusnouanded.csv`) by deterministic keyword matching. No real AI model or paid API is used.
- **Simulated settings**: model selection (GPT-4 / Claude / Local Llama), Temperature and Top-P. They are saved per conversation but are for demonstration only and do not change the replies.
- **System prompts**: six protected built-in prompts (Lühike, Üksikasjalik, Algajasõbralik, Coder, Writer, Math) plus custom prompts that anyone can create, edit and delete. Only Lühike, Üksikasjalik and Algajasõbralik change the reply format.
- **Demo file attachments** (JPG, PNG, WebP, PDF, TXT, up to 5 MB): only the file name, type and size are stored. File contents are never uploaded.
- **Tips page** (`/nouanded`): read-only browser for all tips, filterable by room and topic.
- Responsive layout for desktop and mobile.

## Technology

Next.js (App Router), TypeScript, Tailwind CSS, shadcn/ui, Lucide icons, Prisma ORM and PostgreSQL on Railway.

## How the mock AI works

`src/lib/mock-ai.ts` normalises the question (lowercase, no punctuation, Estonian word-form rules in `src/lib/text.ts`) and scores every tip
against its CSV keywords. Rare keywords weigh more, full keyword phrases get a bonus, and room/category matches add a little. A tip needs real
keyword evidence to qualify, so vague questions get a friendly fallback with example questions instead of an irrelevant answer. The top 1–2 tips
are returned, and the same question always gives the same answer.

## Project structure

| Path | Purpose |
| --- | --- |
| `data/kodustuudio_sisustusnouanded.csv` | The 96 tips (single source of truth, not copied into the database) |
| `prisma/schema.prisma`, `prisma/migrations/`, `prisma/seed.ts` | Database schema, SQL migration, idempotent seed of the built-in prompts |
| `src/app/api/` | API routes: conversations, messages, prompts, health check |
| `src/lib/` | CSV loader, mock AI, validation, rate limiting, database helper |
| `src/components/` | Chat interface and tips page components |
| `scripts/` | Self-check scripts (`npm test`) |

## Configuration

The only environment variable is `DATABASE_URL` (PostgreSQL connection string). It is provided by Railway; never commit real values.
See `.env.example` for the placeholder. `.env` and `.env.local` are git-ignored.

## Local development

This project is set up so that **no local PostgreSQL database and no local development server are needed**.

```bash
npm install     # install dependencies
npm run build   # production build; works without DATABASE_URL
npm test        # mock AI and validation self-checks (no database needed)
npm run lint
```

## Database and migrations

The initial migration was generated without a database connection:

```bash
npx prisma migrate diff --from-empty --to-schema prisma/schema.prisma --script --output prisma/migrations/<timestamp>_init/migration.sql
```

For later schema changes, generate a new migration the same way (comparing the previous schema to the new one) and commit it.
On Railway the migration is applied automatically by the start command.

## Deploying on Railway

1. Create a Railway project with a **PostgreSQL** service and a service for this GitHub repository (branch `main`).
2. In the app service, add the variable `DATABASE_URL` as a *reference* to the PostgreSQL service's `DATABASE_URL`.
3. Railway builds with `npm run build` (`prisma generate && next build`) and starts with `npm start`, which runs
   `prisma migrate deploy && prisma db seed && next start`. This applies pending migrations, upserts the six built-in prompts
   (existing conversations, messages and custom prompts are never touched) and starts the server on Railway's `PORT`.
4. `railway.json` sets `/api/health` as the health check. After the first deploy, open `/api/health`: it should return `{"status":"ok","database":"ok"}`.

## Abuse protection (shared demo)

Messages are limited to 2,000 characters; the workspace holds at most 50 conversations, 200 messages per conversation and 20 custom prompts
(new data is refused when a limit is reached, nothing is deleted automatically). Requests are rate-limited per visitor with a simple in-memory
limiter, which resets when the app restarts.

## Known limitations

- Without login, anyone can delete any conversation or custom prompt. This is acceptable only for a public demo.
- The rate limiter is in memory and keyed on the forwarded client address, so it is a basic safeguard, not a security boundary.
- The assistant only knows the 96 tips. Unusual wording or rare word forms may fall back to the example-questions reply.
