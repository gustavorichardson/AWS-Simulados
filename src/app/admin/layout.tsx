import { notFound } from "next/navigation";
import { getServerSession } from "@/lib/server-auth";
import { isAdminUser } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const session = await getServerSession();
  if (!(await isAdminUser(session?.user))) notFound();

  return children;
}
