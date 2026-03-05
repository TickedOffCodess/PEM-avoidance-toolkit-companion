import { describe, it, expect } from 'vitest';
import {
  generateCSV,
  computeCorrelations,
  computeCrashRisk,
  getLast30Dates,
  emptyDay,
} from '../../src/utils.js';

// --- Helper: create a day with specific values ---
function makeDay(date, overrides = {}) {
  return {
    ...emptyDay(date),
    ...overrides,
    date,
    id: `day-${date}`,
  };
}

// --- generateCSV ---

describe('generateCSV', () => {
  it('returns a header row when given empty days array', () => {
    const csv = generateCSV([]);
    const lines = csv.split('\n');
    expect(lines).toHaveLength(1);
    expect(lines[0]).toContain('Date');
    expect(lines[0]).toContain('Physical');
    expect(lines[0]).toContain('Crash');
    expect(lines[0]).toContain('Comments');
  });

  it('includes all expected column headers', () => {
    const csv = generateCSV([]);
    const headers = csv.split('\n')[0].split(',');
    expect(headers).toHaveLength(27);
    expect(headers[0]).toBe('Date');
    expect(headers[5]).toBe('Unrefreshing Sleep');
    expect(headers[25]).toBe('Crash');
    expect(headers[26]).toBe('Comments');
  });

  it('generates one data row per day', () => {
    const days = [
      makeDay('2024-01-15', { physical: '3', mental: '4', overall_activity: '5' }),
      makeDay('2024-01-16', { physical: '6', mental: '2', overall_activity: '4' }),
    ];
    const lines = generateCSV(days).split('\n');
    expect(lines).toHaveLength(3); // header + 2 rows
  });

  it('maps unrefreshing_sleep correctly', () => {
    const days = [
      makeDay('2024-01-15', { unrefreshing_sleep: true }),
      makeDay('2024-01-16', { unrefreshing_sleep: false }),
      makeDay('2024-01-17', { unrefreshing_sleep: null }),
    ];
    const lines = generateCSV(days).split('\n');
    // sleep is column index 5
    expect(lines[1].split(',')[5]).toBe('Yes');
    expect(lines[2].split(',')[5]).toBe('No');
    expect(lines[3].split(',')[5]).toBe('');
  });

  it('maps crash field correctly', () => {
    const days = [
      makeDay('2024-01-15', { crash: true }),
      makeDay('2024-01-16', { crash: false }),
      makeDay('2024-01-17', { crash: null }),
    ];
    const lines = generateCSV(days).split('\n');
    // crash is column index 25 (shifted by 4 for other_symptom columns)
    expect(lines[1].split(',')[25]).toBe('Yes');
    expect(lines[2].split(',')[25]).toBe('No');
    expect(lines[3].split(',')[25]).toBe('');
  });

  it('includes symptom AM/Mid/PM values', () => {
    const days = [
      makeDay('2024-01-15', {
        fatigue: { am: '3', mid: '5', pm: '7' },
        pain: { am: '1', mid: '2', pm: '3' },
      }),
    ];
    const csv = generateCSV(days);
    const row = csv.split('\n')[1];
    // fatigue AM=3, Mid=5, PM=7 are columns 6,7,8
    expect(row).toContain(',3,5,7,');
  });

  it('escapes commas in comments', () => {
    const days = [makeDay('2024-01-15', { comments: 'felt bad, very tired' })];
    const csv = generateCSV(days);
    expect(csv).toContain('"felt bad, very tired"');
  });

  it('escapes double quotes in comments', () => {
    const days = [makeDay('2024-01-15', { comments: 'said "no more"' })];
    const csv = generateCSV(days);
    expect(csv).toContain('"said ""no more"""');
  });

  it('escapes newlines in comments', () => {
    const days = [makeDay('2024-01-15', { comments: 'line1\nline2' })];
    const csv = generateCSV(days);
    expect(csv).toContain('"line1\nline2"');
  });

  it('handles empty/missing symptom fields gracefully', () => {
    const days = [makeDay('2024-01-15')];
    const csv = generateCSV(days);
    const lines = csv.split('\n');
    expect(lines).toHaveLength(2);
    // Should not throw, empty fields become empty strings
  });
});

// --- computeCorrelations ---

