import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/server-auth";

export const dynamic = "force-dynamic";

export default async function PublicAuthLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession();
  if (session?.user) redirect("/simulado");
  return <>{children}</>;
}
