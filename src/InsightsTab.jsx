import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, ReferenceLine,
} from 'recharts'
import { industryMetrics, bankMetrics, marketShares, rankChanges, outperformerFlags } from './metrics.js'
import { Card, SectionLabel, Badge, TTip, COLORS, fmtRaw, fmtPct, fmtN } from './components.jsx'

// ── Insight KPI tile ──────────────────────────────────────────────────────────
function InsightKPI({ label, value, description, color, delta, deltaLabel }) {
  return (
    <div style={{ background:'#0d1117', border:`1px solid ${color}22`,
      borderLeft:`3px solid ${color}`, borderRadius:8, padding:'14px 16px' }}>
      <div style={{ color:'#8b949e', fontSize:10, textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:5 }}>{label}</div>
      <div style={{ color:'#e6edf3', fontSize:20, fontWeight:800, fontFamily:'monospace' }}>{value}</div>
      {description && <div style={{ color:'#6e7681', fontSize:11, marginTop:4, lineHeight:1.5 }}>{description}</div>}
      {delta !== null && delta !== undefined && (
        <div style={{ color: delta >= 0 ? '#3fb950':'#f85149', fontSize:11, marginTop:5 }}>
          {delta >= 0 ? '▲':'▼'} {Math.abs(delta).toFixed(2)} {deltaLabel || 'MoM'}
        </div>
      )}
    </div>
  )
}

