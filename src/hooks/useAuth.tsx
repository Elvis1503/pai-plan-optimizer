import { useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type AppRole =
  | "administrador"
  | "executivo"
  | "planejador_corporativo"
  | "planejador_regional"
  | "gestor_filial"
  | "operacao"
  | "integracao"
  | "auditor"
  | "leitor";

export const ROLE_LABELS: Record<AppRole, string> = {
  administrador: "Administrador",
  executivo: "Executivo",
  planejador_corporativo: "Planejador Corporativo",
  planejador_regional: "Planejador Regional",
  gestor_filial: "Gestor de Filial",
  operacao: "Operação",
  integracao: "Integração",
  auditor: "Auditor",
  leitor: "Leitor",
};

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [nome, setNome] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      setUser(s?.user ?? null);
    });
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setUser(data.session?.user ?? null);
      setLoading(false);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) {
      setRoles([]);
      setNome("");
      return;
    }
    let active = true;
    void (async () => {
      const [{ data: r }, { data: p }] = await Promise.all([
        supabase.from("user_roles").select("role").eq("user_id", user.id),
        supabase.from("profiles").select("nome").eq("id", user.id).maybeSingle(),
      ]);
      if (!active) return;
      setRoles(((r ?? []) as { role: AppRole }[]).map((x) => x.role));
      setNome(p?.nome ?? user.email ?? "");
    })();
    return () => {
      active = false;
    };
  }, [user]);

  const podePlanejar = roles.some((r) =>
    ["administrador", "planejador_corporativo", "planejador_regional"].includes(r),
  );
  const podeAprovar = roles.some((r) =>
    ["administrador", "planejador_corporativo", "executivo"].includes(r),
  );

  return { session, user, roles, nome, loading, podePlanejar, podeAprovar };
}

export async function registrarAuditoria(
  acao: string,
  entidade: string,
  entidade_id: string | null,
  detalhes?: Record<string, unknown>,
) {
  const { data } = await supabase.auth.getUser();
  if (!data.user) return;
  await supabase.from("auditoria").insert({
    user_id: data.user.id,
    acao,
    entidade,
    entidade_id,
    detalhes: JSON.parse(JSON.stringify(detalhes ?? {})),
  });
}
