#!/usr/bin/env node
/**
 * generate-slides.js
 *
 * Parses PRESENTATION.md and exports a Google Slides-compatible .pptx file.
 * Import into Google Slides: File → Import slides → Upload → select .pptx
 *
 * Usage:
 *   node scripts/generate-slides.js
 *   # outputs: workshop-presentation.pptx
 */

'use strict'

const pptxgen = require('../node_modules/pptxgenjs')
const fs = require('fs')
const path = require('path')

const ROOT = path.resolve(__dirname, '..')
// Optional CLI overrides: node generate-slides.js [source.md] [out.pptx]
const SRC  = path.resolve(ROOT, process.argv[2] || 'PRESENTATION.md')
const OUT  = path.resolve(ROOT, process.argv[3] || 'workshop-presentation.pptx')

// ── Design tokens ────────────────────────────────────────────────────────────

const C = {
  BG:       '0F1117',   // default slide bg
  BG_MOD:   '0C1A35',   // module-header bg
  BG_EX:    '091A09',   // exercise slide bg
  BG_DEMO:  '1A0F00',   // demo slide bg
  BG_CODE:  '1E293B',   // code block bg
  BG_TH:    '1E3A5F',   // table header bg
  BG_TR:    '0F1A2E',   // table alt row bg

  TITLE:    '7DD3FC',   // h1
  H2:       '38BDF8',   // h2 / slide title
  H3:       '93C5FD',   // h3
  BODY:     'E2E8F0',   // body text
  MUTED:    '94A3B8',   // secondary text
  STRONG:   'FBBF24',   // bold / accent
  CODE:     'E2E8F0',   // code text
  CODE_KW:  'A5F3FC',   // code accent
  LINE:     '1E3A5F',   // horizontal rule / divider
  TH:       '7DD3FC',   // table header text
  EX_BAR:   '22C55E',   // exercise accent bar
  DEMO_BAR: 'F59E0B',   // demo accent bar
}

const FONT  = 'Calibri'
const MONO  = 'Courier New'

// 16:9 widescreen
const W  = 13.33
const H  = 7.5
const MX = 0.5          // horizontal margin
const CW = W - 2 * MX   // content width

// ── Markdown parser ──────────────────────────────────────────────────────────

function parseSlides (md) {
  // Strip the Marp YAML + style frontmatter (everything up to the second ---)
  const afterFrontmatter = md.replace(/^---[\s\S]+?---\n/, '')

  // Each slide is separated by a line containing only ---
  const rawSlides = afterFrontmatter.split(/\n---\n/)

  return rawSlides.map(raw => {
    const text = raw.trim()
    if (!text) return null

    // ── Directives ────────────────────────────────────────────────────────
    const classMatch  = text.match(/<!--\s*_class:\s*([^>]+?)\s*-->/)
    const classes     = classMatch ? classMatch[1].split(/\s+/) : []
    const noPaginate  = /<!--\s*paginate:\s*false\s*-->/.test(text)

    // Strip HTML comments before line-parsing
    const stripped = text.replace(/<!--[\s\S]*?-->/g, '').trim()
    const lines    = stripped.split('\n')

    // ── Structure extraction ──────────────────────────────────────────────
    let h1 = null, h2 = null
    const sections = []

    let inCode   = false
    let codeLang = ''
    let codeAcc  = []

    let inTable  = false
    let tableAcc = []   // array of string[]

    let bulletH3  = null
    let bulletAcc = []

    const flushBullets = () => {
      if (bulletAcc.length) {
        sections.push({ kind: 'bullets', h3: bulletH3, items: bulletAcc })
        bulletAcc = []
        bulletH3  = null
      }
    }

    const flushTable = () => {
      if (tableAcc.length) {
        sections.push({ kind: 'table', rows: tableAcc })
        tableAcc = []
        inTable  = false
      }
    }

    for (const line of lines) {
      // ── Code fence ──────────────────────────────────────────────────────
      if (line.startsWith('```')) {
        if (!inCode) {
          flushBullets()
          flushTable()
          inCode   = true
          codeLang = line.slice(3).trim()
          codeAcc  = []
        } else {
          inCode = false
          sections.push({ kind: 'code', lang: codeLang, content: codeAcc.join('\n') })
          codeAcc = []
        }
        continue
      }
      if (inCode) { codeAcc.push(line); continue }

      // ── Table ────────────────────────────────────────────────────────────
      if (line.trimStart().startsWith('|')) {
        flushBullets()
        if (line.match(/^\|[-| :]+\|$/)) continue  // separator row
        inTable = true
        const cells = line.split('|').slice(1, -1).map(c => c.trim())
        tableAcc.push(cells)
        continue
      } else if (inTable) {
        flushTable()
      }

      // ── Headings ─────────────────────────────────────────────────────────
      if (line.startsWith('# '))   { h1 = line.slice(2).trim(); continue }
      if (line.startsWith('## '))  { flushBullets(); h2 = line.slice(3).trim(); continue }
      if (line.startsWith('### ')) {
        flushBullets()
        bulletH3 = line.slice(4).trim()
        continue
      }

      // ── Bullets ──────────────────────────────────────────────────────────
      const bm = line.match(/^[-*]\s+(.+)/)
      if (bm) { bulletAcc.push(bm[1]); continue }

      // ── Numbered list ────────────────────────────────────────────────────
      const nm = line.match(/^\d+\.\s+(.+)/)
      if (nm) { bulletAcc.push(nm[1]); continue }

      // ── Paragraph ────────────────────────────────────────────────────────
      const trimmed = line.trim()
      if (trimmed && !trimmed.startsWith('!') && !trimmed.startsWith('[^')) {
        flushBullets()
        sections.push({ kind: 'para', content: trimmed })
      }
    }

    flushBullets()
    flushTable()
    if (inCode && codeAcc.length) sections.push({ kind: 'code', lang: codeLang, content: codeAcc.join('\n') })

    return { classes, noPaginate, h1, h2, sections }
  }).filter(Boolean)
}

