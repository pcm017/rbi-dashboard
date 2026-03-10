import { useState, useCallback, useRef, useEffect } from 'react'
import * as XLSX from 'xlsx'
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, AreaChart, Area,
} from 'recharts'
import { parseWorkbook, sortMonths } from './parser.js'
import { TTip, KPI, Card, COLORS, fmtL, fmtCr, fmtN } from './components.jsx'
import InsightsTab from './InsightsTab.jsx'

// ── Fetch manifest + data files from /data/ (GitHub Pages mode) ──────────────
async function loadFromManifest(onProgress) {
  const base = import.meta.env.BASE_URL
  const manifestRes = await fetch(`${base}data/manifest.json`)
  if (!manifestRes.ok) throw new Error('No manifest found')
  const manifest = await manifestRes.json()
  const files = manifest.files || []
  const results = []
  for (let i = 0; i < files.length; i++) {
    const f = files[i]
    try {
      const res = await fetch(`${base}data/${f.filename}`)
      if (!res.ok) continue
      const ab = await res.arrayBuffer()
      const wb = XLSX.read(ab, { type: 'array' })
      const parsed = parseWorkbook(wb, f.filename)
      if (parsed) results.push(parsed)
    } catch (e) {
      console.warn('Failed to load:', f.filename, e)
    }
    onProgress(Math.round(((i + 1) / files.length) * 100))
  }
  return results
}

