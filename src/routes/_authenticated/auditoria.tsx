import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/AppShell";
import { auditoriaQuery } from "@/lib/queries";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/auditoria")({
  head: () => ({
    meta: [
      { title: "Auditoria — PAI" },
      {
        name: "description",
        content: "Trilha de auditoria das operações críticas do planejamento avícola integrado.",
      },
      { property: "og:title", content: "Auditoria — PAI" },
      { property: "og:description", content: "Histórico de operações críticas registradas." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AuditoriaPage,
});

function AuditoriaPage() {
  const { data: registros = [] } = useQuery(auditoriaQuery);

  return (
    <AppShell
      title="Auditoria"
      subtitle="Registro imutável de aprovações, versões e alterações de cenários"
    >
      {registros.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhuma operação registrada até agora.</p>
      ) : (
        <div className="overflow-x-auto rounded-sm border border-border bg-card shadow-panel">
          <table className="tabular w-full text-sm">
            <thead className="bg-secondary text-left text-xs tracking-wide text-secondary-foreground uppercase">
              <tr>
                <th className="px-4 py-3">Data</th>
                <th className="px-4 py-3">Usuário</th>
                <th className="px-4 py-3">Ação</th>
                <th className="px-4 py-3">Entidade</th>
              </tr>
            </thead>
            <tbody>
              {registros.map((r) => (
                <tr key={r.id as string} className="border-t border-border">
                  <td className="px-4 py-2">
                    {new Date(r.created_at as string).toLocaleString("pt-BR")}
                  </td>
                  <td className="px-4 py-2">
                    {(r.profiles as { nome: string | null } | null)?.nome ?? "—"}
                  </td>
                  <td className="px-4 py-2">
                    <Badge variant="outline" className="font-normal">
                      {r.acao as string}
                    </Badge>
                  </td>
                  <td className="px-4 py-2 text-muted-foreground">{r.entidade as string}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AppShell>
  );
}