// ── Text helpers ─────────────────────────────────────────────────────────────

// Strip inline markdown: **bold**, *italic*, `code`, links
function cleanText (s) {
  return s
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/~~([^~]+)~~/g, '$1')
}

// ── Slide renderers ──────────────────────────────────────────────────────────

function bg (slide, color) {
  slide.background = { color }
}

function accentBar (slide, color, h = 0.06) {
  slide.addShape('rect', {
    x: 0, y: 0, w: W, h,
    fill: { color }, line: { color, width: 0 }
  })
}

function dividerLine (slide, y) {
  slide.addShape('line', {
    x: MX, y, w: CW, h: 0,
    line: { color: C.LINE, width: 1.5 }
  })
}

// ── Render workshop title slide ───────────────────────────────────────────────
function renderWorkshopTitle (pptx, slide, data) {
  bg(slide, C.BG_MOD)

  // Gradient-like top stripe
  slide.addShape('rect', {
    x: 0, y: 0, w: W, h: 0.5,
    fill: { color: '0C1A35' }, line: { color: '0C1A35', width: 0 }
  })

  // Main title
  const title = data.h1 || data.h2 || 'Workshop'
  slide.addText(cleanText(title), {
    x: MX, y: 2.0, w: CW, h: 1.6,
    fontSize: 44, bold: true, color: C.TITLE,
    fontFace: FONT, align: 'center', valign: 'middle', wrap: true
  })

  // Subtitle / tag line from paragraphs
  const subtitleSections = data.sections.filter(s => s.kind === 'para')
  if (subtitleSections.length) {
    slide.addText(cleanText(subtitleSections[0].content), {
      x: MX, y: 3.8, w: CW, h: 0.7,
      fontSize: 22, color: C.H2,
      fontFace: FONT, align: 'center', wrap: true
    })
  }
  if (subtitleSections.length > 1) {
    slide.addText(cleanText(subtitleSections[1].content), {
      x: MX, y: 4.5, w: CW, h: 0.6,
      fontSize: 18, color: C.MUTED, italics: true,
      fontFace: FONT, align: 'center', wrap: true
    })
  }

  // Bullet badges (stack, Anthropic, etc.)
  const bullets = data.sections.find(s => s.kind === 'bullets')
  if (bullets) {
    const btext = bullets.items.map(b => '· ' + cleanText(b)).join('    ')
    slide.addText(btext, {
      x: MX, y: 5.4, w: CW, h: 0.6,
      fontSize: 14, color: C.MUTED,
      fontFace: FONT, align: 'center', wrap: true
    })
  }
}

