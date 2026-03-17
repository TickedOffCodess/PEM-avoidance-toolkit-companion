function toLocalDateStr(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function getDateStr(offset = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return toLocalDateStr(d);
}

export function formatDate(s) {
  return new Date(s + 'T12:00:00').toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric'
  });
}

export function getWeekStart(s) {
  const d = new Date(s + 'T12:00:00');
  const day = d.getDay();
  d.setDate(d.getDate() - day + (day === 0 ? -6 : 1));
  return toLocalDateStr(d);
}

export function activityColor(v) {
  if (v == null || v === '') return 'var(--tx-d)';
  const n = Number(v);
  if (isNaN(n)) return 'var(--tx-d)';
  if (n <= 3) return 'var(--grn)';
  if (n <= 5) return 'var(--yel)';
  if (n <= 7) return 'var(--org)';
  return 'var(--red)';
}

export function symptomColor(v) {
  if (v == null || v === '') return 'var(--tx-d)';
  const n = Number(v);
  if (isNaN(n)) return 'var(--tx-d)';
  if (n <= 2) return 'var(--grn)';
  if (n <= 4) return 'var(--yel)';
  if (n <= 6) return 'var(--org)';
  return 'var(--red)';
}

export function avgField(f) {
  if (!f) return null;
  const vals = [f.am, f.mid, f.pm]
    .filter(x => x !== '' && x !== undefined)
    .map(Number)
    .filter(x => !isNaN(x));
  return vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
}

export function calcOverallActivity(form) {
  const vals = [form.physical, form.mental, form.emotional]
    .filter(x => x !== '' && x !== undefined && x !== null)
    .map(Number)
    .filter(x => !isNaN(x));
  return vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
}

export function calcOverallSymptom(form, period) {
  const fields = [form.fatigue, form.pain, form.nausea_gi, form.brain_fog];
  if (form.other_symptom && form.other_symptom.name) {
    fields.push(form.other_symptom);
  }
  const vals = fields
    .map(f => f && f[period])
    .filter(x => x !== '' && x !== undefined && x !== null)
    .map(Number)
    .filter(x => !isNaN(x));
  return vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
}

export function emptyDay(date) {
  return {
    id: `day-${date}`,
    date,
    physical: '', mental: '', emotional: '', overall_activity: '',
    overrideActivity: false, overrideSymptom: false,
    unrefreshing_sleep: null,
    fatigue: { am: '', mid: '', pm: '' },
    pain: { am: '', mid: '', pm: '' },
    nausea_gi: { am: '', mid: '', pm: '' },
    brain_fog: { am: '', mid: '', pm: '' },
    other_symptom: { name: '', am: '', mid: '', pm: '' },
    overall_symptom: { am: '', mid: '', pm: '' },
    crash: null,
    comments: '',
  };
}

