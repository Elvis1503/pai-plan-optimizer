
-- ROLES
CREATE TYPE public.app_role AS ENUM ('administrador','executivo','planejador_corporativo','planejador_regional','gestor_filial','operacao','integracao','auditor','leitor');

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text,
  nome text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_select" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION public.pode_planejar()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid()
    AND role IN ('administrador','planejador_corporativo','planejador_regional'))
$$;

CREATE POLICY "user_roles_select_own_or_admin" ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'administrador'));

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_role public.app_role;
BEGIN
  INSERT INTO public.profiles (id, email, nome)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'nome', NEW.raw_user_meta_data->>'full_name', split_part(NEW.email,'@',1)));
  IF NOT EXISTS (SELECT 1 FROM public.user_roles) THEN
    v_role := 'administrador';
  ELSE
    v_role := 'planejador_corporativo';
  END IF;
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, v_role);
  RETURN NEW;
END; $$;

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- CADASTROS
CREATE TABLE public.empresas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  cnpj text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.regioes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  nome text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.filiais (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  regiao_id uuid NOT NULL REFERENCES public.regioes(id) ON DELETE CASCADE,
  nome text NOT NULL,
  codigo text,
  capacidade_abate_dia integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.produtos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  nome text NOT NULL,
  peso_medio_kg numeric NOT NULL DEFAULT 2.8,
  rendimento numeric NOT NULL DEFAULT 0.75,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.planos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  nome text NOT NULL,
  ano integer NOT NULL,
  versao integer NOT NULL DEFAULT 1,
  status text NOT NULL DEFAULT 'rascunho',
  aprovado_por uuid,
  aprovado_em timestamptz,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.cenarios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plano_id uuid NOT NULL REFERENCES public.planos(id) ON DELETE CASCADE,
  filial_id uuid REFERENCES public.filiais(id) ON DELETE SET NULL,
  produto_id uuid REFERENCES public.produtos(id) ON DELETE SET NULL,
  nome text NOT NULL,
  descricao text,
  is_base boolean NOT NULL DEFAULT false,
  mortalidade numeric NOT NULL DEFAULT 0.05,
  taxa_eclosao numeric NOT NULL DEFAULT 0.82,
  ovos_por_matriz numeric NOT NULL DEFAULT 160,
  rendimento numeric NOT NULL DEFAULT 0.75,
  peso_medio_kg numeric NOT NULL DEFAULT 2.8,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.cenario_periodos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cenario_id uuid NOT NULL REFERENCES public.cenarios(id) ON DELETE CASCADE,
  mes integer NOT NULL CHECK (mes BETWEEN 1 AND 12),
  meta_abate_kg numeric NOT NULL DEFAULT 0,
  capacidade_alojamento numeric NOT NULL DEFAULT 0,
  capacidade_incubacao numeric NOT NULL DEFAULT 0,
  ovos_disponiveis numeric NOT NULL DEFAULT 0,
  UNIQUE (cenario_id, mes)
);

