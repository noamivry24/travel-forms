// Fills the two fixed PDF forms with the user's answers.
// Works in the browser (window.FormFiller) and in Node (module.exports) for testing.
(function (root) {
  'use strict';

  // ---------- Hebrew right-to-left handling ----------
  // pdf-lib draws glyphs left to right, so Hebrew text must be converted to
  // "visual order" first. Numbers, dates and Latin words stay left to right.
  const HEB = /[֐-׿]/;
  const LTR = /[A-Za-z0-9\u00C0-\u024F$€£¥₪%]/; // currency signs stay with their numbers
  const MIRROR = { '(': ')', ')': '(', '[': ']', ']': '[', '{': '}', '}': '{', '<': '>', '>': '<' };

  function toVisual(str) {
    str = String(str ?? '');
    if (!HEB.test(str)) return str;
    const chars = [...str];
    const cls = chars.map(c => (HEB.test(c) ? 'R' : LTR.test(c) ? 'L' : 'N'));
    // A neutral between two LTR characters (e.g. "/" in a date, "@" in an email) joins them.
    for (let i = 0; i < cls.length; i++) {
      if (cls[i] !== 'N') continue;
      let p = i - 1; while (p >= 0 && cls[p] === 'N') p--;
      let n = i + 1; while (n < cls.length && cls[n] === 'N') n++;
      // Joined only when it sits inside one LTR word/number: between two Latin letters
      // (e.g. "a@b.com", "Hotel Ibis"), or a single separator inside a number/date ("5/11", "1,500").
      // Lists like "5/11-7/11, 9/11" are kept as separate items in right-to-left order.
      const letters = p >= 0 && n < cls.length && !/\d/.test(chars[p]) && !/\d/.test(chars[n]);
      const sep = n - p - 1 === 1 && chars[i] !== ' ';
      cls[i] = p >= 0 && n < cls.length && cls[p] === 'L' && cls[n] === 'L' && (letters || sep) ? 'L' : 'R';
    }
    const runs = [];
    chars.forEach((c, i) => {
      const last = runs[runs.length - 1];
      if (last && last.t === cls[i]) last.s.push(c); else runs.push({ t: cls[i], s: [c] });
    });
    return runs.reverse().map(r => (r.t === 'R' ? r.s.reverse().map(c => MIRROR[c] || c) : r.s).join('')).join('');
  }

  // ---------- Formatting helpers ----------
  function fmtDate(v) {
    if (!v) return '';
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v);
    return m ? `${m[3]}/${m[2]}/${m[1]}` : v;
  }
  function fmtMoney(v) {
    if (v === '' || v == null) return '';
    const n = Number(v);
    return isNaN(n) ? String(v) : n.toLocaleString('en-US', { maximumFractionDigits: 2 });
  }
  const join = (...parts) => parts.filter(Boolean).join(' / ');

  // ---------- Field positions (PDF points, origin bottom-left) ----------
  // x1..x2 is the blank line; y is the line height. Text is right-aligned (RTL form)
  // unless align is 'center'.

  // Currencies: common ones get their symbol, the rest are printed as ISO code.
  const CUR_SYMBOL = { ILS: '₪', USD: '$', EUR: '€', GBP: '£' };
  const money = (amount, cur) => `${fmtMoney(amount)} ${CUR_SYMBOL[cur] || cur || ''}`.trim();
  function totals(entries) {
    const t = {};
    for (const e of entries) {
      const n = Number(String(e.amount).replace(/,/g, ''));
      if (!e.amount || isNaN(n)) continue;
      t[e.currency] = (t[e.currency] || 0) + n;
    }
    return Object.entries(t).map(([c, n]) => money(Math.round(n * 100) / 100, c));
  }
  const shortDate = v => { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v || ''); return m ? `${+m[3]}/${+m[2]}` : (v || ''); };
  function dateSpan(dates) {
    const d = dates.filter(Boolean).sort();
    if (!d.length) return '';
    return d[0] === d[d.length - 1] ? shortDate(d[0]) : `${shortDate(d[0])}-${shortDate(d[d.length - 1])}`;
  }

  function vacationText(v) {
    if (!v || !v.answer) return '';
    if (v.answer === 'no') return 'חופשה במהלך המשלחת: לא';
    const ranges = (v.ranges || []).map(r => dateSpan([r.from, r.to || r.from])).filter(Boolean);
    return `חופשה במהלך המשלחת: כן${ranges.length ? ', בתאריכים ' + ranges.join(', ') : ''}`;
  }

  // Expense categories, in table order. top/bottom are the row edges on the scan (from the top).
  const CATEGORIES = [
    { key: 'lodging', title: 'לינה', top: 1205, bottom: 1440 },
    { key: 'car', title: 'הוצאות רכב בחו"ל', top: 1440, bottom: 1625 },
    { key: 'taxiIL', title: 'מוניות בארץ', top: 1625, bottom: 1745 },
    { key: 'taxiAbroad', title: 'מוניות בחו"ל', top: 1745, bottom: 1970 },
    { key: 'other', title: 'אחר', top: 1970, bottom: 2080 },
  ];

  // Form 1: scanned page, 2052 x 2993 pt.
  const F1 = { size: 38, lift: 9 };
  const H1 = 2993;

  // For each category: one line per expense (date | description | amount), then payer/note lines.
  function settlementRows(a) {
    const ex = a.expenses || {};
    return CATEGORIES.map(c => {
      const cat = ex[c.key] || {};
      const entries = (cat.entries || []).map(e => ({
        date: c.key === 'lodging' ? dateSpan([e.from, e.to]) : shortDate(e.date),
        desc: e.desc || '',
        sum: e.amount ? money(e.amount, e.currency) : '',
      }));
      const notes = [];
      if (c.key === 'lodging' && cat.paid === 'no') notes.push(`שולם ע״י ${cat.payer || '__________'}`);
      if (cat.note) notes.push(cat.note);
      const drift = ((c.top + c.bottom) / 2 - 1100) * 0.018; // the scan is slightly tilted
      return {
        key: c.key, entries, notes,
        yTop: H1 - c.top - 12, yBottom: H1 - c.bottom + 12,
        cols: { date: [1522 - drift, 1653 - drift], notes: [1140 - drift, 1517 - drift], sum: [1022 - drift, 1135 - drift] },
      };
    });
  }

  const FORMS = {
    settlement: {
      file: 'forms/form1.pdf',
      title: 'התחשבנות לאחר נסיעת חו"ל בתפקיד',
      fileName: 'טופס התחשבנות',
      size: F1.size, lift: F1.lift,
      fields: a => [
        { v: fmtDate(a.fillDate), x1: 1528, x2: 1855, y: 2678 },
        { v: a.name, x1: 1318, x2: 1745, y: 2475 },
        { v: a.idNum, x1: 568, x2: 948, y: 2456 },
        { v: a.destination, x1: 205, x2: 400, y: 2448 },
        { v: fmtDate(a.depDate), x1: 1418, x2: 1622, y: 2395 },
        { v: a.depTime, x1: 1012, x2: 1190, y: 2393 },
        { v: fmtDate(a.retDate), x1: 480, x2: 700, y: 2385 },
        { v: a.retTime, x1: 60, x2: 245, y: 2383 },
        { v: join(a.rank, a.role), x1: 1205, x2: 1565, y: 2328 },
        { v: a.phone, x1: 770, x2: 1050, y: 2318 },
        { v: a.email, x1: 205, x2: 580, y: 2313 },
        { v: a.advance ? money(a.advance, a.advanceCurrency) : '', x1: 1095, x2: 1545, y: 2250 },
        // Free line between the "expenses below…" sentence and the table
        { v: vacationText(a.vacation), x1: 900, x2: 1950, y: 2131, lift: 0, size: 36 },
        // Declaration at the bottom
        { v: a.name, x1: 1350, x2: 1755, y: 558 },
        { v: a.idNum, x1: 895, x2: 1255, y: 555 },
        { v: a.role, x1: 455, x2: 585, y: 548 },
        { v: a.rank, x1: 230, x2: 335, y: 546 },
      ],
      rows: settlementRows,
      appendix: true,
      signature: { x1: 1475, x2: 1700, y: 495, h: 85 },
    },

    commitment: {
      file: 'forms/form2.pdf',
      title: 'טופס משיכת אש״ל',
      fileName: 'טופס משיכת אש״ל',
      size: 10, lift: 2,
      fields: a => [
        { v: fmtDate(a.fillDate), x1: 447, x2: 526, y: 781, align: 'center' },
        { v: a.name, x1: 402, x2: 518, y: 703.8 },
        { v: a.idNum, x1: 196, x2: 300, y: 703.8, align: 'center' },
        { v: a.destination, x1: 60, x2: 151, y: 703.8 },
        { v: fmtDate(a.depDate), x1: 412, x2: 466, y: 652.9, align: 'center' },
        { v: a.depTime, x1: 301, x2: 350, y: 652.9, align: 'center' },
        { v: fmtDate(a.retDate), x1: 155, x2: 216, y: 652.9, align: 'center' },
        { v: a.retTime, x1: 49, x2: 98, y: 652.9, align: 'center' },
        { v: a.rank, x1: 371, x2: 487, y: 627.7 },
        { v: a.phone, x1: 270, x2: 349, y: 627.7, align: 'center' },
        { v: a.email, x1: 142, x2: 246, y: 627.7, align: 'center' },
        { v: a.bank, x1: 467, x2: 541, y: 602.4 },
        { v: a.branch, x1: 359, x2: 420, y: 602.4, align: 'center' },
        { v: a.account, x1: 196, x2: 275, y: 602.4, align: 'center' },
        { v: a.cardNumber, x1: 316, x2: 469, y: 577.2, align: 'center' },
        { v: a.cardType, x1: 245, x2: 281, y: 577.2, align: 'center' },
        { v: a.cardExpiry, x1: 155, x2: 204, y: 577.2, align: 'center' },
        { v: a.cvv, x1: 65, x2: 114, y: 577.2, align: 'center' },
        // Footer
        { v: fmtDate(a.fillDate), x1: 459, x2: 559, y: 135.9, align: 'center' },
        { v: a.name, x1: 276, x2: 415, y: 135.9, align: 'center' },
      ],
      signature: { x1: 112, x2: 239, y: 135.9, h: 34 },
    },
  };

  // fontkit (used by pdf-lib) reverses any string whose first letter is Hebrew,
  // which would undo toVisual(). So draw the visual-order text in pieces:
  // Hebrew pieces are handed over reversed (fontkit flips them back), others as-is.
  function drawVisual(page, text, x, y, size, font, color) {
    const parts = text.match(/[\u0590-\u05FF]+|[^\u0590-\u05FF]+/g) || [];
    for (const part of parts) {
      const isHeb = HEB.test(part);
      page.drawText(isHeb ? [...part].reverse().join('') : part, { x, y, size, font, color });
      x += font.widthOfTextAtSize(part, size);
    }
  }

  // ---------- Text layout helpers ----------
  // Splits logical-order text into lines no wider than maxW.
  function wrap(text, font, size, maxW) {
    const lines = [];
    for (const para of String(text).split(/\n/)) {
      let line = '';
      for (const word of para.split(/\s+/).filter(Boolean)) {
        const test = line ? line + ' ' + word : word;
        if (!line || font.widthOfTextAtSize(test, size) <= maxW) line = test;
        else { lines.push(line); line = word; }
      }
      if (line) lines.push(line);
    }
    return lines;
  }
  // Draws one line of logical-order text inside x1..x2, shrinking it if needed.
  function drawLine(page, raw, { x1, x2, y, size, align, font, color, minScale = 0.6 }) {
    const text = toVisual(raw);
    const maxW = x2 - x1 - 4;
    let w = font.widthOfTextAtSize(text, size);
    if (w > maxW) { size = Math.max(size * minScale, size * maxW / w); w = font.widthOfTextAtSize(text, size); }
    const x = align === 'center' ? (x1 + x2) / 2 - w / 2 : align === 'left' ? x1 + 2 : x2 - 2 - w;
    drawVisual(page, text, x, y, size, font, color);
  }

  const SEE_APPENDIX = 'פירוט מלא בנספח';

  // Writes the expenses table: each expense on its own line, lined up across the columns.
  // Text shrinks step by step to fit the cell; only if it still does not fit is the category
  // marked for the details page. Returns the set of categories that did not fit.
  function drawRows(page, rows, font, color) {
    const overflow = new Set();
    for (const r of rows) {
      if (!r.entries.length && !r.notes.length) continue;
      const avail = r.yTop - r.yBottom;
      const noteW = r.cols.notes[1] - r.cols.notes[0] - 6;
      const anyDesc = r.entries.some(e => e.desc);
      let layout;
      for (const size of [30, 27, 24, 22, 20]) {
        const lineH = size * 1.15;
        // Notes column: entry descriptions on their own lines (if any), then payer/note text.
        const noteLines = r.notes.flatMap(n => wrap(n, font, size, noteW));
        const lead = anyDesc ? r.entries.length : 0;
        const total = Math.max(r.entries.length, lead + noteLines.length);
        layout = { size, lineH, noteLines, lead, total, fits: total * lineH <= avail };
        if (layout.fits) break;
      }
      let { size, lineH, noteLines, lead, total } = layout;
      const maxLines = Math.max(1, Math.floor(avail / lineH));
      let shown = r.entries.length;
      if (!layout.fits) {
        overflow.add(r.key);
        // Keep what fits and point to the details page on the last line.
        shown = Math.min(shown, maxLines - 1);
        lead = anyDesc ? shown : 0;
        total = maxLines;
        noteLines = noteLines.slice(0, Math.max(0, maxLines - lead - 1)).concat(SEE_APPENDIX);
      }
      let y = (r.yTop + r.yBottom) / 2 + (total * lineH) / 2 - size * 0.85;
      for (let i = 0; i < total; i++, y -= lineH) {
        const e = r.entries[i];
        if (e && i < shown) {
          if (e.date) drawLine(page, e.date, { x1: r.cols.date[0] + 4, x2: r.cols.date[1] - 4, y, size, align: 'center', font, color, minScale: 0.4 });
          if (e.sum) drawLine(page, e.sum, { x1: r.cols.sum[0] + 4, x2: r.cols.sum[1] - 4, y, size, align: 'center', font, color, minScale: 0.4 });
          if (anyDesc && e.desc) drawLine(page, e.desc, { x1: r.cols.notes[0] + 4, x2: r.cols.notes[1] - 6, y, size, align: 'right', font, color, minScale: 0.5 });
        }
        const n = noteLines[i - lead];
        if (n && i >= lead) drawLine(page, n, { x1: r.cols.notes[0], x2: r.cols.notes[1], y, size, align: 'right', font, color });
      }
    }
    return overflow;
  }

  // Extra page(s) listing every expense, added when the table cells are not enough.
  function drawAppendix(doc, a, font, PDFLib) {
    const [W, H] = [2052, 2993];
    const black = PDFLib.rgb(0.1, 0.1, 0.1), ink = PDFLib.rgb(0.05, 0.12, 0.45), grey = PDFLib.rgb(0.6, 0.6, 0.6);
    const cols = { cat: [1560, 1900], date: [1250, 1540], desc: [610, 1230], sum: [150, 590] };
    let page, y;
    const newPage = () => {
      page = doc.addPage([W, H]);
      y = H - 180;
      drawLine(page, 'נספח לטופס התחשבנות – פירוט הוצאות', { x1: 150, x2: 1900, y, size: 60, font, color: black });
      y -= 90;
      const trip = [a.name, a.idNum && `ת״ז ${a.idNum}`, a.destination && `יעד: ${a.destination}`,
        (a.depDate || a.retDate) && `${fmtDate(a.depDate)} – ${fmtDate(a.retDate)}`].filter(Boolean).join('   |   ');
      drawLine(page, trip, { x1: 150, x2: 1900, y, size: 36, font, color: ink });
      y -= 100;
      const head = { cat: 'סוג ההוצאה', date: 'תאריך', desc: 'תיאור', sum: 'סכום' };
      for (const [k, [x1, x2]] of Object.entries(cols)) drawLine(page, head[k], { x1, x2, y, size: 36, font, color: black });
      y -= 22;
      page.drawLine({ start: { x: 150, y }, end: { x: 1900, y }, thickness: 3, color: black });
      y -= 60;
    };
    const ensure = h => { if (y - h < 200) newPage(); };
    newPage();

    const all = [];
    for (const c of CATEGORIES) {
      const cat = (a.expenses || {})[c.key] || {};
      const entries = cat.entries || [];
      const payer = c.key === 'lodging' && cat.paid === 'no' ? `שולם ע״י ${cat.payer || ''}` : '';
      if (!entries.length && !cat.note && !payer) continue;
      ensure(120);
      drawLine(page, c.title, { x1: cols.cat[0], x2: cols.cat[1], y, size: 38, font, color: black });
      if (!entries.length) y -= 55;
      for (const e of entries) {
        const descLines = wrap(e.desc || '', font, 34, cols.desc[1] - cols.desc[0]);
        ensure(Math.max(1, descLines.length) * 46);
        const date = c.key === 'lodging' ? [fmtDate(e.from), fmtDate(e.to)].filter(Boolean).join(' – ') : fmtDate(e.date);
        drawLine(page, date, { x1: cols.date[0], x2: cols.date[1], y, size: 34, font, color: ink });
        if (e.amount) drawLine(page, money(e.amount, e.currency), { x1: cols.sum[0], x2: cols.sum[1], y, size: 34, font, color: ink });
        descLines.forEach((l, i) => drawLine(page, l, { x1: cols.desc[0], x2: cols.desc[1], y: y - i * 44, size: 34, font, color: ink }));
        y -= Math.max(1, descLines.length) * 44 + 12;
        all.push(e);
      }
      if (entries.length > 1) {
        drawLine(page, 'סה״כ: ' + totals(entries).join(' + '), { x1: cols.sum[0], x2: cols.desc[1], y, size: 34, font, color: black });
        y -= 56;
      }
      for (const extra of [payer, cat.note && `הערה: ${cat.note}`].filter(Boolean)) {
        for (const l of wrap(extra, font, 34, cols.date[1] - cols.sum[0])) {
          ensure(46);
          drawLine(page, l, { x1: cols.sum[0], x2: cols.date[1], y, size: 34, font, color: ink });
          y -= 46;
        }
      }
      y -= 10;
      page.drawLine({ start: { x: 150, y: y + 30 }, end: { x: 1900, y: y + 30 }, thickness: 1, color: grey });
      y -= 30;
    }
    const grand = totals(all);
    if (grand.length) {
      ensure(80);
      drawLine(page, 'סה״כ כל ההוצאות: ' + grand.join(' + '), { x1: 150, x2: 1900, y: y - 20, size: 40, font, color: black });
    }
  }

  // Receipts go after the form as a collage: 4 per A4 page (2 x 2), each with a "קבלה N" label.
  // Photos and every page of a PDF receipt each take one cell.
  async function addReceipts(doc, receipts, font, PDFLib, onError) {
    const dark = PDFLib.rgb(0.1, 0.1, 0.1), frame = PDFLib.rgb(0.8, 0.8, 0.8);
    const items = [];
    let n = 0;
    for (const r of receipts) {
      try {
        if (r.type === 'pdf') {
          const src = await PDFLib.PDFDocument.load(r.bytes, { ignoreEncryption: true });
          const pages = await doc.embedPdf(src, src.getPageIndices());
          n++;
          pages.forEach((p, i) => items.push({ draw: p, w: p.width, h: p.height, isPage: true,
            label: `קבלה ${n}${r.caption ? ' – ' + r.caption : ''}${pages.length > 1 ? ` (עמוד ${i + 1}/${pages.length})` : ''}` }));
        } else {
          const img = await doc.embedJpg(r.bytes);
          n++;
          items.push({ draw: img, w: img.width, h: img.height, label: `קבלה ${n}${r.caption ? ' – ' + r.caption : ''}` });
        }
      } catch (err) {
        if (onError) onError(r.name || `קבלה ${n + 1}`, err); else throw err;
      }
    }
    // Pack into rows: a wide (landscape) receipt takes a whole row = half a page,
    // tall ones go two to a row. A tall receipt may move up to fill a half-empty row.
    const wide = it => it.w > it.h * 1.15;
    const queue = items.slice(), rowsList = [];
    while (queue.length) {
      const it = queue.shift();
      if (wide(it)) { rowsList.push([it]); continue; }
      const j = queue.findIndex(x => !wide(x));
      rowsList.push(j >= 0 ? [it, queue.splice(j, 1)[0]] : [it]);
    }
    const W = 595.28, H = 841.89, M = 24, G = 14;
    const cw = (W - 2 * M - G) / 2, ch = (H - 2 * M - G) / 2, labelH = 18;
    let page;
    const place = (it, x, yTop, boxW) => {
      drawLine(page, it.label, { x1: x, x2: x + boxW, y: yTop - 12, size: 11, font, color: dark });
      const boxH = ch - labelH, k = Math.min(boxW / it.w, boxH / it.h);
      const w = it.w * k, h = it.h * k, ix = x + (boxW - w) / 2, iy = yTop - labelH - boxH + (boxH - h) / 2;
      if (it.isPage) page.drawPage(it.draw, { x: ix, y: iy, width: w, height: h });
      else page.drawImage(it.draw, { x: ix, y: iy, width: w, height: h });
      page.drawRectangle({ x: ix, y: iy, width: w, height: h, borderColor: frame, borderWidth: 0.6 });
    };
    rowsList.forEach((row, i) => {
      if (i % 2 === 0) page = doc.addPage([W, H]);
      const yTop = H - M - (i % 2) * (ch + G);
      if (row.length === 1 && wide(row[0])) place(row[0], M, yTop, W - 2 * M);
      else row.forEach((it, c) => place(it, W - M - (c + 1) * cw - c * G, yTop, cw)); // right to left
    });
  }

  // ---------- Filling ----------
  async function fill(formKey, { PDFLib, fontkit, pdfBytes, fontBytes, answers, signaturePng, receipts, onReceiptError }) {
    const form = FORMS[formKey];
    const doc = await PDFLib.PDFDocument.load(pdfBytes);
    doc.registerFontkit(fontkit);
    const font = await doc.embedFont(fontBytes, { subset: true });
    const page = doc.getPages()[0];
    const ink = PDFLib.rgb(0.05, 0.12, 0.45); // dark blue, like a pen

    for (const f of form.fields(answers)) {
      const raw = String(f.v ?? '').trim();
      if (!raw) continue;
      drawLine(page, raw, { x1: f.x1, x2: f.x2, y: f.y + (f.lift ?? form.lift), size: f.size || form.size, align: f.align, font, color: ink });
    }

    if (form.rows) {
      // The details page is a last resort, only when the table cells really cannot hold everything.
      const overflow = drawRows(page, form.rows(answers), font, ink);
      if (form.appendix && overflow.size) drawAppendix(doc, answers, font, PDFLib);
    }

    if (signaturePng && form.signature) {
      const s = form.signature;
      const img = await doc.embedPng(signaturePng);
      const scale = Math.min((s.x2 - s.x1) / img.width, s.h / img.height);
      const w = img.width * scale, h = img.height * scale;
      page.drawImage(img, { x: (s.x1 + s.x2) / 2 - w / 2, y: s.y + 1, width: w, height: h });
    }

    if (receipts && receipts.length) await addReceipts(doc, receipts, font, PDFLib, onReceiptError);

    return doc.save();
  }

  const api = { FORMS, CATEGORIES, fill, toVisual, drawVisual, fmtDate };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.FormFiller = api;
})(typeof window !== 'undefined' ? window : globalThis);
