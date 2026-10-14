"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminLoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setError("");
    const response = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    setPending(false);
    if (!response.ok) {
      setError("Wrong password.");
      return;
    }
    router.push("/admin");
    router.refresh();
  }

  return (
    <div className="flex min-h-full items-center justify-center px-6">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-sm rounded-2xl border border-line bg-panel p-6"
      >
        <h1 className="text-xl font-semibold">ReplyBird admin</h1>
        <p className="mt-1 text-sm text-muted">Password is ADMIN_PASSWORD.</p>
        <label className="mt-6 block text-sm text-muted">
          Password
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="mt-2 w-full rounded-xl border border-line bg-background px-3 py-2 text-foreground outline-none focus:border-accent"
            autoFocus
            required
          />
        </label>
        {error ? <p className="mt-3 text-sm text-accent">{error}</p> : null}
        <button
          type="submit"
          disabled={pending}
          className="mt-6 w-full rounded-full bg-accent py-2.5 text-sm font-medium text-white disabled:opacity-60"
        >
          {pending ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </div>
  );
}
