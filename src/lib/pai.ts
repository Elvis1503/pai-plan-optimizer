export type Premissas = {
  mortalidade: number;
  taxa_eclosao: number;
  ovos_por_matriz: number;
  rendimento: number;
  peso_medio_kg: number;
};

export type Periodo = {
  mes: number;
  meta_abate_kg: number;
  capacidade_alojamento: number;
  capacidade_incubacao: number;
  ovos_disponiveis: number;
};

export type Severidade = "ALTA" | "MEDIA";

export type Alerta = {
  codigo:
    | "CAPACIDADE_INSUFICIENTE"
    | "FALTA_OVOS"
    | "PRODUCAO_INSUFICIENTE"
    | "INCUBACAO_INSUFICIENTE"
    | "DISTRIBUICAO_INVIAVEL";
  severidade: Severidade;
  mes: number;
  mensagem: string;
};

export type LinhaCalculo = Periodo & {
  aves_necessarias: number;
  pintos_necessarios: number;
  ovos_necessarios: number;
  matrizes_necessarias: number;
  saldo_alojamento: number;
  saldo_ovos: number;
  saldo_incubacao: number;
  abate_projetado_kg: number;
  atendimento: number;
  alertas: Alerta[];
};

export const MESES = [
  "Jan",
  "Fev",
  "Mar",
  "Abr",
  "Mai",
  "Jun",
  "Jul",
  "Ago",
  "Set",
  "Out",
  "Nov",
  "Dez",
];

const safe = (n: number) => (Number.isFinite(n) && n > 0 ? n : 0);

export function calcularPeriodo(p: Periodo, pr: Premissas): LinhaCalculo {
  const sobrevivencia = Math.max(0.0001, 1 - pr.mortalidade);
  const eclosao = Math.max(0.0001, pr.taxa_eclosao);
  const rendimentoTotal = Math.max(0.0001, pr.peso_medio_kg * pr.rendimento);

  const aves = p.meta_abate_kg / rendimentoTotal;
  const pintos = aves / sobrevivencia;
  const ovos = pintos / eclosao;
  const matrizes = ovos / Math.max(0.0001, pr.ovos_por_matriz);

  const saldo_alojamento = p.capacidade_alojamento - pintos;
  const saldo_ovos = p.ovos_disponiveis - ovos;
  const saldo_incubacao = p.capacidade_incubacao - ovos;

  const ovosViaveis = Math.min(ovos, p.ovos_disponiveis, p.capacidade_incubacao);
  const pintosViaveis = Math.min(ovosViaveis * eclosao, p.capacidade_alojamento);
  const abate_projetado_kg = pintosViaveis * sobrevivencia * rendimentoTotal;
  const atendimento = p.meta_abate_kg > 0 ? abate_projetado_kg / p.meta_abate_kg : 1;

  const alertas: Alerta[] = [];
  const mes = p.mes;
  if (saldo_alojamento < 0)
    alertas.push({
      codigo: "CAPACIDADE_INSUFICIENTE",
      severidade: "ALTA",
      mes,
      mensagem: `Faltam ${Math.abs(saldo_alojamento).toLocaleString("pt-BR", { maximumFractionDigits: 0 })} posições de alojamento`,
    });
  if (saldo_ovos < 0)
    alertas.push({
      codigo: "FALTA_OVOS",
      severidade: "ALTA",
      mes,
      mensagem: `Faltam ${Math.abs(saldo_ovos).toLocaleString("pt-BR", { maximumFractionDigits: 0 })} ovos férteis`,
    });
  if (abate_projetado_kg < p.meta_abate_kg - 1)
    alertas.push({
      codigo: "PRODUCAO_INSUFICIENTE",
      severidade: "ALTA",
      mes,
      mensagem: `Abate projetado atende ${(atendimento * 100).toFixed(1)}% da meta`,
    });
  if (saldo_incubacao < 0)
    alertas.push({
      codigo: "INCUBACAO_INSUFICIENTE",
      severidade: "MEDIA",
      mes,
      mensagem: `Capacidade de incubação ${Math.abs(saldo_incubacao).toLocaleString("pt-BR", { maximumFractionDigits: 0 })} ovos abaixo do programado`,
    });
  if (p.meta_abate_kg > 0 && safe(p.capacidade_alojamento) === 0)
    alertas.push({
      codigo: "DISTRIBUICAO_INVIAVEL",
      severidade: "ALTA",
      mes,
      mensagem: "Não existe origem/destino elegível para o período",
    });

  return {
    ...p,
    aves_necessarias: aves,
    pintos_necessarios: pintos,
    ovos_necessarios: ovos,
    matrizes_necessarias: matrizes,
    saldo_alojamento,
    saldo_ovos,
    saldo_incubacao,
    abate_projetado_kg,
    atendimento,
    alertas,
  };
}

export type ResultadoCenario = {
  linhas: LinhaCalculo[];
  totalMeta: number;
  totalAbate: number;
  totalAves: number;
  totalPintos: number;
  totalOvos: number;
  matrizesPico: number;
  atendimento: number;
  alertas: Alerta[];
};

export function calcularCenario(periodos: Periodo[], pr: Premissas): ResultadoCenario {
  const linhas = [...periodos].sort((a, b) => a.mes - b.mes).map((p) => calcularPeriodo(p, pr));
  const totalMeta = linhas.reduce((s, l) => s + l.meta_abate_kg, 0);
  const totalAbate = linhas.reduce((s, l) => s + l.abate_projetado_kg, 0);
  return {
    linhas,
    totalMeta,
    totalAbate,
    totalAves: linhas.reduce((s, l) => s + l.aves_necessarias, 0),
    totalPintos: linhas.reduce((s, l) => s + l.pintos_necessarios, 0),
    totalOvos: linhas.reduce((s, l) => s + l.ovos_necessarios, 0),
    matrizesPico: linhas.reduce((m, l) => Math.max(m, l.matrizes_necessarias), 0),
    atendimento: totalMeta > 0 ? totalAbate / totalMeta : 1,
    alertas: linhas.flatMap((l) => l.alertas),
  };
}

export const nf = (n: number, d = 0) =>
  n.toLocaleString("pt-BR", { minimumFractionDigits: d, maximumFractionDigits: d });

export const nfCompact = (n: number) =>
  n >= 1_000_000
    ? `${(n / 1_000_000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} mi`
    : n >= 1_000
      ? `${(n / 1_000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} mil`
      : nf(n);

export const pct = (n: number, d = 1) => `${(n * 100).toFixed(d).replace(".", ",")}%`;

export function toCSV(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return "";
  const headers = Object.keys(rows[0]!);
  const escape = (v: unknown) => {
    const s = v == null ? "" : String(v);
    return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [headers.join(";"), ...rows.map((r) => headers.map((h) => escape(r[h])).join(";"))].join(
    "\n",
  );
}

export function baixarCSV(nome: string, rows: Record<string, unknown>[]) {
  const blob = new Blob(["\uFEFF" + toCSV(rows)], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nome;
  a.click();
  URL.revokeObjectURL(url);
}
