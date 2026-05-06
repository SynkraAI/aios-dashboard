# Story CDM-UI-004: Semântica HTML — reduzir razão div:semântico de 12.6:1 para ≤5:1

**Status:** Ready for Dev
**Epic:** CDM-UI-001 Portal CDM Design Quality
**Sprint:** Wave 2 — Quick Wins
**Agente:** @dev
**Skill:** redesign-skill (Code Quality section: div soup fix)
**Complexidade:** M

executor: "@dev"
quality_gate: "@qa"
quality_gate_tools: ["npm run test", "e2e/accessibility.spec.ts", "grep -c"]

---

## Story

**As a** developer maintaining the AIOX Dashboard,
**I want** os `<div>` genéricos substituídos por elementos HTML semânticos corretos nos hotspots identificados pelo QA baseline,
**so that** a razão div:semântico cai de 12.6:1 para ≤5:1, melhorando acessibilidade, SEO e legibilidade do DOM sem alterar comportamento ou lógica de negócio.

---

## Acceptance Criteria

- [ ] 1. A razão div:semântico cai de **12.6:1 para ≤5:1** — medida via: `grep -rc "<div" src/ --include="*.tsx" | awk -F: '{d+=$2} END {print d}'` comparado com count de elementos semânticos
- [ ] 2. `npm run test` passa sem novos erros (vitest-axe não reporta novos erros de a11y)
- [ ] 3. `e2e/accessibility.spec.ts` Playwright testes passam sem regressão
- [ ] 4. Nenhum CSS breakage — classes Tailwind existentes nos `<div>` substituídos são transferidas integralmente para o novo elemento semântico
- [ ] 5. Nenhuma mudança de lógica de negócio — apenas wrapper elements foram alterados

---

## 🤖 CodeRabbit Integration

### Story Type Analysis

**Primary Type**: Frontend
**Secondary Type(s)**: Architecture (qualidade de código — eliminação de div soup)
**Complexity**: Medium — múltiplos arquivos nos hotspots, mudança puramente estrutural mas requer cuidado com CSS e event handlers

### Specialized Agent Assignment

**Primary Agents**:
- @dev (pre-commit reviews — obrigatório)
- @qa (vitest-axe + Playwright a11y validation)

**Supporting Agents**:
- @ux-expert (verificação de comportamento visual pós-substituição)

### Quality Gate Tasks

- [ ] Pre-Commit (@dev): Medir razão div:semântico via grep após mudanças — deve ser ≤5:1
- [ ] Pre-Commit (@dev): `npm run test` sem novos erros
- [ ] Pre-PR (@github-devops): `coderabbit --prompt-only --base main` antes de criar PR
- [ ] A11y Gate: `e2e/accessibility.spec.ts` deve passar sem regressão

### Self-Healing Configuration

**Expected Self-Healing**:
- Primary Agent: @dev (light mode)
- Max Iterations: 2
- Timeout: 15 minutes
- Severity Filter: CRITICAL only

**Predicted Behavior**:
- CRITICAL issues: auto_fix (up to 2 iterations)
- HIGH issues: document_only (noted in Dev Notes)

### CodeRabbit Focus Areas

**Primary Focus**:
- Verificar que elementos semânticos têm o significado correto para o contexto (ex: `<nav>` só para navegação, não para wrappers genéricos)
- Verificar que classes Tailwind foram preservadas integralmente na substituição
- Verificar que ARIA roles não conflitem com elementos semânticos (ex: não usar `role="main"` em `<main>`)

**Secondary Focus**:
- Sem event handlers perdidos na substituição (onClick, onKeyDown, etc. devem estar no elemento correto)
- Sem mudança em estrutura CSS que possa quebrar flexbox/grid layout

---

## Tasks / Subtasks

- [ ] Task 1: Medir baseline e calcular meta (AC: 1)
  - [ ] 1.1 Contar divs atuais: `grep -rc "<div" src/ --include="*.tsx" | awk -F: '{sum+=$2} END {print sum}'`
  - [ ] 1.2 Contar elementos semânticos atuais: `grep -rcE "<(nav|main|article|aside|section|header|footer|figure|figcaption|time|address|mark)" src/ --include="*.tsx" | awk -F: '{sum+=$2} END {print sum}'`
  - [ ] 1.3 Documentar razão atual (deve ser ~12.6:1) e calcular quantos `<div>` precisam ser convertidos para atingir ≤5:1

- [ ] Task 2: Substituições em hotspots prioritários (AC: 1, 4, 5)
  - [ ] 2.1 `src/components/workflow/WorkflowExecutionDetails.tsx` — identificar wrappers semânticos: painel de detalhes → `<section>`, listas de dados → `<dl>/<dt>/<dd>`, cabeçalhos de seção → `<header>`
  - [ ] 2.2 `src/components/workflow/NodeDetailPanel.tsx` — painéis de detalhe → `<section>`, metadados do nó → elementos semânticos apropriados
  - [ ] 2.3 `src/components/chat/MarkdownRenderer.tsx` — verificar se já usa elementos semânticos do markdown (já pode ter `<article>`, `<p>`, etc.); adicionar `<article>` no wrapper se aplicável
  - [ ] 2.4 `src/components/workflow/WorkflowCanvas.tsx` — toolbar → `<nav>` ou `<menu>`, região principal do canvas → `<main>` ou `<section>`
  - [ ] 2.5 `src/components/settings/MemoryManager.tsx` — seções de configuração → `<section>`, cabeçalhos → `<header>`

