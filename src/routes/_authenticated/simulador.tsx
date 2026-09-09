import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Download, Lock, Save, ShieldCheck } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, registrarAuditoria } from "@/hooks/useAuth";
import { cenariosQuery, periodosQuery, planosQuery, type PeriodoRow } from "@/lib/queries";
import { MESES, baixarCSV, calcularCenario, nf, pct } from "@/lib/pai";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/simulador")({
  head: () => ({
    meta: [
      { title: "Simulador de cenários — PAI" },
      {
        name: "description",
        content:
          "Ajuste premissas de mortalidade, eclosão, capacidade e metas e veja a necessidade de aves, pintos, ovos e matrizes.",
      },
      { property: "og:title", content: "Simulador de cenários — PAI" },
      {
        property: "og:description",
        content: "Simulação da cadeia avícola com alertas automáticos por período.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SimuladorPage,
});

type PremissasForm = {
  mortalidade: number;
  taxa_eclosao: number;
  ovos_por_matriz: number;
  rendimento: number;
  peso_medio_kg: number;
};

function SimuladorPage() {
  const qc = useQueryClient();
  const { podePlanejar, podeAprovar, user } = useAuth();
  const { data: planos = [] } = useQuery(planosQuery);
  const { data: cenarios = [] } = useQuery(cenariosQuery);
  const { data: periodos = [] } = useQuery(periodosQuery);

  const [cenarioId, setCenarioId] = useState("");
  const cenario = cenarios.find((c) => c.id === cenarioId) ?? cenarios[0];
  const plano = planos.find((p) => p.id === cenario?.plano_id);
  const aprovado = plano?.status === "aprovado";
  const editavel = podePlanejar && !aprovado;

  const [premissas, setPremissas] = useState<PremissasForm | null>(null);
  const [linhas, setLinhas] = useState<PeriodoRow[]>([]);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (!cenario) return;
    setPremissas({
      mortalidade: Number(cenario.mortalidade),
      taxa_eclosao: Number(cenario.taxa_eclosao),
      ovos_por_matriz: Number(cenario.ovos_por_matriz),
      rendimento: Number(cenario.rendimento),
      peso_medio_kg: Number(cenario.peso_medio_kg),
    });
    setLinhas(
      periodos
        .filter((p) => p.cenario_id === cenario.id)
        .sort((a, b) => a.mes - b.mes)
        .map((p) => ({ ...p })),
    );
  }, [cenario, periodos]);

  const resultado = useMemo(
    () => (premissas ? calcularCenario(linhas, premissas) : null),
    [linhas, premissas],
  );

  function atualizarLinha(mes: number, campo: keyof PeriodoRow, valor: string) {
    const n = Number(valor.replace(",", ".")) || 0;
    setLinhas((old) => old.map((l) => (l.mes === mes ? { ...l, [campo]: n } : l)));
  }

  async function salvar() {
    if (!cenario || !premissas) return;
    setSalvando(true);
    const { error: e1 } = await supabase
      .from("cenarios")
      .update({ ...premissas })
      .eq("id", cenario.id);
    const { error: e2 } = await supabase.from("cenario_periodos").upsert(
      linhas.map((l) => ({
        id: l.id,
        cenario_id: l.cenario_id,
        mes: l.mes,
        meta_abate_kg: l.meta_abate_kg,
        capacidade_alojamento: l.capacidade_alojamento,
        capacidade_incubacao: l.capacidade_incubacao,
        ovos_disponiveis: l.ovos_disponiveis,
      })),
    );
    setSalvando(false);
    if (e1 || e2) {
      toast.error("Não foi possível salvar", { description: (e1 ?? e2)?.message });
      return;
    }
    await registrarAuditoria("SALVAR_CENARIO", "cenarios", cenario.id, { premissas });
    await qc.invalidateQueries();
    toast.success("Cenário salvo");
  }

  async function aprovarPlano() {
    if (!plano || !user) return;
    const { error } = await supabase
      .from("planos")
      .update({ status: "aprovado", aprovado_por: user.id, aprovado_em: new Date().toISOString() })
      .eq("id", plano.id);
    if (error) {
      toast.error("Não foi possível aprovar", { description: error.message });
      return;
    }
    await registrarAuditoria("APROVAR_PLANO", "planos", plano.id, {
      versao: plano.versao,
      nome: plano.nome,
    });
    await qc.invalidateQueries();
    toast.success("Plano aprovado — edição bloqueada");
  }

  async function novaVersao() {
    if (!plano || !cenario) return;
    const { data: novo, error } = await supabase
      .from("planos")
      .insert({
        empresa_id: plano.empresa_id,
        nome: plano.nome,
        ano: plano.ano,
        versao: plano.versao + 1,
        status: "rascunho",
        created_by: user?.id ?? null,
      })
      .select()
      .single();
    if (error || !novo) {
      toast.error("Não foi possível criar a nova versão", { description: error?.message });
      return;
    }
    const doPlano = cenarios.filter((c) => c.plano_id === plano.id);
    for (const c of doPlano) {
      const { data: novoCen } = await supabase
        .from("cenarios")
        .insert({
          plano_id: novo.id,
          filial_id: c.filial_id,
          produto_id: c.produto_id,
          nome: c.nome,
          descricao: c.descricao,
          is_base: c.is_base,
          mortalidade: c.mortalidade,
          taxa_eclosao: c.taxa_eclosao,
          ovos_por_matriz: c.ovos_por_matriz,
          rendimento: c.rendimento,
          peso_medio_kg: c.peso_medio_kg,
          created_by: user?.id ?? null,
        })
        .select()
        .single();
      if (!novoCen) continue;
      const ps = periodos.filter((p) => p.cenario_id === c.id);
      if (ps.length > 0) {
        await supabase.from("cenario_periodos").insert(
          ps.map((p) => ({
            cenario_id: novoCen.id,
            mes: p.mes,
            meta_abate_kg: p.meta_abate_kg,
            capacidade_alojamento: p.capacidade_alojamento,
            capacidade_incubacao: p.capacidade_incubacao,
            ovos_disponiveis: p.ovos_disponiveis,
          })),
        );
      }
    }
    await registrarAuditoria("NOVA_VERSAO_PLANO", "planos", novo.id, { origem: plano.id });
    await qc.invalidateQueries();
    toast.success(`Versão ${plano.versao + 1} criada como rascunho`);
  }

  function exportar() {
    if (!resultado) return;
    baixarCSV(
      `pai-cenario-${cenario?.nome ?? "simulacao"}.csv`,
      resultado.linhas.map((l) => ({
        Mes: MESES[l.mes - 1],
        Meta_abate_kg: Math.round(l.meta_abate_kg),
        Aves: Math.round(l.aves_necessarias),
        Pintos: Math.round(l.pintos_necessarios),
        Ovos: Math.round(l.ovos_necessarios),
        Matrizes: Math.round(l.matrizes_necessarias),
        Abate_projetado_kg: Math.round(l.abate_projetado_kg),
        Atendimento: pct(l.atendimento),
        Alertas: l.alertas.map((a) => a.codigo).join(" | "),
      })),
    );
  }

  const campos: { chave: keyof PremissasForm; label: string; step: string }[] = [
    { chave: "mortalidade", label: "Mortalidade", step: "0.001" },
    { chave: "taxa_eclosao", label: "Taxa de eclosão", step: "0.001" },
    { chave: "ovos_por_matriz", label: "Ovos por matriz", step: "1" },
    { chave: "rendimento", label: "Rendimento de carcaça", step: "0.01" },
    { chave: "peso_medio_kg", label: "Peso médio (kg)", step: "0.01" },
  ];

  return (
    <AppShell
      title="Simulador de cenários"
      subtitle={plano ? `${plano.nome} · versão ${plano.versao}` : "Sem plano cadastrado"}
      actions={
        <>
          {cenarios.length > 0 ? (
            <Select value={cenario?.id ?? ""} onValueChange={setCenarioId}>
              <SelectTrigger className="w-56">
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
          ) : null}
          <Button variant="outline" size="sm" onClick={exportar}>
            <Download className="size-4" /> CSV
          </Button>
          {editavel ? (
            <Button size="sm" onClick={salvar} disabled={salvando}>
              <Save className="size-4" /> Salvar
            </Button>
          ) : null}
          {podeAprovar && plano && !aprovado ? (
            <Button size="sm" variant="secondary" onClick={aprovarPlano}>
              <ShieldCheck className="size-4" /> Aprovar plano
            </Button>
          ) : null}
          {aprovado && podePlanejar ? (
            <Button size="sm" variant="secondary" onClick={novaVersao}>
              Nova versão
            </Button>
          ) : null}
        </>
      }
    >
      {aprovado ? (
        <div className="mb-6 flex items-center gap-2 rounded-sm border border-border bg-secondary px-4 py-3 text-sm">
          <Lock className="size-4" /> Plano aprovado: edição bloqueada. Gere uma nova versão para
          alterar premissas.
        </div>
      ) : null}

      {!cenario || !premissas || !resultado ? (
        <p className="text-sm text-muted-foreground">Nenhum cenário disponível.</p>
      ) : (
        <div className="space-y-6">
          <section className="rounded-sm border border-border bg-card p-5 shadow-panel">
            <h2 className="text-sm font-semibold">Premissas do cenário</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
              {campos.map((c) => (
                <div key={c.chave} className="space-y-2">
                  <Label htmlFor={c.chave}>{c.label}</Label>
                  <Input
                    id={c.chave}
                    type="number"
                    step={c.step}
                    disabled={!editavel}
                    value={premissas[c.chave]}
                    onChange={(e) =>
                      setPremissas({ ...premissas, [c.chave]: Number(e.target.value) })
                    }
                  />
                </div>
              ))}
            </div>
          </section>

          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[
              { l: "Aves necessárias", v: nf(resultado.totalAves) },
              { l: "Pintos necessários", v: nf(resultado.totalPintos) },
              { l: "Ovos necessários", v: nf(resultado.totalOvos) },
              { l: "Matrizes no pico", v: nf(resultado.matrizesPico) },
            ].map((k) => (
              <div key={k.l} className="rounded-sm border border-border bg-card p-5 shadow-panel">
                <p className="text-xs tracking-wide text-muted-foreground uppercase">{k.l}</p>
                <p className="tabular mt-2 font-display text-xl font-bold">{k.v}</p>
              </div>
            ))}
          </section>

          <section className="overflow-x-auto rounded-sm border border-border bg-card shadow-panel">
            <table className="tabular w-full min-w-[900px] text-sm">
              <thead className="bg-secondary text-left text-xs tracking-wide text-secondary-foreground uppercase">
                <tr>
                  <th className="px-3 py-3">Mês</th>
                  <th className="px-3 py-3">Meta abate (kg)</th>
                  <th className="px-3 py-3">Cap. alojamento</th>
                  <th className="px-3 py-3">Cap. incubação</th>
                  <th className="px-3 py-3">Ovos disponíveis</th>
                  <th className="px-3 py-3 text-right">Ovos necessários</th>
                  <th className="px-3 py-3 text-right">Atendimento</th>
                  <th className="px-3 py-3">Alertas</th>
                </tr>
              </thead>
              <tbody>
                {resultado.linhas.map((l) => (
                  <tr key={l.mes} className="border-t border-border align-middle">
                    <td className="px-3 py-2 font-medium">{MESES[l.mes - 1]}</td>
                    {(
                      [
                        "meta_abate_kg",
                        "capacidade_alojamento",
                        "capacidade_incubacao",
                        "ovos_disponiveis",
                      ] as const
                    ).map((campo) => (
                      <td key={campo} className="px-3 py-2">
                        <Input
                          className="h-8 w-32"
                          type="number"
                          disabled={!editavel}
                          value={l[campo]}
                          onChange={(e) => atualizarLinha(l.mes, campo, e.target.value)}
                        />
                      </td>
                    ))}
                    <td className="px-3 py-2 text-right">{nf(l.ovos_necessarios)}</td>
                    <td
                      className={`px-3 py-2 text-right ${l.atendimento < 0.999 ? "font-semibold text-destructive" : "text-success"}`}
                    >
                      {pct(l.atendimento)}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex flex-wrap gap-1">
                        {l.alertas.map((a) => (
                          <Badge
                            key={a.codigo}
                            variant={a.severidade === "ALTA" ? "destructive" : "secondary"}
                            title={a.mensagem}
                            className="font-normal"
                          >
                            {a.codigo}
                          </Badge>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </div>
      )}
    </AppShell>
  );
}
