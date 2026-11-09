# CLAUDE.md – KoduStuudio project rules

KoduStuudio is an Estonian-language virtual interior design assistant, built as a university homework project. Follow these rules in every task.

## Project overview

1. KoduStuudio is a responsive web application that helps users learn about interior design, furniture placement, lighting, home decoration and colour combinations.
2. **All user-facing interface text must be in Estonian.** (Code, comments and commit messages may be in English.)

## Technology stack (planned)

3. Next.js (App Router), TypeScript, Tailwind CSS, shadcn/ui, Prisma ORM and PostgreSQL.

## Hosting and database

4. The app runs on Railway and is deployed automatically from the `main` branch of this GitHub repository.
5. The PostgreSQL database is hosted on Railway. The app must access it only through the `DATABASE_URL` environment variable.

## Secrets and configuration

6. Never hard-code credentials, passwords, API keys or connection strings.
   - The application must include a `.env.example` file (placeholder values only).
   - `.env` and `.env.local` must be excluded from Git via `.gitignore`.

## Local environment restrictions

7. Do **not** set up a local PostgreSQL database. Do **not** start a local development server.
   - Local Node.js and npm may be used to install dependencies and verify the build.

## Build and Git workflow

8. Once `package.json` and the application exist, run `npm run build` before pushing application changes to GitHub. Fix any build errors before pushing.
9. After each finished development task, prepare a Git commit, but commit and push to GitHub **only with the user's approval**.

## AI functionality

10. The first version uses **mock AI responses** based on prepared interior design data. Do not add paid AI API dependencies unless the user requests them.

## Code quality

11. Keep the implementation understandable, stable and suitable for a university homework project. Prefer simple, readable solutions over clever or over-engineered ones.
