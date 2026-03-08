'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import type { Components } from 'react-markdown';
import { Mermaid } from '@/components/mermaidcn/mermaid';

interface MarkdownRendererProps {
  content: string;
  hideFirstH1?: boolean;
}

const components: Components = {
  h1: ({ children }) => (
    <h1 className="text-sm font-semibold text-gold mb-3 mt-5 first:mt-0 leading-tight">
      {children}
    </h1>
  ),
  h2: ({ children }) => (
    <h2 className="text-reading font-semibold text-text-primary mb-2 mt-4 leading-snug">
      {children}
    </h2>
  ),
  h3: ({ children }) => (
    <h3 className="text-xs font-semibold text-text-primary mb-2 mt-3 leading-snug">
      {children}
    </h3>
  ),
  h4: ({ children }) => (
    <h4 className="text-label font-semibold text-text-secondary mb-1.5 mt-2.5">
      {children}
    </h4>
  ),
  p: ({ children }) => (
    <p className="text-label text-text-secondary leading-relaxed mb-3">
      {children}
    </p>
  ),
  strong: ({ children }) => (
    <strong className="font-semibold text-text-primary">{children}</strong>
  ),
  em: ({ children }) => (
    <em className="italic text-text-muted">{children}</em>
  ),
  ul: ({ children }) => (
    <ul className="list-disc list-inside mb-3 space-y-1 text-text-secondary">
      {children}
    </ul>
  ),
  ol: ({ children }) => (
    <ol className="list-decimal list-inside mb-3 space-y-1 text-text-secondary">
      {children}
    </ol>
  ),
  li: ({ children }) => (
    <li className="text-label leading-relaxed">{children}</li>
  ),
  blockquote: ({ children }) => (
    <blockquote className="border-l-2 border-gold pl-3 my-3 text-text-muted italic">
      {children}
    </blockquote>
  ),
  code: ({ className, children }) => {
    const isBlock = className?.includes('language-');
    // Render Mermaid code blocks as diagrams
    if (className === 'language-mermaid') {
      const chartText = String(children).replace(/\n$/, '');
      return (
        <Mermaid
          chart={chartText}
          config={{ theme: 'dark', darkMode: true }}
          className="my-4"
        />
      );
    }
    if (isBlock) {
      return (
        <code className={`${className} font-mono`}>
          {children}
        </code>
      );
    }
    return (
      <code className="font-mono bg-bg-tertiary text-gold px-1 py-0.5 text-detail">
        {children}
      </code>
    );
  },
  pre: ({ children }) => {
    // If the child is a Mermaid diagram (already rendered by code component), don't wrap in pre
    const child = children as React.ReactElement<{ className?: string }>;
    if (child?.props?.className === 'language-mermaid') {
      return <>{children}</>;
    }
    return (
      <pre className="bg-bg-tertiary border border-border p-3 mb-3 overflow-x-auto font-mono text-detail leading-relaxed">
        {children}
      </pre>
    );
  },
  table: ({ children }) => (
    <div className="overflow-x-auto mb-3">
      <table className="border-collapse w-full text-detail">
        {children}
      </table>
    </div>
  ),
  thead: ({ children }) => (
    <thead className="border-b border-border">{children}</thead>
  ),
  th: ({ children }) => (
    <th className="text-left px-2 py-1.5 font-semibold text-gold text-detail uppercase tracking-wider">
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td className="px-2 py-1.5 border-b border-border text-text-secondary text-detail">
      {children}
    </td>
  ),
  hr: () => (
    <hr className="border-border my-4" />
  ),
  a: ({ href, children }) => (
    <a
      href={href}
      className="text-gold underline underline-offset-2 hover:brightness-110"
      target="_blank"
      rel="noopener noreferrer"
    >
      {children}
    </a>
  ),
};

export function MarkdownRenderer({ content, hideFirstH1 }: MarkdownRendererProps) {
  let processedContent = content;
  if (hideFirstH1) {
    processedContent = content.replace(/^#\s+.+\n?/, '');
  }

  return (
    <div className="max-w-none">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight]}
        components={components}
      >
        {processedContent}
      </ReactMarkdown>
    </div>
  );
}
