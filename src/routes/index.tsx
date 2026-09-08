import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Egg, LineChart, ShieldCheck, TriangleAlert } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "PAI — Planejamento Avícola Integrado" },
      {
        name: "description",
        content:
          "Planeje a cadeia avícola ponta a ponta: metas de abate, necessidade de aves, pintos, ovos e matrizes, com alertas e comparação de cenários.",
      },
      { property: "og:title", content: "PAI — Planejamento Avícola Integrado" },
      {
        property: "og:description",
        content:
          "Simulador corporativo da cadeia avícola com alertas de capacidade, ovos e produção.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Home,
});

const CARDS = [
  {
    icon: LineChart,
    titulo: "Cadeia calculada ponta a ponta",
    texto: "Da meta de abate até matrizes necessárias, mês a mês, por filial e produto.",
  },
  {
    icon: TriangleAlert,
    titulo: "Alertas automáticos",
    texto: "Capacidade, ovos, incubação e produção insuficiente sinalizados por severidade.",
  },
  {
    icon: Egg,
    titulo: "Cenários comparáveis",
    texto: "Ajuste mortalidade, eclosão e capacidades e compare resultados lado a lado.",
  },
  {
    icon: ShieldCheck,
    titulo: "Governança e auditoria",
    texto: "Perfis de acesso, aprovação de plano com bloqueio de edição e trilha de auditoria.",
  },
];

function Home() {
  return (
    <div className="min-h-screen bg-sidebar text-sidebar-foreground">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-sm bg-sidebar-primary font-display text-sm font-bold text-sidebar-primary-foreground">
            PAI
          </div>
          <span className="font-display text-sm font-semibold">Planejamento Avícola Integrado</span>
        </div>
        <Link
          to="/auth"
          className="rounded-sm bg-sidebar-primary px-4 py-2 text-sm font-medium text-sidebar-primary-foreground transition-opacity hover:opacity-90"
        >
          Entrar
        </Link>
      </header>

      <section className="mx-auto max-w-6xl px-6 pt-12 pb-20">
        <p className="font-mono text-xs tracking-widest text-sidebar-primary uppercase">
          MVP Corporativo
        </p>
        <h1 className="mt-4 max-w-3xl font-display text-4xl leading-tight font-bold sm:text-5xl">
          Planeje e simule toda a cadeia avícola sem perder a meta de abate.
        </h1>
        <p className="mt-5 max-w-2xl text-base text-sidebar-foreground/70">
          O PAI conecta metas de abate a aves, pintos, ovos e matrizes, identifica gargalos de
          capacidade e permite comparar cenários antes de aprovar o plano.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            to="/auth"
            className="inline-flex items-center gap-2 rounded-sm bg-sidebar-primary px-5 py-3 text-sm font-semibold text-sidebar-primary-foreground transition-opacity hover:opacity-90"
          >
            Acessar o simulador <ArrowRight className="size-4" />
          </Link>
        </div>

        <div className="mt-16 grid gap-px overflow-hidden rounded-sm bg-sidebar-border sm:grid-cols-2 lg:grid-cols-4">
          {CARDS.map((c) => (
            <div key={c.titulo} className="bg-sidebar p-6">
              <c.icon className="size-5 text-sidebar-primary" />
              <h2 className="mt-4 font-display text-sm font-semibold">{c.titulo}</h2>
              <p className="mt-2 text-sm text-sidebar-foreground/65">{c.texto}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
