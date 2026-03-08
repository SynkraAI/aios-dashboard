'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Target,
  ChevronRight,
  RefreshCw,
  Loader2,
  FolderOpen,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { apiUrl } from '@/lib/api';
import { Badge } from '@/components/ui/badge';

interface PlanItem {
  id: string;
  name: string;
  description: string;
  category: string;
  filePath: string;
}

interface PlanGroup {
  category: string;
  label: string;
  count: number;
  items: PlanItem[];
}

const CATEGORY_COLORS: Record<string, string> = {
  database: 'text-purple-500 bg-purple-500/10',
  development: 'text-blue-500 bg-blue-500/10',
  quality: 'text-green-500 bg-green-500/10',
  devops: 'text-orange-500 bg-orange-500/10',
  creation: 'text-cyan-500 bg-cyan-500/10',
  analysis: 'text-yellow-500 bg-yellow-500/10',
  architecture: 'text-red-500 bg-red-500/10',
  brownfield: 'text-amber-500 bg-amber-500/10',
  general: 'text-muted-foreground bg-muted',
};

export function PlansPanel() {
  const [grouped, setGrouped] = useState<PlanGroup[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  const fetchPlans = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(apiUrl('/api/plans'));
      if (res.ok) {
        const json = await res.json();
        setGrouped(json.grouped || []);
        setTotal(json.total || 0);
        // Auto-expand first 3 categories
        const cats = (json.grouped || []).slice(0, 3).map((g: PlanGroup) => g.category);
        setExpandedCategories(new Set(cats));
      }
    } catch (error) {
      console.error('Failed to fetch plans:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPlans();
  }, [fetchPlans]);

  const toggleCategory = (category: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  };

  if (loading && grouped.length === 0) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 text-muted-foreground animate-spin" />
      </div>
    );
  }

  if (grouped.length === 0 && !loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <Target className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-lg font-medium">No Task Templates Found</p>
          <p className="text-sm text-muted-foreground mt-1">
            Task templates will appear from .aiox-core/development/tasks/
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center gap-3">
          <Target className="h-5 w-5 text-cyan-500" />
          <h2 className="text-lg font-semibold">Plans & Tasks</h2>
          <Badge variant="outline" className="text-xs">{total} templates</Badge>
        </div>
        <button onClick={fetchPlans} disabled={loading} className="p-1.5 rounded-md hover:bg-muted transition-colors">
          <RefreshCw className={cn('h-4 w-4 text-muted-foreground', loading && 'animate-spin')} />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {grouped.map((group) => {
          const isExpanded = expandedCategories.has(group.category);
          const colorClass = CATEGORY_COLORS[group.category] || CATEGORY_COLORS.general;

          return (
            <div key={group.category} className="border border-border rounded-lg overflow-hidden">
              <button
                onClick={() => toggleCategory(group.category)}
                className="w-full flex items-center justify-between p-3 bg-muted/30 hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <div className={cn('p-1 rounded', colorClass)}>
                    <FolderOpen className="h-3.5 w-3.5" />
                  </div>
                  <span className="font-medium text-sm capitalize">{group.label}</span>
                  <Badge variant="outline" className="text-xs">{group.count}</Badge>
                </div>
                <ChevronRight className={cn('h-4 w-4 transition-transform', isExpanded && 'rotate-90')} />
              </button>
              {isExpanded && (
                <div className="border-t border-border divide-y divide-border">
                  {group.items.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center gap-3 p-3 hover:bg-muted/30 transition-colors"
                    >
                      <Target className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{item.name}</p>
                        {item.description && (
                          <p className="text-xs text-muted-foreground truncate mt-0.5">{item.description}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between px-4 py-2 border-t border-border bg-muted/30">
        <span className="text-xs text-muted-foreground">
          From .aiox-core/development/tasks/
        </span>
        <span className="text-xs text-muted-foreground">
          {grouped.length} categories
        </span>
      </div>
    </div>
  );
}