// ── Render module header slide ────────────────────────────────────────────────
function renderModuleHeader (pptx, slide, data) {
  bg(slide, C.BG_MOD)

  // Top accent stripe
  slide.addShape('rect', {
    x: 0, y: 0, w: W, h: 0.12,
    fill: { color: C.H2 }, line: { color: C.H2, width: 0 }
  })

  // "Module N" label
  const h1 = data.h1 ? cleanText(data.h1) : ''
  const h2 = data.h2 ? cleanText(data.h2) : ''

  if (h1) {
    slide.addText(h1, {
      x: MX, y: 2.0, w: CW, h: 1.2,
      fontSize: 52, bold: true, color: C.TITLE,
      fontFace: FONT, align: 'center', valign: 'middle'
    })
  }

  if (h2) {
    slide.addText(h2, {
      x: MX, y: 3.4, w: CW, h: 0.9,
      fontSize: 28, color: C.H2,
      fontFace: FONT, align: 'center', wrap: true
    })
  }

  // Sub-label (italic para)
  const para = data.sections.find(s => s.kind === 'para')
  if (para) {
    slide.addText(cleanText(para.content), {
      x: MX, y: 4.5, w: CW, h: 0.7,
      fontSize: 18, color: C.MUTED, italics: true,
      fontFace: FONT, align: 'center', wrap: true
    })
  }
}

// ── Render closing slide ──────────────────────────────────────────────────────
function renderClosing (pptx, slide, data) {
  bg(slide, C.BG_MOD)
  slide.addShape('rect', {
    x: 0, y: H - 0.12, w: W, h: 0.12,
    fill: { color: C.H2 }, line: { color: C.H2, width: 0 }
  })

  const h2 = data.h2 ? cleanText(data.h2) : ''
  if (h2) {
    slide.addText(h2, {
      x: MX, y: 2.6, w: CW, h: 1.0,
      fontSize: 36, bold: true, color: C.TITLE,
      fontFace: FONT, align: 'center'
    })
  }

  const bullets = data.sections.find(s => s.kind === 'bullets')
  if (bullets) {
    const rows = bullets.items.map(item => cleanText(item))
    slide.addText(rows.join('\n'), {
      x: MX + 1, y: 3.8, w: CW - 2, h: 2.5,
      fontSize: 18, color: C.BODY,
      fontFace: FONT, align: 'center', wrap: true,
      lineSpacingMultiple: 1.5
    })
  }
}