// ── Outperformer table ────────────────────────────────────────────────────────
function OutperformerTable({ latestBanks, prevBanks, latestTotals, prevTotals, metricKey, label }) {
  const flags    = outperformerFlags(latestBanks, prevBanks, latestTotals, prevTotals, metricKey)
  const rankChg  = rankChanges(latestBanks, prevBanks, metricKey)
  const industryGrowth = prevTotals
    ? ((latestTotals[metricKey] - prevTotals[metricKey]) / prevTotals[metricKey]) * 100
    : null

  const rows = latestBanks
    .map(b => ({ bank: b.bank, value: b[metricKey], outperform: flags[b.bank], rankChg: rankChg[b.bank] || 0 }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 15)

  return (
    <div>
      {industryGrowth !== null && (
        <div style={{ color:'#8b949e', fontSize:12, marginBottom:12 }}>
          Industry MoM growth: <span style={{ color: industryGrowth >= 0 ? '#3fb950':'#f85149', fontWeight:700 }}>
            {industryGrowth >= 0 ? '▲':'▼'} {Math.abs(industryGrowth).toFixed(2)}%
          </span>
        </div>
      )}
      <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
        <thead>
          <tr style={{ borderBottom:'1px solid #30363d' }}>
            {['Bank', label, 'vs Industry', 'Rank Δ'].map(h => (
              <th key={h} style={{ color:'#8b949e', textAlign: h==='Bank'?'left':'right',
                padding:'7px 10px', fontWeight:600, whiteSpace:'nowrap' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.bank} style={{ borderBottom:'1px solid #1c2128', background: i%2===0?'#080d12':'transparent' }}>
              <td style={{ padding:'7px 10px', color:'#e6edf3', fontWeight:500 }}>{r.bank}</td>
              <td style={{ padding:'7px 10px', color:'#c9d1d9', fontFamily:'monospace', textAlign:'right' }}>{fmtN(r.value)}</td>
              <td style={{ padding:'7px 10px', textAlign:'right' }}>
                {r.outperform !== null && r.outperform !== undefined
                  ? <Badge value={r.outperform} />
                  : <span style={{ color:'#8b949e' }}>—</span>}
              </td>
              <td style={{ padding:'7px 10px', textAlign:'right' }}>
                {r.rankChg !== 0
                  ? <Badge value={r.rankChg} />
                  : <span style={{ color:'#8b949e', fontSize:11 }}>—</span>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ── Main Insights tab ─────────────────────────────────────────────────────────
export default function InsightsTab({ months }) {
  if (months.length === 0) return null

  const latest     = months[months.length - 1]
  const prev       = months[months.length - 2]
  const latestM    = industryMetrics(latest.totals)
  const prevM      = prev ? industryMetrics(prev.totals) : null
  const latestBanksEnriched = latest.banks.map(bankMetrics)

  // Trend data for charts
  const trend = months.map(m => ({ month: m.month, ...industryMetrics(m.totals) }))

  // Delta helpers
  const d = (key) => prevM ? latestM[key] - prevM[key] : null

  // Market share for top banks
  const shares   = marketShares(latest.banks, latest.totals)
  const topByATM = shares.sort((a, b) => b.atmShare - a.atmShare).slice(0, 8)

  return (
    <div style={{ display:'grid', gap:20 }}>

      {/* ── Story 1: Digital Shift ──────────────────────────────────────── */}
      <SectionLabel>📱 Story 1 — Digital Shift (Physical → Digital)</SectionLabel>

      <div style={{ display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:14 }}>
        <InsightKPI
          label="Digital Infra Index"
          value={latestM.digitalInfraIndex.toFixed(2)}
          description="(PoS + UPI QR + Bharat QR) ÷ ATMs. Higher = more digital relative to cash infra."
          color={COLORS.upiQR}
          delta={d('digitalInfraIndex')}
          deltaLabel="pts MoM"
        />
        <InsightKPI
          label="Cash Infra Ratio"
          value={latestM.cashInfraRatio.toFixed(3)}
          description="ATMs ÷ PoS terminals. Declining = India shifting away from cash infrastructure."
          color={COLORS.offsite}
          delta={d('cashInfraRatio')}
          deltaLabel="pts MoM"
        />
        <InsightKPI
          label="PoS per ATM"
          value={latestM.posPerATM.toFixed(1)}
          description="How many PoS terminals exist for every ATM deployed."
          color={COLORS.pos}
          delta={d('posPerATM')}
          deltaLabel="pts MoM"
        />
      </div>

      <Card title="Digital Infra Index vs Cash Infra Ratio" subtitle="Divergence = structural shift from cash to digital">
        <ResponsiveContainer width="100%" height={230}>
          <LineChart data={trend}>
            <CartesianGrid strokeDasharray="3 3" stroke="#21262d"/>
            <XAxis dataKey="month" tick={{ fill:'#8b949e', fontSize:11 }}/>
            <YAxis yAxisId="left"  tick={{ fill:'#8b949e', fontSize:11 }} tickFormatter={v => v.toFixed(1)}/>
            <YAxis yAxisId="right" orientation="right" tick={{ fill:'#8b949e', fontSize:11 }} tickFormatter={v => v.toFixed(3)}/>
            <Tooltip content={<TTip/>}/>
            <Legend wrapperStyle={{ fontSize:12, color:'#8b949e' }}/>
            <Line yAxisId="left"  type="monotone" dataKey="digitalInfraIndex" stroke={COLORS.upiQR}   strokeWidth={2.5} dot={{ r:4 }} name="Digital Infra Index"/>
            <Line yAxisId="right" type="monotone" dataKey="cashInfraRatio"    stroke={COLORS.offsite} strokeWidth={2}   dot={{ r:3 }} name="Cash Infra Ratio (R)"/>
          </LineChart>
        </ResponsiveContainer>
      </Card>

      {/* ── Story 2: Bank Competitiveness ──────────────────────────────── */}
      <SectionLabel>🏆 Story 2 — Bank Competitiveness</SectionLabel>

      <div style={{ display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:14 }}>
        <InsightKPI
          label="Credit Card Penetration"
          value={`${latestM.creditCardPenetration.toFixed(1)}%`}
          description="Credit cards as % of all cards. Higher = banks winning premium customers."
          color={COLORS.creditCards}
          delta={d('creditCardPenetration')}
          deltaLabel="pp MoM"
        />
        <InsightKPI
          label="PoS Density"
          value={latestM.posDensity.toFixed(1)}
          description="PoS terminals per credit card issued. Merchant network strength."
          color={COLORS.pos}
          delta={d('posDensity')}
          deltaLabel="pts MoM"
        />
        <InsightKPI
          label="Digital Infra per Debit Card"
          value={latestM.digitalInfraPerCard.toFixed(1)}
          description="(PoS + UPI QR + Bharat QR) ÷ Debit Cards. Digital touchpoints per cardholder."
          color={COLORS.digital}
          delta={d('digitalInfraPerCard')}
          deltaLabel="pts MoM"
        />
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:18 }}>
        <Card title="Credit Card Penetration Trend" subtitle="% of total cards that are credit cards">
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={trend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#21262d"/>
              <XAxis dataKey="month" tick={{ fill:'#8b949e', fontSize:11 }}/>
              <YAxis tick={{ fill:'#8b949e', fontSize:11 }} tickFormatter={v => `${v.toFixed(1)}%`}/>
              <Tooltip content={<TTip/>}/>
              <Line type="monotone" dataKey="creditCardPenetration" stroke={COLORS.creditCards} strokeWidth={2.5} dot={{ r:4 }} name="CC Penetration %"/>
            </LineChart>
          </ResponsiveContainer>
        </Card>

        <Card title="Bank CC Penetration — Latest Month" subtitle="Which banks are winning the credit-card customer">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={[...latestBanksEnriched].sort((a,b)=>b.creditCardPenetration-a.creditCardPenetration).slice(0,10)} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#21262d" horizontal={false}/>
              <XAxis type="number" tick={{ fill:'#8b949e', fontSize:10 }} tickFormatter={v=>`${v}%`}/>
              <YAxis type="category" dataKey="bank" width={160} tick={{ fill:'#e6edf3', fontSize:10 }}/>
              <Tooltip content={<TTip/>}/>
              <Bar dataKey="creditCardPenetration" fill={COLORS.creditCards} name="CC Penetration %" radius={[0,4,4,0]}/>
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* ── Story 3: Market Share Dynamics ─────────────────────────────── */}
      <SectionLabel>📊 Story 3 — Market Share Dynamics</SectionLabel>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:18 }}>
        <Card title="ATM Market Share — Top 8 Banks" subtitle="% of total industry ATMs">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={topByATM} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#21262d" horizontal={false}/>
              <XAxis type="number" tick={{ fill:'#8b949e', fontSize:10 }} tickFormatter={v=>`${v}%`}/>
              <YAxis type="category" dataKey="bank" width={160} tick={{ fill:'#e6edf3', fontSize:10 }}/>
              <Tooltip content={<TTip/>}/>
              <Bar dataKey="atmShare" fill={COLORS.totalATM} name="ATM Share %" radius={[0,4,4,0]}/>
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card title="Credit Card Market Share — Top 8" subtitle="% of total industry credit cards">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={[...shares].sort((a,b)=>b.creditShare-a.creditShare).slice(0,8)} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#21262d" horizontal={false}/>
              <XAxis type="number" tick={{ fill:'#8b949e', fontSize:10 }} tickFormatter={v=>`${v}%`}/>
              <YAxis type="category" dataKey="bank" width={160} tick={{ fill:'#e6edf3', fontSize:10 }}/>
              <Tooltip content={<TTip/>}/>
              <Bar dataKey="creditShare" fill={COLORS.creditCards} name="Credit Card Share %" radius={[0,4,4,0]}/>
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {months.length > 1 && (
        <Card title="ATM Outperformers vs Industry" subtitle="Bank MoM growth minus industry MoM growth — positive = gaining ground">
          <OutperformerTable
            latestBanks={latest.banks}
            prevBanks={prev.banks}
            latestTotals={latest.totals}
            prevTotals={prev.totals}
            metricKey="totalATM"
            label="Total ATMs"
          />
        </Card>
      )}

      {months.length > 1 && (
        <Card title="Credit Card Outperformers vs Industry" subtitle="Bank MoM growth minus industry MoM growth">
          <OutperformerTable
            latestBanks={latest.banks}
            prevBanks={prev.banks}
            latestTotals={latest.totals}
            prevTotals={prev.totals}
            metricKey="creditCards"
            label="Credit Cards"
          />
        </Card>
      )}

      {/* ── Story 4: Reach & Access ─────────────────────────────────────── */}
      <SectionLabel>🌍 Story 4 — Reach & Access (Financial Inclusion)</SectionLabel>

      <div style={{ display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:14 }}>
        <InsightKPI
          label="Off-site ATM %"
          value={`${latestM.offsiteATMPct.toFixed(1)}%`}
          description="ATMs outside bank branches. Higher = broader geographic reach."
          color={COLORS.offsite}
          delta={d('offsiteATMPct')}
          deltaLabel="pp MoM"
        />
        <InsightKPI
          label="Micro ATM Intensity"
          value={`${latestM.microATMIntensity.toFixed(2)}%`}
          description="Micro ATMs as % of total ATM-class devices. Last-mile banking reach."
          color={COLORS.microATM}
          delta={d('microATMIntensity')}
          deltaLabel="pp MoM"
        />
        <InsightKPI
          label="UPI QR per Debit Card"
          value={latestM.upiQRPerDebitCard.toFixed(2)}
          description="UPI QR codes per debit card. Digital acceptance points per potential user."
          color={COLORS.upiQR}
          delta={d('upiQRPerDebitCard')}
          deltaLabel="pts MoM"
        />
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:18 }}>
        <Card title="Off-site ATM % Trend" subtitle="Branch-independent ATM access over time">
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={trend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#21262d"/>
              <XAxis dataKey="month" tick={{ fill:'#8b949e', fontSize:11 }}/>
              <YAxis tick={{ fill:'#8b949e', fontSize:11 }} tickFormatter={v=>`${v.toFixed(1)}%`}/>
              <Tooltip content={<TTip/>}/>
              <Line type="monotone" dataKey="offsiteATMPct" stroke={COLORS.offsite} strokeWidth={2.5} dot={{ r:4 }} name="Off-site ATM %"/>
            </LineChart>
          </ResponsiveContainer>
        </Card>

        <Card title="Off-site ATM % by Bank" subtitle="Who is deploying the most beyond-branch ATMs">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={[...latestBanksEnriched].filter(b=>b.totalATM>100).sort((a,b)=>b.offsiteATMPct-a.offsiteATMPct).slice(0,10)} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#21262d" horizontal={false}/>
              <XAxis type="number" tick={{ fill:'#8b949e', fontSize:10 }} tickFormatter={v=>`${v}%`}/>
              <YAxis type="category" dataKey="bank" width={160} tick={{ fill:'#e6edf3', fontSize:10 }}/>
              <Tooltip content={<TTip/>}/>
              <Bar dataKey="offsiteATMPct" fill={COLORS.offsite} name="Off-site %" radius={[0,4,4,0]}/>
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* ── Bank Scorecard ──────────────────────────────────────────────── */}
      <SectionLabel>🧾 Bank Scorecard — All Stories in One View</SectionLabel>

      <Card title="Bank Scorecard" subtitle="All 4 derived metrics per bank — sorted by Digital Infra Index">
        <div style={{ overflowX:'auto' }}>
          <table style={{ width:'100%', borderCollapse:'collapse', fontSize:11 }}>
            <thead>
              <tr style={{ borderBottom:'1px solid #30363d' }}>
                {['#','Bank','Digital Infra Index','CC Penetration %','Off-site ATM %','PoS Density','UPI QR / Debit Card','Micro ATM Intensity'].map(h => (
                  <th key={h} style={{ color:'#8b949e', textAlign:h==='#'||h==='Bank'?'left':'right',
                    padding:'7px 10px', fontWeight:600, whiteSpace:'nowrap', fontSize:10 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[...latestBanksEnriched]
                .filter(b => b.totalATM > 0 || b.debitCards > 0)
                .sort((a,b) => b.digitalInfraIndex - a.digitalInfraIndex)
                .map((b, i) => (
                  <tr key={b.bank} style={{ borderBottom:'1px solid #1c2128', background:i%2===0?'#080d12':'transparent' }}>
                    <td style={{ padding:'7px 10px', color:'#8b949e' }}>{i+1}</td>
                    <td style={{ padding:'7px 10px', color:'#e6edf3', fontWeight:500, whiteSpace:'nowrap' }}>{b.bank}</td>
                    <td style={{ padding:'7px 10px', color:COLORS.upiQR,       fontFamily:'monospace', textAlign:'right' }}>{b.digitalInfraIndex.toFixed(2)}</td>
                    <td style={{ padding:'7px 10px', color:COLORS.creditCards, fontFamily:'monospace', textAlign:'right' }}>{b.creditCardPenetration.toFixed(1)}%</td>
                    <td style={{ padding:'7px 10px', color:COLORS.offsite,     fontFamily:'monospace', textAlign:'right' }}>{b.offsiteATMPct.toFixed(1)}%</td>
                    <td style={{ padding:'7px 10px', color:COLORS.pos,         fontFamily:'monospace', textAlign:'right' }}>{b.posDensity.toFixed(1)}</td>
                    <td style={{ padding:'7px 10px', color:COLORS.upiQR,       fontFamily:'monospace', textAlign:'right' }}>{b.upiQRPerDebitCard.toFixed(2)}</td>
                    <td style={{ padding:'7px 10px', color:COLORS.microATM,    fontFamily:'monospace', textAlign:'right' }}>{b.microATMIntensity.toFixed(2)}%</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </Card>

    </div>
  )
}
