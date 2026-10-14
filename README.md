# ReplyBird

Open-source Instagram **comment-to-DM** auto-reply. Someone comments a keyword on your reel, ReplyBird sends them one official private reply.

Inspired by [OpenReply](https://github.com/diwenne/openreply) (MIT), redesigned to run **fully serverless** on Vercel. No Redis, no BullMQ, no long-running worker. Neon Postgres only.

[![License: MIT](https://img.shields.io/badge/License-MIT-black.svg)](LICENSE)

## Why this shape

OpenReply is a full product: workspaces, a queue, a worker process, Redis. ReplyBird is the same Meta-official comment-to-DM idea for a **single Instagram professional account**, cheap enough for a Vercel Hobby cron and a Neon database.

The first production user is a gold-price app. Nothing about that product is hardcoded — rules, copy, and links live in env vars and the database.

Persian setup walkthrough: [docs/SETUP.fa.md](docs/SETUP.fa.md).

## Features

- Instagram API with Instagram Login (`graph.instagram.com`), not Facebook Page tokens.
- Webhook `GET` verification and `POST` HMAC check (`X-Hub-Signature-256`).
- Events are processed **inline** in the request, then the route returns 200.
- Keyword rules with Persian/Arabic normalization (ي→ی, ك→ک, digits, diacritics, ZWNJ, tatweel).
- Optional “any comment” rule and optional per-post (`media_id`) scope.
- One private reply per matching comment: `POST /{ig-user-id}/messages` with `recipient: { comment_id }`.
- Optional tappable link button, optional rotating public comment replies.
- Unique `comment_id` insert **before** send — duplicate webhook deliveries never double-send ([openreply #69](https://github.com/diwenne/openreply/issues/69)).
- Skips comments from your own account. Respects Instagram’s 7-day private-reply window.
- Optional inbound DM keyword replies inside the 24-hour messaging window.
- Optional Telegram lead report after each sent DM.
- Kill switch: `AUTOREPLY_ENABLED=false` logs matches and sends nothing.
- Event log + a small password-protected admin UI.
- Daily Vercel cron refreshes the long-lived Instagram token into Postgres.

## Stack

- Next.js (App Router, TypeScript), Node runtime for API routes
- Drizzle ORM + `@neondatabase/serverless`
- SQL migrations in `drizzle/`, applied with `npm run migrate`
- Vitest for unit tests

## Quick start

```bash
npm install
cp .env.example .env.local   # fill in values, never commit this file
npm run migrate
npm test
npm run dev
```

Admin UI: [http://localhost:3000/admin](http://localhost:3000/admin) (password = `ADMIN_PASSWORD`).

Webhook (Meta callback URL):

```
https://YOUR_DOMAIN/api/webhooks/instagram
```

Verify token = `IG_VERIFY_TOKEN`. Subscribe to **comments** and **messages**.

## Environment variables

| Name | Required | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | yes | Neon pooled Postgres URL |
| `IG_APP_ID` | yes | Instagram / Meta app id |
| `IG_APP_SECRET` | yes | HMAC secret for webhooks; also used when exchanging tokens |
| `IG_VERIFY_TOKEN` | yes | Hub verify token you type into Meta |
| `IG_ACCESS_TOKEN` | yes | Long-lived Instagram user token (copied into the DB on first use) |
| `IG_USER_ID` | yes | Professional account id (`user_id` from `GET /me`) |
| `ADMIN_PASSWORD` | yes | Admin UI password |
| `AUTOREPLY_ENABLED` | no | Default `true`. `false` logs and does not send |
| `TELEGRAM_BOT_TOKEN` | no | Bot API token; unset = no reports |
| `TELEGRAM_REPORT_CHAT_ID` | no | Chat that receives lead reports |
| `CRON_SECRET` | no | If set, cron route requires `Authorization: Bearer …` |
| `IG_GRAPH_API_VERSION` | no | Default `v23.0` |

Never commit `.env`, `.env.local`, or tokens.

## How a comment becomes a DM

1. Instagram delivers a `comments` webhook to `/api/webhooks/instagram`.
2. ReplyBird verifies `X-Hub-Signature-256` with `IG_APP_SECRET`.
3. Own-account comments and comments older than 7 days are skipped.
4. Enabled rules are matched against normalized text (and optional `media_id`).
5. On match, a row is inserted into `processed_comments` (`comment_id` primary key). A unique-violation means this delivery is a duplicate — stop.
6. Unless the kill switch is on, send **one** private reply. Optionally post a public reply and notify Telegram.
7. Return 200 so Meta does not retry the whole batch.

Inbound DMs use the same keyword matcher when a rule has “also auto-reply to DMs” enabled.

## Deploy on Vercel

1. Create a Neon project and run `npm run migrate` against its `DATABASE_URL`.
2. Import this GitHub repo into Vercel. Do **not** skip env vars.
3. Paste every variable from `.env.example` into the Vercel project.
4. Deploy. Confirm `GET /api/health`.
5. In Meta, set the callback URL to `https://<your-app>.vercel.app/api/webhooks/instagram`.
6. `vercel.json` already registers a daily cron at `/api/cron/refresh-token`.

Full Meta + Neon + Vercel steps in Persian: [docs/SETUP.fa.md](docs/SETUP.fa.md).

## Scripts

| Script | What it does |
| --- | --- |
| `npm run dev` | Local Next.js server |
| `npm run build` | Production build |
| `npm test` | Unit tests (normalize, match, signature, dedupe) |
| `npm run migrate` | Apply SQL files in `drizzle/` |
| `npm run db:generate` | Optional Drizzle Kit generate |

## License

MIT. See [LICENSE](LICENSE).

ReplyBird is a new codebase. It borrows the *product idea* and several Meta API details from OpenReply, which is also MIT-licensed. It does not include OpenReply’s worker, Redis, or SaaS dashboard.