// ── Render standard content slide ────────────────────────────────────────────
function renderContent (pptx, slide, data, accent) {
  bg(slide, accent === 'exercise' ? C.BG_EX : accent === 'demo' ? C.BG_DEMO : C.BG)

  // Accent bar at top
  const barColor = accent === 'exercise' ? C.EX_BAR : accent === 'demo' ? C.DEMO_BAR : C.LINE
  slide.addShape('rect', {
    x: 0, y: 0, w: W, h: 0.06,
    fill: { color: barColor }, line: { color: barColor, width: 0 }
  })

  const titleText = data.h2 || data.h1 || ''
  const titleColor = accent === 'exercise' ? C.EX_BAR : accent === 'demo' ? C.DEMO_BAR : C.H2

  // Slide title
  slide.addText(cleanText(titleText), {
    x: MX, y: 0.18, w: CW, h: 0.9,
    fontSize: 26, bold: true, color: titleColor,
    fontFace: FONT, wrap: true
  })

  dividerLine(slide, 1.1)

  // ── Layout sections ───────────────────────────────────────────────────────
  const sections = data.sections

  // Decide layout: code-only, table-only, bullets-only, mixed
  const hasCodes   = sections.some(s => s.kind === 'code')
  const hasTables  = sections.some(s => s.kind === 'table')
  const hasBullets = sections.some(s => s.kind === 'bullets')
  const hasPara    = sections.some(s => s.kind === 'para')

  let y = 1.25
  const maxY = H - 0.3

  for (const sec of sections) {
    if (y >= maxY) break

    if (sec.kind === 'h3') {
      slide.addText(cleanText(sec.h3 || ''), {
        x: MX, y, w: CW, h: 0.35,
        fontSize: 15, bold: true, color: C.H3,
        fontFace: FONT, wrap: true
      })
      y += 0.4

    } else if (sec.kind === 'para') {
      const txt = cleanText(sec.content)
      if (!txt) continue
      slide.addText(txt, {
        x: MX, y, w: CW, h: 0.45,
        fontSize: 16, color: C.BODY,
        fontFace: FONT, wrap: true
      })
      y += 0.5

    } else if (sec.kind === 'bullets') {
      if (sec.h3) {
        slide.addText(cleanText(sec.h3), {
          x: MX, y, w: CW, h: 0.35,
          fontSize: 15, bold: true, color: C.H3,
          fontFace: FONT, wrap: true
        })
        y += 0.38
      }
      for (const item of sec.items) {
        if (y >= maxY) break
        const cleanItem = cleanText(item)
        const lineCount = Math.ceil(cleanItem.length / 90) || 1
        const itemH = lineCount * 0.34
        slide.addText('▸  ' + cleanItem, {
          x: MX + 0.15, y, w: CW - 0.15, h: itemH,
          fontSize: 16, color: C.BODY,
          fontFace: FONT, wrap: true
        })
        y += itemH + 0.06
      }
      y += 0.1

    } else if (sec.kind === 'code') {
      const codeLines = sec.content.split('\n')
      const visibleLines = codeLines.slice(0, 22) // cap for slide space
      const codeText    = visibleLines.join('\n')
      const lineH       = 0.23
      const codeH       = Math.min(visibleLines.length * lineH + 0.25, maxY - y - 0.1)

      // Background box
      slide.addShape('rect', {
        x: MX, y, w: CW, h: codeH,
        fill: { color: C.BG_CODE },
        line: { color: '2D4A6B', width: 1 }
      })

      // Lang badge
      if (sec.lang) {
        slide.addText(sec.lang, {
          x: W - MX - 1.1, y: y + 0.04, w: 1.0, h: 0.22,
          fontSize: 9, color: C.MUTED,
          fontFace: MONO, align: 'right'
        })
      }

      slide.addText(codeText, {
        x: MX + 0.15, y: y + 0.1, w: CW - 0.3, h: codeH - 0.15,
        fontSize: 11, color: C.CODE,
        fontFace: MONO, wrap: false,
        lineSpacingMultiple: 1.2
      })
      y += codeH + 0.15

    } else if (sec.kind === 'table') {
      if (!sec.rows || sec.rows.length < 2) continue

      const header = sec.rows[0]
      const body   = sec.rows.slice(1)

      const colCount = header.length
      const colW     = CW / colCount
      const rowH     = 0.38
      const tableH   = (sec.rows.length * rowH) + 0.1

      if (y + tableH > maxY) {
        // Truncate rows that don't fit
        const maxRows = Math.floor((maxY - y - 0.1) / rowH)
        sec.rows = sec.rows.slice(0, maxRows)
      }

      const tableData = sec.rows.map((row, ri) => {
        return row.map(cell => ({
          text: cleanText(cell),
          options: {
            color:    ri === 0 ? C.TH   : C.BODY,
            fill:     ri === 0 ? C.BG_TH : (ri % 2 === 0 ? C.BG_TR : C.BG),
            bold:     ri === 0,
            fontFace: FONT,
            fontSize: 14,
            align:    'left',
            valign:   'middle',
          }
        }))
      })

      slide.addTable(tableData, {
        x: MX, y,
        w: CW,
        colW: Array(colCount).fill(colW),
        rowH: Array(sec.rows.length).fill(rowH),
        border: { pt: 1, color: C.LINE }
      })

      y += sec.rows.length * rowH + 0.2
    }
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main () {
  const md     = fs.readFileSync(SRC, 'utf8')
  const slides = parseSlides(md)

  const pptx = new pptxgen()
  pptx.layout = 'LAYOUT_WIDE'
  pptx.title  = 'Agentic Mobile Test Automation'
  pptx.author = 'droid-detective workshop'
  pptx.company = 'Snappi'

  let slideNum = 0

  for (const data of slides) {
    slideNum++
    const s = pptx.addSlide()

    const isTitle      = data.classes.includes('title') || data.classes.includes('lead')
    const isExercise   = data.classes.includes('exercise')
    const isDemo       = data.classes.includes('demo')
    const isModuleHead = isTitle && (data.h1 || data.h2)
    const isWorkshopTitle = slideNum === 1

    // Page number (bottom right, skip title slides)
    if (!isTitle && !data.noPaginate) {
      s.addText(String(slideNum), {
        x: W - 1, y: H - 0.4, w: 0.6, h: 0.3,
        fontSize: 11, color: C.MUTED,
        fontFace: FONT, align: 'right'
      })
      s.addText('droid-detective', {
        x: MX, y: H - 0.4, w: 3, h: 0.3,
        fontSize: 11, color: C.MUTED,
        fontFace: FONT
      })
    }

    if (isWorkshopTitle) {
      renderWorkshopTitle(pptx, s, data)
    } else if (data.noPaginate && data.h2 && !data.h1) {
      // "What You Built Today" / "Thank You" closing slides
      renderClosing(pptx, s, data)
    } else if (isModuleHead) {
      renderModuleHeader(pptx, s, data)
    } else if (isExercise) {
      renderContent(pptx, s, data, 'exercise')
    } else if (isDemo) {
      renderContent(pptx, s, data, 'demo')
    } else {
      renderContent(pptx, s, data, 'default')
    }
  }

  await pptx.writeFile({ fileName: OUT })
  console.log(`✓  ${slides.length} slides → ${OUT}`)
  console.log(`   Import into Google Slides: File → Import slides → Upload`)
}

main().catch(err => { console.error(err.message); process.exit(1) })
