import { useState, useEffect, useCallback, useMemo, useRef, lazy, Suspense } from 'react';
import { dbGet, dbSet, dbExportAll, dbImportAll } from './db.js';
import { emptyDay, generateExportText, generateCSV, getDateStr } from './utils.js';

const TrackView = lazy(() => import('./TrackView.jsx'));
const PatternsView = lazy(() => import('./PatternsView.jsx'));
const PlanView = lazy(() => import('./PlanView.jsx'));
const LearnView = lazy(() => import('./LearnView.jsx'));
const DayEditor = lazy(() => import('./DayEditor.jsx'));

const DB_KEY = 'appdata';

function trapFocus(e, containerRef) {
  if (e.key !== 'Tab' || !containerRef.current) return;
  const focusable = containerRef.current.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
  if (focusable.length === 0) return;
  const first = focusable[0], last = focusable[focusable.length - 1];
  if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
  else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
}

function defaultData() {
  return { days: [], plan: { causes: [], barriers: [], strategies: [] } };
}

const TOUR_STEPS = [
  { tab: 'track', title: 'Track Your Day', desc: 'Log physical, mental, and emotional activity levels plus symptoms each day.' },
  { tab: 'patterns', title: 'See Your Patterns', desc: 'Discover what triggers crashes by reviewing trends and correlations.' },
  { tab: 'plan', title: 'Build Your Plan', desc: 'Identify causes, barriers, and strategies to prevent PEM crashes.' },
  { tab: 'learn', title: 'Learn About PEM', desc: 'Reference material from the Stanford PEM Avoidance Toolkit, hosted by the Open Medicine Foundation.' },
];

function LoadingFallback() {
  return <div style={{ textAlign: 'center', padding: 32, color: 'var(--tx-d)', fontSize: 13 }}>Loading&hellip;</div>;
}