export function generateCSV(days) {
  const headers = [
    'Date', 'Physical', 'Mental', 'Emotional', 'Overall Activity',
    'Unrefreshing Sleep', 'Fatigue AM', 'Fatigue Mid', 'Fatigue PM',
    'Pain AM', 'Pain Mid', 'Pain PM', 'Nausea/GI AM', 'Nausea/GI Mid', 'Nausea/GI PM',
    'Brain Fog AM', 'Brain Fog Mid', 'Brain Fog PM',
    'Other Symptom Name', 'Other Symptom AM', 'Other Symptom Mid', 'Other Symptom PM',
    'Overall Symptom AM', 'Overall Symptom Mid', 'Overall Symptom PM',
    'Crash', 'Comments',
  ];
  const esc = (v) => {
    let s = String(v == null ? '' : v);
    // Guard against CSV formula injection
    if (s.length > 0 && '=+-@'.includes(s[0])) s = "'" + s;
    return s.includes(',') || s.includes('"') || s.includes('\n') ? '"' + s.replace(/"/g, '""') + '"' : s;
  };
  const rows = [headers.join(',')];
  days.forEach(d => {
    rows.push([
      d.date, d.physical, d.mental, d.emotional, d.overall_activity,
      d.unrefreshing_sleep === true ? 'Yes' : d.unrefreshing_sleep === false ? 'No' : '',
      d.fatigue?.am, d.fatigue?.mid, d.fatigue?.pm,
      d.pain?.am, d.pain?.mid, d.pain?.pm,
      d.nausea_gi?.am, d.nausea_gi?.mid, d.nausea_gi?.pm,
      d.brain_fog?.am, d.brain_fog?.mid, d.brain_fog?.pm,
      d.other_symptom?.name || '', d.other_symptom?.am, d.other_symptom?.mid, d.other_symptom?.pm,
      d.overall_symptom?.am, d.overall_symptom?.mid, d.overall_symptom?.pm,
      d.crash ? 'Yes' : d.crash === false ? 'No' : '',
      d.comments || '',
    ].map(esc).join(','));
  });
  return rows.join('\n');
}

function numOrNull(v) {
  if (v == null || v === '') return null;
  const n = Number(v);
  return isNaN(n) ? null : n;
}

export function computeCorrelations(days) {
  const fields = [
    { key: 'physical', label: 'Physical', get: d => numOrNull(d.physical) },
    { key: 'mental', label: 'Mental', get: d => numOrNull(d.mental) },
    { key: 'emotional', label: 'Emotional', get: d => numOrNull(d.emotional) },
    { key: 'overall_activity', label: 'Activity', get: d => numOrNull(d.overall_activity) },
    { key: 'fatigue', label: 'Fatigue', get: d => avgField(d.fatigue) },
    { key: 'pain', label: 'Pain', get: d => avgField(d.pain) },
    { key: 'nausea_gi', label: 'Nausea/GI', get: d => avgField(d.nausea_gi) },
    { key: 'brain_fog', label: 'Brain Fog', get: d => avgField(d.brain_fog) },
    { key: 'overall_symptom', label: 'Symptom', get: d => avgField(d.overall_symptom) },
  ];

  function pearson(xs, ys) {
    const pairs = [];
    for (let i = 0; i < xs.length; i++) {
      if (xs[i] !== null && ys[i] !== null && !isNaN(xs[i]) && !isNaN(ys[i])) {
        pairs.push([xs[i], ys[i]]);
      }
    }
    if (pairs.length < 5) return null;
    const n = pairs.length;
    const mx = pairs.reduce((s, p) => s + p[0], 0) / n;
    const my = pairs.reduce((s, p) => s + p[1], 0) / n;
    let num = 0, dx = 0, dy = 0;
    pairs.forEach(([x, y]) => {
      num += (x - mx) * (y - my);
      dx += (x - mx) ** 2;
      dy += (y - my) ** 2;
    });
    const denom = Math.sqrt(dx * dy);
    return denom === 0 ? 0 : num / denom;
  }

  const vectors = fields.map(f => days.map(f.get));
  const matrix = [];
  for (let i = 0; i < fields.length; i++) {
    const row = [];
    for (let j = 0; j < fields.length; j++) {
      row.push(i === j ? 1 : pearson(vectors[i], vectors[j]));
    }
    matrix.push(row);
  }
  return { labels: fields.map(f => f.label), matrix };
}

export function computeCrashRisk(days) {
  if (days.length < 7) return null;
  const nonCrash = days.filter(d => d.crash !== true && d.overall_activity != null && d.overall_activity !== '');
  if (nonCrash.length < 5) return null;
  const vals = nonCrash.map(d => +d.overall_activity).filter(v => !isNaN(v));
  if (vals.length < 5) return null;
  const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
  const std = Math.sqrt(vals.reduce((s, v) => s + (v - mean) ** 2, 0) / vals.length);
  const ceiling = mean + std;
  const recent = days.slice(-3);
  const recentActs = recent.map(d => numOrNull(d.overall_activity)).filter(v => v !== null);
  if (recentActs.length === 0) return null;
  const recentAvg = recentActs.reduce((a, b) => a + b, 0) / recentActs.length;
  return {
    ceiling: ceiling.toFixed(1),
    recentAvg: recentAvg.toFixed(1),
    atRisk: recentAvg > ceiling,
    mean: mean.toFixed(1),
  };
}

export function getLast30Dates() {
  const dates = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    dates.push(toLocalDateStr(d));
  }
  return dates;
}

export function generateExportText(days, plan) {
  const lines = [
    'PEM AVOIDANCE TOOLKIT - TRACKING DATA',
    'Based on Stanford PEM Avoidance Toolkit, hosted by Open Medicine Foundation',
    'Generated: ' + new Date().toLocaleDateString(),
    '', '',
  ];

  if (plan.causes.length || plan.barriers.length || plan.strategies.length) {
    lines.push('=== MY CRASH AVOIDANCE PLAN ===', '');
    if (plan.causes.length) {
      lines.push('CAUSES:');
      plan.causes.forEach(c => lines.push('  - ' + c));
      lines.push('');
    }
    if (plan.barriers.length) {
      lines.push('BARRIERS:');
      plan.barriers.forEach(b => lines.push('  - ' + b));
      lines.push('');
    }
    if (plan.strategies.length) {
      lines.push('STRATEGIES:');
      plan.strategies.forEach(s => lines.push('  - ' + s));
      lines.push('');
    }
  }

  lines.push('=== TRACKING DATA ===', '');
  lines.push('Date       | Activity | Symptom | Sleep     | Crash | Comments');
  lines.push('-'.repeat(75));
  days.forEach(d => {
    const sym = avgField(d.overall_symptom);
    const symStr = sym !== null ? sym.toFixed(1).padEnd(7) : '  -    ';
    const slp = d.unrefreshing_sleep === true ? 'Unrefresh' : d.unrefreshing_sleep === false ? 'OK       ' : '  -      ';
    const crash = d.crash === true ? 'YES  ' : d.crash === false ? 'No   ' : '  -  ';
    const act = d.overall_activity != null && d.overall_activity !== '' ? String(d.overall_activity).padEnd(8) : '  -     ';
    lines.push(`${d.date} | ${act} | ${symStr} | ${slp} | ${crash} | ${d.comments || ''}`);
  });

  return lines.join('\n');
}
