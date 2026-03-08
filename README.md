# AIOX Dashboard

**Real-time observability interface for AIOX projects.**

---

## Features

| View | Description |
|------|-------------|
| **Kanban** | Story board with drag-and-drop (Backlog, Doing, Done) |
| **Monitor** | Real-time event feed from Claude Code (tools, prompts, errors) |
| **Agents** | AIOX agents (@dev, @qa, @architect, etc) — active and standby |
| **Squads** | Visual org chart of installed squads with drill-down to agents and tasks |
| **Bob** | Bob Orchestrator execution tracking (autonomous dev pipeline) |
| **Roadmap** | Planned features visualization |
| **GitHub** | GitHub integration (PRs, issues) |
| **Insights** | Project statistics and metrics |
| **Context** | Active rules, agent definitions, MCP servers |
| **Plans** | Task plans from .aiox-core |
| **PRDs** | Product requirement documents |
| **QA** | Quality assurance metrics |
| **Terminals** | Multi-terminal grid |
| **Settings** | Dashboard configuration |

---

## Architecture

```
CLI First > Observability Second > UI Third
```

This dashboard operates in the **Observability** layer. It observes but never controls.

---

## Multi-Project Support

The dashboard supports multiple AIOX projects via a project registry at `~/.aios/dashboard/projects.json`.

```bash
# List registered projects
curl localhost:3100/aiox-dashboard/api/projects

# Register a new project
curl -X POST localhost:3100/aiox-dashboard/api/projects/register \
  -H 'Content-Type: application/json' \
  -d '{"name":"my-project","path":"/path/to/my-project"}'
```

API routes accept `?project=<name>` query parameter to scope data to a specific project.

---

## Systemd Services

```bash
# Dashboard (Next.js on port 3100)
systemctl status aiox-dashboard

# Monitor server (Bun on port 4001)
systemctl status aiox-monitor

# Restart both
systemctl restart aiox-monitor aiox-dashboard
```

---

## API Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /api/status` | AIOX CLI connection status |
| `GET /api/stories` | List all stories |
| `GET /api/squads` | List all squads |
| `GET /api/github` | GitHub issues and PRs |
| `GET /api/insights` | Project metrics |
| `GET /api/context` | Active rules, agents, configs |
| `GET /api/roadmap` | Roadmap items |
| `GET /api/plans` | Task plans |
| `GET /api/prds` | PRD documents |
| `GET /api/qa/metrics` | QA metrics |
| `GET /api/bob/status` | Bob orchestrator status |
| `GET /api/projects` | Registered projects |
| `POST /api/projects/register` | Register a project |
| `GET /api/events` | SSE event stream |
| `GET /api/logs?agent=dev` | Agent log stream (SSE) |

## License

MIT
