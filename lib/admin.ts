import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/auth";

export async function requireAdmin(): Promise<NextResponse | null> {
  if (await isAdminAuthenticated()) return null;
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

export function asStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }
  if (typeof value === "string") {
    return value
      .split(/[\n,]/)
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
}
