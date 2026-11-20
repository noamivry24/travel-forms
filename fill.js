// Fills the two fixed PDF forms with the user's answers.
// Works in the browser (window.FormFiller) and in Node (module.exports) for testing.
(function (root) {
  'use strict';

  // ---------- Hebrew right-to-left handling ----------
  // pdf-lib draws glyphs left to right, so Hebrew text must be converted to
  // "visual order" first. Numbers, dates and Latin words stay left to right.
  const HEB = /[֐-׿]/;
  const LTR = /[A-Za-z0-9À-ɏ]/;
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
      cls[i] = p >= 0 && n < cls.length && cls[p] === 'L' && cls[n] === 'L' ? 'L' : 'R';
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

  // Form 1: scanned page, 2052 x 2993 pt.
  const F1 = { size: 38, lift: 9 };
  const f1Rows = [
    ['food', 1100], ['lodging', 1320], ['car', 1530],
    ['taxiIL', 1685], ['taxiAbroad', 1858], ['other', 2025],
  ];
  const f1Cols = { date: [1588, 130], breakfast: [1465, 100], lunch: [1320, 170], dinner: [1183, 85], sum: [1078, 110] };

  const FORMS = {
    settlement: {
      file: 'forms/form1.pdf',
      title: 'התחשבנות לאחר נסיעת חו"ל בתפקיד',
      fileName: 'טופס התחשבנות',
      size: F1.size, lift: F1.lift,
      fields: a => {
        const list = [
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
          { v: a.advance ? `${fmtMoney(a.advance)} ${a.advanceCurrency || ''}`.trim() : '', x1: 1095, x2: 1545, y: 2250 },
          // Declaration at the bottom
          { v: a.name, x1: 1350, x2: 1755, y: 558 },
          { v: a.idNum, x1: 895, x2: 1255, y: 555 },
          { v: a.role, x1: 455, x2: 585, y: 548 },
          { v: a.rank, x1: 230, x2: 335, y: 546 },
        ];
        // Expenses table. The scan is slightly tilted, so columns drift left lower down.
        const ex = a.expenses || {};
        for (const [key, rowY] of f1Rows) {
          const row = ex[key] || {};
          const drift = (rowY - 1100) * 0.018;
          const y = 2993 - rowY - 12;
          for (const [col, [cx, w]] of Object.entries(f1Cols)) {
            let v = row[col];
            if (!v) continue;
            if (col === 'sum') v = fmtMoney(v);
            list.push({ v, x1: cx - drift - w / 2, x2: cx - drift + w / 2, y, align: 'center', lift: 0, size: 32 });
          }
        }
        return list;
      },
      signature: { x1: 1475, x2: 1700, y: 495, h: 85 },
    },

    commitment: {
      file: 'forms/form2.pdf',
      title: 'התחייבות לפני נסיעה – הקצאה בכרטיס אשראי',
      fileName: 'טופס התחייבות אשראי',
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

  // ---------- Filling ----------
  async function fill(formKey, { PDFLib, fontkit, pdfBytes, fontBytes, answers, signaturePng }) {
    const form = FORMS[formKey];
    const doc = await PDFLib.PDFDocument.load(pdfBytes);
    doc.registerFontkit(fontkit);
    const font = await doc.embedFont(fontBytes, { subset: true });
    const page = doc.getPages()[0];
    const ink = PDFLib.rgb(0.05, 0.12, 0.45); // dark blue, like a pen

    for (const f of form.fields(answers)) {
      const raw = String(f.v ?? '').trim();
      if (!raw) continue;
      const text = toVisual(raw);
      const maxW = f.x2 - f.x1 - 4;
      let size = f.size || form.size;
      let w = font.widthOfTextAtSize(text, size);
      if (w > maxW) { size = Math.max(size * 0.6, size * maxW / w); w = font.widthOfTextAtSize(text, size); }
      const x = f.align === 'center' ? (f.x1 + f.x2) / 2 - w / 2 : f.x2 - 2 - w;
      const lift = f.lift ?? form.lift;
      page.drawText(text, { x, y: f.y + lift, size, font, color: ink });
    }

    if (signaturePng && form.signature) {
      const s = form.signature;
      const img = await doc.embedPng(signaturePng);
      const scale = Math.min((s.x2 - s.x1) / img.width, s.h / img.height);
      const w = img.width * scale, h = img.height * scale;
      page.drawImage(img, { x: (s.x1 + s.x2) / 2 - w / 2, y: s.y + 1, width: w, height: h });
    }

    return doc.save();
  }

  const api = { FORMS, fill, toVisual, fmtDate };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.FormFiller = api;
})(typeof window !== 'undefined' ? window : globalThis);
