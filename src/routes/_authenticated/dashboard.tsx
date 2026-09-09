import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  ComposedChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AlertTriangle, Egg, Factory, Target } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { cenariosQuery, periodosQuery, planosQuery } from "@/lib/queries";
import { calcularCenario, MESES, nfCompact, pct, nf } from "@/lib/pai";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboards — PAI" },
      {
        name: "description",
        content: "Visão executiva, operacional e estratégica do planejamento avícola integrado.",
      },
      { property: "og:title", content: "Dashboards — PAI" },
      { property: "og:description", content: "Indicadores do planejamento avícola integrado." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: DashboardPage,
});

function Kpi({
  icon: Icon,
  label,
  valor,
  detalhe,
  tom = "default",
}: {
  icon: typeof Target;
  label: string;
  valor: string;
  detalhe?: string;
  tom?: "default" | "alerta" | "ok";
}) {
  return (
    <div className="rounded-sm border border-border bg-card p-5 shadow-panel">
      <div className="flex items-center justify-between">
        <span className="text-xs tracking-wide text-muted-foreground uppercase">{label}</span>
        <Icon
          className={
            tom === "alerta"
              ? "size-4 text-destructive"
              : tom === "ok"
                ? "size-4 text-success"
                : "size-4 text-muted-foreground"
          }
        />
      </div>
      <p className="tabular mt-3 font-display text-2xl font-bold text-foreground">{valor}</p>
      {detalhe ? <p className="mt-1 text-xs text-muted-foreground">{detalhe}</p> : null}
    </div>
  );
}

