import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AppShell } from "@/components/AppShell";
import { cenariosQuery, periodosQuery } from "@/lib/queries";
import { MESES, calcularCenario, nf, nfCompact, pct } from "@/lib/pai";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/comparar")({
  head: () => ({
    meta: [
      { title: "Comparar cenários — PAI" },
      {
        name: "description",
        content: "Compare dois cenários de planejamento avícola lado a lado com alertas e desvios.",
      },
      { property: "og:title", content: "Comparar cenários — PAI" },
      { property: "og:description", content: "Comparação de cenários da cadeia avícola." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CompararPage,
});

function CompararPage() {
  const { data: cenarios = [] } = useQuery(cenariosQuery);
  const { data: periodos = [] } = useQuery(periodosQuery);
  const [aId, setAId] = useState("");
  const [bId, setBId] = useState("");

  const a = cenarios.find((c) => c.id === aId) ?? cenarios[0];
  const b = cenarios.find((c) => c.id === bId) ?? cenarios[1] ?? cenarios[0];

  const ra = useMemo(
    () => (a ? calcularCenario(periodos.filter((p) => p.cenario_id === a.id), a) : null),
    [a, periodos],
  );
  const rb = useMemo(
    () => (b ? calcularCenario(periodos.filter((p) => p.cenario_id === b.id), b) : null),
    [b, periodos],
  );

  const dados =
    ra && rb
      ? ra.linhas.map((l, i) => ({
          mes: MESES[l.mes - 1],
          [a!.nome]: Math.round(l.abate_projetado_kg),
          [b!.nome]: Math.round(rb.linhas[i]?.abate_projetado_kg ?? 0),
        }))
      : [];

  const indicadores =
    ra && rb
      ? [
          { label: "Meta total (kg)", a: ra.totalMeta, b: rb.totalMeta },
          { label: "Abate projetado (kg)", a: ra.totalAbate, b: rb.totalAbate },
          { label: "Aves necessárias", a: ra.totalAves, b: rb.totalAves },
          { label: "Pintos necessários", a: ra.totalPintos, b: rb.totalPintos },
          { label: "Ovos necessários", a: ra.totalOvos, b: rb.totalOvos },
          { label: "Matrizes no pico", a: ra.matrizesPico, b: rb.matrizesPico },
          { label: "Alertas gerados", a: ra.alertas.length, b: rb.alertas.length },
        ]
      : [];

  return (
    <AppShell
      title="Comparação de cenários"
      subtitle="Avalie desvios de necessidade, atendimento e alertas entre duas simulações"
      actions={
        cenarios.length > 1 ? (
          <>
            <Select value={a?.id ?? ""} onValueChange={setAId}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Cenário A" />
              </SelectTrigger>
              <SelectContent>
                {cenarios.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={b?.id ?? ""} onValueChange={setBId}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Cenário B" />
              </SelectTrigger>
              <SelectContent>
                {cenarios.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </>
        ) : null
      }
    >
      {!ra || !rb || !a || !b ? (
        <p className="text-sm text-muted-foreground">
          É preciso ter pelo menos dois cenários para comparar.
        </p>
      ) : (
        <div className="space-y-6">
          <div className="grid gap-4 lg:grid-cols-2">
            {[
              { c: a, r: ra },
              { c: b, r: rb },
            ].map(({ c, r }) => (
              <div key={c.id} className="rounded-sm border border-border bg-card p-5 shadow-panel">
                <div className="flex items-center justify-between">
                  <h2 className="font-display text-base font-semibold">{c.nome}</h2>
                  <Badge variant={r.atendimento >= 0.999 ? "secondary" : "destructive"}>
                    {pct(r.atendimento)} da meta
                  </Badge>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{c.descricao ?? "—"}</p>
                <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <dt className="text-xs text-muted-foreground uppercase">Mortalidade</dt>
                    <dd className="tabular">{pct(Number(c.mortalidade))}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground uppercase">Eclosão</dt>
                    <dd className="tabular">{pct(Number(c.taxa_eclosao))}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground uppercase">Ovos/matriz</dt>
                    <dd className="tabular">{nf(Number(c.ovos_por_matriz))}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground uppercase">Alertas ALTA</dt>
                    <dd className="tabular">
                      {r.alertas.filter((x) => x.severidade === "ALTA").length}
                    </dd>
                  </div>
                </dl>
              </div>
            ))}
          </div>

          <div className="overflow-x-auto rounded-sm border border-border bg-card shadow-panel">
            <table className="tabular w-full text-sm">
              <thead className="bg-secondary text-left text-xs tracking-wide text-secondary-foreground uppercase">
                <tr>
                  <th className="px-4 py-3">Indicador</th>
                  <th className="px-4 py-3 text-right">{a.nome}</th>
                  <th className="px-4 py-3 text-right">{b.nome}</th>
                  <th className="px-4 py-3 text-right">Variação</th>
                </tr>
              </thead>
              <tbody>
                {indicadores.map((i) => {
                  const dif = i.a === 0 ? 0 : (i.b - i.a) / i.a;
                  return (
                    <tr key={i.label} className="border-t border-border">
                      <td className="px-4 py-2">{i.label}</td>
                      <td className="px-4 py-2 text-right">{nf(i.a)}</td>
                      <td className="px-4 py-2 text-right">{nf(i.b)}</td>
                      <td
                        className={`px-4 py-2 text-right ${dif > 0 ? "text-accent-foreground" : dif < 0 ? "text-success" : ""}`}
                      >
                        {dif >= 0 ? "+" : ""}
                        {pct(dif)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="rounded-sm border border-border bg-card p-5 shadow-panel">
            <h2 className="text-sm font-semibold">Abate projetado por mês (kg)</h2>
            <div className="mt-4 h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dados}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="mes" fontSize={12} stroke="var(--muted-foreground)" />
                  <YAxis
                    fontSize={12}
                    stroke="var(--muted-foreground)"
                    tickFormatter={(v: number) => nfCompact(v)}
                  />
                  <Tooltip formatter={(v: number) => nf(v)} />
                  <Legend />
                  <Bar dataKey={a.nome} fill="var(--chart-1)" radius={[2, 2, 0, 0]} />
                  <Bar dataKey={b.nome} fill="var(--chart-2)" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
