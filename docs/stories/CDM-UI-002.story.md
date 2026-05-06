# Story CDM-UI-002: Eliminar `bg-black` puro — migrar para tokens semânticos

**Status:** Ready for Dev
**Epic:** CDM-UI-001 Portal CDM Design Quality
**Sprint:** Wave 2 — Quick Wins
**Agente:** @dev
**Skill:** taste-skill (Rule 2: NO Pure Black)
**Complexidade:** M

executor: "@dev"
quality_gate: "@ux-expert"
quality_gate_tools: ["npx impeccable detect", "npm run lint", "npm run typecheck"]

---

## Story

**As a** developer maintaining the AIOX Dashboard,
**I want** all 62 occurrences of `bg-black` hardcoded Tailwind class replaced with the correct semantic design tokens from `src/styles/tokens/`,
**so that** the UI respects the design system across all 4 themes and eliminates the "AI-generated UI" fingerprint of raw #000 values.

---

## Acceptance Criteria

- [ ] 1. `npx impeccable detect ./src` reporta **0 hits** para a categoria `pure-black-white` (baseline atual: 62)
- [ ] 2. Todos os 4 themes (`aiox`, `glass`, `matrix`, `liquid-glass`) continuam renderizando corretamente — sem quebra visual
- [ ] 3. `npm run lint` passa sem novos erros
- [ ] 4. `npm run typecheck` passa sem novos erros
- [ ] 5. Os hotspots prioritários foram endereçados: `Sidebar`, `MessageBubble`, `ChatInput`, `MarkdownRenderer`, `TerminalCard`, `WorkflowCanvas`
- [ ] 6. Nenhum token novo foi inventado — apenas tokens já existentes em `src/styles/tokens/` foram utilizados

---

## 🤖 CodeRabbit Integration

### Story Type Analysis

**Primary Type**: Frontend
**Secondary Type(s)**: Architecture (design system enforcement)
**Complexity**: Medium — afeta 30+ arquivos, escopo bem definido, sem mudança de lógica

### Specialized Agent Assignment

**Primary Agents**:
- @dev (pre-commit reviews — obrigatório)
- @ux-expert (validação de consistência visual pós-migração)

**Supporting Agents**:
- @qa (verificação de regressão via vitest-axe)

### Quality Gate Tasks

- [ ] Pre-Commit (@dev): Rodar `npx impeccable detect ./src` antes de marcar story complete — deve retornar 0 hits `pure-black-white`
- [ ] Pre-PR (@github-devops): Rodar `coderabbit --prompt-only --base main` antes de criar pull request
- [ ] Visual Smoke Test: Verificar os 4 themes manualmente ou via Playwright screenshot diff

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
- Verificar que nenhum `bg-black` residual permaneceu (grep `bg-black` deve retornar 0)
- Verificar que tokens usados existem em `src/styles/tokens/` (sem tokens inventados)
- Consistência de substituição — mesma classe `bg-black` em contextos similares deve usar o mesmo token

**Secondary Focus**:
- Sem quebra de responsividade (classes Tailwind adjacentes preservadas)
- CSS custom properties dos tokens resolvendo corretamente no runtime

---

## Tasks / Subtasks

- [ ] Task 1: Mapear tokens semânticos disponíveis (AC: 6)
  - [ ] 1.1 Ler `src/styles/tokens/semantic/colors.css` e listar variáveis de background disponíveis
  - [ ] 1.2 Ler `src/styles/tokens/primitives/colors.css` para entender a camada base
  - [ ] 1.3 Documentar mapeamento: contexto de uso → token correto (ex: `bg-black` em sidebar → `bg-[var(--color-surface-primary)]`)

- [ ] Task 2: Substituir hotspots prioritários (AC: 1, 5)
  - [ ] 2.1 `src/components/layout/Sidebar.tsx` (e subcomponentes)
  - [ ] 2.2 `src/components/chat/MessageBubble.tsx`
  - [ ] 2.3 `src/components/chat/ChatInput.tsx`
  - [ ] 2.4 `src/components/chat/MarkdownRenderer.tsx`
  - [ ] 2.5 `src/components/workflow/WorkflowCanvas.tsx`
  - [ ] 2.6 Buscar e substituir `TerminalCard` (verificar path exato em `src/components/terminals/`)

