import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import jwt from "jsonwebtoken";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getUserFullProfile, type FullUserProfile } from "@/lib/services/role";
import { AuthProvider } from "@/app/context/AuthContext";
import Header from "@/components/dashboard/Header";
import FloatingDock from "@/components/dashboard/FloatingDock";
import { Plus, AlertTriangle } from "lucide-react";

async function getSessionUser(): Promise<FullUserProfile | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("auth_token")?.value || cookieStore.get("token")?.value;
    if (!token) return null;

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as {
      userID: number;
      tokenVersion: number;
    };

    const [user] = await db.select().from(users).where(eq(users.id, decoded.userID)).limit(1);
    if (!user || user.tokenVersion !== decoded.tokenVersion) return null;

    return await getUserFullProfile(user.id, user.name, user.email);
  } catch {
    return null;
  }
}

export default async function IncidentsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getSessionUser();

  if (!user) {
    redirect("/");
  }

  return (
    <AuthProvider initialUser={user}>
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col transition-colors selection:bg-emerald-500/20 selection:text-emerald-500">
        {/* Sticky Top Header */}
        <Header unreadNotificationsCount={3} />

        {/* Main Route Content */}
        <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 pb-36">
          {children}
        </main>

        {/* Quick Action FAB: Create New Incident -> /incidents/new */}
        <Link
          href="/incidents/new"
          className="fixed bottom-7 left-7 z-50 flex items-center gap-3 px-5 py-3.5 rounded-full bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-950 font-semibold text-xs border border-slate-800 dark:border-slate-200 shadow-xl shadow-slate-950/20 hover:bg-slate-800 dark:hover:bg-white hover:scale-105 active:scale-95 transition-all select-none"
        >
          <div className="flex size-5 items-center justify-center rounded-full bg-emerald-500 text-slate-950">
            <Plus className="size-3.5 stroke-[3]" />
          </div>
          <span className="tracking-wide font-bold">Create New Incident</span>
          <AlertTriangle className="size-4 text-amber-500 opacity-90" />
        </Link>

        {/* Floating Dock Navigation */}
        <FloatingDock />
      </div>
    </AuthProvider>
  );
}
