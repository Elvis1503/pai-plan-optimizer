import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/AppShell";
import { filiaisQuery, produtosQuery, regioesQuery, planosQuery } from "@/lib/queries";
import { nf, pct } from "@/lib/pai";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/_authenticated/cadastros")({
  head: () => ({
    meta: [
      { title: "Cadastros — PAI" },
      {
        name: "description",
        content: "Empresas, regiões, filiais, produtos e planos usados no planejamento avícola.",
      },
      { property: "og:title", content: "Cadastros — PAI" },
      { property: "og:description", content: "Estrutura corporativa do planejamento avícola." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CadastrosPage,
});

function Tabela({ head, rows }: { head: string[]; rows: (string | number)[][] }) {
  return (
    <div className="overflow-x-auto rounded-sm border border-border bg-card shadow-panel">
      <table className="tabular w-full text-sm">
        <thead className="bg-secondary text-left text-xs tracking-wide text-secondary-foreground uppercase">
          <tr>
            {head.map((h) => (
              <th key={h} className="px-4 py-3">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-t border-border">
              {r.map((c, j) => (
                <td key={j} className="px-4 py-2">
                  {c}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CadastrosPage() {
  const { data: regioes = [] } = useQuery(regioesQuery);
  const { data: filiais = [] } = useQuery(filiaisQuery);
  const { data: produtos = [] } = useQuery(produtosQuery);
  const { data: planos = [] } = useQuery(planosQuery);

  return (
    <AppShell
      title="Cadastros"
      subtitle="Estrutura corporativa que alimenta o planejamento e a simulação"
    >
      <Tabs defaultValue="filiais">
        <TabsList>
          <TabsTrigger value="filiais">Filiais</TabsTrigger>
          <TabsTrigger value="regioes">Regiões</TabsTrigger>
          <TabsTrigger value="produtos">Produtos</TabsTrigger>
          <TabsTrigger value="planos">Planos</TabsTrigger>
        </TabsList>

        <TabsContent value="filiais" className="pt-6">
          <Tabela
            head={["Filial", "Código", "Região", "Capacidade de abate/dia"]}
            rows={filiais.map((f) => [
              f.nome,
              f.codigo ?? "—",
              (f.regioes as { nome: string } | null)?.nome ?? "—",
              nf(f.capacidade_abate_dia),
            ])}
          />
        </TabsContent>

        <TabsContent value="regioes" className="pt-6">
          <Tabela
            head={["Região", "Empresa"]}
            rows={regioes.map((r) => [
              r.nome,
              (r.empresas as { nome: string } | null)?.nome ?? "—",
            ])}
          />
        </TabsContent>

        <TabsContent value="produtos" className="pt-6">
          <Tabela
            head={["Produto", "Peso médio (kg)", "Rendimento"]}
            rows={produtos.map((p) => [
              p.nome,
              nf(Number(p.peso_medio_kg), 2),
              pct(Number(p.rendimento)),
            ])}
          />
        </TabsContent>

        <TabsContent value="planos" className="space-y-3 pt-6">
          {planos.map((p) => (
            <div
              key={p.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-sm border border-border bg-card p-4 shadow-panel"
            >
              <div>
                <p className="font-medium">{p.nome}</p>
                <p className="text-xs text-muted-foreground">
                  Ano {p.ano} · versão {p.versao}
                </p>
              </div>
              <Badge variant={p.status === "aprovado" ? "secondary" : "outline"}>
                {p.status === "aprovado" ? "Aprovado" : "Rascunho"}
              </Badge>
            </div>
          ))}
        </TabsContent>
      </Tabs>
    </AppShell>
  );
}