- [ ] Task 3: Substituições adicionais para atingir meta ≤5:1 (AC: 1)
  - [ ] 3.1 Layout principal (`src/components/layout/`) — estrutura de página: `<header>`, `<main>`, `<aside>` para sidebar, `<footer>` se aplicável
  - [ ] 3.2 Cards e painéis em `src/components/dashboard/` — containers de informação independente → `<article>` ou `<section>`
  - [ ] 3.3 Menus de navegação — `<nav>` com `<ul>/<li>` para listas de links
  - [ ] 3.4 Medir razão após cada arquivo para acompanhar progresso

- [ ] Task 4: Verificação de integridade (AC: 2, 3, 4, 5)
  - [ ] 4.1 `npm run test` — vitest-axe não deve reportar novos erros
  - [ ] 4.2 `npx playwright test e2e/accessibility.spec.ts` — sem regressão
  - [ ] 4.3 Smoke test visual — layout não quebrou
  - [ ] 4.4 Medir razão final — confirmar ≤5:1

---

## Dev Notes

### Contexto do QA Baseline

Source: `docs/design/QA-UI-BASELINE.md`

- **Razão atual**: 3.034 `<div>` vs 240 elementos semânticos = **12.6:1**
- **Meta**: ≤5:1 (redução de ~60% na dependência de divs)
- O QA baseline identificou que o projeto JÁ TEM 240 elementos semânticos — boa base, mas diluídos em 3034 divs

### Hotspots identificados pelo QA (Top 5)

Source: `docs/design/QA-UI-BASELINE.md`

1. `src/components/workflow/WorkflowExecutionDetails.tsx`
2. `src/components/workflow/NodeDetailPanel.tsx`
3. `src/components/chat/MarkdownRenderer.tsx`
4. `src/components/workflow/WorkflowCanvas.tsx`
5. `src/components/settings/MemoryManager.tsx`

### Mapa de Substituição Semântica

| `<div>` atual (contexto) | Elemento semântico correto |
|---|---|
| Container de página inteira | `<main>` (único por página) |
| Barra lateral de navegação | `<aside>` |
| Links/menu de navegação | `<nav>` com `<ul>/<li>` |
| Cabeçalho de seção ou componente | `<header>` |
| Rodapé de seção ou componente | `<footer>` |
| Card/bloco de conteúdo independente | `<article>` |
| Seção temática com heading | `<section>` |
| Conteúdo complementar/tangencial | `<aside>` |
| Lista de metadados/propriedades | `<dl>/<dt>/<dd>` |
| Conteúdo com figura + legenda | `<figure>/<figcaption>` |

### Regras de Substituição SEGURA

**PODE substituir `<div>` por semântico quando:**
- O `<div>` é apenas um container/wrapper sem comportamento interativo direto
- O contexto semântico é claro (ex: único `<main>` por view, `<nav>` para listas de links)
- As classes Tailwind são transferidas integralmente (sem remoção)
- Nenhum event handler é movido de lugar

**NÃO substituir `<div>` quando:**
- Elemento é `draggable`, tem `onDrag*` handlers (canvas do workflow)
- Elemento usa `ref` para medição de DOM (pode quebrar dimensões)
- Contexto semântico é ambíguo
- Substituição implicaria em mudança de layout (elementos de bloco vs inline)

### Nota sobre `<section>` vs `<article>`

- `<article>`: conteúdo que faz sentido de forma independente (card de workflow, mensagem de chat, resultado de execução)
- `<section>`: agrupa conteúdo relacionado que precisa de `<h2>`/`<h3>` para identificação (seções de settings, painéis de detalhes)
- **SEMPRE** adicionar um `aria-label` ou heading quando usar `<section>` para evitar "landmark sem acessible name"

### Nota sobre ARIA e elementos semânticos

Não adicionar `role` redundante. Exemplos:
- `<nav>` não precisa de `role="navigation"` — já é implícito
- `<main>` não precisa de `role="main"`
- `<aside>` não precisa de `role="complementary"`
- Se o elemento JÁ TINHA um `role` explícito, verificar se o novo elemento semântico não conflita

### Stack Técnica

- React + TypeScript — substituições são puramente de JSX tag (sem mudança de lógica)
- Tailwind CSS 3 — classes transferidas integralmente
- vitest-axe para detecção de violações a11y em unit tests
- Playwright para testes e2e de acessibilidade

### Testing

- **Medição de razão**: grep counters (ver Task 1)
- **A11y unitária**: `npm run test` (vitest-axe) — sem novos erros
- **A11y e2e**: `npx playwright test e2e/accessibility.spec.ts`
- **Visual**: smoke test manual dos 5 hotspots

---

## Change Log

| Date | Version | Description | Author |
|------|---------|-------------|--------|
| 2026-05-06 | 1.0.0 | Story criada — Wave 2 CDM-UI-001 | @sm (River) |
