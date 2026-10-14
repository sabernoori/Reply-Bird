import { redirect } from "next/navigation";
import { AdminDashboard } from "@/components/admin-dashboard";
import { loadAdminBundle } from "@/lib/admin-data";
import { isAdminAuthenticated } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  if (!(await isAdminAuthenticated())) {
    redirect("/admin/login");
  }

  let data: Awaited<ReturnType<typeof loadAdminBundle>> | null = null;
  let loadError = "";
  try {
    data = await loadAdminBundle();
  } catch {
    loadError = "Could not load admin data. Check DATABASE_URL and run npm run migrate.";
  }

  return (
    <AdminDashboard
      initialRules={data?.rules ?? []}
      initialEvents={data?.events ?? []}
      initialStatus={data?.status ?? null}
      initialError={loadError}
    />
  );
}
