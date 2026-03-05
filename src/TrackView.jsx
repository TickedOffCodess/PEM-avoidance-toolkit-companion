import { getDateStr, formatDate, getWeekStart, activityColor, symptomColor, computeCrashRisk } from './utils.js';
import { Card, DaySummary, CrashBadge, BtnP } from './components.jsx';

export default function TrackView({ data, onEditDay }) {
  const today = getDateStr();
  const todayData = data.days.find(d => d.date === today);
  const ws = getWeekStart(today);
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(ws + 'T12:00:00');
    d.setDate(d.getDate() + i);
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  });

  const crashRisk = computeCrashRisk(data.days);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Crash Risk Warning */}
      {crashRisk && crashRisk.atRisk && (
        <div role="alert" style={{
          padding: '14px 16px', background: 'var(--red-d)',
          border: '1px solid rgba(248,113,113,0.3)', borderRadius: 12,
          display: 'flex', alignItems: 'flex-start', gap: 10,
        }}>
          <span style={{ fontSize: 20, flexShrink: 0, lineHeight: 1 }}>{'\u26A0\uFE0F'}</span>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--red)', marginBottom: 4 }}>
              Crash Risk: Activity Above Your Threshold
            </div>
            <div style={{ fontSize: 12, color: 'var(--tx-m)', lineHeight: 1.5 }}>
              Your 3-day average activity ({crashRisk.recentAvg}) exceeds your safe ceiling ({crashRisk.ceiling}).
              Consider resting today.
            </div>
          </div>
        </div>
      )}

      <Card>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600 }}>Today &mdash; {formatDate(today)}</div>
            <div style={{ fontSize: 11, color: 'var(--tx-d)', marginTop: 2 }}>
              {todayData ? 'Tap Edit to update' : 'No entry yet — tap to log'}
            </div>
          </div>
          <BtnP onClick={() => onEditDay(today)} aria-label={todayData ? 'Edit today\'s entry' : 'Log today\'s entry'}>{todayData ? 'Edit' : '+ Log'}</BtnP>
        </div>
        {todayData && <DaySummary day={todayData} />}
      </Card>

      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--tx-m)' }}>THIS WEEK</div>
      <Card>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 5, marginBottom: 8 }}>
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => (
            <div key={d} style={{ fontSize: 11, color: 'var(--tx-d)', textAlign: 'center', fontWeight: 600 }}>{d}</div>
          ))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 5 }} role="grid" aria-label="Weekly calendar">
          {weekDays.map(dateStr => {
            const day = data.days.find(d => d.date === dateStr);
            const isToday = dateStr === today;
            const isFuture = dateStr > today;
            const hasCrash = day?.crash === true;
            const oa = day?.overall_activity;
            const os = day?.overall_symptom;
            const avgS = os ? (() => {
              const vals = [os.am, os.mid, os.pm].filter(v => v !== '').map(Number);
              return vals.length > 0 ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : null;
            })() : null;

            return (
              <button key={dateStr} onClick={() => !isFuture && onEditDay(dateStr)} disabled={isFuture} aria-label={`${formatDate(dateStr)}${hasCrash ? ', crash day' : ''}${day ? '' : ', no entry'}`} style={{
                aspectRatio: '1', borderRadius: 8, cursor: isFuture ? 'default' : 'pointer',
                background: hasCrash ? 'var(--red-d)' : day ? 'var(--card)' : 'var(--bg)',
                border: isToday ? '2px solid var(--acc)' : hasCrash ? '2px solid var(--red)' : '1px solid var(--border)',
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                opacity: isFuture ? 0.3 : 1, gap: 2, minHeight: 44,
              }}>
                <span style={{ fontSize: 13, fontWeight: 600, fontFamily: 'var(--mono)', color: isToday ? 'var(--acc)' : 'var(--tx)' }}>
                  {new Date(dateStr + 'T12:00:00').getDate()}
                </span>
                {day && (
                  <div style={{ display: 'flex', gap: 3 }}>
                    {oa != null && oa !== '' && <div style={{ width: 5, height: 5, borderRadius: '50%', background: activityColor(oa) }} />}
                    {avgS !== null && <div style={{ width: 5, height: 5, borderRadius: '50%', background: symptomColor(avgS) }} />}
                  </div>
                )}
              </button>
            );
          })}
        </div>
        <div style={{ display: 'flex', gap: 14, marginTop: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
          {[['var(--grn)', 'Low'], ['var(--yel)', 'Moderate'], ['var(--org)', 'Elevated'], ['var(--red)', 'High / Crash']].map(([c, l]) => (
            <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <div style={{ width: 7, height: 7, borderRadius: '50%', background: c }} />
              <span style={{ fontSize: 10, color: 'var(--tx-d)' }}>{l}</span>
            </div>
          ))}
        </div>
      </Card>

      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--tx-m)' }}>RECENT ENTRIES</div>
      {[...data.days].reverse().slice(0, 10).map(day => (
        <button key={day.id} onClick={() => onEditDay(day.date)} aria-label={`${formatDate(day.date)}${day.crash ? ', crash day' : ''}`} style={{
          background: 'var(--card)', borderRadius: 12, padding: '14px 16px',
          border: `1px solid ${day.crash ? 'rgba(248,113,113,0.3)' : 'var(--border)'}`,
          cursor: 'pointer', width: '100%', textAlign: 'left', marginBottom: 8, fontFamily: 'var(--font)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <span style={{ fontSize: 13, fontWeight: 600 }}>{formatDate(day.date)}</span>
            {day.crash && <CrashBadge />}
          </div>
          <DaySummary day={day} compact />
        </button>
      ))}
      {data.days.length === 0 && (
        <div style={{ textAlign: 'center', padding: 24, color: 'var(--tx-d)', fontSize: 13 }}>
          No entries yet. Tap &ldquo;+ Log&rdquo; above to start tracking.
        </div>
      )}
    </div>
  );
}
