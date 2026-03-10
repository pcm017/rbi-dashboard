export const COLORS = {
  totalATM:    '#00d4ff',
  onsite:      '#7b61ff',
  offsite:     '#ff6b6b',
  pos:         '#ffd166',
  microATM:    '#06d6a0',
  bharatQR:    '#f77f00',
  upiQR:       '#e040fb',
  creditCards: '#f77f00',
  debitCards:  '#06d6a0',
  digital:     '#a78bfa',
  insight1:    '#34d399',
  insight2:    '#f472b6',
}

export const BANK_PAL = [
  '#00d4ff','#7b61ff','#ff6b6b','#ffd166','#06d6a0',
  '#f77f00','#e040fb','#00bfa5','#ff5722','#8bc34a',
]

export const fmtL   = v => v ? `${(v/1e5).toFixed(2)}L`  : '—'
export const fmtCr  = v => v ? `${(v/1e7).toFixed(2)}Cr` : '—'
export const fmtN   = v => v ? Number(v).toLocaleString('en-IN') : '—'
export const fmtPct = v => v !== null && v !== undefined ? `${v >= 0 ? '▲':'▼'} ${Math.abs(v).toFixed(2)}%` : '—'
export const fmtRaw = v => v !== null && v !== undefined ? Number(v).toFixed(2) : '—'

export function TTip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background:'#0d1117', border:'1px solid #30363d', borderRadius:8, padding:'10px 14px', maxWidth:280 }}>
      <p style={{ color:'#e6edf3', fontWeight:700, margin:'0 0 6px', fontSize:13 }}>{label}</p>
      {payload.map(p => (
        <p key={p.dataKey} style={{ color:p.color, margin:'2px 0', fontSize:12 }}>
          {p.name}: {fmtN(p.value)}
        </p>
      ))}
    </div>
  )
}

export function KPI({ label, value, sub, color, delta }) {
  return (
    <div style={{ background:'#0d1117', border:`1px solid ${color}33`, borderTop:`3px solid ${color}`,
      borderRadius:10, padding:'14px 16px', flex:1, minWidth:130 }}>
      <div style={{ color:'#8b949e', fontSize:10, letterSpacing:'0.08em', textTransform:'uppercase', marginBottom:6 }}>{label}</div>
      <div style={{ color:'#e6edf3', fontSize:18, fontWeight:800, fontFamily:'monospace' }}>{value}</div>
      {sub && <div style={{ color:'#8b949e', fontSize:10, marginTop:2 }}>{sub}</div>}
      {delta !== undefined && delta !== null && (
        <div style={{ color: delta >= 0 ? '#3fb950':'#f85149', fontSize:11, marginTop:4 }}>
          {fmtPct(delta)} MoM
        </div>
      )}
    </div>
  )
}

export function Card({ title, subtitle, children }) {
  return (
    <div style={{ background:'#0d1117', border:'1px solid #21262d', borderRadius:10, padding:'18px 22px' }}>
      {title && (
        <div style={{ marginBottom:16 }}>
          <h3 style={{ color:'#e6edf3', margin:0, fontSize:13, fontWeight:600 }}>{title}</h3>
          {subtitle && <p style={{ color:'#8b949e', margin:'4px 0 0', fontSize:11 }}>{subtitle}</p>}
        </div>
      )}
      {children}
    </div>
  )
}

export function SectionLabel({ children }) {
  return (
    <div style={{ color:'#8b949e', fontSize:11, letterSpacing:'0.12em', textTransform:'uppercase',
      fontWeight:700, margin:'28px 0 14px', borderBottom:'1px solid #21262d', paddingBottom:8 }}>
      {children}
    </div>
  )
}

export function Badge({ value, positive }) {
  const isPos = positive !== undefined ? positive : value >= 0
  return (
    <span style={{
      background: isPos ? '#12261a':'#2a1215',
      color:      isPos ? '#3fb950':'#f85149',
      borderRadius:4, padding:'2px 7px', fontSize:11, fontWeight:600, fontFamily:'monospace',
    }}>
      {isPos ? '▲':'▼'} {Math.abs(Number(value)).toFixed(2)}
    </span>
  )
}
