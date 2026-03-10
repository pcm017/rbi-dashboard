import * as XLSX from 'xlsx'

// ── Column indices (0-based) ──────────────────────────────────────────────────
export const C = {
  srno:        1,
  bank:        2,
  onsite:      3,
  offsite:     4,
  pos:         5,
  microATM:    6,
  bharatQR:    7,
  upiQR:       8,
  creditCards: 9,
  debitCards:  10,
}

export function num(v) {
  if (typeof v === 'number') return v
  if (v === null || v === undefined) return 0
  const n = parseFloat(String(v).replace(/,/g, ''))
  return isNaN(n) ? 0 : n
}

const MONTH_NAMES = ['january','february','march','april','may','june',
  'july','august','september','october','november','december']
const MONTH_ABBR  = ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec']

export function detectMonth(filename, sheetName, rows) {
  const src  = (sheetName + ' ' + filename).toLowerCase()
  const year = (src.match(/20\d\d/) || [])[0] || new Date().getFullYear()
  for (let i = 0; i < MONTH_NAMES.length; i++) {
    if (src.includes(MONTH_NAMES[i])) return `${cap(MONTH_NAMES[i])} ${year}`
  }
  for (let i = 0; i < MONTH_ABBR.length; i++) {
    if (src.includes(MONTH_ABBR[i])) return `${cap(MONTH_NAMES[i])} ${year}`
  }
  const title = String(((rows||[])[1] || [])[1] || '').toLowerCase()
  const yr2   = (title.match(/20\d\d/) || [])[0] || year
  for (let i = 0; i < MONTH_NAMES.length; i++) {
    if (title.includes(MONTH_NAMES[i])) return `${cap(MONTH_NAMES[i])} ${yr2}`
  }
  return filename.replace(/\.(xlsx?)/i, '')
}

function cap(s) { return s[0].toUpperCase() + s.slice(1) }

export function parseWorkbook(wb, filename) {
  const sheetName = wb.SheetNames[0]
  const ws        = wb.Sheets[sheetName]
  const rows      = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null })
  const month     = detectMonth(filename, sheetName, rows)
  const banks     = []
  let totals      = null

  for (const row of rows) {
    const srno     = row[C.srno]
    const bankName = String(row[C.bank] || '').trim()

    if (typeof srno === 'number' && bankName && bankName.length > 2) {
      banks.push({
        bank:        bankName,
        onsite:      num(row[C.onsite]),
        offsite:     num(row[C.offsite]),
        totalATM:    num(row[C.onsite]) + num(row[C.offsite]),
        pos:         num(row[C.pos]),
        microATM:    num(row[C.microATM]),
        bharatQR:    num(row[C.bharatQR]),
        upiQR:       num(row[C.upiQR]),
        creditCards: num(row[C.creditCards]),
        debitCards:  num(row[C.debitCards]),
      })
    }

    if (String(srno || '').toLowerCase() === 'total' || bankName.toLowerCase() === 'total') {
      totals = {
        bank: 'TOTAL',
        onsite:      num(row[C.onsite]),
        offsite:     num(row[C.offsite]),
        totalATM:    num(row[C.onsite]) + num(row[C.offsite]),
        pos:         num(row[C.pos]),
        microATM:    num(row[C.microATM]),
        bharatQR:    num(row[C.bharatQR]),
        upiQR:       num(row[C.upiQR]),
        creditCards: num(row[C.creditCards]),
        debitCards:  num(row[C.debitCards]),
      }
    }
  }

  if (!totals && banks.length > 0) {
    totals = banks.reduce((acc, b) => ({
      bank: 'TOTAL',
      onsite:      acc.onsite      + b.onsite,
      offsite:     acc.offsite     + b.offsite,
      totalATM:    acc.totalATM    + b.totalATM,
      pos:         acc.pos         + b.pos,
      microATM:    acc.microATM    + b.microATM,
      bharatQR:    acc.bharatQR    + b.bharatQR,
      upiQR:       acc.upiQR       + b.upiQR,
      creditCards: acc.creditCards + b.creditCards,
      debitCards:  acc.debitCards  + b.debitCards,
    }), { bank:'TOTAL', onsite:0, offsite:0, totalATM:0, pos:0, microATM:0, bharatQR:0, upiQR:0, creditCards:0, debitCards:0 })
  }

  if (!totals || banks.length === 0) return null
  return { month, filename, totals, banks }
}

// ── Sort months chronologically ───────────────────────────────────────────────
const MORD = ['January','February','March','April','May','June',
  'July','August','September','October','November','December']

export function sortMonths(arr) {
  return [...arr].sort((a, b) => {
    const [am, ay] = a.month.split(' ')
    const [bm, by] = b.month.split(' ')
    return ay !== by ? +ay - +by : MORD.indexOf(am) - MORD.indexOf(bm)
  })
}
