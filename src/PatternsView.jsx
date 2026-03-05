import { avgField, activityColor, symptomColor, getLast30Dates, computeCorrelations } from './utils.js';
import { Card, Sparkline, StatBox } from './components.jsx';

function HeatmapCalendar({ days }) {
  const dates = getLast30Dates();
  const dayMap = {};
  days.forEach(d => { dayMap[d.date] = d; });

  // Find which weekday the first date falls on (0=Sun...6=Sat)
  const firstDay = new Date(dates[0] + 'T12:00:00');
  const startDow = (firstDay.getDay() + 6) % 7; // shift so Mon=0

  const cells = [];
  for (let i = 0; i < startDow; i++) cells.push(null);
  dates.forEach(d => cells.push(d));

  return (
    <Card title="30-Day Activity Heatmap">
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 3, marginBottom: 8 }}>
        {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
          <div key={i} style={{ fontSize: 9, color: 'var(--tx-d)', textAlign: 'center', fontWeight: 600 }}>{d}</div>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 3 }}>
        {cells.map((dateStr, i) => {
          if (!dateStr) return <div key={`empty-${i}`} />;
          const day = dayMap[dateStr];
          const oa = day?.overall_activity != null && day?.overall_activity !== '' ? +day.overall_activity : null;
          const hasCrash = day?.crash === true;
          const bg = hasCrash ? 'var(--red)' : oa !== null ? activityColor(oa) : 'var(--bg)';
          const dayNum = new Date(dateStr + 'T12:00:00').getDate();
          return (
            <div key={dateStr} title={`${dateStr}${oa !== null ? ` Activity: ${oa}` : ''}${hasCrash ? ' CRASH' : ''}`} style={{
              aspectRatio: '1', borderRadius: 4, background: bg,
              opacity: hasCrash ? 1 : oa !== null ? 0.7 : 0.15,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 9, fontWeight: 600, fontFamily: 'var(--mono)',
              color: hasCrash ? '#fff' : oa !== null ? '#000' : 'var(--tx-d)',
              border: hasCrash ? '1px solid var(--red)' : '1px solid transparent',
            }}>
              {dayNum}
            </div>
          );
        })}
      </div>
      <div style={{ display: 'flex', gap: 10, marginTop: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
        {[['var(--grn)', 'Low'], ['var(--yel)', 'Med'], ['var(--org)', 'High'], ['var(--red)', 'Crash']].map(([c, l]) => (
          <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <div style={{ width: 10, height: 10, borderRadius: 2, background: c, opacity: 0.7 }} />
            <span style={{ fontSize: 9, color: 'var(--tx-d)' }}>{l}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}

function CorrelationMatrix({ days }) {
  const result = computeCorrelations(days);
  if (!result) return null;
  const { labels, matrix } = result;

  const corrColor = (v) => {
    if (v === null) return 'transparent';
    if (v > 0.5) return 'var(--red)';
    if (v > 0.2) return 'var(--org)';
    if (v > -0.2) return 'var(--tx-d)';
    if (v > -0.5) return 'var(--teal)';
    return 'var(--grn)';
  };

  const corrBg = (v) => {
    if (v === null) return 'transparent';
    const abs = Math.abs(v);
    if (v > 0) return `rgba(248,113,113,${abs * 0.3})`;
    return `rgba(45,212,191,${abs * 0.3})`;
  };

  return (
    <Card title="Metric Correlations">
      <div style={{ fontSize: 11, color: 'var(--tx-d)', marginBottom: 10 }}>
        Red = tend to increase together. Green = inversely related. Based on your tracked data.
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: 10 }} role="table" aria-label="Correlation matrix">
          <thead>
            <tr>
              <th style={{ padding: 4 }} />
              {labels.map(l => (
                <th key={l} style={{ padding: '4px 2px', color: 'var(--tx-d)', fontWeight: 600, fontSize: 9, textAlign: 'center', writingMode: 'vertical-rl', transform: 'rotate(180deg)', height: 60 }}>{l}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {labels.map((rowLabel, ri) => (
              <tr key={rowLabel}>
                <td style={{ padding: '4px 6px 4px 0', color: 'var(--tx-m)', fontSize: 10, fontWeight: 500, whiteSpace: 'nowrap' }}>{rowLabel}</td>
                {matrix[ri].map((val, ci) => (
                  <td key={ci} style={{
                    padding: 2, textAlign: 'center',
                  }}>
                    {ri === ci ? (
                      <div style={{ width: '100%', aspectRatio: '1', borderRadius: 3, background: 'var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <span style={{ fontSize: 8, color: 'var(--tx-d)' }}>&mdash;</span>
                      </div>
                    ) : (
                      <div style={{
                        width: '100%', aspectRatio: '1', borderRadius: 3,
                        background: corrBg(val),
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        <span style={{ fontSize: 9, fontFamily: 'var(--mono)', fontWeight: 600, color: corrColor(val) }}>
                          {val !== null ? (val > 0 ? '+' : '') + val.toFixed(1) : ''}
                        </span>
                      </div>
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

export default function PatternsView({ data }) {
  const days = data.days;
  const last14 = days.slice(-14);
  const last30 = days.slice(-30);
  const crashDays = last30.filter(d => d.crash === true);
  const nonCrash = last30.filter(d => d.crash !== true && d.overall_activity != null && d.overall_activity !== '');

  const av = (arr, fn) => {
    const vals = arr.map(fn).filter(v => v !== null && !isNaN(v));
    return vals.length > 0 ? (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1) : '—';
  };

  const numOrNull = v => (v == null || v === '' ? null : (isNaN(Number(v)) ? null : Number(v)));
  const comps = [
    ['Overall Activity', d => numOrNull(d.overall_activity)],
    ['Physical', d => numOrNull(d.physical)],
    ['Mental', d => numOrNull(d.mental)],
    ['Emotional', d => numOrNull(d.emotional)],
    ['Fatigue', d => avgField(d.fatigue)],
    ['Pain', d => avgField(d.pain)],
    ['Brain Fog', d => avgField(d.brain_fog)],
    ['Overall Symptom', d => avgField(d.overall_symptom)],
  ];

  const preCrash = [];
  crashDays.forEach(cd => {
    for (let o = 1; o <= 5; o++) {
      const d = new Date(cd.date + 'T12:00:00');
      d.setDate(d.getDate() - o);
      const s = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
      const found = days.find(x => x.date === s);
      if (found) preCrash.push({ day: found, off: o });
    }
  });

  const symTrend = last30.map(d => avgField(d.overall_symptom)).filter(v => v !== null);
  const actTrend = last30.map(d => d.overall_activity != null && d.overall_activity !== '' ? Number(d.overall_activity) : null).filter(v => v !== null && !isNaN(v));
  const badSleep = last14.filter(d => d.unrefreshing_sleep === true).length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ fontSize: 15, fontWeight: 600 }}>Pattern Analysis</div>

      {days.length < 3 && (
        <Card><div style={{ fontSize: 13, color: 'var(--tx-m)', padding: 8, textAlign: 'center' }}>
          Log at least 3 days to see patterns. The toolkit recommends tracking for several weeks.
        </div></Card>
      )}

      <div style={{ display: 'flex', gap: 10, marginBottom: 4 }}>
        <StatBox label="Crashes (30d)" value={crashDays.length} color={crashDays.length > 3 ? 'var(--red)' : crashDays.length > 1 ? 'var(--yel)' : 'var(--grn)'} />
        <StatBox label="Bad Sleep (14d)" value={badSleep} color={badSleep > 5 ? 'var(--red)' : badSleep > 2 ? 'var(--yel)' : 'var(--grn)'} />
        <StatBox label="Days Tracked" value={days.length} color="var(--acc)" />
      </div>

      {/* 30-day Heatmap */}
      {days.length >= 3 && <HeatmapCalendar days={days} />}

      {symTrend.length > 2 && (
        <Card title="Overall Symptom Trend"><Sparkline data={symTrend} color="var(--org)" /></Card>
      )}
      {actTrend.length > 2 && (
        <Card title="Overall Activity Trend"><Sparkline data={actTrend} color="var(--acc)" /></Card>
      )}

      {crashDays.length > 0 && nonCrash.length > 0 && (
        <Card title="Crash vs Non-Crash Days (Averages)">
          <div style={{ display: 'flex', gap: 8, fontSize: 10, color: 'var(--tx-d)', padding: '0 4px', marginBottom: 4 }}>
            <span style={{ flex: 1 }}>Metric</span>
            <span style={{ width: 55, textAlign: 'right', color: 'var(--red)' }}>Crash</span>
            <span style={{ width: 55, textAlign: 'right', color: 'var(--grn)' }}>OK</span>
          </div>
          {comps.map(([label, fn]) => (
            <div key={label} style={{ display: 'flex', gap: 8, fontSize: 13, padding: '6px 4px', borderBottom: '1px solid rgba(42,51,64,0.2)', alignItems: 'center' }}>
              <span style={{ flex: 1, color: 'var(--tx-m)' }}>{label}</span>
              <span style={{ width: 55, textAlign: 'right', fontFamily: 'var(--mono)', color: 'var(--red)', fontWeight: 600 }}>{av(crashDays, fn)}</span>
              <span style={{ width: 55, textAlign: 'right', fontFamily: 'var(--mono)', color: 'var(--grn)', fontWeight: 600 }}>{av(nonCrash, fn)}</span>
            </div>
          ))}
        </Card>
      )}

      {preCrash.length > 0 && (
        <Card title="Days Before Crashes — Activity">
          <div style={{ fontSize: 11, color: 'var(--tx-d)', marginBottom: 10 }}>
            Crashes can be delayed 1-5 days. This shows activity before each crash.
          </div>
          {[1, 2, 3, 4, 5].map(o => {
            const matching = preCrash.filter(p => p.off === o);
            if (!matching.length) return null;
            const a = av(matching.map(p => p.day), d => numOrNull(d.overall_activity));
            return (
              <div key={o} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '5px 0' }}>
                <span style={{ width: 80, fontSize: 12, color: 'var(--tx-m)' }}>{o} day{o > 1 ? 's' : ''} before</span>
                <div style={{ flex: 1, height: 20, background: 'var(--bg)', borderRadius: 5, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${(+a / 10) * 100}%`, background: activityColor(a), borderRadius: 5, opacity: 0.6 }} />
                </div>
                <span style={{ width: 35, textAlign: 'right', fontSize: 13, fontFamily: 'var(--mono)', fontWeight: 600, color: activityColor(a) }}>{a}</span>
              </div>
            );
          })}
        </Card>
      )}

      {days.length >= 7 && (() => {
        const afterBad = [], afterGood = [];
        days.forEach((d, i) => {
          if (i + 1 < days.length) {
            const next = days[i + 1];
            const ns = avgField(next.overall_symptom);
            if (ns !== null) {
              if (d.unrefreshing_sleep === true) afterBad.push(ns);
              else if (d.unrefreshing_sleep === false) afterGood.push(ns);
            }
          }
        });
        if (afterBad.length === 0 && afterGood.length === 0) return null;
        const avgB = afterBad.length > 0 ? (afterBad.reduce((a, b) => a + b, 0) / afterBad.length).toFixed(1) : '—';
        const avgG = afterGood.length > 0 ? (afterGood.reduce((a, b) => a + b, 0) / afterGood.length).toFixed(1) : '—';

        return (
          <Card title="Unrefreshing Sleep & Next-Day Symptoms">
            <div style={{ display: 'flex', gap: 16 }}>
              {[[avgB, 'After unrefreshing sleep', afterBad.length, 'var(--red)'], [avgG, 'After refreshing sleep', afterGood.length, 'var(--grn)']].map(([val, lbl, cnt, col]) => (
                <div key={lbl} style={{ flex: 1, textAlign: 'center', padding: '12px 0', background: 'var(--bg)', borderRadius: 8 }}>
                  <div style={{ fontSize: 22, fontWeight: 700, fontFamily: 'var(--mono)', color: col }}>{val}</div>
                  <div style={{ fontSize: 10, color: 'var(--tx-d)', marginTop: 3 }}>{lbl}</div>
                  <div style={{ fontSize: 9, color: 'var(--tx-d)' }}>({cnt} days)</div>
                </div>
              ))}
            </div>
          </Card>
        );
      })()}

      {/* Correlation Matrix */}
      {days.length >= 7 && <CorrelationMatrix days={days} />}
    </div>
  );
}
