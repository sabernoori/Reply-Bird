import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-full">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-3">
          <BirdMark />
          <span className="text-sm font-medium tracking-wide">ReplyBird</span>
        </div>
        <Link
          href="/admin"
          className="rounded-full border border-line px-4 py-1.5 text-sm text-muted transition hover:border-foreground hover:text-foreground"
        >
          Admin
        </Link>
      </header>

      <main className="mx-auto max-w-5xl px-6 pb-24 pt-10">
        <p className="mb-4 text-xs uppercase tracking-[0.25em] text-accent-2">
          Open source · MIT · Serverless
        </p>
        <h1 className="max-w-3xl text-4xl font-semibold leading-tight tracking-tight sm:text-6xl">
          Comment in, private reply out.
        </h1>
        <p className="mt-6 max-w-2xl text-lg leading-8 text-muted">
          ReplyBird watches Instagram comments and inbound DMs, matches keywords
          (including Persian and Arabic text), and sends one official private
          reply. No Redis, no worker process, no queue. Just Next.js on Vercel
          and Neon Postgres.
        </p>

        <div className="mt-10 flex flex-wrap gap-3">
          <Link
            href="/admin"
            className="rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-white"
          >
            Open dashboard
          </Link>
          <a
            href="https://github.com/sabernoori/Reply-Bird"
            className="rounded-full border border-line px-5 py-2.5 text-sm text-muted hover:text-foreground"
          >
            Source
          </a>
        </div>

        <section className="mt-20 grid gap-4 sm:grid-cols-3">
          {[
            {
              title: "Inline webhooks",
              body: "Meta POSTs to /api/webhooks/instagram. Events are processed in the same request, then we return 200.",
            },
            {
              title: "Dedupe first",
              body: "comment_id is inserted before any send. Duplicate deliveries cannot double-DM.",
            },
            {
              title: "One cron, one token",
              body: "A daily Hobby-compatible cron refreshes the long-lived Instagram token into Postgres.",
            },
          ].map((item) => (
            <article key={item.title} className="rounded-2xl border border-line bg-panel p-5">
              <h2 className="text-base font-medium">{item.title}</h2>
              <p className="mt-2 text-sm leading-6 text-muted">{item.body}</p>
            </article>
          ))}
        </section>
      </main>
    </div>
  );
}

function BirdMark() {
  return (
    <svg width="28" height="28" viewBox="0 0 32 32" aria-hidden="true">
      <rect width="32" height="32" rx="8" fill="#e45b43" />
      <path
        d="M7 20c6-1 9-6 10-11 3 4 8 6 12 6-4 3-6 8-6 13-4-3-10-4-16-2z"
        fill="#f4efe6"
      />
    </svg>
  );
}