- [ ] Task 3: Substituir ocorrências restantes (AC: 1)
  - [ ] 3.1 Rodar `grep -r "bg-black" src/ --include="*.tsx" --include="*.ts" -l` para listar todos os arquivos restantes
  - [ ] 3.2 Processar cada arquivo aplicando o mapeamento definido em Task 1
  - [ ] 3.3 Verificar arquivos em: `src/components/workflow/`, `src/components/settings/`, `src/components/ui/`, `src/components/dashboard/`

- [ ] Task 4: Validação final (AC: 1, 2, 3, 4)
  - [ ] 4.1 `npx impeccable detect ./src` — confirmar 0 hits `pure-black-white`
  - [ ] 4.2 `npm run lint` — sem erros novos
  - [ ] 4.3 `npm run typecheck` — sem erros novos
  - [ ] 4.4 Smoke test visual: abrir o app nos 4 themes e verificar que não há artefatos visuais

---

## Dev Notes

### Contexto do QA Baseline

Source: `docs/design/QA-UI-BASELINE.md`

- **62 ocorrências** de `bg-black` distribuídas em **30+ arquivos**
- Severidade: CRÍTICO (Rule 2 do taste-skill: NO Pure Black)
- O problema é visual: `bg-black` = #000 puro, que é um tell clássico de UI gerada por IA

### Sistema de Tokens

Source: `docs/design/QA-UI-BASELINE.md` + inspeção de `src/styles/tokens/`

O projeto já possui um sistema de tokens em 4 camadas:
```
src/styles/tokens/
├── primitives/    # valores brutos (cores hex, tamanhos)
├── semantic/      # tokens com significado (surface-primary, text-muted, etc.)
├── component/     # tokens específicos por componente
└── themes/        # aiox.css, glass.css, matrix.css, liquid-glass.css
```

**REGRA CRÍTICA**: Usar APENAS tokens já existentes. NÃO inventar novos tokens CSS.

### Mapeamento de Substituição Esperado

| Contexto de `bg-black` | Token semântico provável |
|---|---|
| Background de containers/cards escuros | `bg-[var(--color-surface-primary)]` ou `bg-[var(--color-background)]` |
| Overlay/modal backdrop | `bg-[var(--color-overlay)]` ou `bg-black/80` (opacity ok, pure black não) |
| Terminal/code backgrounds | `bg-[var(--color-surface-code)]` ou similar |
| Sidebar background | `bg-[var(--color-sidebar-bg)]` se existir, ou `bg-[var(--color-surface-secondary)]` |

**IMPORTANTE**: O dev deve verificar os tokens reais presentes nos arquivos CSS antes de aplicar — esta tabela é orientativa, não prescritiva.

### O que PRESERVAR

Source: `docs/design/QA-UI-BASELINE.md` — Seção "Pontos Fortes"

- **354 hover states** — NÃO remover classes `hover:` ao substituir
- **166 skeletons** — manter estrutura dos loading states
- **113 empty/error states** — manter intactos
- Fonte **TASAOrbiterDisplay + Roboto Mono** — NÃO tocar em tipografia
- **Lógica de negócio** — esta story é de puro refactoring visual, sem mudança de comportamento

### Stack Técnica

- Tailwind CSS 3 (não v4) — tokens devem ser usados via `bg-[var(--token-name)]` ou classes customizadas
- React + TypeScript
- `data-theme` attribute no root para os 4 themes

### Testing

- **Comando de detecção**: `npx impeccable detect ./src` (ou `npx impeccable@latest detect ./src`)
- **Critério de sucesso**: 0 hits na categoria `pure-black-white`
- **Regressão a11y**: `npm run test` deve passar (inclui vitest-axe)
- **E2E**: `e2e/accessibility.spec.ts` via Playwright

---

## Change Log

| Date | Version | Description | Author |
|------|---------|-------------|--------|
| 2026-05-06 | 1.0.0 | Story criada — Wave 2 CDM-UI-001 | @sm (River) |
