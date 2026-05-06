# Story CDM-UI-003: Remover side-tabs e gradientes AI-fingerprint

**Status:** Ready for Dev
**Epic:** CDM-UI-001 Portal CDM Design Quality
**Sprint:** Wave 2 — Quick Wins
**Agente:** @dev
**Skill:** impeccable (shared design laws: absolute bans — side-stripe borders banidos)
**Complexidade:** S

executor: "@dev"
quality_gate: "@ux-expert"
quality_gate_tools: ["npx impeccable detect", "npm run test"]

---

## Story

**As a** developer maintaining the AIOX Dashboard,
**I want** os 13 side-tabs (`border-l-2/3/4` como accent colorido) e 5 gradientes purple/violet removidos dos componentes afetados,
**so that** a UI elimina os dois "AI fingerprints" mais óbvios identificados no QA baseline, substituindo-os por padrões de design system aceitos.

---

## Acceptance Criteria

- [ ] 1. `npx impeccable detect ./src` reporta **0 hits** para a categoria `side-tab` (baseline atual: 13)
- [ ] 2. `npx impeccable detect ./src` reporta **0 hits** para a categoria `ai-color-palette` (baseline atual: 5)
- [ ] 3. Os componentes afetados mantêm hierarquia visual clara sem os gradientes — a distinção entre elementos é comunicada por outros meios (cor sólida, espaçamento, background tint)
- [ ] 4. `npm run test` passa, incluindo vitest-axe (sem novos erros de a11y)
- [ ] 5. Nenhum CSS breakage — classes Tailwind não-relacionadas preservadas intactas

---

## 🤖 CodeRabbit Integration

### Story Type Analysis

**Primary Type**: Frontend
**Secondary Type(s)**: Architecture (eliminar padrões banidos pelo design system)
**Complexity**: Small — 4 arquivos alvo bem definidos, mudanças cirúrgicas

### Specialized Agent Assignment

**Primary Agents**:
- @dev (pre-commit reviews — obrigatório)
- @ux-expert (validação de hierarquia visual pós-remoção)

**Supporting Agents**:
- @qa (vitest-axe + Playwright a11y)

### Quality Gate Tasks

- [ ] Pre-Commit (@dev): Rodar `npx impeccable detect ./src` antes de marcar story complete — 0 hits em `side-tab` E `ai-color-palette`
- [ ] Pre-PR (@github-devops): Rodar `coderabbit --prompt-only --base main` antes de criar pull request
- [ ] Test Gate: `npm run test` deve passar sem regressões

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
- Confirmar que `border-l-2`, `border-l-3`, `border-l-4` com cor de accent foram removidos ou convertidos para `border` completo
- Confirmar que classes `from-purple-*`, `to-violet-*`, `from-violet-*`, `to-purple-*` foram removidas dos 5 arquivos alvo
- Hierarquia visual: alternativas às bordas laterais devem ser semanticamente equivalentes

**Secondary Focus**:
- Sem regressão em hover states existentes (preservar classes `hover:`)
- Verificar que substitutos usam tokens do design system, não valores hardcoded

---

## Tasks / Subtasks

- [ ] Task 1: Remover side-tabs (13 ocorrências) (AC: 1, 3, 5)
  - [ ] 1.1 Identificar todos os arquivos com `border-l-2`, `border-l-3`, `border-l-4` como accent colorido via `grep -r "border-l-[234]" src/ --include="*.tsx" -l`
  - [ ] 1.2 Para cada ocorrência, aplicar uma das alternativas aprovadas:
    - Converter para `border` completo (`border border-[var(--color-border)]`)
    - Usar background tint (`bg-[var(--color-surface-hover)]` ou similar)
    - Usar espaçamento/indentation para comunicar hierarquia
  - [ ] 1.3 Verificar especificamente os arquivos do QA baseline (ver Dev Notes — lista de hotspots)
  - [ ] 1.4 Rodar `npx impeccable detect ./src` — confirmar 0 hits `side-tab`

