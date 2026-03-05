import { useState } from 'react';
import { OMF_CAUSES, OMF_BARRIERS, OMF_STRATEGIES } from './omfData.js';
import { Card, BtnP, s } from './components.jsx';

export default function PlanView({ plan, onUpdate }) {
  const [exp, setExp] = useState(null);

  const toggle = (section, item) => {
    const list = [...plan[section]];
    const idx = list.indexOf(item);
    if (idx >= 0) list.splice(idx, 1);
    else list.push(item);
    onUpdate({ ...plan, [section]: list });
  };

  const sections = [
    { k: 'causes', title: 'My Causes of PEM', data: OMF_CAUSES, color: 'var(--org)', icon: '\u26A1' },
    { k: 'barriers', title: 'My Barriers', data: OMF_BARRIERS, color: 'var(--yel)', icon: '\uD83D\uDEA7' },
    { k: 'strategies', title: 'My Strategies', data: OMF_STRATEGIES, color: 'var(--grn)', icon: '\uD83D\uDEE1\uFE0F' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ fontSize: 15, fontWeight: 600 }}>Crash Avoidance Plan</div>
      <div style={{ fontSize: 12, color: 'var(--tx-d)', lineHeight: 1.6 }}>
        Identify your causes and barriers, then pick strategies. Share your plan with your support team.
      </div>

      {sections.map(sec => {
        const isOpen = exp === sec.k;
        return (
          <div key={sec.k}>
            <button onClick={() => setExp(isOpen ? null : sec.k)} aria-expanded={isOpen} aria-label={`${sec.title}, ${plan[sec.k].length} selected`} style={{
              width: '100%', background: 'var(--card)', border: '1px solid var(--border)',
              borderRadius: isOpen ? '12px 12px 0 0' : 12, padding: '16px 18px',
              textAlign: 'left', display: 'flex', justifyContent: 'space-between',
              alignItems: 'center', minHeight: 52, cursor: 'pointer', fontFamily: 'var(--font)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 18 }}>{sec.icon}</span>
                <span style={{ fontSize: 14, fontWeight: 600, color: sec.color }}>{sec.title}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 12, fontFamily: 'var(--mono)', color: 'var(--tx-m)' }}>{plan[sec.k].length} selected</span>
                <span style={{ color: 'var(--tx-d)', fontSize: 14 }}>{isOpen ? '\u25BE' : '\u25B8'}</span>
              </div>
            </button>

            {isOpen && (
              <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderTop: 'none', borderRadius: '0 0 12px 12px', padding: '14px 18px' }}>
                {Object.entries(sec.data).map(([cat, items]) => (
                  <div key={cat} style={{ marginBottom: 14 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: sec.color, marginBottom: 8, opacity: 0.8 }}>{cat}</div>
                    {items.map(item => {
                      const sel = plan[sec.k].includes(item);
                      return (
                        <button key={item} onClick={() => toggle(sec.k, item)} role="checkbox" aria-checked={sel} aria-label={item} style={{
                          display: 'flex', gap: 12, alignItems: 'flex-start', padding: '8px 10px',
                          width: '100%', textAlign: 'left', background: sel ? 'rgba(255,255,255,0.03)' : 'transparent',
                          border: 'none', borderRadius: 6, cursor: 'pointer', marginBottom: 3, minHeight: 44,
                          fontFamily: 'var(--font)',
                        }}>
                          <div style={{
                            width: 22, height: 22, borderRadius: 5, flexShrink: 0, marginTop: 1,
                            border: `2px solid ${sel ? sec.color : 'var(--border)'}`,
                            background: sel ? sec.color : 'transparent',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 13, color: '#000', fontWeight: 700, transition: 'all 0.15s',
                          }}>{sel ? '\u2713' : ''}</div>
                          <span style={{ fontSize: 13, color: sel ? 'var(--tx)' : 'var(--tx-m)', lineHeight: 1.5 }}>{item}</span>
                        </button>
                      );
                    })}
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}

      {(plan.causes.length > 0 || plan.barriers.length > 0 || plan.strategies.length > 0) && (
        <Card title={'\uD83D\uDCCB My Plan Summary'}>
          {[['My Causes', plan.causes, 'var(--org)'], ['My Barriers', plan.barriers, 'var(--yel)'], ['My Strategies', plan.strategies, 'var(--grn)']].map(([title, items, color]) => (
            items.length > 0 && (
              <div key={title} style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color, marginBottom: 6 }}>{title}</div>
                {items.map((item, i) => (
                  <div key={i} style={{ fontSize: 13, color: 'var(--tx-m)', padding: '4px 0 4px 14px', borderLeft: `2px solid ${color}`, marginBottom: 3, lineHeight: 1.5, opacity: 0.7 }}>{item}</div>
                ))}
              </div>
            )
          ))}
        </Card>
      )}
    </div>
  );
}