export default function App() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('track');
  const [editDate, setEditDate] = useState(null);
  const [onboarded, setOnboarded] = useState(false);
  const [theme, setTheme] = useState('dark');
  const [exportOpen, setExportOpen] = useState(false);
  const [tourStep, setTourStep] = useState(null);
  const [reminderDismissed, setReminderDismissed] = useState(() => sessionStorage.getItem('reminderDismissed') === 'true');
  const exportModalRef = useRef(null);

  // Load from IndexedDB
  useEffect(() => {
    dbGet(DB_KEY).then(stored => {
      if (stored) {
        setData({ days: stored.days || [], plan: stored.plan || defaultData().plan });
        setOnboarded(stored.onboarded || false);
        setTheme(stored.theme || 'dark');
        if (stored.tourCompleted) setTourStep(null);
      } else {
        setData(defaultData());
      }
      setLoading(false);
    });
  }, []);

  // Save to IndexedDB
  const save = useCallback((newData, newOnboarded, newTheme) => {
    dbSet(DB_KEY, { days: newData.days, plan: newData.plan, onboarded: newOnboarded, theme: newTheme, tourCompleted: tourStep === null && onboarded });
  }, [tourStep, onboarded]);

  useEffect(() => {
    if (data && !loading) save(data, onboarded, theme);
  }, [data, onboarded, theme, loading, save]);

  const updateDay = useCallback((day) => {
    setData(prev => {
      const days = [...prev.days];
      const idx = days.findIndex(d => d.date === day.date);
      if (idx >= 0) days[idx] = day;
      else days.push(day);
      days.sort((a, b) => a.date.localeCompare(b.date));
      return { ...prev, days };
    });
  }, []);

  const deleteDay = useCallback((date) => {
    setData(prev => ({
      ...prev,
      days: prev.days.filter(d => d.date !== date),
    }));
    setEditDate(null);
  }, []);

  const updatePlan = useCallback((plan) => {
    setData(prev => ({ ...prev, plan }));
  }, []);

  const toggleTheme = () => setTheme(t => t === 'dark' ? 'light' : 'dark');

  // Apply theme class
  useEffect(() => {
    document.body.className = theme === 'light' ? 'light' : '';
  }, [theme]);

  // Backup: download JSON
  const handleBackup = async () => {
    try {
      const allData = await dbExportAll();
      const blob = new Blob([JSON.stringify(allData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `pem-toolkit-backup-${getDateStr()}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      alert('Could not create backup. Please try again.');
    }
  };

  // Restore: import JSON
  const handleRestore = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      try {
        const text = await file.text();
        const parsed = JSON.parse(text);
        if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) throw new Error('Invalid backup');
        // Only allow known keys to prevent prototype pollution and arbitrary data injection
        const ALLOWED_KEYS = new Set(['appdata', 'onboarded', 'theme', 'tourCompleted', 'reminderTime']);
        const sanitized = {};
        for (const [key, value] of Object.entries(parsed)) {
          if (!ALLOWED_KEYS.has(key)) continue;
          if (key === 'appdata' && typeof value === 'object' && value !== null) {
            // Validate appdata shape
            if (value.days && !Array.isArray(value.days)) continue;
            if (value.plan && typeof value.plan !== 'object') continue;
          }
          sanitized[key] = value;
        }
        if (Object.keys(sanitized).length === 0) throw new Error('No valid data found');
        await dbImportAll(sanitized);
        window.location.reload();
      } catch {
        alert('Could not restore backup. Make sure the file is a valid PEM Toolkit backup.');
      }
    };
    input.click();
  };

  // CSV download
  const handleCSVExport = () => {
    if (!data || !data.days.length) return;
    const csv = generateCSV(data.days);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pem-toolkit-data-${getDateStr()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Print report
  const handlePrint = () => window.print();

  // Onboarding tour
  const startTour = () => { setTourStep(0); setTab(TOUR_STEPS[0].tab); };
  const nextTour = () => {
    const next = tourStep + 1;
    if (next < TOUR_STEPS.length) {
      setTourStep(next);
      setTab(TOUR_STEPS[next].tab);
    } else {
      setTourStep(null);
    }
  };

  // Daily reminder check
  const today = getDateStr();
  const hasLoggedToday = data ? data.days.some(d => d.date === today) : true;
  const showReminder = onboarded && !loading && !hasLoggedToday && !reminderDismissed && tab === 'track';
  const printText = useMemo(() => data ? generateExportText(data.days, data.plan) : '', [data]);

  if (loading) {
    return (
      <div style={{ background: 'var(--bg)', minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: 'var(--tx-m)', fontSize: 16 }}>Loading&hellip;</div>
      </div>
    );
  }

  // Onboarding
  if (!onboarded) {
    return (
      <div role="dialog" aria-label="Welcome to PEM Avoidance Toolkit" style={{ position: 'fixed', inset: 0, background: 'var(--bg)', zIndex: 300, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px 24px', textAlign: 'center', overflowY: 'auto' }}>
        <div style={{ fontSize: 64, marginBottom: 24 }}>{'\u26A1'}</div>
        <div style={{ fontSize: 24, fontWeight: 700, marginBottom: 12, lineHeight: 1.3 }}>PEM Avoidance Toolkit</div>
        <div style={{ fontSize: 15, color: 'var(--tx-m)', lineHeight: 1.7, marginBottom: 32, maxWidth: 380 }}>
          Track your activities and symptoms to identify crash triggers and build your personalized avoidance plan. Based on the Stanford PEM Avoidance Toolkit, hosted by the Open Medicine Foundation.
        </div>
        <div style={{ textAlign: 'left', marginBottom: 32, maxWidth: 380, width: '100%' }}>
          {[
            'Rate physical, mental, and emotional activity (0-10) each day',
            'Score key symptoms morning, midday, and evening',
            'Mark crash days and add brief comments',
            'Review patterns to identify your personal triggers',
          ].map((text, i) => (
            <div key={i} style={{ display: 'flex', gap: 12, marginBottom: 16, alignItems: 'flex-start' }}>
              <div style={{ width: 28, height: 28, borderRadius: '50%', flexShrink: 0, background: 'var(--acc-d)', color: 'var(--acc)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, fontFamily: 'var(--mono)' }}>{i + 1}</div>
              <div style={{ fontSize: 14, color: 'var(--tx-m)', lineHeight: 1.5, paddingTop: 3 }}>{text}</div>
            </div>
          ))}
        </div>
        <div style={{ fontSize: 13, color: 'var(--tx-d)', marginBottom: 24, maxWidth: 380 }}>
          All your data stays on this device. Nothing is sent to any server.
        </div>
        <button onClick={() => { setOnboarded(true); startTour(); }} aria-label="Get Started" style={{
          background: 'var(--acc)', color: '#fff', border: 'none', borderRadius: 12,
          padding: '16px 48px', fontSize: 16, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font)',
        }}>Get Started</button>
      </div>
    );
  }

  const tabs = [
    { id: 'track', l: 'Track', i: '\uD83D\uDCCB' },
    { id: 'patterns', l: 'Patterns', i: '\uD83D\uDCCA' },
    { id: 'plan', l: 'Plan', i: '\uD83D\uDEE1\uFE0F' },
    { id: 'learn', l: 'Learn', i: '\uD83D\uDCD6' },
  ];

  return (
    <div style={{ maxWidth: 520, margin: '0 auto', minHeight: '100dvh', position: 'relative', paddingBottom: 80 }}>
      {/* Header */}
      <header style={{ padding: '18px 20px 14px', borderBottom: '1px solid var(--border)', background: 'linear-gradient(180deg, var(--surface), var(--bg))', position: 'sticky', top: 0, zIndex: 50 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 38, height: 38, borderRadius: 10, background: 'linear-gradient(135deg, var(--teal), var(--acc))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, color: '#fff', flexShrink: 0 }}>{'\u26A1'}</div>
          <div style={{ flex: 1 }}>
            <h1 style={{ fontSize: 17, fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1.2 }}>PEM Avoidance Toolkit</h1>
            <div style={{ fontSize: 11, color: 'var(--tx-d)', marginTop: 2 }}>Stanford · Hosted by Open Medicine Foundation</div>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <button onClick={toggleTheme} aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, padding: '6px 10px', fontSize: 12, color: 'var(--tx-m)', cursor: 'pointer', fontFamily: 'var(--font)', minHeight: 32 }}>
              {theme === 'dark' ? '\u2600 Light' : '\uD83C\uDF19 Dark'}
            </button>
            <button onClick={() => setExportOpen(true)} aria-label="Export data" style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, padding: '6px 10px', fontSize: 12, color: 'var(--tx-m)', cursor: 'pointer', fontFamily: 'var(--font)', minHeight: 32 }}>
              {'\uD83D\uDCE4'} Export
            </button>
          </div>
        </div>
      </header>

      {/* Reminder Banner */}
      {showReminder && (
        <div role="alert" style={{ margin: '12px 16px 0', padding: '12px 16px', background: 'var(--acc-d)', border: '1px solid rgba(96,165,250,0.3)', borderRadius: 10, display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 18 }}>{'\uD83D\uDD14'}</span>
          <div style={{ flex: 1, fontSize: 13, color: 'var(--acc)' }}>Don't forget to log today!</div>
          <button onClick={() => { setReminderDismissed(true); sessionStorage.setItem('reminderDismissed', 'true'); }} aria-label="Dismiss reminder" style={{ background: 'none', border: 'none', color: 'var(--tx-d)', fontSize: 16, cursor: 'pointer', padding: 4 }}>{'\u2715'}</button>
        </div>
      )}

      {/* Content */}
      <main style={{ padding: '14px 16px 0' }}>
        <Suspense fallback={<LoadingFallback />}>
          {tab === 'track' && <TrackView data={data} onEditDay={setEditDate} />}
          {tab === 'patterns' && <PatternsView data={data} />}
          {tab === 'plan' && <PlanView plan={data.plan} onUpdate={updatePlan} />}
          {tab === 'learn' && <LearnView />}
        </Suspense>
      </main>

      {/* Day Editor */}
      <Suspense fallback={null}>
        {editDate && (
          <DayEditor
            day={data.days.find(d => d.date === editDate) || emptyDay(editDate)}
            onSave={(day) => { updateDay(day); setEditDate(null); }}
            onCancel={() => setEditDate(null)}
            onDelete={data.days.some(d => d.date === editDate) ? deleteDay : null}
          />
        )}
      </Suspense>

      {/* Export Modal */}
      {exportOpen && (() => {
        const exportText = generateExportText(data.days, data.plan);
        return (
        <div ref={exportModalRef} role="dialog" aria-label="Export data" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }} onClick={() => setExportOpen(false)} onKeyDown={e => { if (e.key === 'Escape') setExportOpen(false); trapFocus(e, exportModalRef); }}>
          <div onClick={e => e.stopPropagation()} style={{ background: 'var(--surface)', borderRadius: 16, width: '100%', maxWidth: 480, maxHeight: '80dvh', overflowY: 'auto', padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <span style={{ fontSize: 16, fontWeight: 700 }}>Export & Backup</span>
              <button onClick={() => setExportOpen(false)} aria-label="Close export dialog" style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, padding: '6px 14px', fontSize: 13, color: 'var(--tx-m)', cursor: 'pointer', fontFamily: 'var(--font)' }}>Close</button>
            </div>
            <div style={{ fontSize: 13, color: 'var(--tx-m)', marginBottom: 12 }}>
              Share this with your doctor or support team.
            </div>
            <div style={{ background: 'var(--bg)', borderRadius: 8, padding: 14, maxHeight: 200, overflowY: 'auto', fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--tx-m)', lineHeight: 1.6, whiteSpace: 'pre-wrap', border: '1px solid var(--border)' }}>
              {exportText}
            </div>
            <button onClick={() => {
              navigator.clipboard.writeText(exportText).then(() => alert('Copied to clipboard!'));
            }} aria-label="Copy report to clipboard" style={{ width: '100%', marginTop: 12, background: 'var(--acc)', color: '#fff', border: 'none', borderRadius: 8, padding: '12px 20px', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font)' }}>
              Copy to Clipboard
            </button>

            <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10, color: 'var(--tx)' }}>More Options</div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button onClick={handleCSVExport} aria-label="Download CSV spreadsheet" style={{ flex: 1, background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: 'var(--tx-m)', cursor: 'pointer', fontFamily: 'var(--font)', minHeight: 44, minWidth: 120 }}>
                  {'\uD83D\uDCC4'} Download CSV
                </button>
                <button onClick={handlePrint} aria-label="Print report" style={{ flex: 1, background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: 'var(--tx-m)', cursor: 'pointer', fontFamily: 'var(--font)', minHeight: 44, minWidth: 120 }}>
                  {'\uD83D\uDDA8\uFE0F'} Print Report
                </button>
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                <button onClick={handleBackup} aria-label="Download backup file" style={{ flex: 1, background: 'var(--grn-d)', border: '1px solid rgba(74,222,128,0.3)', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: 'var(--grn)', cursor: 'pointer', fontFamily: 'var(--font)', minHeight: 44, fontWeight: 600 }}>
                  {'\uD83D\uDCBE'} Download Backup
                </button>
                <button onClick={handleRestore} aria-label="Restore from backup file" style={{ flex: 1, background: 'var(--yel-d)', border: '1px solid rgba(250,204,21,0.3)', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: 'var(--yel)', cursor: 'pointer', fontFamily: 'var(--font)', minHeight: 44, fontWeight: 600 }}>
                  {'\uD83D\uDCC2'} Restore Backup
                </button>
              </div>
            </div>
          </div>
        </div>
        );
      })()}

      {/* Onboarding Tour Overlay */}
      {tourStep !== null && tourStep < TOUR_STEPS.length && (
        <div role="dialog" aria-label="App tour" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 250, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div style={{ background: 'var(--surface)', borderRadius: 16, padding: 24, maxWidth: 340, width: '100%', textAlign: 'center', border: '1px solid var(--border)' }}>
            <div style={{ fontSize: 11, color: 'var(--tx-d)', marginBottom: 8, fontFamily: 'var(--mono)' }}>Step {tourStep + 1} of {TOUR_STEPS.length}</div>
            <div style={{ fontSize: 32, marginBottom: 12 }}>{tabs[tourStep]?.i}</div>
            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>{TOUR_STEPS[tourStep].title}</div>
            <div style={{ fontSize: 14, color: 'var(--tx-m)', lineHeight: 1.6, marginBottom: 20 }}>{TOUR_STEPS[tourStep].desc}</div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
              <button onClick={() => setTourStep(null)} aria-label="Skip tour" style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 20px', fontSize: 13, color: 'var(--tx-m)', cursor: 'pointer', fontFamily: 'var(--font)', minHeight: 44 }}>Skip</button>
              <button onClick={nextTour} aria-label={tourStep === TOUR_STEPS.length - 1 ? 'Finish tour' : 'Next step'} style={{ background: 'var(--acc)', border: 'none', borderRadius: 8, padding: '10px 24px', fontSize: 13, color: '#fff', fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font)', minHeight: 44 }}>
                {tourStep === TOUR_STEPS.length - 1 ? 'Done' : 'Next'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Print-only Report */}
      <div className="print-report" aria-hidden="true">
        <h2>PEM Avoidance Toolkit Report</h2>
        <p>Generated: {new Date().toLocaleDateString()}</p>
        <pre>{printText}</pre>
      </div>

      {/* Bottom Navigation */}
      <nav aria-label="Main navigation" style={{
        position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)',
        width: '100%', maxWidth: 520, background: 'var(--surface)',
        borderTop: '1px solid var(--border)', display: 'flex',
        padding: '8px 0 calc(12px + env(safe-area-inset-bottom, 0))', zIndex: 100,
      }}>
        {tabs.map(tb => (
          <button key={tb.id} onClick={() => setTab(tb.id)} aria-label={tb.l} aria-current={tab === tb.id ? 'page' : undefined} style={{
            flex: 1, background: 'none', border: 'none', display: 'flex',
            flexDirection: 'column', alignItems: 'center', gap: 3,
            padding: '6px 0', color: tab === tb.id ? 'var(--acc)' : 'var(--tx-d)',
            transition: 'color 0.2s', minHeight: 48, cursor: 'pointer', fontFamily: 'var(--font)',
          }}>
            <span style={{ fontSize: 18 }}>{tb.i}</span>
            <span style={{ fontSize: 10, fontWeight: 600 }}>{tb.l}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}
