# QA UI Baseline — CDM Portal (aiox-dashboard)

**Data:** 2026-05-06
**QA Agent:** Quinn (Guardian)
**Scope:** `C:\dev\aiox-dashboard\src` — 591 arquivos `.tsx/.ts`
**Tools:** `npx impeccable@latest detect`, manual 7-layer audit, ripgrep heuristics

---

## Sumário Executivo

| Severidade | Total |
|---|---|
| **CRÍTICO** | 4 |
| **ALTO** | 7 |
| **MÉDIO** | 6 |
| **BAIXO** | 3 |
| **TOTAL** | **20 issues** (consolidando 96 ocorrências de anti-patterns) |

**Veredicto QA Gate:** **NEEDS_WORK** — base sólida (design tokens centralizados, 354 hovers, 166 skeletons, 113 empty/error states, 36 elementos semânticos em layout), mas com tells de UI gerada por IA disseminados (62 ocorrências de `bg-black` puro, 13 cards com border-l grosso, 5 usos de gradiente roxo/violeta).

---

## Estrutura do Projeto

| Métrica | Valor |
|---|---|
| Arquivos `.tsx/.ts` em `src/` | 591 |
| Diretórios em `src/components/` | 36 (agents, chat, dashboard, kanban, layout, monitor, orchestration, qa, registry, settings, terminals, ui, voice, workflow, world, etc.) |
| Páginas/rotas (viewMap em `App.tsx`) | 27 views (dashboard, chat, agents, terminals, monitor, roadmap, squads, github, qa, stories, knowledge, engine, sales-room, …) |
| Sistema de estilo | **Tailwind CSS 3** + **CSS variables** (design tokens em camadas: `primitives/` → `semantic/` → `themes/` → `component/`) |
| CSS modules | **Não usa** (consistente — só Tailwind + tokens) |
| styled-components | **Não usa** |
| Design tokens | **Sim** — `src/styles/tokens/{primitives,semantic,component,themes}` com `colors.css`, `typography.css`, `spacing.css`, `sizing.css`, `timing.css` |
| Themes | `aiox.css`, `glass.css`, `matrix.css` + `liquid-glass.css` (data-theme) |
| Testes a11y | `vitest-axe@^0.1.0` instalado + `e2e/accessibility.spec.ts` (Playwright) — **existe, mas cobertura precisa ser verificada** |

---

## `npx impeccable detect ./src` — Resultado

**Status:** OK (executou sem erro). **96 anti-patterns** encontrados.

### Distribuição por categoria

