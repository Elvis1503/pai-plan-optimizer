# PAI Plan Optimizer

# Especifica&#231;&#227;o Funcional — MVP Corporativo PAI

## 1. Objetivo do MVP

Entregar uma vers&#227;o m&#237;nima vi&#225;vel do **Planejamento Av&#237;cola Integrado (PAI)** capaz de:

- Planejar e simular a cadeia av&#237;cola ponta a ponta.
- Garantir o atendimento das metas de abate.
- Identificar gargalos de capacidade, ovos e produ&#231;&#227;o.
- Permitir compara&#231;&#227;o de cen&#225;rios.
- Integrar-se a dados via CSV e Excel.
- Oferecer vis&#227;o corporativa, regional e operacional.

## 2. Escopo funcional congelado

### 2.1 Cadastros obrigat&#243;rios

- Empresas, regi&#245;es e filiais.
- Granjas e incubat&#243;rios.
- Linhagens e produtos.
- Calend&#225;rio produtivo.
- Per&#237;odos de planejamento.
- Capacidades de alojamento, incubac&#227;o e abate.

### 2.2 Planejamento

- Metas de abate por filial, produto e per&#237;odo.
- C&#225;lculo de necessidade de aves, pintos, ovos e matrizes.
- Vers&#227;o de planos.
- Aprova&#231;&#227;o de plano.

### 2.3 Produ&#231;&#227;o

- Lotes de matrizes.
- Produ&#231;&#227;o de ovos f&#233;rteis.
- Estoque de ovos.
- Incubac&#227;o programada.
- Nascimentos.
- Pintos dispon&#237;veis.
- Alojamientos realizados.
- Mortalidade.
- Desempenho de lotes.
- Abate realizado.

### 2.4 Simulador

- Cria&#231;&#227;o de cen&#225;rios.
- Ajuste de premissas:
  - Mortalidade.
  - Taxa de eclos&#227;o.
  - Produ&#231;&#227;o de ovos.
  - Capacidade de alojamento.
  - Capacidade de incubac&#227;o.
  - Meta de abate.
- Comparac&#227;o entre cen&#225;rios.
- Alertas autom&#225;ticos.

### 2.5 Integra&#231;&#245;es MVP

- Importac&#227;o de CSV.
- Importac&#227;o de Excel.
- Estrutura preparada para conectores SAP, TOTVS, Oracle e Senior.

### 2.6 Governan&#231;a

- Usu&#225;rios.
- Perfis.
- Permiss&#245;es.
- Escopos de acesso.
- Auditoria de operac&#245;es cr&#237;ticas.

### 2.7 Dashboards

- Dashboard executivo.
- Dashboard operacional.
- Dashboard estrat&#233;gico.

## 3. Requisitos n&#227;o funcionais

### 3.1 Desempenho

- Tempo de resposta de APIs operacionais inferior a 500 ms para consultas simples.
- Simula&#231;&#227;o de cen&#225;rio com at&#233; 12 meses em at&#233; 10 segundos.
- Interface responsiva em desktop e mobile.

### 3.2 Disponibilidade

- Ambiente de produ&#231;&#227;o com SLA m&#237;nimo de 99%.
- Backup di&#225;rio com reten&#231;&#227;o m&#237;nima de 30 dias.

### 3.3 Seguran&#231;a

- Autentica&#231;&#227;o via OAuth 2.0 / OIDC.
- RBAC por perfil, empresa, regi&#227;o e filial.
- Auditoria de alterac&#245;es e acessos.
- Criptografia TLS em tr&#226;nsito.
- Segregac&#227;o de ambientes (DEV, HOM, PRD).

### 3.4 Usabilidade

- Interface em portugu&#234;s.
- Navegac&#227;o intuitiva com menu hier&#225;rquico.
- Alertas visuais claros.
- Exportac&#227;o para Excel, CSV e PDF.

## 4. Regras de neg&#243;cio congeladas

### 4.1 C&#225;lculo de necessidade

```text
Aves necess&#225;rias = Meta de abate / rendimento total esperado
Pintos necess&#225;rios = Aves necess&#225;rias / taxa de sobreviv&#234;ncia
Ovos necess&#225;rios = Pintos necess&#225;rios / taxa de eclos&#227;o
Matrizes necess&#225;rias = Ovos necess&#225;rios / produtividade m&#233;dia por matriz
```

### 4.2 Alertas obrigat&#243;rios

| C&#243;digo | Condi&#231;&#227;o | Severidade |
|---|---|---|
| CAPACIDADE_INSUFICIENTE | Saldo de alojamento &lt; 0 | ALTA |
| FALTA_OVOS | Saldo de ovos &lt; 0 | ALTA |
| PRODUCAO_INSUFICIENTE | Abate projetado &lt; meta de abate | ALTA |
| INCUBACAO_INSUFICIENTE | Capacidade de incubac&#227;o &lt; ovos programados | M&#201;DIA |
| DISTRIBUICAO_INVIAVEL | N&#227;o existe origem/destino eleg&#237;vel | ALTA |

### 4.3 Aprova&#231;&#227;o de plano

- Somente usu&#225;rios com perfil **Planejador Corporativo** ou **Executivo** podem aprovar.
- Plano aprovado n&#227;o pode ser alterado, apenas gerar nova vers&#227;o.
- Aprova&#231;&#227;o gera registro de auditoria.

### 4.4 Integra&#231;&#245;es

- Dados importados via CSV/Excel devem passar por validac&#227;o t&#233;cnica e de neg&#243;cio.
- Registros inv&#225;lidos geram arquivo de erro detalhado.
- Reprocessamento &#233; idempotente.

## 5. Perfis de usu&#225;rio

| Perfil | Acesso |
|---|---|
| Administrador | Configura&#231;&#227;o integral |
| Executivo | Dashboards e planos aprovados |
| Planejador corporativo | Todos os planos, cen&#225;rios e aprova&#231;&#245;es |
| Planejador regional | Planos e dados da regi&#227;o |
| Gestor de filial | Dados da filial |
| Operac&#227;o | Cadastro de produ&#231;&#227;o e alojamento |
| Integra&#231;&#227;o | Execu&#231;&#227;o de importac&#245;es e exporta&#231;&#245;es |
| Auditor | Consulta de logs e hist&#243;rico |
| Leitor | Somente consulta |

## 6. Crit&#233;rios de aceite do MVP

- C&#225;lculo correto de toda a cadeia.
- Alertas gerados conforme regras.
- Comparac&#227;o entre pelo menos dois cen&#225;rios.
- Aprova&#231;&#227;o de plano com bloqueio de edic&#227;o.
- Importac&#227;o de CSV e Excel funcional.
- Permiss&#245;es aplicadas corretamente.
- Auditoria registrada em operac&#245;es cr&#237;ticas.
- Interface responsiva em desktop e mobile.
- Documentac&#227;o t&#233;cnica e funcional entregue.
- Testes unit&#225;rios, de integrac&#227;o e E2E executados.
- Ambiente de homologac&#227;o validado.
- Pipeline CI/CD configurado.
- Backup e observabilidade configurados.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/51a75519-b898-40fc-8618-d945c5c2efba).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