// ── HBar helper ───────────────────────────────────────────────────────────────
function HBar({ data, dataKey, color, name, fmt = fmtN }) {
  return (
    <ResponsiveContainer width="100%" height={Math.max(220, data.length * 32)}>
      <BarChart data={data} layout="vertical" margin={{ left: 0, right: 20 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#21262d" horizontal={false}/>
        <XAxis type="number" tick={{ fill:'#8b949e', fontSize:10 }} tickFormatter={fmt}/>
        <YAxis type="category" dataKey="bank" width={180} tick={{ fill:'#e6edf3', fontSize:10 }}/>
        <Tooltip content={<TTip/>}/>
        <Bar dataKey={dataKey} fill={color} name={name} radius={[0,4,4,0]}/>
      </BarChart>
    </ResponsiveContainer>
  )
}

// ── Main App ──────────────────────────────────────────────────────────────────
export default function App() {
  const [months, setMonths]           = useState([])
  const [activeTab, setActiveTab]     = useState('overview')
  const [dragging, setDragging]       = useState(false)
  const [errors, setErrors]           = useState([])
  const [autoLoading, setAutoLoading] = useState(false)
  const [autoProgress, setAutoProgress] = useState(0)
  const [autoFailed, setAutoFailed]   = useState(false)
  const fileRef = useRef()

  // Auto-load from manifest on mount (GitHub Pages mode)
  useEffect(() => {
    setAutoLoading(true)
    loadFromManifest(setAutoProgress)
      .then(results => {
        if (results.length > 0) setMonths(sortMonths(results))
        else setAutoFailed(true)
      })
      .catch(() => setAutoFailed(true))
      .finally(() => setAutoLoading(false))
  }, [])

  const processFiles = useCallback(async (files) => {
    setErrors([])
    const parsed = []
    const errs   = []
    for (const file of files) {
      try {
        const ab = await file.arrayBuffer()
        const wb = XLSX.read(ab, { type: 'array' })
        const result = parseWorkbook(wb, file.name)
        if (result) parsed.push(result)
        else errs.push(`Could not extract data from: ${file.name}`)
      } catch (e) {
        errs.push(`Error reading ${file.name}: ${e.message}`)
      }
    }
    setErrors(errs)
    if (!parsed.length) return
    setMonths(prev => {
      const map = Object.fromEntries(prev.map(m => [m.month, m]))
      parsed.forEach(m => { map[m.month] = m })
      return sortMonths(Object.values(map))
    })
  }, [])

  const onDrop = useCallback(e => {
    e.preventDefault(); setDragging(false)
    processFiles([...e.dataTransfer.files].filter(f => /\.xlsx?$/i.test(f.name)))
  }, [processFiles])

  const latest = months[months.length - 1]
  const prev   = months[months.length - 2]
  const delta  = key => prev ? ((latest.totals[key] - prev.totals[key]) / prev.totals[key]) * 100 : undefined

  const trend = months.map(m => ({ ...m.totals, month: m.month }))
  const top   = (key, n = 10) => latest ? [...latest.banks].sort((a, b) => b[key] - a[key]).slice(0, n) : []

  const TABS = ['overview', 'atms', 'cards', 'pos', 'digital', 'banks', 'insights']

  return (
    <div style={{ minHeight:'100vh', background:'#010409', fontFamily:"'IBM Plex Sans',system-ui,sans-serif", color:'#e6edf3' }}>

      {/* Header */}
      <div style={{ borderBottom:'1px solid #21262d', padding:'14px 28px', background:'#0d1117',
        display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:10 }}>
        <div>
          <div style={{ color:'#8b949e', fontSize:10, letterSpacing:'0.12em', textTransform:'uppercase', marginBottom:2 }}>
            RBI · ATM, Acceptance Infrastructure &amp; Card Statistics
          </div>
          <h1 style={{ margin:0, fontSize:18, fontWeight:800 }}>India Banking Infrastructure Dashboard</h1>
        </div>
        <div style={{ display:'flex', gap:8, alignItems:'center', flexWrap:'wrap' }}>
          {months.length > 0 && (
            <span style={{ color:'#8b949e', fontSize:12 }}>
              {months.length} month{months.length > 1 ? 's' : ''} loaded ·{' '}
              <span style={{ color:'#3fb950' }}>{latest.month}</span>
            </span>
          )}
          {autoLoading && (
            <span style={{ color:'#8b949e', fontSize:12 }}>Loading data… {autoProgress}%</span>
          )}
          <button onClick={() => fileRef.current.click()} style={{
            background:'#1f6feb', color:'#fff', border:'none', borderRadius:7,
            padding:'8px 16px', cursor:'pointer', fontWeight:600, fontSize:13,
          }}>+ Upload Excel(s)</button>
          {months.length > 0 && (
            <button onClick={() => { setMonths([]); setErrors([]); setActiveTab('overview') }} style={{
              background:'transparent', color:'#8b949e', border:'1px solid #30363d',
              borderRadius:7, padding:'8px 12px', cursor:'pointer', fontSize:12,
            }}>Clear</button>
          )}
          <input ref={fileRef} type="file" accept=".xlsx,.xls" multiple style={{ display:'none' }}
            onChange={e => { processFiles([...e.target.files]); e.target.value = '' }} />
        </div>
      </div>

      <div style={{ padding:'24px 28px', maxWidth:1280, margin:'0 auto' }}>

        {errors.length > 0 && (
          <div style={{ background:'#1a0a0a', border:'1px solid #f8514944', borderRadius:8, padding:'12px 16px', marginBottom:16 }}>
            {errors.map((e, i) => <p key={i} style={{ color:'#f85149', margin:'2px 0', fontSize:12 }}>{e}</p>)}
          </div>
        )}

        {/* Drop zone */}
        {months.length === 0 && !autoLoading && (
          <div
            onDragOver={e => { e.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            onClick={() => fileRef.current.click()}
            style={{
              border:`2px dashed ${dragging ? '#1f6feb' : '#30363d'}`,
              borderRadius:14, padding:'64px 40px', textAlign:'center',
              cursor:'pointer', transition:'all 0.2s',
              background: dragging ? '#0d1f3c' : 'transparent',
            }}
          >
            <div style={{ fontSize:48, marginBottom:14 }}>🏧</div>
            <h2 style={{ color:'#e6edf3', margin:'0 0 10px', fontSize:20 }}>
              {autoFailed ? 'Drop RBI Excel files here' : 'Loading data…'}
            </h2>
            <p style={{ color:'#8b949e', maxWidth:460, margin:'0 auto 6px', lineHeight:1.7, fontSize:14 }}>
              Upload <strong style={{ color:'#e6edf3' }}>ATM, Acceptance Infrastructure &amp; Card Statistics</strong> Excel
              files from RBI's website. Multiple months unlock trend charts &amp; insights.
            </p>
            <p style={{ color:'#6e7681', fontSize:12, margin:'0 auto 20px' }}>
              Parsed entirely in your browser — files never leave your device.
            </p>
            <div style={{ display:'inline-block', background:'#1f6feb', color:'#fff',
              borderRadius:8, padding:'10px 28px', fontWeight:700, fontSize:14 }}>
              Browse Files
            </div>
          </div>
        )}

        {/* Dashboard */}
        {months.length > 0 && (
          <>
            {/* KPIs */}
            <div style={{ display:'flex', gap:10, flexWrap:'wrap', marginBottom:24 }}>
              <KPI label="Total ATMs"     value={fmtL(latest.totals.totalATM)}     sub={fmtN(latest.totals.totalATM)}     color={COLORS.totalATM}    delta={months.length>1?delta('totalATM'):undefined}/>
              <KPI label="On-site ATMs"   value={fmtL(latest.totals.onsite)}       sub={fmtN(latest.totals.onsite)}       color={COLORS.onsite}      delta={months.length>1?delta('onsite'):undefined}/>
              <KPI label="Off-site ATMs"  value={fmtL(latest.totals.offsite)}      sub={fmtN(latest.totals.offsite)}      color={COLORS.offsite}     delta={months.length>1?delta('offsite'):undefined}/>
              <KPI label="PoS Terminals"  value={fmtCr(latest.totals.pos)}         sub={fmtN(latest.totals.pos)}          color={COLORS.pos}         delta={months.length>1?delta('pos'):undefined}/>
              <KPI label="Micro ATMs"     value={fmtCr(latest.totals.microATM)}    sub={fmtN(latest.totals.microATM)}     color={COLORS.microATM}    delta={months.length>1?delta('microATM'):undefined}/>
              <KPI label="UPI QR Codes"   value={fmtCr(latest.totals.upiQR)}       sub={fmtN(latest.totals.upiQR)}        color={COLORS.upiQR}       delta={months.length>1?delta('upiQR'):undefined}/>
              <KPI label="Credit Cards"   value={fmtCr(latest.totals.creditCards)} sub={fmtN(latest.totals.creditCards)}  color={COLORS.creditCards} delta={months.length>1?delta('creditCards'):undefined}/>
              <KPI label="Debit Cards"    value={fmtCr(latest.totals.debitCards)}  sub={fmtN(latest.totals.debitCards)}   color={COLORS.debitCards}  delta={months.length>1?delta('debitCards'):undefined}/>
            </div>

            {/* Tabs */}
            <div style={{ display:'flex', borderBottom:'1px solid #21262d', marginBottom:22, overflowX:'auto' }}>
              {TABS.map(t => (
                <button key={t} onClick={() => setActiveTab(t)} style={{
                  background:'none', border:'none',
                  borderBottom: activeTab===t ? '2px solid #1f6feb' : '2px solid transparent',
                  color: activeTab===t ? '#e6edf3' : '#8b949e',
                  padding:'9px 16px', cursor:'pointer',
                  fontWeight: activeTab===t ? 700 : 400, fontSize:13, whiteSpace:'nowrap',
                }}>
                  {t==='pos'?'PoS':t==='digital'?'Digital Infra':t==='insights'?'✦ Insights':t[0].toUpperCase()+t.slice(1)}
                </button>
              ))}
            </div>

            {/* Overview */}
            {activeTab==='overview' && (
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:18 }}>
                <Card title="Total ATMs & CRMs">
                  <ResponsiveContainer width="100%" height={210}>
                    <AreaChart data={trend}>
                      <defs><linearGradient id="ga" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor="#00d4ff" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#00d4ff" stopOpacity={0}/>
                      </linearGradient></defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#21262d"/>
                      <XAxis dataKey="month" tick={{ fill:'#8b949e', fontSize:11 }}/>
                      <YAxis tick={{ fill:'#8b949e', fontSize:11 }} tickFormatter={v=>`${(v/1e5).toFixed(1)}L`}/>
                      <Tooltip content={<TTip/>}/>
                      <Area type="monotone" dataKey="totalATM" stroke="#00d4ff" fill="url(#ga)" strokeWidth={2} name="Total ATMs"/>
                    </AreaChart>
                  </ResponsiveContainer>
                </Card>
                <Card title="Debit vs Credit Cards Outstanding">
                  <ResponsiveContainer width="100%" height={210}>
                    <LineChart data={trend}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#21262d"/>
                      <XAxis dataKey="month" tick={{ fill:'#8b949e', fontSize:11 }}/>
                      <YAxis tick={{ fill:'#8b949e', fontSize:11 }} tickFormatter={v=>`${(v/1e7).toFixed(1)}Cr`}/>
                      <Tooltip content={<TTip/>}/>
                      <Legend wrapperStyle={{ fontSize:11, color:'#8b949e' }}/>
                      <Line type="monotone" dataKey="debitCards"  stroke={COLORS.debitCards}  strokeWidth={2} dot={false} name="Debit Cards"/>
                      <Line type="monotone" dataKey="creditCards" stroke={COLORS.creditCards} strokeWidth={2} dot={false} name="Credit Cards"/>
                    </LineChart>
                  </ResponsiveContainer>
                </Card>
                <Card title="PoS Terminals">
                  <ResponsiveContainer width="100%" height={210}>
                    <AreaChart data={trend}>
                      <defs><linearGradient id="gb" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor="#ffd166" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#ffd166" stopOpacity={0}/>
                      </linearGradient></defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#21262d"/>
                      <XAxis dataKey="month" tick={{ fill:'#8b949e', fontSize:11 }}/>
                      <YAxis tick={{ fill:'#8b949e', fontSize:11 }} tickFormatter={v=>`${(v/1e7).toFixed(1)}Cr`}/>
                      <Tooltip content={<TTip/>}/>
                      <Area type="monotone" dataKey="pos" stroke="#ffd166" fill="url(#gb)" strokeWidth={2} name="PoS Terminals"/>
                    </AreaChart>
                  </ResponsiveContainer>
                </Card>
                <Card title="On-site vs Off-site ATMs">
                  <ResponsiveContainer width="100%" height={210}>
                    <BarChart data={trend}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#21262d"/>
                      <XAxis dataKey="month" tick={{ fill:'#8b949e', fontSize:11 }}/>
                      <YAxis tick={{ fill:'#8b949e', fontSize:11 }} tickFormatter={v=>`${(v/1e5).toFixed(1)}L`}/>
                      <Tooltip content={<TTip/>}/>
                      <Legend wrapperStyle={{ fontSize:11, color:'#8b949e' }}/>
                      <Bar dataKey="onsite"  fill={COLORS.onsite}  name="On-site"  radius={[3,3,0,0]}/>
                      <Bar dataKey="offsite" fill={COLORS.offsite} name="Off-site" radius={[3,3,0,0]}/>
                    </BarChart>
                  </ResponsiveContainer>
                </Card>
              </div>
            )}

            {activeTab==='atms' && (
              <div style={{ display:'grid', gap:18 }}>
                <Card title="ATM & CRM Growth">
                  <ResponsiveContainer width="100%" height={260}>
                    <LineChart data={trend}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#21262d"/>
                      <XAxis dataKey="month" tick={{ fill:'#8b949e', fontSize:12 }}/>
                      <YAxis tick={{ fill:'#8b949e', fontSize:12 }} tickFormatter={v=>`${(v/1e5).toFixed(2)}L`}/>
                      <Tooltip content={<TTip/>}/>
                      <Legend wrapperStyle={{ fontSize:12, color:'#8b949e' }}/>
                      <Line type="monotone" dataKey="totalATM" stroke={COLORS.totalATM} strokeWidth={2.5} dot={{ r:4 }} name="Total ATMs"/>
                      <Line type="monotone" dataKey="onsite"   stroke={COLORS.onsite}   strokeWidth={2}   dot={{ r:3 }} name="On-site"/>
                      <Line type="monotone" dataKey="offsite"  stroke={COLORS.offsite}  strokeWidth={2}   dot={{ r:3 }} name="Off-site"/>
                    </LineChart>
                  </ResponsiveContainer>
                </Card>
                <Card title={`Top 10 Banks by ATMs — ${latest.month}`}>
                  <HBar data={top('totalATM')} dataKey="totalATM" color={COLORS.totalATM} name="Total ATMs" fmt={v=>`${(v/1e3).toFixed(1)}K`}/>
                </Card>
              </div>
            )}

            {activeTab==='cards' && (
              <div style={{ display:'grid', gap:18 }}>
                <Card title="Card Issuance Trend">
                  <ResponsiveContainer width="100%" height={260}>
                    <LineChart data={trend}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#21262d"/>
                      <XAxis dataKey="month" tick={{ fill:'#8b949e', fontSize:12 }}/>
                      <YAxis tick={{ fill:'#8b949e', fontSize:12 }} tickFormatter={v=>`${(v/1e7).toFixed(2)}Cr`}/>
                      <Tooltip content={<TTip/>}/>
                      <Legend wrapperStyle={{ fontSize:12, color:'#8b949e' }}/>
                      <Line type="monotone" dataKey="debitCards"  stroke={COLORS.debitCards}  strokeWidth={2.5} dot={{ r:4 }} name="Debit Cards"/>
                      <Line type="monotone" dataKey="creditCards" stroke={COLORS.creditCards} strokeWidth={2.5} dot={{ r:4 }} name="Credit Cards"/>
                    </LineChart>
                  </ResponsiveContainer>
                </Card>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:18 }}>
                  <Card title={`Top 10 — Debit Cards (${latest.month})`}>
                    <HBar data={top('debitCards')} dataKey="debitCards" color={COLORS.debitCards} name="Debit Cards" fmt={v=>`${(v/1e7).toFixed(1)}Cr`}/>
                  </Card>
                  <Card title={`Top 10 — Credit Cards (${latest.month})`}>
                    <HBar data={top('creditCards')} dataKey="creditCards" color={COLORS.creditCards} name="Credit Cards" fmt={v=>`${(v/1e7).toFixed(1)}Cr`}/>
                  </Card>
                </div>
              </div>
            )}

            {activeTab==='pos' && (
              <div style={{ display:'grid', gap:18 }}>
                <Card title="PoS Terminal Growth">
                  <ResponsiveContainer width="100%" height={260}>
                    <AreaChart data={trend}>
                      <defs><linearGradient id="gc" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor="#ffd166" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#ffd166" stopOpacity={0}/>
                      </linearGradient></defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#21262d"/>
                      <XAxis dataKey="month" tick={{ fill:'#8b949e', fontSize:12 }}/>
                      <YAxis tick={{ fill:'#8b949e', fontSize:12 }} tickFormatter={v=>`${(v/1e7).toFixed(2)}Cr`}/>
                      <Tooltip content={<TTip/>}/>
                      <Area type="monotone" dataKey="pos" stroke="#ffd166" fill="url(#gc)" strokeWidth={2.5} name="PoS Terminals"/>
                    </AreaChart>
                  </ResponsiveContainer>
                </Card>
                <Card title={`Top 10 Banks by PoS — ${latest.month}`}>
                  <HBar data={top('pos')} dataKey="pos" color={COLORS.pos} name="PoS Terminals" fmt={v=>`${(v/1e6).toFixed(1)}M`}/>
                </Card>
              </div>
            )}

            {activeTab==='digital' && (
              <div style={{ display:'grid', gap:18 }}>
                <Card title="Digital Infrastructure Growth">
                  <ResponsiveContainer width="100%" height={260}>
                    <LineChart data={trend}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#21262d"/>
                      <XAxis dataKey="month" tick={{ fill:'#8b949e', fontSize:12 }}/>
                      <YAxis tick={{ fill:'#8b949e', fontSize:12 }} tickFormatter={v=>`${(v/1e7).toFixed(1)}Cr`}/>
                      <Tooltip content={<TTip/>}/>
                      <Legend wrapperStyle={{ fontSize:12, color:'#8b949e' }}/>
                      <Line type="monotone" dataKey="microATM" stroke={COLORS.microATM} strokeWidth={2} dot={{ r:3 }} name="Micro ATMs"/>
                      <Line type="monotone" dataKey="bharatQR" stroke={COLORS.bharatQR} strokeWidth={2} dot={{ r:3 }} name="Bharat QR"/>
                      <Line type="monotone" dataKey="upiQR"    stroke={COLORS.upiQR}    strokeWidth={2} dot={{ r:3 }} name="UPI QR Codes"/>
                    </LineChart>
                  </ResponsiveContainer>
                </Card>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:18 }}>
                  <Card title={`Top 10 — Micro ATMs (${latest.month})`}>
                    <HBar data={top('microATM')} dataKey="microATM" color={COLORS.microATM} name="Micro ATMs" fmt={v=>`${(v/1e3).toFixed(0)}K`}/>
                  </Card>
                  <Card title={`Top 10 — UPI QR Codes (${latest.month})`}>
                    <HBar data={top('upiQR')} dataKey="upiQR" color={COLORS.upiQR} name="UPI QR Codes" fmt={v=>`${(v/1e7).toFixed(1)}Cr`}/>
                  </Card>
                </div>
              </div>
            )}

            {activeTab==='banks' && (
              <Card title={`All Banks — ${latest.month}`}>
                <div style={{ overflowX:'auto' }}>
                  <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
                    <thead>
                      <tr style={{ borderBottom:'1px solid #30363d' }}>
                        {['#','Bank','On-site','Off-site','PoS','Micro ATMs','Bharat QR','UPI QR','Credit Cards','Debit Cards'].map(h => (
                          <th key={h} style={{ color:'#8b949e', textAlign:h==='#'||h==='Bank'?'left':'right',
                            padding:'8px 10px', fontWeight:600, whiteSpace:'nowrap', fontSize:11 }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {[...latest.banks].sort((a,b)=>b.totalATM-a.totalATM).map((row, i) => (
                        <tr key={row.bank} style={{ borderBottom:'1px solid #21262d', background:i%2===0?'#080d12':'transparent' }}>
                          <td style={{ padding:'7px 10px', color:'#8b949e' }}>{i+1}</td>
                          <td style={{ padding:'7px 10px', color:'#e6edf3', fontWeight:600, whiteSpace:'nowrap' }}>{row.bank}</td>
                          <td style={{ padding:'7px 10px', color:COLORS.onsite,      fontFamily:'monospace', textAlign:'right' }}>{fmtN(row.onsite)}</td>
                          <td style={{ padding:'7px 10px', color:COLORS.offsite,     fontFamily:'monospace', textAlign:'right' }}>{fmtN(row.offsite)}</td>
                          <td style={{ padding:'7px 10px', color:COLORS.pos,         fontFamily:'monospace', textAlign:'right' }}>{fmtN(row.pos)}</td>
                          <td style={{ padding:'7px 10px', color:COLORS.microATM,    fontFamily:'monospace', textAlign:'right' }}>{fmtN(row.microATM)}</td>
                          <td style={{ padding:'7px 10px', color:COLORS.bharatQR,    fontFamily:'monospace', textAlign:'right' }}>{fmtN(row.bharatQR)}</td>
                          <td style={{ padding:'7px 10px', color:COLORS.upiQR,       fontFamily:'monospace', textAlign:'right' }}>{fmtN(row.upiQR)}</td>
                          <td style={{ padding:'7px 10px', color:COLORS.creditCards, fontFamily:'monospace', textAlign:'right' }}>{fmtN(row.creditCards)}</td>
                          <td style={{ padding:'7px 10px', color:COLORS.debitCards,  fontFamily:'monospace', textAlign:'right' }}>{fmtN(row.debitCards)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            )}

            {activeTab==='insights' && <InsightsTab months={months} />}
          </>
        )}
      </div>
    </div>
  )
}
