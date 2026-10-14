import Link from "next/link";

export const dynamic = "force-dynamic";

export default function AdminShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-full">
      <header className="border-b border-line">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/" className="text-sm font-medium tracking-wide">
            ReplyBird
          </Link>
          <span className="text-xs uppercase tracking-[0.2em] text-muted">Admin</span>
        </div>
      </header>
      {children}
    </div>
  );
}
