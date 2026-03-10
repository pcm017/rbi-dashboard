/**
 * All derived / computed metrics for Phase 2 Insights.
 * Each function takes raw bank/totals data and returns enriched objects.
 */

const safe = (n, d) => (d && d !== 0) ? n / d : 0
const pct  = v => Math.round(v * 10000) / 100   // → e.g. 0.312 → 31.20

// ── Industry-level derived metrics (one value per month) ─────────────────────
export function industryMetrics(totals) {
  const { totalATM, onsite, offsite, pos, microATM, bharatQR, upiQR, creditCards, debitCards } = totals

  const totalDigital  = pos + upiQR + bharatQR
  const totalCards    = creditCards + debitCards

  return {
    // Digital Shift
    digitalInfraIndex:      safe(totalDigital, totalATM),          // higher = more digital
    cashInfraRatio:         safe(totalATM, pos),                   // lower = less cash-dependent
    posPerATM:              safe(pos, totalATM),

    // Reach & Access
    offsiteATMPct:          pct(safe(offsite, totalATM)),          // %
    microATMIntensity:      pct(safe(microATM, microATM + totalATM)),  // %
    upiQRPerDebitCard:      safe(upiQR, debitCards),

    // Competitiveness
    creditCardPenetration:  pct(safe(creditCards, totalCards)),    // %
    posDensity:             safe(pos, creditCards),                // PoS per credit card
    digitalInfraPerCard:    safe(totalDigital, debitCards),

    // Raw for charting
    totalATM, onsite, offsite, pos, microATM, bharatQR, upiQR, creditCards, debitCards,
    totalDigital, totalCards,
  }
}

// ── Bank-level derived metrics ────────────────────────────────────────────────
export function bankMetrics(bank) {
  const { onsite, offsite, pos, microATM, bharatQR, upiQR, creditCards, debitCards } = bank
  const totalATM     = onsite + offsite
  const totalDigital = pos + upiQR + bharatQR
  const totalCards   = creditCards + debitCards

  return {
    ...bank,
    totalATM,
    creditCardPenetration: pct(safe(creditCards, totalCards)),
    offsiteATMPct:         pct(safe(offsite, totalATM)),
    digitalInfraIndex:     safe(totalDigital, totalATM || 1),
    posDensity:            safe(pos, creditCards || 1),
    digitalInfraPerCard:   safe(totalDigital, debitCards || 1),
    microATMIntensity:     pct(safe(microATM, microATM + totalATM || 1)),
    upiQRPerDebitCard:     safe(upiQR, debitCards || 1),
  }
}

// ── Market share per bank ─────────────────────────────────────────────────────
export function marketShares(banks, totals) {
  return banks.map(b => ({
    bank: b.bank,
    atmShare:    pct(safe(b.totalATM,    totals.totalATM)),
    posShare:    pct(safe(b.pos,         totals.pos)),
    debitShare:  pct(safe(b.debitCards,  totals.debitCards)),
    creditShare: pct(safe(b.creditCards, totals.creditCards)),
    upiShare:    pct(safe(b.upiQR,       totals.upiQR)),
  }))
}

// ── Rank change between two months ───────────────────────────────────────────
export function rankChanges(latestBanks, prevBanks, key) {
  if (!prevBanks) return {}
  const rankOf = (banks) => {
    const sorted = [...banks].sort((a, b) => b[key] - a[key])
    return Object.fromEntries(sorted.map((b, i) => [b.bank, i + 1]))
  }
  const latestRanks = rankOf(latestBanks)
  const prevRanks   = rankOf(prevBanks)
  const changes = {}
  for (const bank of Object.keys(latestRanks)) {
    const curr = latestRanks[bank]
    const prev = prevRanks[bank]
    changes[bank] = prev !== undefined ? prev - curr : 0  // positive = moved up
  }
  return changes
}

// ── MoM growth rate per bank ──────────────────────────────────────────────────
export function momGrowth(latestBanks, prevBanks, key) {
  if (!prevBanks) return {}
  const prevMap = Object.fromEntries(prevBanks.map(b => [b.bank, b[key]]))
  const result  = {}
  for (const b of latestBanks) {
    const prev = prevMap[b.bank]
    result[b.bank] = (prev && prev !== 0) ? ((b[key] - prev) / prev) * 100 : null
  }
  return result
}

// ── Outperformer flag: bank growth vs industry growth ────────────────────────
export function outperformerFlags(latestBanks, prevBanks, latestTotals, prevTotals, key) {
  if (!prevBanks || !prevTotals) return {}
  const industryGrowth = safe(latestTotals[key] - prevTotals[key], prevTotals[key]) * 100
  const bankGrowth     = momGrowth(latestBanks, prevBanks, key)
  const flags = {}
  for (const [bank, growth] of Object.entries(bankGrowth)) {
    if (growth === null) { flags[bank] = null; continue }
    flags[bank] = growth - industryGrowth  // positive = outperforming
  }
  return flags
}