- [ ] Task 2: Remover gradientes AI-fingerprint (5 ocorrências) (AC: 2, 3, 5)
  - [ ] 2.1 `src/components/settings/MemoryManager.tsx` — localizar e substituir gradientes purple/violet
  - [ ] 2.2 `src/components/workflow/WorkflowDialogs.tsx` — substituir gradientes
  - [ ] 2.3 `src/components/workflow/WorkflowManager.tsx` — substituir gradientes
  - [ ] 2.4 `src/components/workflow/NodeDetailPanel.tsx` — substituir gradientes
  - [ ] 2.5 Para cada gradiente: substituir por **cor sólida única** do design system (ex: `bg-[var(--color-accent)]` ou `bg-[var(--color-primary)]`)
  - [ ] 2.6 Rodar `npx impeccable detect ./src` — confirmar 0 hits `ai-color-palette`

- [ ] Task 3: Validação de hierarquia visual (AC: 3)
  - [ ] 3.1 Revisar visualmente cada componente alterado — a distinção entre elementos ainda é clara?
  - [ ] 3.2 Se hierarquia ficou ambígua, usar background tint, font-weight, ou gap de espaçamento

- [ ] Task 4: Testes e validação final (AC: 4, 5)
  - [ ] 4.1 `npm run test` — sem novos erros (vitest-axe incluído)
  - [ ] 4.2 `npx impeccable detect ./src` — 0 hits em ambas as categorias
  - [ ] 4.3 Smoke test visual dos 4 componentes alterados nos themes `aiox` e `glass`

---

## Dev Notes

### Contexto do QA Baseline

Source: `docs/design/QA-UI-BASELINE.md`

**Side-tabs (13 ocorrências):**
- Padrão banido: `border-l-2/3/4` com cor de accent (ex: `border-l-4 border-purple-500`)
- Classificado como `side-tab` pelo impeccable — "tell clássico de UI gerada por IA"
- Alternativas aceitas: border completo, background tint, espaçamento

**Gradientes AI-fingerprint (5 ocorrências):**
- Padrão banido: gradientes `from-purple-*`, `to-violet-*` e combinações similares
- Classificados como `ai-color-palette` pelo impeccable
- Motivo: paleta purple/violet em gradientes é fingerprint de LLMs gerando UI

### Arquivos Alvo — Gradientes

| Arquivo | Tipo de gradiente provável |
|---|---|
| `src/components/settings/MemoryManager.tsx` | Header/card gradient purple/violet |
| `src/components/workflow/WorkflowDialogs.tsx` | Dialog header ou badge gradient |
| `src/components/workflow/WorkflowManager.tsx` | Panel header gradient |
| `src/components/workflow/NodeDetailPanel.tsx` | Node type indicator ou header |

### Alternativas de Substituição

**Para side-tabs:**
```
// ANTES (banido)
border-l-4 border-purple-500

// DEPOIS (opções)
border border-[var(--color-border-accent)]     // border completo
bg-[var(--color-surface-hover)] rounded-md     // background tint
pl-4 border-l border-[var(--color-border)]     // sutil com indent
```

**Para gradientes:**
```
// ANTES (banido)
bg-gradient-to-r from-purple-600 to-violet-600

// DEPOIS
bg-[var(--color-primary)]        // cor sólida do design system
bg-[var(--color-accent)]         // cor de destaque do sistema
```

### O que PRESERVAR

Source: `docs/design/QA-UI-BASELINE.md` — Seção "Pontos Fortes"

- **354 hover states** — preservar todas as classes `hover:` existentes
- Lógica dos dialogs/modals — apenas visual, sem mudança de comportamento
- Estado dos nós do workflow — não tocar em lógica de `NodeDetailPanel`

### Stack Técnica

- Tailwind CSS 3 — substituições via classes utilitárias ou `bg-[var(--token)]`
- Os 4 themes são controlados via `data-theme` no root — tokens semânticos respeitam todos automaticamente

### Testing

- **Detecção**: `npx impeccable detect ./src` — categorias `side-tab` e `ai-color-palette` devem ser 0
- **Testes unitários/a11y**: `npm run test` (vitest + vitest-axe)
- **E2E**: `e2e/accessibility.spec.ts` via Playwright

---

## Change Log

| Date | Version | Description | Author |
|------|---------|-------------|--------|
| 2026-05-06 | 1.0.0 | Story criada — Wave 2 CDM-UI-001 | @sm (River) |