function DashboardPage() {
  const { data: planos = [] } = useQuery(planosQuery);
  const { data: cenarios = [] } = useQuery(cenariosQuery);
  const { data: periodos = [] } = useQuery(periodosQuery);
  const [cenarioId, setCenarioId] = useState<string>("");

  const cenario = cenarios.find((c) => c.id === cenarioId) ?? cenarios[0];
  const plano = planos.find((p) => p.id === cenario?.plano_id);

  const resultado = useMemo(() => {
    if (!cenario) return null;
    return calcularCenario(
      periodos.filter((p) => p.cenario_id === cenario.id),
      cenario,
    );
  }, [cenario, periodos]);

  const dados =
    resultado?.linhas.map((l) => ({
      mes: MESES[l.mes - 1],
      Meta: Math.round(l.meta_abate_kg),
      Projetado: Math.round(l.abate_projetado_kg),
      Ovos: Math.round(l.ovos_necessarios),
      Pintos: Math.round(l.pintos_necessarios),
      Matrizes: Math.round(l.matrizes_necessarias),
      Atendimento: Number((l.atendimento * 100).toFixed(1)),
    })) ?? [];

  const alertasAltos = resultado?.alertas.filter((a) => a.severidade === "ALTA").length ?? 0;

  return (
    <AppShell
      title="Dashboards"
      subtitle={
        cenario
          ? `${plano?.nome ?? "Plano"} · ${cenario.nome}`
          : "Nenhum cenário disponível ainda"
      }
      actions={
        cenarios.length > 0 ? (
          <Select value={cenario?.id ?? ""} onValueChange={setCenarioId}>
            <SelectTrigger className="w-60">
              <SelectValue placeholder="Cenário" />
            </SelectTrigger>
            <SelectContent>
              {cenarios.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : null
      }
    >
      {!resultado ? (
        <p className="text-sm text-muted-foreground">
          Cadastre um cenário no simulador para ver os indicadores.
        </p>
      ) : (
        <Tabs defaultValue="executivo">
          <TabsList>
            <TabsTrigger value="executivo">Executivo</TabsTrigger>
            <TabsTrigger value="operacional">Operacional</TabsTrigger>
            <TabsTrigger value="estrategico">Estratégico</TabsTrigger>
          </TabsList>

          <TabsContent value="executivo" className="space-y-6 pt-6">
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <Kpi
                icon={Target}
                label="Meta de abate (ano)"
                valor={`${nfCompact(resultado.totalMeta)} kg`}
              />
              <Kpi
                icon={Factory}
                label="Abate projetado"
                valor={`${nfCompact(resultado.totalAbate)} kg`}
                detalhe={`Atendimento de ${pct(resultado.atendimento)}`}
                tom={resultado.atendimento >= 0.999 ? "ok" : "alerta"}
              />
              <Kpi
                icon={Egg}
                label="Ovos necessários"
                valor={nfCompact(resultado.totalOvos)}
                detalhe={`${nfCompact(resultado.matrizesPico)} matrizes no pico`}
              />
              <Kpi
                icon={AlertTriangle}
                label="Alertas de alta severidade"
                valor={nf(alertasAltos)}
                detalhe={`${resultado.alertas.length} alertas no total`}
                tom={alertasAltos > 0 ? "alerta" : "ok"}
              />
            </div>

            <div className="rounded-sm border border-border bg-card p-5 shadow-panel">
              <h2 className="text-sm font-semibold">Meta x abate projetado (kg)</h2>
              <div className="mt-4 h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={dados}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="mes" fontSize={12} stroke="var(--muted-foreground)" />
                    <YAxis
                      fontSize={12}
                      stroke="var(--muted-foreground)"
                      tickFormatter={(v: number) => nfCompact(v)}
                    />
                    <Tooltip formatter={(v: number) => nf(v)} />
                    <Legend />
                    <Bar dataKey="Meta" fill="var(--chart-1)" radius={[2, 2, 0, 0]} />
                    <Bar dataKey="Projetado" fill="var(--chart-2)" radius={[2, 2, 0, 0]} />
                    <Line dataKey="Atendimento" stroke="var(--chart-3)" yAxisId={0} dot={false} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="operacional" className="space-y-6 pt-6">
            <div className="overflow-x-auto rounded-sm border border-border bg-card shadow-panel">
              <table className="tabular w-full text-sm">
                <thead className="bg-secondary text-left text-xs tracking-wide text-secondary-foreground uppercase">
                  <tr>
                    <th className="px-4 py-3">Mês</th>
                    <th className="px-4 py-3 text-right">Aves</th>
                    <th className="px-4 py-3 text-right">Pintos</th>
                    <th className="px-4 py-3 text-right">Ovos</th>
                    <th className="px-4 py-3 text-right">Matrizes</th>
                    <th className="px-4 py-3 text-right">Saldo alojamento</th>
                    <th className="px-4 py-3 text-right">Saldo ovos</th>
                  </tr>
                </thead>
                <tbody>
                  {resultado.linhas.map((l) => (
                    <tr key={l.mes} className="border-t border-border">
                      <td className="px-4 py-2 font-medium">{MESES[l.mes - 1]}</td>
                      <td className="px-4 py-2 text-right">{nf(l.aves_necessarias)}</td>
                      <td className="px-4 py-2 text-right">{nf(l.pintos_necessarios)}</td>
                      <td className="px-4 py-2 text-right">{nf(l.ovos_necessarios)}</td>
                      <td className="px-4 py-2 text-right">{nf(l.matrizes_necessarias)}</td>
                      <td
                        className={`px-4 py-2 text-right ${l.saldo_alojamento < 0 ? "font-semibold text-destructive" : ""}`}
                      >
                        {nf(l.saldo_alojamento)}
                      </td>
                      <td
                        className={`px-4 py-2 text-right ${l.saldo_ovos < 0 ? "font-semibold text-destructive" : ""}`}
                      >
                        {nf(l.saldo_ovos)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </TabsContent>

          <TabsContent value="estrategico" className="space-y-6 pt-6">
            <div className="rounded-sm border border-border bg-card p-5 shadow-panel">
              <h2 className="text-sm font-semibold">Necessidade da cadeia por mês</h2>
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
                    <Bar dataKey="Ovos" fill="var(--chart-1)" radius={[2, 2, 0, 0]} />
                    <Bar dataKey="Pintos" fill="var(--chart-2)" radius={[2, 2, 0, 0]} />
                    <Bar dataKey="Matrizes" fill="var(--chart-3)" radius={[2, 2, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {resultado.alertas.length === 0 ? (
                <Badge variant="outline">Nenhum alerta neste cenário</Badge>
              ) : (
                resultado.alertas.slice(0, 24).map((a, i) => (
                  <Badge
                    key={i}
                    variant={a.severidade === "ALTA" ? "destructive" : "secondary"}
                    className="font-normal"
                  >
                    {MESES[a.mes - 1]} · {a.codigo}
                  </Badge>
                ))
              )}
            </div>
          </TabsContent>
        </Tabs>
      )}
    </AppShell>
  );
}
