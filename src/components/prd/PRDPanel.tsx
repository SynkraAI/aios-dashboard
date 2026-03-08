'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  FileText,
  ChevronRight,
  RefreshCw,
  Loader2,
  ArrowLeft,
  User,
  Clock,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { apiUrl } from '@/lib/api';
import { Badge } from '@/components/ui/badge';

interface PRDSummary {
  slug: string;
  title: string;
  version: string;
  author: string;
  date: string;
  description: string;
  filePath: string;
}

export function PRDPanel() {
  const [prds, setPrds] = useState<PRDSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);
  const [prdContent, setPrdContent] = useState<string | null>(null);
  const [contentLoading, setContentLoading] = useState(false);

  const fetchPRDs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(apiUrl('/api/prds'));
      if (res.ok) {
        const json = await res.json();
        setPrds(json.prds || []);
      }
    } catch (error) {
      console.error('Failed to fetch PRDs:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchPRDContent = useCallback(async (slug: string) => {
    setContentLoading(true);
    try {
      const res = await fetch(apiUrl(`/api/prds/${slug}`));
      if (res.ok) {
        const json = await res.json();
        setPrdContent(json.content || '');
      }
    } catch (error) {
      console.error('Failed to fetch PRD content:', error);
    } finally {
      setContentLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPRDs();
  }, [fetchPRDs]);

  const handleSelect = (slug: string) => {
    setSelectedSlug(slug);
    fetchPRDContent(slug);
  };

  const handleBack = () => {
    setSelectedSlug(null);
    setPrdContent(null);
  };

  if (loading && prds.length === 0) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 text-muted-foreground animate-spin" />
      </div>
    );
  }

  if (prds.length === 0 && !loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-lg font-medium">No PRDs Found</p>
          <p className="text-sm text-muted-foreground mt-1">
            Add PRD files as docs/prd-*.md in your project
          </p>
        </div>
      </div>
    );
  }

  // Detail view
  if (selectedSlug && prdContent !== null) {
    const prd = prds.find(p => p.slug === selectedSlug);
    return (
      <div className="h-full flex flex-col">
        <div className="flex items-center gap-3 p-4 border-b border-border">
          <button onClick={handleBack} className="p-1.5 rounded-md hover:bg-muted transition-colors">
            <ArrowLeft className="h-4 w-4 text-muted-foreground" />
          </button>
          <FileText className="h-5 w-5 text-blue-500" />
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-semibold truncate">{prd?.title || selectedSlug}</h2>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              {prd?.version && <Badge variant="outline" className="text-xs">v{prd.version}</Badge>}
              {prd?.author && <span className="flex items-center gap-1"><User className="h-3 w-3" />{prd.author}</span>}
              {prd?.date && <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{prd.date}</span>}
            </div>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-6">
          {contentLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 text-muted-foreground animate-spin" />
            </div>
          ) : (
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-foreground">
                {prdContent}
              </pre>
            </div>
          )}
        </div>
      </div>
    );
  }

  // List view
  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center gap-3">
          <FileText className="h-5 w-5 text-blue-500" />
          <h2 className="text-lg font-semibold">PRDs</h2>
          <Badge variant="outline" className="text-xs">{prds.length}</Badge>
        </div>
        <button onClick={fetchPRDs} disabled={loading} className="p-1.5 rounded-md hover:bg-muted transition-colors">
          <RefreshCw className={cn('h-4 w-4 text-muted-foreground', loading && 'animate-spin')} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {prds.map((prd) => (
          <button
            key={prd.slug}
            onClick={() => handleSelect(prd.slug)}
            className="w-full flex items-center gap-4 p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors text-left group"
          >
            <div className="p-2 rounded-lg bg-blue-500/10">
              <FileText className="h-5 w-5 text-blue-500" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm truncate">{prd.title}</p>
              <p className="text-xs text-muted-foreground truncate mt-1">{prd.description}</p>
              <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                <Badge variant="outline" className="text-xs">v{prd.version}</Badge>
                <span className="flex items-center gap-1"><User className="h-3 w-3" />{prd.author}</span>
                <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{prd.date}</span>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
          </button>
        ))}
      </div>

      <div className="flex items-center justify-between px-4 py-2 border-t border-border bg-muted/30">
        <span className="text-xs text-muted-foreground">
          Scanned from docs/prd-*.md
        </span>
        <span className="text-xs text-muted-foreground">
          {prds.length} document{prds.length !== 1 ? 's' : ''}
        </span>
      </div>
    </div>
  );
}
