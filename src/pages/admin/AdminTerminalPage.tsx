// ============================================
// Admin Terminal / CLI Command Console Page
// ============================================
import { useState, useRef, useEffect } from 'react';
import {
  Terminal,
  Play,
  RotateCcw,
  Trash2,
  Download,
  HelpCircle,
  BarChart2,
  Users,
  Receipt,
  CheckCircle2,
  AlertTriangle,
  Info,
  CornerDownLeft,
} from 'lucide-react';
import { api } from '../../lib/api';
import { exportMonthBackup } from '../../lib/exportSheet';
import { useToast } from '../../contexts/ToastContext';

interface TerminalLine {
  id: string;
  text: string;
  type?: 'default' | 'success' | 'warning' | 'error' | 'info' | 'highlight' | 'muted' | 'command';
  timestamp?: string;
}

export default function AdminTerminalPage() {
  const toast = useToast();
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);
  const [lines, setLines] = useState<TerminalLine[]>([
    {
      id: 'welcome-1',
      text: 'BARAHA MESS 2.0 — ADMIN COMMAND CONSOLE [Version 2.0.4]',
      type: 'highlight',
    },
    {
      id: 'welcome-2',
      text: 'Type "help" to view available commands or use the quick buttons below.',
      type: 'muted',
    },
    {
      id: 'welcome-3',
      text: 'Tip: You can add expenses, record payments, delete members, undo actions, or backup data directly from here.',
      type: 'info',
    },
  ]);

  const terminalEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [lines, loading]);

  const executeCommand = async (cmdToRun?: string) => {
    const command = (cmdToRun !== undefined ? cmdToRun : input).trim();
    if (!command) return;

    if (command.toLowerCase() === 'clear' || command.toLowerCase() === 'cls') {
      setLines([]);
      setInput('');
      return;
    }

    const commandLine: TerminalLine = {
      id: `cmd-${Date.now()}`,
      text: `$ ${command}`,
      type: 'command',
      timestamp: new Date().toLocaleTimeString(),
    };

    setLines((prev) => [...prev, commandLine]);
    setHistory((prev) => [command, ...prev.filter((c) => c !== command)]);
    setHistoryIndex(-1);
    setInput('');
    setLoading(true);

    try {
      const res = await api.post<{
        lines?: Array<{ text: string; type?: string }>;
        action?: string;
        backup_data?: any;
      }>('/admin/terminal', { command });

      const rawLines = res.data?.lines || (res as any).lines;
      const action = res.data?.action || (res as any).action;
      const backupData = res.data?.backup_data || (res as any).backup_data;

      if (rawLines && Array.isArray(rawLines)) {
        const newLines: TerminalLine[] = rawLines.map((l, i) => ({
          id: `res-${Date.now()}-${i}`,
          text: l.text,
          type: (l.type as any) || 'default',
        }));
        setLines((prev) => [...prev, ...newLines]);
      } else if (!res.success) {
        setLines((prev) => [
          ...prev,
          {
            id: `err-${Date.now()}`,
            text: res.error || 'Command failed to execute.',
            type: 'error',
          },
        ]);
      }

      // Handle Excel backup action trigger
      if (action === 'download_backup' && backupData) {
        exportMonthBackup(backupData);
        toast.success('Excel backup spreadsheet downloaded');
      }
    } catch (err: any) {
      setLines((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          text: `Network Error: ${err?.message || 'Failed to connect to server'}`,
          type: 'error',
        },
      ]);
    }

    setLoading(false);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      executeCommand();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (history.length > 0) {
        const nextIndex = Math.min(historyIndex + 1, history.length - 1);
        setHistoryIndex(nextIndex);
        setInput(history[nextIndex] || '');
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex > 0) {
        const nextIndex = historyIndex - 1;
        setHistoryIndex(nextIndex);
        setInput(history[nextIndex] || '');
      } else if (historyIndex === 0) {
        setHistoryIndex(-1);
        setInput('');
      }
    }
  };

  const quickCommands = [
    { label: 'Help', icon: HelpCircle, cmd: 'help' },
    { label: 'Stats', icon: BarChart2, cmd: 'stats' },
    { label: 'Members', icon: Users, cmd: 'members' },
    { label: 'Expenses', icon: Receipt, cmd: 'expenses 10' },
    { label: 'Undo Last', icon: RotateCcw, cmd: 'undo' },
    { label: 'Backup Excel', icon: Download, cmd: 'backup' },
    { label: 'Clear', icon: Trash2, cmd: 'clear' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 5.5rem)', gap: '0.75rem' }}>
      {/* Header */}
      <div className="page-header" style={{ marginBottom: 0 }}>
        <div className="page-header-left">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Terminal size={22} className="text-primary" />
            <h1 style={{ fontSize: '1.25rem', margin: 0 }}>Admin Terminal Console</h1>
          </div>
          <p className="text-xs text-muted" style={{ marginTop: '0.125rem' }}>
            Execute quick operations, edit expenses, record payments, and manage mess data via command line
          </p>
        </div>
      </div>

      {/* Quick Actions Bar */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '0.5rem',
          padding: '0.5rem 0.75rem',
          backgroundColor: 'var(--card)',
          borderRadius: 'var(--radius)',
          border: '1px solid var(--border)',
        }}
      >
        <span style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)', alignSelf: 'center', marginRight: '0.25rem', fontWeight: 600 }}>
          Quick Commands:
        </span>
        {quickCommands.map((qc) => (
          <button
            key={qc.label}
            className="btn btn-secondary btn-sm"
            style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem', height: '1.875rem' }}
            onClick={() => executeCommand(qc.cmd)}
            disabled={loading}
          >
            <qc.icon size={13} />
            {qc.label}
          </button>
        ))}
      </div>

      {/* Terminal Window */}
      <div
        onClick={() => inputRef.current?.focus()}
        style={{
          flex: 1,
          backgroundColor: '#090d16',
          color: '#e2e8f0',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid #1e293b',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
          boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.4)',
        }}
      >
        {/* Terminal Titlebar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0.5rem 0.875rem',
            backgroundColor: '#0f172a',
            borderBottom: '1px solid #1e293b',
            userSelect: 'none',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
            <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#ef4444' }} />
            <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#f59e0b' }} />
            <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#10b981' }} />
            <span style={{ fontSize: '0.75rem', color: '#94a3b8', marginLeft: '0.5rem', fontWeight: 600 }}>
              admin@baraha-mess:~
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.6875rem', color: '#64748b' }}>UTF-8</span>
            <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#22c55e' }} />
          </div>
        </div>

        {/* Terminal Body */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '1rem',
            fontSize: '0.8125rem',
            lineHeight: 1.6,
            display: 'flex',
            flexDirection: 'column',
            gap: '0.25rem',
          }}
        >
          {lines.map((l) => {
            let color = '#cbd5e1';
            let fontWeight = 'normal';

            if (l.type === 'command') {
              color = '#38bdf8';
              fontWeight = 'bold';
            } else if (l.type === 'highlight') {
              color = '#f8fafc';
              fontWeight = 'bold';
            } else if (l.type === 'success') {
              color = '#4ade80';
            } else if (l.type === 'warning') {
              color = '#fbbf24';
            } else if (l.type === 'error') {
              color = '#f87171';
            } else if (l.type === 'info') {
              color = '#67e8f9';
            } else if (l.type === 'muted') {
              color = '#64748b';
            }

            return (
              <div
                key={l.id}
                style={{
                  color,
                  fontWeight,
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                }}
              >
                {l.text}
              </div>
            );
          })}

          {loading && (
            <div style={{ color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span className="loader-spinner" style={{ width: '0.75rem', height: '0.75rem', borderWidth: '2px' }} />
              Executing command...
            </div>
          )}

          <div ref={terminalEndRef} />
        </div>

        {/* Command Input Bar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            padding: '0.625rem 1rem',
            backgroundColor: '#0c1322',
            borderTop: '1px solid #1e293b',
            gap: '0.5rem',
          }}
        >
          <span style={{ color: '#10b981', fontWeight: 700, fontSize: '0.8125rem', whiteSpace: 'nowrap' }}>
            admin@baraha:$
          </span>
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a command (e.g. expense Mohamed 45 Groceries, stats, backup, help)..."
            disabled={loading}
            autoFocus
            style={{
              flex: 1,
              backgroundColor: 'transparent',
              border: 'none',
              outline: 'none',
              color: '#f8fafc',
              fontFamily: 'inherit',
              fontSize: '0.875rem',
            }}
          />
          <button
            className="btn btn-primary btn-sm"
            style={{ height: '1.875rem', padding: '0 0.625rem', fontSize: '0.75rem' }}
            onClick={() => executeCommand()}
            disabled={loading || !input.trim()}
          >
            <CornerDownLeft size={12} /> Run
          </button>
        </div>
      </div>
    </div>
  );
}
