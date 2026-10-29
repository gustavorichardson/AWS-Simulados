import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/server-auth";
import { SimuladoClient } from "@/components/SimuladoClient";

export const dynamic = "force-dynamic";

export default async function SimuladoPage({
  searchParams,
}: {
  searchParams: Promise<{ resultado?: string; continuar?: string }>;
}) {
  const session = await getServerSession();
  if (!session?.user) redirect("/login?motivo=sessao-expirada");

  const params = await searchParams;
  return (
    <SimuladoClient
      userId={session.user.id}
      initialResultId={typeof params.resultado === "string" ? params.resultado : null}
      initialAttemptId={typeof params.continuar === "string" ? params.continuar : null}
    />
  );
}