| Categoria | Ocorrências | Significado |
|---|---|---|
| `pure-black-white` | **62** | `bg-black` puro (#000) — visual cru, falta de tint |
| `side-tab` | **13** | `border-l-2/3/4` em cards — tell clássico de UI gerada por IA |
| `ai-color-palette` | **5** | gradientes purple/violet em headings/cards |
| `layout-transition` | **3** | `transition: width/height` causa thrash |
| `bounce-easing` | **3** | `cubic-bezier(0.34, 1.56, 0.64, 1)` (overshoot) — datado |
| `dark-glow` | **2** | colored box-shadow glows em dark theme |
| `single-font` | **1** | `ExportChat.tsx:274` apenas Roboto |
| `gradient-text` | **1** | `background-clip: text` com gradiente |
| `overused-font` | **1** | Roboto via Google Fonts (genérico) |

---

## Auditoria Manual — 7 Camadas

### 1. Tipografia — MÉDIO

- Família declarada: `var(--font-family-sans)` / `--font-family-display)` / `--font-family-mono)` (em `tailwind.config.ts`).
- Theme `aiox` carrega **TASAOrbiterDisplay** (display, distintivo) + **Roboto Mono** (mono) — **bom**.
- **[ALTO] Fonte body padrão (default theme) é Roboto**, marcada por impeccable como `overused-font` em `aiox-fonts.css:11`. Roboto + Inter + Open Sans são os "padrões safe" usados por milhões de sites — falta personalidade quando o tema cockpit não está ativo.
- **[BAIXO] Hierarquia OK** — `--font-weight-{regular,medium,semibold,bold}` definidos em primitives/typography. Não vi pages caindo em "Regular + Bold" só.
- **[ALTO] `ExportChat.tsx:274` usa apenas Roboto** (single-font no escopo daquela view).

### 2. Cor — CRÍTICO

- Sistema de tokens **bem estruturado**: `primitives/colors.css` define palette completa (warm, dark, green, blue, cyan, purple, violet…), `semantic/colors.css` mapeia para tokens semânticos (background, foreground, border, accent, status, squad, tier).
- **[CRÍTICO] 62 ocorrências de `bg-black` puro** espalhadas por 30+ componentes (Sidebar, AgentExplorer, MessageBubble, MarkdownRenderer, ChatInput, TerminalCard, WorkflowCanvas, Dialog, KeyboardShortcuts, light-mode-compat.css, etc.). Recomendação: trocar por `bg-background-base` (token semântico) ou `oklch(12% 0.01 250)`.
- **[CRÍTICO] Gradientes purple/violet** em `MemoryManager.tsx` (3x), `WorkflowDialogs.tsx`, `WorkflowManager.tsx`, `NodeDetailPanel.tsx` — AI fingerprint clássico. Substituir por cor sólida do design system.
- **[ALTO] `dark-glow`** em `aiox.css:415` (`rgb(209,255,0)` lime glow) e `matrix.css:833` (`rgb(74,200,90)` green glow) — efeitos "cool AI" datados.
- **[ALTO] `gradient-text`** em `aiox-animations.css:201` (`background-clip: text` com gradiente) — decorativo, dificulta leitura.

### 3. Layout — MÉDIO

- `body` usa `min-height: 100vh` (não 100dvh) — em iOS Safari pode gerar barra de scroll fantasma.
- 6 ocorrências de `h-screen | min-h-screen | min-h-[100dvh]` no codebase — uso baixo de viewport-locked layouts (bom; não força full-screen).
- Estrutura de 3 colunas: `AppLayout` (Sidebar | Main | ActivityPanel) — não é "3 colunas iguais" simétricas (anti-pattern AI), tem hierarquia.
- **[MÉDIO] `body { min-height: 100vh }`** em `index.css:36` — preferir `min-height: 100dvh` para mobile.
- **[MÉDIO] `transition: width/height`** em `liquid-glass.css:544,711` e `VoiceOrb.tsx:372` — causa layout thrash. Migrar para `transform`/`grid-template-rows`.

### 4. Estados Interativos — BAIXO (positivo)

| Estado | Ocorrências | Status |
|---|---|---|
| Hover (`hover:`) | **354** | Bom |
| Skeletons (`Skeleton`/`animate-pulse`) | **166** | Excelente |
| Empty/error states | **113** | Excelente |
| Focus visible | `:focus-visible` global em `index.css:46` | Bom |

- **[BAIXO] `bounce-easing` em `timing.css:8,12` e `aiox-animations.css:13`** (`cubic-bezier(0.34, 1.56, 0.64, 1)`) — overshoot bounce em transições genéricas é datado. Migrar para `ease-out-quart/quint` exponencial.

### 5. Conteúdo — POSITIVO

- **Nenhuma ocorrência** de copy AI-cliché ("Seamless", "Elevate", "Unleash", "Empower", "Revolutionary") — exceto 1 comentário inócuo (`{/* Second set for seamless loop */}` em `EmbeddedScreen.tsx`).
- Mensagens de loading em PT-BR consistentes ("Carregando dashboard…", "Carregando squads…", etc.).
- Sem dados fake genéricos óbvios em strings (`fake|dummy|Lorem|placeholder Name` retornou 0).

### 6. Componentes — ALTO

- **[ALTO] 13 ocorrências de `side-tab` (`border-l-2/3/4`)** em cards: `RoadmapView` (2), `WorkflowExecutionDetails` (3), `WorkflowExecutionSidebar`, `WorkflowSidebar`, `NodeDetailPanel` (3), `AgentProfileModal`, `MarkdownRenderer`, `CockpitAlert`. **Tell mais reconhecível de UI gerada por IA.** Remover ou substituir por accent sutil (1px) ou ícone leading.
- Cards com `border + shadow + white` genéricos — não detectado padrão sistêmico (positivo).
- Modal usage: `Dialog.tsx` é o primitivo correto. Não vi modal-everywhere anti-pattern.

### 7. Código (Semântica + A11y) — ALTO

| Métrica | Valor | Análise |
|---|---|---|
| Elementos semânticos (`main/nav/header/footer/section/article/aside/h1-h3`) | **240** | Razoável |
| `<div>` total | **3.034** | Razão div:semântico = **12.6:1** — div soup moderado |
| `aria-label` / `role=` | **351** ocorrências em 591 arquivos | Bom |
| `sr-only` / skip-link / `skipToContent` | **8** | **Baixo** — falta skip-to-main em layout |
| `vitest-axe` instalado | Sim (^0.1.0) | Cobertura real precisa ser auditada |
| `e2e/accessibility.spec.ts` | Existe | Cobertura real precisa ser auditada |

- **[CRÍTICO] Razão `<div>:semântico` = 12.6:1** — sugere uso excessivo de `<div>` onde poderia haver `<section>`, `<article>`, `<nav>`, `<button>`. Refatoração progressiva por componente.
- **[ALTO] Apenas 8 ocorrências de `sr-only`/skip-link** em 591 arquivos — sem skip-to-main, screen readers precisam tabular toda a sidebar antes de chegar ao conteúdo.

---

## Tabela Consolidada de Issues

| # | Sev | Camada | Issue | Localização | Recomendação |
|---|---|---|---|---|---|
| 1 | CRÍTICO | Cor | 62× `bg-black` puro | 30+ arquivos (Sidebar, MessageBubble, ChatInput, MarkdownRenderer, TerminalCard, WorkflowCanvas, light-mode-compat.css…) | Substituir por token semântico `bg-background-base` ou `oklch(12% 0.01 250)` |
| 2 | CRÍTICO | Cor | Gradientes purple/violet (AI fingerprint) | `MemoryManager.tsx` 316/546/661, `WorkflowDialogs.tsx:153`, `WorkflowManager.tsx:217`, `NodeDetailPanel.tsx:286` | Trocar por cor sólida brand |
| 3 | CRÍTICO | Componentes | 13× side-tab `border-l-2/3/4` | `WorkflowExecutionDetails.tsx`, `NodeDetailPanel.tsx`, `RoadmapView.tsx`, `AgentProfileModal.tsx`, `MarkdownRenderer.tsx:768`, `CockpitAlert.tsx:26`, `WorkflowSidebar.tsx:273`, `WorkflowExecutionSidebar.tsx:182` | Remover ou usar accent sutil (1px) / ícone leading |
| 4 | CRÍTICO | A11y | Razão `<div>` para semântico ≈ 12.6:1 | App-wide | Auditar componentes top-3 (chat, layout, dashboard) e refatorar para semântica HTML5 |
| 5 | ALTO | Tipografia | Fonte body default = Roboto (overused) | `aiox-fonts.css:11` | Trocar por fonte distintiva (Geist já está no fontFamily; promover) |
| 6 | ALTO | Tipografia | `ExportChat.tsx:274` single-font | `ExportChat.tsx` | Pareiar display + body para hierarquia |
| 7 | ALTO | Cor | `dark-glow` em themes | `aiox.css:415`, `matrix.css:833` | Substituir por iluminação sutil/funcional |
| 8 | ALTO | Cor | `gradient-text` decorativo | `aiox-animations.css:201` | Cor sólida para texto |
| 9 | ALTO | A11y | Apenas 8 skip-links/sr-only em 591 arquivos | layout/AppLayout | Adicionar `Skip to main content` no AppLayout |
| 10 | ALTO | Componentes | `WorkflowExecutionDetails.tsx` 3× side-tab + 2× bg-black | linhas 265, 326, 572, 400, 594 | Refatoração focada — hotspot |
| 11 | ALTO | Componentes | `NodeDetailPanel.tsx` 3× side-tab + 1× bg-black + gradiente | linhas 203, 324, 346, 156, 286 | Refatoração focada — hotspot |
| 12 | MÉDIO | Layout | `body { min-height: 100vh }` em vez de `100dvh` | `index.css:36` | Trocar para `100dvh` (mobile) |
| 13 | MÉDIO | Layout | `transition: width/height` (layout thrash) | `liquid-glass.css:544/711`, `VoiceOrb.tsx:372` | Migrar para `transform` ou `grid-template-rows` |
| 14 | MÉDIO | Estados | `bounce-easing` em tokens e animações | `timing.css:8,12`, `aiox-animations.css:13` | Trocar por `ease-out-quart/quint` |
| 15 | MÉDIO | Cor | `light-mode-compat.css` ainda contém 5× `bg-black` | linhas 4, 98, 101, 104, 107 | Limpar shim agora que tokens semânticos estão prontos |
| 16 | MÉDIO | Cor | `aiox-components.css:167` + `aiox.css:484/488` + `glass.css:147/151` | tokens themes | Limpar `bg-black` puro nos themes |
| 17 | MÉDIO | A11y | Cobertura real de `vitest-axe` desconhecida | `__tests__/` | Rodar `npm test -- --reporter=verbose` e medir |
| 18 | BAIXO | Tipografia | Falta `font-display: swap` explícito? | `aiox-fonts.css` | Validar CDN `cdnfonts.com` headers |
| 19 | BAIXO | Estados | `:focus-visible` global é bom mas `outline-offset: 2px` pode ser cortado em containers `overflow: hidden` | `index.css:48` | Auditar containers críticos |
| 20 | BAIXO | Layout | `* { scroll-behavior: smooth }` aplicado globalmente | `index.css:53` | Considerar respeitar `prefers-reduced-motion` |

---

## Hotspots (top 5 arquivos com mais issues)

1. **`src/components/workflow/WorkflowExecutionDetails.tsx`** — 3 side-tab + 2 bg-black
2. **`src/components/workflow/NodeDetailPanel.tsx`** — 3 side-tab + 1 bg-black + 1 gradiente
3. **`src/components/chat/MarkdownRenderer.tsx`** — 1 side-tab + 4 bg-black
4. **`src/components/workflow/WorkflowCanvas.tsx`** — 4 bg-black
5. **`src/components/settings/MemoryManager.tsx`** — 3 gradientes purple

---

## Recomendação de Prioridade

### Sprint 1 (CRÍTICO — UX brand integrity)
1. **Codemod `bg-black` → token semântico** — script único `scripts/codemod/replace-bg-black.ts` que substitui `bg-black` por `bg-background-base` (ou novo token `bg-near-black` com `oklch(12% 0.01 250)`). Cobre **62 ocorrências em 30+ arquivos** com 1 PR.
2. **Eliminar gradientes purple/violet** — 5 ocorrências, fix manual (escolha cor brand sólida).
3. **Refatorar 13 side-tabs** — workshop UI: substituir `border-l-{2,3,4}` por accent ícone ou `border-l border-border-subtle`.

### Sprint 2 (ALTO — typography + a11y)
4. **Trocar Roboto default → Geist** (já está no `fontFamily`, só precisa promoção).
5. **Adicionar Skip to main content** no `AppLayout`.
6. **Refatorar hotspots `WorkflowExecutionDetails`, `NodeDetailPanel`** (concentram 8 issues).
7. **Auditar cobertura real de `vitest-axe` e `accessibility.spec.ts`** — expandir se < 70% rotas.

### Sprint 3 (MÉDIO — polish)
8. **Migrar `transition: width/height` → `transform`** (3 ocorrências, perf win).
9. **Trocar `bounce-easing` → `ease-out-quart`** em `timing.css` (sistêmico, 1 PR).
10. **Limpar `light-mode-compat.css`** se tokens semânticos cobrem o caso.
11. **`100vh` → `100dvh`** em `index.css:36`.

### Sprint 4 (BAIXO — backlog)
12. **Auditar div soup** em chat/layout/dashboard, refatorar progressivo para `<section>/<article>/<nav>`.
13. **`prefers-reduced-motion`** wrap em `scroll-behavior: smooth`.

---

## Notas

- **Pontos fortes do baseline:** design tokens em camadas (primitives → semantic → themes) bem arquitetados, hover/skeleton/empty states com cobertura excelente (633 ocorrências combinadas), copy livre de AI-cliché, 351 atributos a11y, `vitest-axe` + `accessibility.spec.ts` instalados.
- **Maior risco de marca:** os 62 `bg-black` + 13 side-tabs + 5 gradientes purple criam uma "assinatura visual de IA" que contradiz a sofisticação do design system. Resolver Sprint 1 transforma a percepção de qualidade.
- **Próximo passo recomendado:** abrir épico `epic-ui-baseline-cleanup` com 4 stories (uma por sprint acima).