CREATE TABLE public.auditoria (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  acao text NOT NULL,
  entidade text NOT NULL,
  entidade_id uuid,
  detalhes jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.empresas, public.regioes, public.filiais, public.produtos, public.planos, public.cenarios, public.cenario_periodos TO authenticated;
GRANT SELECT, INSERT ON public.auditoria TO authenticated;
GRANT ALL ON public.empresas, public.regioes, public.filiais, public.produtos, public.planos, public.cenarios, public.cenario_periodos, public.auditoria TO service_role;

ALTER TABLE public.empresas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.regioes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.filiais ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.produtos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.planos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cenarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cenario_periodos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auditoria ENABLE ROW LEVEL SECURITY;

CREATE POLICY "empresas_select" ON public.empresas FOR SELECT TO authenticated USING (true);
CREATE POLICY "empresas_write" ON public.empresas FOR ALL TO authenticated USING (public.pode_planejar()) WITH CHECK (public.pode_planejar());
CREATE POLICY "regioes_select" ON public.regioes FOR SELECT TO authenticated USING (true);
CREATE POLICY "regioes_write" ON public.regioes FOR ALL TO authenticated USING (public.pode_planejar()) WITH CHECK (public.pode_planejar());
CREATE POLICY "filiais_select" ON public.filiais FOR SELECT TO authenticated USING (true);
CREATE POLICY "filiais_write" ON public.filiais FOR ALL TO authenticated USING (public.pode_planejar()) WITH CHECK (public.pode_planejar());
CREATE POLICY "produtos_select" ON public.produtos FOR SELECT TO authenticated USING (true);
CREATE POLICY "produtos_write" ON public.produtos FOR ALL TO authenticated USING (public.pode_planejar()) WITH CHECK (public.pode_planejar());

CREATE POLICY "planos_select" ON public.planos FOR SELECT TO authenticated USING (true);
CREATE POLICY "planos_insert" ON public.planos FOR INSERT TO authenticated WITH CHECK (public.pode_planejar());
CREATE POLICY "planos_update" ON public.planos FOR UPDATE TO authenticated
  USING (public.pode_planejar() OR public.has_role(auth.uid(),'executivo')) WITH CHECK (true);
CREATE POLICY "planos_delete" ON public.planos FOR DELETE TO authenticated USING (public.pode_planejar() AND status <> 'aprovado');

CREATE POLICY "cenarios_select" ON public.cenarios FOR SELECT TO authenticated USING (true);
CREATE POLICY "cenarios_write" ON public.cenarios FOR ALL TO authenticated
  USING (public.pode_planejar() AND EXISTS (SELECT 1 FROM public.planos p WHERE p.id = plano_id AND p.status <> 'aprovado'))
  WITH CHECK (public.pode_planejar() AND EXISTS (SELECT 1 FROM public.planos p WHERE p.id = plano_id AND p.status <> 'aprovado'));

CREATE POLICY "cenario_periodos_select" ON public.cenario_periodos FOR SELECT TO authenticated USING (true);
CREATE POLICY "cenario_periodos_write" ON public.cenario_periodos FOR ALL TO authenticated
  USING (public.pode_planejar() AND EXISTS (SELECT 1 FROM public.cenarios c JOIN public.planos p ON p.id = c.plano_id WHERE c.id = cenario_id AND p.status <> 'aprovado'))
  WITH CHECK (public.pode_planejar() AND EXISTS (SELECT 1 FROM public.cenarios c JOIN public.planos p ON p.id = c.plano_id WHERE c.id = cenario_id AND p.status <> 'aprovado'));

CREATE POLICY "auditoria_select" ON public.auditoria FOR SELECT TO authenticated USING (true);
CREATE POLICY "auditoria_insert" ON public.auditoria FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

-- DADOS DE EXEMPLO
INSERT INTO public.empresas (id, nome, cnpj) VALUES
 ('11111111-1111-1111-1111-111111111111','Agro Aliança Alimentos','12.345.678/0001-90');

INSERT INTO public.regioes (id, empresa_id, nome) VALUES
 ('22222222-2222-2222-2222-222222222221','11111111-1111-1111-1111-111111111111','Sul'),
 ('22222222-2222-2222-2222-222222222222','11111111-1111-1111-1111-111111111111','Centro-Oeste');

INSERT INTO public.filiais (id, regiao_id, nome, codigo, capacidade_abate_dia) VALUES
 ('33333333-3333-3333-3333-333333333331','22222222-2222-2222-2222-222222222221','Chapecó - SC','CHA',180000),
 ('33333333-3333-3333-3333-333333333332','22222222-2222-2222-2222-222222222221','Cascavel - PR','CAS',140000),
 ('33333333-3333-3333-3333-333333333333','22222222-2222-2222-2222-222222222222','Rio Verde - GO','RVE',220000),
 ('33333333-3333-3333-3333-333333333334','22222222-2222-2222-2222-222222222222','Dourados - MS','DOU',95000);

INSERT INTO public.produtos (id, empresa_id, nome, peso_medio_kg, rendimento) VALUES
 ('44444444-4444-4444-4444-444444444441','11111111-1111-1111-1111-111111111111','Frango Inteiro Congelado',2.85,0.76),
 ('44444444-4444-4444-4444-444444444442','11111111-1111-1111-1111-111111111111','Cortes Especiais Export',3.10,0.72);

INSERT INTO public.planos (id, empresa_id, nome, ano, versao, status) VALUES
 ('55555555-5555-5555-5555-555555555551','11111111-1111-1111-1111-111111111111','Plano Anual de Abate 2026',2026,1,'rascunho');

INSERT INTO public.cenarios (id, plano_id, filial_id, produto_id, nome, descricao, is_base, mortalidade, taxa_eclosao, ovos_por_matriz, rendimento, peso_medio_kg) VALUES
 ('66666666-6666-6666-6666-666666666661','55555555-5555-5555-5555-555555555551','33333333-3333-3333-3333-333333333331','44444444-4444-4444-4444-444444444441','Cenário Base','Premissas históricas consolidadas',true,0.052,0.820,160,0.76,2.85),
 ('66666666-6666-6666-6666-666666666662','55555555-5555-5555-5555-555555555551','33333333-3333-3333-3333-333333333331','44444444-4444-4444-4444-444444444441','Cenário Expansão','Meta 12% maior com ganho sanitário',false,0.041,0.845,168,0.77,2.95);

INSERT INTO public.cenario_periodos (cenario_id, mes, meta_abate_kg, capacidade_alojamento, capacidade_incubacao, ovos_disponiveis)
SELECT '66666666-6666-6666-6666-666666666661', m,
  9500000 + (m % 4) * 320000,
  4600000, 5200000, 5000000
FROM generate_series(1,12) m;

INSERT INTO public.cenario_periodos (cenario_id, mes, meta_abate_kg, capacidade_alojamento, capacidade_incubacao, ovos_disponiveis)
SELECT '66666666-6666-6666-6666-666666666662', m,
  (9500000 + (m % 4) * 320000) * 1.12,
  4900000, 5200000, 5100000
FROM generate_series(1,12) m;
