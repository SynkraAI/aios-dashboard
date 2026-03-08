import { NextRequest } from 'next/server';
import { promises as fs } from 'fs';
import { watch, type FSWatcher } from 'fs';
import { open, type FileHandle } from 'fs/promises';
import path from 'path';
import { randomUUID } from 'crypto';

const VALID_AGENTS = ['dev', 'qa', 'architect', 'pm', 'po', 'analyst', 'devops', 'main'];
import { resolveProjectRoot } from '@/lib/project-registry';

const INITIAL_LINES = 50;
const POLL_INTERVAL = 2000;
const HEARTBEAT_INTERVAL = 30000;

interface TerminalLine {
  id: string;
  content: string;
  timestamp: string;
  isInitial: boolean;
}

function formatSSE(eventType: string, data: unknown): string {
  return `event: ${eventType}\ndata: ${JSON.stringify(data)}\n\n`;
}

function parseLines(text: string): string[] {
  return text.split('\n').filter((line) => line.length > 0);
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const agent = searchParams.get('agent');
  const since = searchParams.get('since');

  // Validate agent parameter
  if (!agent) {
    return new Response(JSON.stringify({ error: 'Missing required parameter: agent' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (!VALID_AGENTS.includes(agent)) {
    return new Response(
      JSON.stringify({ error: `Invalid agent. Valid agents: ${VALID_AGENTS.join(', ')}` }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const projectRoot = await resolveProjectRoot();
  const logFilePath = path.join(projectRoot, '.aiox', 'logs', `${agent}.log`);

  const encoder = new TextEncoder();
  let isStreamActive = true;
  let watcher: FSWatcher | null = null;
  let pollInterval: ReturnType<typeof setInterval> | null = null;
  let heartbeatInterval: ReturnType<typeof setInterval> | null = null;
  let fileOffset = 0;
  let partialLine = '';

  const stream = new ReadableStream({
    async start(controller) {
      const sendEvent = (eventType: string, data: unknown) => {
        if (!isStreamActive) return;
        try {
          controller.enqueue(encoder.encode(formatSSE(eventType, data)));
        } catch {
          isStreamActive = false;
        }
      };

      const sendLines = (lines: TerminalLine[]) => {
        for (const line of lines) {
          sendEvent('line', line);
        }
      };

      // Send initial batch from log file
      try {
        const content = await fs.readFile(logFilePath, 'utf-8');
        const allLines = parseLines(content);
        fileOffset = Buffer.byteLength(content, 'utf-8');

        // Filter by `since` if provided
        let linesToSend = allLines;
        if (since) {
          const sinceDate = new Date(since).getTime();
          // Try to parse timestamps from lines, otherwise send last N
          linesToSend = allLines.filter((line) => {
            const match = line.match(/^\[?(\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2})/);
            if (match) {
              return new Date(match[1]).getTime() > sinceDate;
            }
            return true;
          });
        }

        // Limit initial batch
        const initialBatch = linesToSend.slice(-INITIAL_LINES);
        const terminalLines: TerminalLine[] = initialBatch.map((line) => ({
          id: randomUUID(),
          content: line,
          timestamp: new Date().toISOString(),
          isInitial: true,
        }));

        sendLines(terminalLines);
      } catch (err) {
        if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
          sendEvent('status', { message: 'No log file available', agent });
        } else {
          sendEvent('error', { message: 'Failed to read log file' });
        }
      }

      // Read new bytes from file
      const readNewLines = async () => {
        if (!isStreamActive) return;

        try {
          const stat = await fs.stat(logFilePath);
          const currentSize = stat.size;

          // File was truncated/rotated — reset
          if (currentSize < fileOffset) {
            fileOffset = 0;
            partialLine = '';
          }

          if (currentSize <= fileOffset) return;

          // Read only new bytes
          let fh: FileHandle | null = null;
          try {
            fh = await open(logFilePath, 'r');
            const bytesToRead = currentSize - fileOffset;
            const buffer = Buffer.alloc(bytesToRead);
            await fh.read(buffer, 0, bytesToRead, fileOffset);
            fileOffset = currentSize;

            const text = partialLine + buffer.toString('utf-8');
            const lines = text.split('\n');

            // Last element might be a partial line
            partialLine = lines.pop() || '';

            const terminalLines: TerminalLine[] = lines
              .filter((line) => line.length > 0)
              .map((line) => ({
                id: randomUUID(),
                content: line,
                timestamp: new Date().toISOString(),
                isInitial: false,
              }));

            if (terminalLines.length > 0) {
              sendLines(terminalLines);
            }
          } finally {
            if (fh) await fh.close();
          }
        } catch {
          // File might not exist yet — ignore
        }
      };

      // Try fs.watch first, fallback to polling
      try {
        watcher = watch(logFilePath, { persistent: false }, () => {
          readNewLines();
        });
        watcher.on('error', () => {
          // Fallback to polling
          if (!pollInterval) {
            pollInterval = setInterval(readNewLines, POLL_INTERVAL);
          }
        });
      } catch {
        // fs.watch not available — use polling
        pollInterval = setInterval(readNewLines, POLL_INTERVAL);
      }

      // Heartbeat
      heartbeatInterval = setInterval(() => {
        sendEvent('heartbeat', { alive: true });
      }, HEARTBEAT_INTERVAL);
    },

    cancel() {
      isStreamActive = false;
      if (watcher) {
        watcher.close();
        watcher = null;
      }
      if (pollInterval) {
        clearInterval(pollInterval);
        pollInterval = null;
      }
      if (heartbeatInterval) {
        clearInterval(heartbeatInterval);
        heartbeatInterval = null;
      }
    },
  });

  // Handle client disconnect
  request.signal.addEventListener('abort', () => {
    isStreamActive = false;
    if (watcher) watcher.close();
    if (pollInterval) clearInterval(pollInterval);
    if (heartbeatInterval) clearInterval(heartbeatInterval);
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