describe('computeCorrelations', () => {
  // Generate N days with linearly correlated physical and fatigue
  function makeDaysWithCorrelation(n) {
    return Array.from({ length: n }, (_, i) => makeDay(
      `2024-01-${String(i + 1).padStart(2, '0')}`,
      {
        physical: String(i + 1),
        mental: String(10 - i),
        emotional: String(Math.round(Math.random() * 10)),
        overall_activity: String(i + 1),
        fatigue: { am: String(i + 1), mid: String(i + 1), pm: String(i + 1) },
        pain: { am: String(i), mid: String(i), pm: String(i) },
        brain_fog: { am: String(Math.round(i / 2)), mid: String(Math.round(i / 2)), pm: String(Math.round(i / 2)) },
        overall_symptom: { am: String(i + 1), mid: String(i + 1), pm: String(i + 1) },
      }
    ));
  }

  it('returns labels and matrix', () => {
    const days = makeDaysWithCorrelation(10);
    const result = computeCorrelations(days);
    expect(result).toHaveProperty('labels');
    expect(result).toHaveProperty('matrix');
    expect(result.labels).toHaveLength(9);
    expect(result.matrix).toHaveLength(9);
  });

  it('diagonal values are always 1', () => {
    const days = makeDaysWithCorrelation(10);
    const { matrix } = computeCorrelations(days);
    for (let i = 0; i < matrix.length; i++) {
      expect(matrix[i][i]).toBe(1);
    }
  });

  it('matrix is symmetric', () => {
    const days = makeDaysWithCorrelation(10);
    const { matrix } = computeCorrelations(days);
    for (let i = 0; i < matrix.length; i++) {
      for (let j = 0; j < matrix.length; j++) {
        if (matrix[i][j] !== null && matrix[j][i] !== null) {
          expect(matrix[i][j]).toBeCloseTo(matrix[j][i], 10);
        }
      }
    }
  });

  it('detects perfect positive correlation', () => {
    // physical and fatigue both increase linearly with i
    const days = makeDaysWithCorrelation(10);
    const { labels, matrix } = computeCorrelations(days);
    const physIdx = labels.indexOf('Physical');
    const fatIdx = labels.indexOf('Fatigue');
    expect(matrix[physIdx][fatIdx]).toBeCloseTo(1.0, 5);
  });

  it('detects perfect negative correlation', () => {
    // physical increases, mental decreases
    const days = makeDaysWithCorrelation(10);
    const { labels, matrix } = computeCorrelations(days);
    const physIdx = labels.indexOf('Physical');
    const mentIdx = labels.indexOf('Mental');
    expect(matrix[physIdx][mentIdx]).toBeCloseTo(-1.0, 5);
  });

  it('returns null correlations when fewer than 5 valid pairs', () => {
    const days = Array.from({ length: 3 }, (_, i) => makeDay(
      `2024-01-${String(i + 1).padStart(2, '0')}`,
      { physical: String(i), mental: String(i) }
    ));
    const { matrix } = computeCorrelations(days);
    // With only 3 data points, off-diagonal should be null
    expect(matrix[0][1]).toBeNull();
  });

  it('handles days with mixed null fields', () => {
    const days = Array.from({ length: 10 }, (_, i) => makeDay(
      `2024-01-${String(i + 1).padStart(2, '0')}`,
      {
        physical: i % 2 === 0 ? String(i) : '', // half missing
        mental: String(i),
        overall_activity: String(i),
        fatigue: { am: String(i), mid: String(i), pm: String(i) },
        pain: { am: '', mid: '', pm: '' },
        brain_fog: { am: '', mid: '', pm: '' },
        overall_symptom: { am: String(i), mid: String(i), pm: String(i) },
      }
    ));
    const result = computeCorrelations(days);
    expect(result).toHaveProperty('matrix');
    // Physical has only 5 valid values, should still compute
  });

  it('returns 0 for constant fields', () => {
    const days = Array.from({ length: 10 }, (_, i) => makeDay(
      `2024-01-${String(i + 1).padStart(2, '0')}`,
      {
        physical: '5', // constant
        mental: String(i),
        emotional: String(i),
        overall_activity: String(i),
        fatigue: { am: '5', mid: '5', pm: '5' }, // constant
        pain: { am: String(i), mid: String(i), pm: String(i) },
        brain_fog: { am: String(i), mid: String(i), pm: String(i) },
        overall_symptom: { am: String(i), mid: String(i), pm: String(i) },
      }
    ));
    const { labels, matrix } = computeCorrelations(days);
    const physIdx = labels.indexOf('Physical');
    const mentIdx = labels.indexOf('Mental');
    // Constant vs varying should be 0
    expect(matrix[physIdx][mentIdx]).toBe(0);
  });
});

// --- computeCrashRisk ---

