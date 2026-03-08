import useSWR from 'swr';
import { useEffect } from 'react';
import { useSquadStore } from '@/stores/squad-store';
import { apiUrl } from '@/lib/api';
import type { Squad, SquadConnection, SquadTier } from '@/types';

const fetcher = (url: string) =>
  fetch(url).then((res) => {
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  });

interface SquadsResponse {
  squads: Squad[];
  domainIndex: Record<string, string[]>;
  connections: SquadConnection[];
  summary: {
    total_agents: number;
    total_tasks: number;
    total_workflows: number;
    total_templates: number;
    total_checklists: number;
    total_data_files: number;
  };
}

interface SquadDetailResponse {
  squad: Squad & {
    tiers?: SquadTier[];
    objectives?: string[];
    keyCapabilities?: string[];
  };
}

export function useSquads() {
  const { data, error, isLoading, mutate } = useSWR<SquadsResponse>(
    apiUrl('/api/squads'),
    fetcher,
    { revalidateOnFocus: false }
  );

  const { setSquads, setConnections, setDomainIndex, setSummary } =
    useSquadStore();

  useEffect(() => {
    if (data) {
      setSquads(data.squads);
      setConnections(data.connections);
      setDomainIndex(data.domainIndex);
      setSummary(data.summary);
    }
  }, [data, setSquads, setConnections, setDomainIndex, setSummary]);

  return {
    squads: data?.squads ?? [],
    domainIndex: data?.domainIndex ?? {},
    connections: data?.connections ?? [],
    summary: data?.summary ?? { total_agents: 0, total_tasks: 0, total_workflows: 0, total_templates: 0, total_checklists: 0, total_data_files: 0 },
    isLoading,
    isError: !!error,
    refresh: mutate,
  };
}

export function useSquadDetail(name: string | null) {
  const { data, error, isLoading } = useSWR<SquadDetailResponse>(
    name ? apiUrl(`/api/squads/${name}`) : null,
    fetcher,
    { revalidateOnFocus: false }
  );

  return {
    squad: data?.squad ?? null,
    isLoading,
    isError: !!error,
  };
}

export interface AgentTask {
  id: string;
  name: string;
  description: string;
  category: string;
  agent: string;
  inputs: string[];
  outputs: string[];
  responsibilities: string[];
  antiPatterns: string[];
  tools: string[];
  estimatedDuration: string;
}

export interface AgentDetailData {
  id: string;
  name: string;
  title: string;
  icon: string;
  role: string;
  tier: string;
  description: string;
  principles: string[];
  tools: string[];
  commands: string[];
  tasks: AgentTask[];
  handoffs: { agent: string; when: string; squad?: string }[];
  sourceMarkdown?: string;
  sourcePath?: string;
}

interface AgentDetailResponse {
  agent: AgentDetailData;
}

// Section items types and hooks

export interface SectionItem {
  slug: string;
  name: string;
  relativePath: string;
}

interface SectionItemsResponse {
  items: SectionItem[];
}

export function useSquadSectionItems(squadName: string | null, section: string | null) {
  const { data, error, isLoading } = useSWR<SectionItemsResponse>(
    squadName && section ? apiUrl(`/api/squads/${squadName}/sections/${section}`) : null,
    fetcher,
    { revalidateOnFocus: false }
  );

  return {
    items: data?.items ?? [],
    isLoading,
    isError: !!error,
  };
}

export interface ItemContent {
  title: string;
  content: string;
  filePath: string;
  isYaml: boolean;
}

export function useSquadItemContent(squadName: string | null, section: string | null, slug: string | null) {
  const { data, error, isLoading } = useSWR<ItemContent>(
    squadName && section && slug ? apiUrl(`/api/squads/${squadName}/sections/${section}/${slug}`) : null,
    fetcher,
    { revalidateOnFocus: false }
  );

  return {
    item: data ?? null,
    isLoading,
    isError: !!error,
  };
}

export function useSquadAgentDetail(squadName: string | null, agentId: string | null) {
  const { data, error, isLoading } = useSWR<AgentDetailResponse>(
    squadName && agentId ? apiUrl(`/api/squads/${squadName}/agents/${agentId}`) : null,
    fetcher,
    { revalidateOnFocus: false }
  );

  return {
    agent: data?.agent ?? null,
    isLoading,
    isError: !!error,
  };
}
