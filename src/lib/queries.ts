import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type Cenario = {
  id: string;
  plano_id: string;
  filial_id: string | null;
  produto_id: string | null;
  nome: string;
  descricao: string | null;
  is_base: boolean;
  mortalidade: number;
  taxa_eclosao: number;
  ovos_por_matriz: number;
  rendimento: number;
  peso_medio_kg: number;
};

export type PeriodoRow = {
  id: string;
  cenario_id: string;
  mes: number;
  meta_abate_kg: number;
  capacidade_alojamento: number;
  capacidade_incubacao: number;
  ovos_disponiveis: number;
};

export type Plano = {
  id: string;
  nome: string;
  ano: number;
  versao: number;
  status: string;
  aprovado_em: string | null;
  aprovado_por: string | null;
  empresa_id: string;
};

export const planosQuery = queryOptions({
  queryKey: ["planos"],
  queryFn: async (): Promise<Plano[]> => {
    const { data, error } = await supabase
      .from("planos")
      .select("*")
      .order("ano", { ascending: false })
      .order("versao", { ascending: false });
    if (error) throw error;
    return (data ?? []) as Plano[];
  },
});

export const cenariosQuery = queryOptions({
  queryKey: ["cenarios"],
  queryFn: async (): Promise<Cenario[]> => {
    const { data, error } = await supabase
      .from("cenarios")
      .select("*")
      .order("created_at", { ascending: true });
    if (error) throw error;
    return (data ?? []) as Cenario[];
  },
});

export const periodosQuery = queryOptions({
  queryKey: ["cenario_periodos"],
  queryFn: async (): Promise<PeriodoRow[]> => {
    const { data, error } = await supabase
      .from("cenario_periodos")
      .select("*")
      .order("mes", { ascending: true });
    if (error) throw error;
    return (data ?? []) as PeriodoRow[];
  },
});

export const filiaisQuery = queryOptions({
  queryKey: ["filiais"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("filiais")
      .select("id, nome, codigo, capacidade_abate_dia, regiao_id, regioes(nome)")
      .order("nome");
    if (error) throw error;
    return data ?? [];
  },
});

export const produtosQuery = queryOptions({
  queryKey: ["produtos"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("produtos")
      .select("id, nome, peso_medio_kg, rendimento")
      .order("nome");
    if (error) throw error;
    return data ?? [];
  },
});

export const regioesQuery = queryOptions({
  queryKey: ["regioes"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("regioes")
      .select("id, nome, empresas(nome)")
      .order("nome");
    if (error) throw error;
    return data ?? [];
  },
});

export const auditoriaQuery = queryOptions({
  queryKey: ["auditoria"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("auditoria")
      .select("id, acao, entidade, entidade_id, detalhes, created_at, user_id")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw error;
    return data ?? [];
  },
});

export const profilesQuery = queryOptions({
  queryKey: ["profiles"],
  queryFn: async () => {
    const { data, error } = await supabase.from("profiles").select("id, nome");
    if (error) throw error;
    return data ?? [];
  },
});
