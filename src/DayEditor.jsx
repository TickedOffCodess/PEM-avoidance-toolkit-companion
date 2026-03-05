import { useState, useRef } from 'react';
import { formatDate, activityColor, symptomColor } from './utils.js';
import { SectionLabel, ScoreInput, SymptomRow, BtnP, BtnS, s } from './components.jsx';

function trapFocus(e, containerRef) {
  if (e.key !== 'Tab' || !containerRef.current) return;
  const focusable = containerRef.current.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
  if (focusable.length === 0) return;
  const first = focusable[0], last = focusable[focusable.length - 1];
  if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
  else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
}

export default function DayEditor({ day, onSave, onCancel, onDelete }) {
  const modalRef = useRef(null);
  const [form, setForm] = useState(() => {
    const clone = JSON.parse(JSON.stringify(day));
    // Restore properties that JSON stringify removes (undefined → missing)
    if (!clone.other_symptom) clone.other_symptom = { name: '', am: '', mid: '', pm: '' };
    if (!clone.nausea_gi) clone.nausea_gi = { am: '', mid: '', pm: '' };
    return clone;
  });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const setN = (k, sub, v) => setForm(f => ({ ...f, [k]: { ...f[k], [sub]: v } }));

  return (
    <div ref={modalRef} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 200, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }} onClick={onCancel} onKeyDown={e => { if (e.key === 'Escape') onCancel(); trapFocus(e, modalRef); }}>
      <div onClick={e => e.stopPropagation()} style={{ background: 'var(--surface)', borderRadius: '22px 22px 0 0', width: '100%', maxWidth: 520, maxHeight: '92dvh', overflowY: 'auto', padding: '22px 20px 36px', WebkitOverflowScrolling: 'touch' }}>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <span style={{ fontSize: 16, fontWeight: 700 }}>{formatDate(form.date)}</span>
          <div style={{ display: 'flex', gap: 8 }}>
            <BtnS onClick={onCancel}>Cancel</BtnS>
            <BtnP onClick={() => onSave(form)}>Save</BtnP>
          </div>
        </div>

        <SectionLabel>Activity Levels (0-10)</SectionLabel>
        <div style={{ fontSize: 11, color: 'var(--tx-d)', marginBottom: 10 }}>0 = very low/negligible &middot; 10 = activity when fully healthy</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <ScoreInput label="Physical" value={form.physical} onChange={v => set('physical', v)} colorFn={activityColor} />
          <ScoreInput label="Mental" value={form.mental} onChange={v => set('mental', v)} colorFn={activityColor} />
          <ScoreInput label="Emotional" value={form.emotional} onChange={v => set('emotional', v)} colorFn={activityColor} />
          <ScoreInput label="Overall Activity &#9733;" value={form.overall_activity} onChange={v => set('overall_activity', v)} colorFn={activityColor} highlight />
        </div>

        <SectionLabel>Unrefreshing Sleep?</SectionLabel>
        <div style={{ display: 'flex', gap: 8 }}>
          {[{ v: true, l: 'Yes' }, { v: false, l: 'No' }].map(opt => (
            <button key={String(opt.v)} onClick={() => set('unrefreshing_sleep', opt.v)} style={{
              borderRadius: 8, padding: '10px 18px', fontSize: 14, fontWeight: 600, minHeight: 44, cursor: 'pointer',
              border: '1px solid',
              background: form.unrefreshing_sleep === opt.v ? (opt.v ? 'var(--red-d)' : 'var(--grn-d)') : 'var(--card)',
              color: form.unrefreshing_sleep === opt.v ? (opt.v ? 'var(--red)' : 'var(--grn)') : 'var(--tx-m)',
              borderColor: form.unrefreshing_sleep === opt.v ? (opt.v ? 'rgba(248,113,113,0.3)' : 'rgba(74,222,128,0.3)') : 'var(--border)',
              fontFamily: 'var(--font)',
            }}>{opt.l}</button>
          ))}
        </div>

        <SectionLabel>Symptoms (0-10, AM / Midday / PM)</SectionLabel>
        <div style={{ fontSize: 11, color: 'var(--tx-d)', marginBottom: 10 }}>0 = no symptom &middot; 10 = worst experienced</div>
        <SymptomRow label="Fatigue" data={form.fatigue} onChange={(sub, v) => setN('fatigue', sub, v)} />
        <SymptomRow label="Pain" data={form.pain} onChange={(sub, v) => setN('pain', sub, v)} />
        <SymptomRow label="Nausea / GI" data={form.nausea_gi} onChange={(sub, v) => setN('nausea_gi', sub, v)} />
        <SymptomRow label="Brain Fog" data={form.brain_fog} onChange={(sub, v) => setN('brain_fog', sub, v)} />

        <div style={{ marginTop: 10 }}>
          <div style={{ fontSize: 11, color: 'var(--tx-m)', marginBottom: 4 }}>Other symptom name:</div>
          <input value={form.other_symptom.name} onChange={e => setN('other_symptom', 'name', e.target.value)}
            placeholder="e.g. dizziness, anxiety&hellip;" style={{ ...s.input, fontSize: 13 }} />
        </div>
        {form.other_symptom.name && (
          <SymptomRow label={form.other_symptom.name} data={form.other_symptom} onChange={(sub, v) => setN('other_symptom', sub, v)} />
        )}

        <div style={{ marginTop: 6, padding: '8px 10px', background: 'var(--acc-d)', borderRadius: 8, border: '1px solid rgba(96,165,250,0.2)' }}>
          <SymptomRow label="Overall Symptom &#9733;" data={form.overall_symptom} onChange={(sub, v) => setN('overall_symptom', sub, v)} highlight />
        </div>

        <SectionLabel>Crash?</SectionLabel>
        <div style={{ fontSize: 11, color: 'var(--tx-d)', marginBottom: 8 }}>A significant set-back in daily function</div>
        <div style={{ display: 'flex', gap: 8 }}>
          {[{ v: true, l: 'Yes — Crash' }, { v: false, l: 'No' }].map(opt => (
            <button key={String(opt.v)} onClick={() => set('crash', opt.v)} style={{
              borderRadius: 8, padding: '10px 18px', fontSize: 14, fontWeight: 600, minHeight: 44, cursor: 'pointer',
              border: '1px solid', fontFamily: 'var(--font)',
              background: form.crash === opt.v ? (opt.v ? 'var(--red-d)' : 'var(--grn-d)') : 'var(--card)',
              color: form.crash === opt.v ? (opt.v ? 'var(--red)' : 'var(--grn)') : 'var(--tx-m)',
              borderColor: form.crash === opt.v ? (opt.v ? 'rgba(248,113,113,0.3)' : 'rgba(74,222,128,0.3)') : 'var(--border)',
            }}>{opt.l}</button>
          ))}
        </div>

        <SectionLabel>Comments</SectionLabel>
        <div style={{ fontSize: 11, color: 'var(--tx-d)', marginBottom: 6 }}>Brief reminder, e.g. &quot;Shopping for 3 hours&quot;</div>
        <textarea value={form.comments} maxLength={500} onChange={e => set('comments', e.target.value)}
          rows={3} placeholder="A few words about the day&hellip;"
          aria-label="Comments about the day"
          style={{ ...s.input, resize: 'vertical', fontFamily: 'var(--font)' }} />

        {onDelete && (
          <div style={{ marginTop: 24, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
            <button onClick={() => {
              if (window.confirm('Delete this day entry? This cannot be undone.')) onDelete(form.date);
            }} aria-label="Delete this day entry" style={{
              width: '100%', background: 'var(--red-d)', color: 'var(--red)', border: '1px solid rgba(248,113,113,0.3)',
              borderRadius: 8, padding: '12px 20px', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font)', minHeight: 44,
            }}>Delete This Entry</button>
          </div>
        )}
      </div>
    </div>
  );
}