describe('computeCrashRisk', () => {
  it('returns null when fewer than 7 days', () => {
    const days = Array.from({ length: 5 }, (_, i) =>
      makeDay(`2024-01-${String(i + 1).padStart(2, '0')}`, { overall_activity: '3' })
    );
    expect(computeCrashRisk(days)).toBeNull();
  });

  it('returns null when fewer than 5 non-crash days with activity', () => {
    const days = Array.from({ length: 7 }, (_, i) =>
      makeDay(`2024-01-${String(i + 1).padStart(2, '0')}`, { crash: true, overall_activity: '8' })
    );
    expect(computeCrashRisk(days)).toBeNull();
  });

  it('returns null when recent days have no activity logged', () => {
    const days = Array.from({ length: 10 }, (_, i) =>
      makeDay(`2024-01-${String(i + 1).padStart(2, '0')}`, {
        overall_activity: i < 7 ? '4' : '', // last 3 have no activity
      })
    );
    expect(computeCrashRisk(days)).toBeNull();
  });

  it('returns atRisk=false when recent activity is within normal range', () => {
    // All days at activity level 4 — recent avg = 4, ceiling = mean + std = 4 + 0 = 4
    // Actually with constant values std=0, ceiling=4.0, recentAvg=4.0, 4 > 4 is false
    const days = Array.from({ length: 10 }, (_, i) =>
      makeDay(`2024-01-${String(i + 1).padStart(2, '0')}`, { overall_activity: '4' })
    );
    const result = computeCrashRisk(days);
    expect(result).not.toBeNull();
    expect(result.atRisk).toBe(false);
    expect(result.mean).toBe('4.0');
    expect(result.recentAvg).toBe('4.0');
  });

  it('returns atRisk=true when recent activity exceeds ceiling', () => {
    // First 7 days at activity 3, last 3 days at activity 9
    // Non-crash mean ≈ (3*7 + 9*3)/10 = 4.8, std will be moderate
    // Recent avg = 9, well above ceiling
    const days = Array.from({ length: 10 }, (_, i) =>
      makeDay(`2024-01-${String(i + 1).padStart(2, '0')}`, {
        overall_activity: i < 7 ? '3' : '9',
      })
    );
    const result = computeCrashRisk(days);
    expect(result).not.toBeNull();
    expect(result.atRisk).toBe(true);
    expect(Number(result.recentAvg)).toBe(9.0);
  });

  it('excludes crash days from baseline calculation', () => {
    // 5 non-crash days at 3, 2 crash days at 10, last 3 non-crash at 3
    const days = [
      makeDay('2024-01-01', { overall_activity: '3' }),
      makeDay('2024-01-02', { overall_activity: '3' }),
      makeDay('2024-01-03', { overall_activity: '3' }),
      makeDay('2024-01-04', { overall_activity: '10', crash: true }),
      makeDay('2024-01-05', { overall_activity: '10', crash: true }),
      makeDay('2024-01-06', { overall_activity: '3' }),
      makeDay('2024-01-07', { overall_activity: '3' }),
      makeDay('2024-01-08', { overall_activity: '3' }),
      makeDay('2024-01-09', { overall_activity: '3' }),
      makeDay('2024-01-10', { overall_activity: '3' }),
    ];
    const result = computeCrashRisk(days);
    expect(result).not.toBeNull();
    // Mean of non-crash days should be 3.0
    expect(result.mean).toBe('3.0');
    expect(result.atRisk).toBe(false);
  });

  it('returns ceiling, recentAvg, mean as string numbers', () => {
    const days = Array.from({ length: 10 }, (_, i) =>
      makeDay(`2024-01-${String(i + 1).padStart(2, '0')}`, { overall_activity: String(i + 1) })
    );
    const result = computeCrashRisk(days);
    expect(result).not.toBeNull();
    expect(typeof result.ceiling).toBe('string');
    expect(typeof result.recentAvg).toBe('string');
    expect(typeof result.mean).toBe('string');
    expect(Number(result.ceiling)).toBeGreaterThan(0);
  });
});

// --- getLast30Dates ---

describe('getLast30Dates', () => {
  it('returns exactly 30 dates', () => {
    const dates = getLast30Dates();
    expect(dates).toHaveLength(30);
  });

  it('returns dates in YYYY-MM-DD format', () => {
    const dates = getLast30Dates();
    dates.forEach(d => {
      expect(d).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });

  it('ends with today', () => {
    const dates = getLast30Dates();
    const today = new Date().toISOString().split('T')[0];
    expect(dates[29]).toBe(today);
  });

  it('starts 29 days ago', () => {
    const dates = getLast30Dates();
    const expected = new Date();
    expected.setDate(expected.getDate() - 29);
    expect(dates[0]).toBe(expected.toISOString().split('T')[0]);
  });

  it('dates are in ascending chronological order', () => {
    const dates = getLast30Dates();
    for (let i = 1; i < dates.length; i++) {
      expect(dates[i] > dates[i - 1]).toBe(true);
    }
  });

  it('has consecutive dates with no gaps', () => {
    const dates = getLast30Dates();
    for (let i = 1; i < dates.length; i++) {
      const prev = new Date(dates[i - 1] + 'T12:00:00');
      const curr = new Date(dates[i] + 'T12:00:00');
      const diff = (curr - prev) / (1000 * 60 * 60 * 24);
      expect(diff).toBe(1);
    }
  });
});
