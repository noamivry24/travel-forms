(function () {
  'use strict';
  const form = document.getElementById('app');
  const $ = sel => form.querySelector(sel);
  const field = name => form.elements[name];

  // ---------- Currencies ----------
  const CURRENCIES = [
    ['USD', 'דולר אמריקאי'], ['EUR', 'אירו'], ['ILS', 'שקל'], ['GBP', 'לירה שטרלינג'],
    ['CHF', 'פרנק שווייצרי'], ['CAD', 'דולר קנדי'], ['AUD', 'דולר אוסטרלי'], ['NZD', 'דולר ניו זילנדי'],
    ['SGD', 'דולר סינגפורי'], ['HKD', 'דולר הונג קונגי'], ['THB', 'באט תאילנדי'], ['JPY', 'ין יפני'],
    ['CNY', 'יואן סיני'], ['KRW', 'וון דרום קוריאני'], ['INR', 'רופי הודי'], ['VND', 'דונג וייטנאמי'],
    ['PHP', 'פסו פיליפיני'], ['IDR', 'רופיה אינדונזית'], ['MYR', 'רינגיט מלזי'], ['AED', 'דירהם (איחוד האמירויות)'],
    ['BHD', 'דינר בחרייני'], ['MAD', 'דירהם מרוקאי'], ['EGP', 'לירה מצרית'], ['JOD', 'דינר ירדני'],
    ['TRY', 'לירה טורקית'], ['GEL', 'לארי גאורגי'], ['AZN', 'מנאט אזרבייג׳ני'], ['KZT', 'טנגה קזחסטני'],
    ['PLN', 'זלוטי פולני'], ['CZK', 'קורונה צ׳כית'], ['HUF', 'פורינט הונגרי'], ['RON', 'לאו רומני'],
    ['BGN', 'לב בולגרי'], ['RSD', 'דינר סרבי'], ['UAH', 'הריבנה אוקראינית'], ['SEK', 'קרונה שוודית'],
    ['NOK', 'קרונה נורווגית'], ['DKK', 'כתר דני'], ['ISK', 'קרונה איסלנדית'], ['MXN', 'פסו מקסיקני'],
    ['BRL', 'ריאל ברזילאי'], ['ARS', 'פסו ארגנטינאי'], ['CLP', 'פסו צ׳יליאני'], ['COP', 'פסו קולומביאני'],
    ['PEN', 'סול פרואני'], ['ZAR', 'ראנד דרום אפריקאי'], ['KES', 'שילינג קנייתי'], ['ETB', 'ביר אתיופי'],
  ];
  let lastCurrency = 'USD';
  function currencyHTML(selected) {
    const opts = CURRENCIES.map(([c, n]) => `<option value="${c}"${c === selected ? ' selected' : ''}>${n} (${c})</option>`).join('');
    return `<select class="cur">${opts}<option value="OTHER">מטבע אחר…</option></select>
      <input class="cur-other" dir="ltr" placeholder="קוד המטבע, למשל LKR" hidden maxlength="12">`;
  }
  const readCurrency = box => {
    const sel = box.querySelector('select.cur');
    return sel.value === 'OTHER' ? box.querySelector('.cur-other').value.trim().toUpperCase() : sel.value;
  };
  form.addEventListener('change', ev => {
    if (!ev.target.matches('select.cur')) return;
    const other = ev.target.parentElement.querySelector('.cur-other');
    other.hidden = ev.target.value !== 'OTHER';
    if (ev.target.value === 'OTHER') other.focus();
    else if (ev.target.value !== 'ILS') lastCurrency = ev.target.value;
  });
  document.querySelectorAll('.cur-slot').forEach(slot => { slot.innerHTML = currencyHTML(slot.dataset.default); });

  // ---------- Expenses (settlement form) ----------
  const CATS = [
    { key: 'lodging', title: 'לינה', sub: 'עם קבלה מפורטת', add: 'הוספת מלון' },
    { key: 'car', title: 'הוצאות רכב בחו"ל', sub: 'דלק, חניה, השכרה', add: 'הוספת הוצאה', desc: 'למשל: דלק / חניה' },
    { key: 'taxiIL', title: 'מוניות בארץ', sub: 'לשדה התעופה וממנו', add: 'הוספת נסיעה', desc: 'למשל: מהבית לנתב״ג', currency: 'ILS' },
    { key: 'taxiAbroad', title: 'מוניות בחו"ל', sub: 'לשדה התעופה וממנו', add: 'הוספת נסיעה', noDesc: true },
    { key: 'other', title: 'אחר', sub: 'בתיאום מראש: כנס, קורס, מזוודה', add: 'הוספת הוצאה', desc: 'מה זה היה' },
  ];
  const expBox = document.getElementById('expenses');
  for (const c of CATS) {
    const lodging = c.key === 'lodging';
    expBox.insertAdjacentHTML('beforeend', `
      <div class="cat" data-cat="${c.key}">
        <h3>${c.title}<small>${c.sub}</small></h3>
        ${lodging ? `
        <div class="question">שילמת על החדר?
          <label class="pill"><input type="radio" name="lodgingPaid" value="yes"> כן</label>
          <label class="pill"><input type="radio" name="lodgingPaid" value="no"> לא</label>
        </div>
        <div class="payer" hidden><label>מי שילם? <input data-f="payer" placeholder="שם האדם או הגוף ששילם"></label></div>` : ''}
        <div class="paid-part"${lodging ? ' hidden' : ''}>
          <div class="entries"></div>
          <button type="button" class="add">+ ${c.add}</button>
        </div>
        <label class="note-field">הערה <textarea data-f="note" rows="2" placeholder="לא חובה"></textarea></label>
      </div>`);
  }
  function addEntry(catEl) {
    const c = CATS.find(x => x.key === catEl.dataset.cat);
    const lodging = c.key === 'lodging';
    const cur = c.currency || lastCurrency;
    const fields = lodging ? `
        <label>מתאריך <input type="date" data-f="from"></label>
        <label>עד תאריך <input type="date" data-f="to"></label>` : `
        <label>תאריך <input type="date" data-f="date"></label>${c.noDesc ? '' : `
        <label class="wide">תיאור <input data-f="desc" placeholder="${c.desc}"></label>`}`;
    catEl.querySelector('.entries').insertAdjacentHTML('beforeend', `
      <div class="entry">${fields}
        <label>סכום <input data-f="amount" inputmode="decimal" dir="ltr"></label>
        <label class="cur-box">מטבע ${currencyHTML(cur)}</label>
        <button type="button" class="remove" aria-label="הסרת ההוצאה" title="הסרה">×</button>
      </div>`);
  }
  expBox.addEventListener('click', ev => {
    if (ev.target.matches('.add')) addEntry(ev.target.closest('.cat'));
    if (ev.target.matches('.remove')) ev.target.closest('.entry').remove();
  });
  expBox.addEventListener('change', ev => {
    if (ev.target.name !== 'lodgingPaid') return;
    const cat = ev.target.closest('.cat'), yes = ev.target.value === 'yes';
    cat.querySelector('.paid-part').hidden = !yes;
    cat.querySelector('.payer').hidden = yes;
    if (yes && !cat.querySelector('.entry')) addEntry(cat);
  });
  expBox.addEventListener('input', ev => {
    if (ev.target.dataset.f === 'amount') ev.target.value = ev.target.value.replace(/[^\d.,]/g, '');
  });

  function collectExpenses() {
    const out = {};
    for (const catEl of expBox.querySelectorAll('.cat')) {
      const key = catEl.dataset.cat;
      const val = sel => (catEl.querySelector(sel)?.value || '').trim();
      const cat = { note: val('[data-f=note]'), entries: [] };
      if (key === 'lodging') {
        cat.paid = catEl.querySelector('input[name=lodgingPaid]:checked')?.value || '';
        cat.payer = val('[data-f=payer]');
      }
      if (key !== 'lodging' || cat.paid === 'yes') {
        for (const en of catEl.querySelectorAll('.entry')) {
          const e = { currency: readCurrency(en.querySelector('.cur-box')) };
          en.querySelectorAll('[data-f]').forEach(i => { e[i.dataset.f] = i.value.trim(); });
          e.amount = (e.amount || '').replace(/,/g, '');
          if (e.amount || e.date || e.from || e.desc) cat.entries.push(e);
        }
      }
      out[key] = cat;
    }
    return out;
  }

  // ---------- Which forms are selected ----------
  const wanted = () => [...form.querySelectorAll('input[name=want]:checked')].map(i => i.value);
  function refreshVisibility() {
    const w = wanted();
    form.querySelectorAll('[data-show]').forEach(el => el.classList.toggle('off', !w.includes(el.dataset.show)));
    let n = 0;
    form.querySelectorAll('section.card').forEach(sec => {
      const num = sec.querySelector('.num');
      if (num && !sec.classList.contains('off')) num.textContent = ++n;
    });
    renderButtons();
  }

  // ---------- Signature pad ----------
  const canvas = document.getElementById('sig');
  const sigWrap = canvas.parentElement;
  const ctx = canvas.getContext('2d');
  let drawing = false, signed = false, last = null;
  function sizeCanvas() {
    const r = canvas.getBoundingClientRect(), dpr = window.devicePixelRatio || 1;
    const keep = signed ? canvas.toDataURL() : null;
    canvas.width = r.width * dpr; canvas.height = r.height * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.lineCap = ctx.lineJoin = 'round'; ctx.lineWidth = 2.6; ctx.strokeStyle = '#0d1f73';
    if (keep) { const img = new Image(); img.onload = () => ctx.drawImage(img, 0, 0, r.width, r.height); img.src = keep; }
  }
  const pos = ev => { const r = canvas.getBoundingClientRect(); return { x: ev.clientX - r.left, y: ev.clientY - r.top }; };
  canvas.addEventListener('pointerdown', ev => { drawing = true; last = pos(ev); canvas.setPointerCapture(ev.pointerId); ev.preventDefault(); });
  canvas.addEventListener('pointermove', ev => {
    if (!drawing) return;
    const p = pos(ev);
    ctx.beginPath(); ctx.moveTo(last.x, last.y); ctx.lineTo(p.x, p.y); ctx.stroke();
    last = p; signed = true; sigWrap.classList.add('signed');
  });
  ['pointerup', 'pointercancel', 'pointerleave'].forEach(t => canvas.addEventListener(t, () => { drawing = false; }));
  document.getElementById('sigClear').addEventListener('click', () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height); signed = false; sigWrap.classList.remove('signed');
  });
  window.addEventListener('resize', sizeCanvas);

  // Crop the signature to its ink so it fits the small signature line on the form.
  function signaturePng() {
    if (!signed) return null;
    const { width: W, height: H } = canvas;
    const data = ctx.getImageData(0, 0, W, H).data;
    let x0 = W, y0 = H, x1 = -1, y1 = -1;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      if (data[(y * W + x) * 4 + 3] > 20) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    }
    if (x1 < 0) return null;
    const pad = 6, w = x1 - x0 + 1 + pad * 2, h = y1 - y0 + 1 + pad * 2;
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    c.getContext('2d').drawImage(canvas, x0 - pad, y0 - pad, w, h, 0, 0, w, h);
    return dataUrlToBytes(c.toDataURL('image/png'));
  }
  function dataUrlToBytes(url) {
    const bin = atob(url.split(',')[1]); const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  }

  // ---------- Input helpers and checks ----------
  function israeliIdValid(id) {
    id = String(id).trim();
    if (!/^\d{5,9}$/.test(id)) return false;
    id = id.padStart(9, '0');
    let sum = 0;
    for (let i = 0; i < 9; i++) { let d = +id[i] * ((i % 2) + 1); sum += d > 9 ? d - 9 : d; }
    return sum % 10 === 0;
  }
  function luhnValid(num) {
    const d = num.replace(/\D/g, '');
    if (d.length < 12) return false;
    let sum = 0;
    for (let i = 0; i < d.length; i++) { let n = +d[d.length - 1 - i]; if (i % 2) { n *= 2; if (n > 9) n -= 9; } sum += n; }
    return sum % 10 === 0;
  }
  function setHint(name, ok, goodText, badText) {
    const el = form.querySelector(`[data-hint="${name}"]`);
    const v = field(name).value.trim();
    el.className = 'hint' + (v ? (ok ? ' good' : ' bad') : '');
    el.textContent = v ? (ok ? goodText : badText) : '';
  }
  field('idNum').addEventListener('input', e => {
    e.target.value = e.target.value.replace(/\D/g, '');
    setHint('idNum', israeliIdValid(e.target.value), '✓ מספר תקין', 'ספרת הביקורת לא מתאימה – כדאי לבדוק');
  });
  field('cardNumber').addEventListener('input', e => {
    const d = e.target.value.replace(/\D/g, '').slice(0, 19);
    e.target.value = d.replace(/(.{4})/g, '$1 ').trim();
    setHint('cardNumber', luhnValid(d), '✓ מספר תקין', 'נראה שיש טעות במספר הכרטיס');
  });
  field('cardExpiry').addEventListener('input', e => {
    let d = e.target.value.replace(/\D/g, '').slice(0, 4);
    if (d.length > 2) d = d.slice(0, 2) + '/' + d.slice(2);
    e.target.value = d;
  });
  ['cvv', 'branch'].forEach(n => field(n).addEventListener('input', e => { e.target.value = e.target.value.replace(/\D/g, ''); }));

  // ---------- Receipts (settlement form) ----------
  // Files never leave the device: they are read in the browser and added as pages.
  const receipts = []; // { id, file, isPdf, url }
  const receiptList = document.getElementById('receiptList');
  const drop = document.getElementById('drop');
  const receiptInput = document.getElementById('receiptInput');
  let receiptSeq = 0;
  function addReceipts(files) {
    for (const file of files) {
      const isPdf = file.type === 'application/pdf' || /\.pdf$/i.test(file.name);
      if (!isPdf && !file.type.startsWith('image/') && !/\.(heic|heif)$/i.test(file.name)) continue;
      const r = { id: ++receiptSeq, file, isPdf, url: isPdf ? null : URL.createObjectURL(file), rot: 0 };
      receipts.push(r);
      const li = document.createElement('li');
      li.className = 'receipt'; li.dataset.id = r.id;
      li.innerHTML = `
        ${isPdf ? '<span class="thumb">PDF</span>' : `<img class="thumb" alt="">`}
        <span class="meta">
          <input data-caption placeholder="תיאור (לא חובה), למשל: מונית 1/11">
          <span class="fname"></span>
        </span>
        <span class="receipt-actions">
          ${isPdf ? '' : '<button type="button" class="rotate" aria-label="סיבוב התמונה" title="סיבוב">↻</button>'}
          <button type="button" class="remove" aria-label="הסרת הקבלה" title="הסרה">×</button>
        </span>`;
      li.querySelector('.fname').textContent = file.name;
      const img = li.querySelector('img');
      if (img) { img.src = r.url; img.onerror = () => img.replaceWith(Object.assign(document.createElement('span'), { className: 'thumb', textContent: 'תמונה' })); }
      receiptList.append(li);
      // A receipt photographed sideways (text running up/down) is turned upright automatically.
      if (!isPdf) r.ready = detectSideways(file).then(side => { if (side) { r.rot = 90; showRotation(r); } }).catch(() => {});

    }
  }
  receiptInput.addEventListener('change', () => { addReceipts(receiptInput.files); receiptInput.value = ''; });
  ['dragenter', 'dragover'].forEach(t => drop.addEventListener(t, e => { e.preventDefault(); drop.classList.add('over'); }));
  ['dragleave', 'drop'].forEach(t => drop.addEventListener(t, e => { e.preventDefault(); drop.classList.remove('over'); }));
  drop.addEventListener('drop', e => addReceipts(e.dataTransfer.files));
  function showRotation(r) {
    const img = receiptList.querySelector(`[data-id="${r.id}"] img.thumb`);
    if (img) img.style.transform = r.rot ? `rotate(${r.rot}deg)` : '';
  }
  receiptList.addEventListener('click', e => {
    if (e.target.matches('.rotate')) {
      const r = receipts.find(x => x.id === +e.target.closest('.receipt').dataset.id);
      if (r) { r.rot = (r.rot + 90) % 360; r.ready = null; showRotation(r); }
      return;
    }
    if (!e.target.matches('.remove')) return;
    const li = e.target.closest('.receipt'), i = receipts.findIndex(r => r.id === +li.dataset.id);
    if (i >= 0) { if (receipts[i].url) URL.revokeObjectURL(receipts[i].url); receipts.splice(i, 1); }
    li.remove();
  });

  // Turns photos into reasonably sized JPEGs (phone photos can be 10MB+), rotated as chosen.
  async function imageToJpeg(file, rot = 0) {
    const bmp = await createImageBitmap(file, { imageOrientation: 'from-image' });
    const max = 1400, k = Math.min(1, max / Math.max(bmp.width, bmp.height)); // 4 receipts share a page
    const w = Math.round(bmp.width * k), h = Math.round(bmp.height * k), side = rot % 180 !== 0;
    const c = document.createElement('canvas');
    c.width = side ? h : w; c.height = side ? w : h;
    const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height);
    g.translate(c.width / 2, c.height / 2); g.rotate(rot * Math.PI / 180);
    g.drawImage(bmp, -w / 2, -h / 2, w, h);
    const blob = await new Promise(res => c.toBlob(res, 'image/jpeg', 0.82));
    return new Uint8Array(await blob.arrayBuffer());
  }

  // Guesses whether the text in a photo runs vertically (receipt shot sideways).
  // Between lines of text there are rows with no ink at all. If instead there are
  // many ink-free columns, the text lines run up/down and the photo is sideways.
  // Measured in 6 narrow strips so a slightly tilted photo still works.
  async function detectSideways(file) {
    const bmp = await createImageBitmap(file, { imageOrientation: 'from-image' });
    const S = 600, N = 6, k = S / Math.max(bmp.width, bmp.height);
    const W = Math.max(1, Math.round(bmp.width * k)), H = Math.max(1, Math.round(bmp.height * k));
    const c = document.createElement('canvas'); c.width = W; c.height = H;
    const g = c.getContext('2d', { willReadFrequently: true }); g.drawImage(bmp, 0, 0, W, H);
    const d = g.getImageData(0, 0, W, H).data, gray = new Float32Array(W * H);
    for (let i = 0; i < W * H; i++) gray[i] = 0.3 * d[i * 4] + 0.59 * d[i * 4 + 1] + 0.11 * d[i * 4 + 2];
    const paper = Float32Array.from(gray).sort()[Math.floor(W * H * 0.9)]; // brightness of the paper
    const I = new Float64Array((W + 1) * (H + 1)); // integral image for fast local averages
    for (let y = 0; y < H; y++) for (let x = 0, row = 0; x < W; x++) { row += gray[y * W + x]; I[(y + 1) * (W + 1) + x + 1] = I[y * (W + 1) + x + 1] + row; }
    const R = Math.round(S / 60);
    const rowS = Array.from({ length: N }, () => new Float32Array(H)), colS = Array.from({ length: N }, () => new Float32Array(W));
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const x0 = Math.max(0, x - R), x1 = Math.min(W, x + R + 1), y0 = Math.max(0, y - R), y1 = Math.min(H, y + R + 1);
      const m = (I[y1 * (W + 1) + x1] - I[y0 * (W + 1) + x1] - I[y1 * (W + 1) + x0] + I[y0 * (W + 1) + x0]) / ((x1 - x0) * (y1 - y0));
      // ink = darker than its surroundings, on the paper (not the table it lies on)
      if (m > paper * 0.8 && gray[y * W + x] < m - 20) { rowS[Math.min(N - 1, Math.floor(x * N / W))][y]++; colS[Math.min(N - 1, Math.floor(y * N / H))][x]++; }
    }
    const emptyShare = p => {
      let tot = 0, mx = 0;
      for (const v of p) { tot += v; if (v > mx) mx = v; }
      if (tot < 20) return null;
      let acc = 0, a = 0, b = p.length - 1;
      for (let i = 0; i < p.length; i++) { acc += p[i]; if (acc < tot * 0.03) a = i; if (acc <= tot * 0.97) b = i; }
      let e = 0;
      for (let i = a; i <= b; i++) if (p[i] <= mx * 0.03) e++;
      return e / (b - a + 1);
    };
    const avg = list => { const v = list.map(emptyShare).filter(x => x != null); return v.length ? v.reduce((s, x) => s + x, 0) / v.length : 0; };
    const emptyRows = avg(rowS), emptyCols = avg(colS);
    return emptyCols > emptyRows + 0.1;
  }

  async function prepareReceipts() {
    const out = [], failed = [];
    for (const r of receipts) {
      const li = receiptList.querySelector(`[data-id="${r.id}"]`);
      const caption = li?.querySelector('[data-caption]')?.value.trim() || '';
      li?.querySelector('.err')?.remove();
      try {
        if (r.isPdf) out.push({ type: 'pdf', bytes: new Uint8Array(await r.file.arrayBuffer()), caption, name: r.file.name });
        else { if (r.ready) await r.ready; out.push({ type: 'jpg', bytes: await imageToJpeg(r.file, r.rot), caption, name: r.file.name }); }
      } catch (err) {
        failed.push(r.file.name);
        li?.querySelector('.meta').insertAdjacentHTML('beforeend', '<span class="err">לא הצלחתי לקרוא את הקובץ. נסו לצלם מסך שלו או לשמור אותו כ-JPG.</span>');
      }
    }
    return { out, failed };
  }

  // ---------- Answers ----------
  function collect() {
    const a = {};
    for (const el of form.elements) {
      if (!el.name || el.name === 'want' || el.name === 'lodgingPaid') continue;
      a[el.name] = el.value.trim();
    }
    a.advanceCurrency = readCurrency(document.querySelector('.cur-slot[data-name=advanceCurrency]'));
    a.expenses = collectExpenses();
    return a;
  }

  const REQUIRED = {
    common: [['name', 'שם מלא'], ['idNum', 'תעודת זהות'], ['destination', 'יעד'], ['depDate', 'תאריך יציאה'], ['retDate', 'תאריך חזרה']],
    commitment: [], // card details are optional on purpose
    settlement: [],
  };
  function missingFor(key, a) {
    const list = [...REQUIRED.common, ...REQUIRED[key]].filter(([n]) => !a[n]).map(([, label]) => label);
    if (!signed) list.push('חתימה');
    return list;
  }

  // ---------- Remember non-sensitive details (opt-in) ----------
  const REMEMBER_KEY = 'travel-forms-profile';
  const SAFE = ['name', 'idNum', 'rank', 'role', 'phone', 'email'];
  const remember = document.getElementById('remember');
  try {
    const saved = JSON.parse(localStorage.getItem(REMEMBER_KEY) || 'null');
    if (saved) { remember.checked = true; SAFE.forEach(k => { if (saved[k]) field(k).value = saved[k]; }); field('idNum').dispatchEvent(new Event('input')); }
  } catch (_) { /* storage unavailable */ }
  function saveProfile() {
    try {
      if (remember.checked) localStorage.setItem(REMEMBER_KEY, JSON.stringify(Object.fromEntries(SAFE.map(k => [k, field(k).value.trim()]))));
      else localStorage.removeItem(REMEMBER_KEY);
    } catch (_) { /* ignore */ }
  }
  remember.addEventListener('change', saveProfile);
  SAFE.forEach(k => field(k).addEventListener('change', saveProfile));

  // ---------- Generating PDFs ----------
  const cache = {};
  const getBytes = url => (cache[url] ||= fetch(url).then(r => {
    if (!r.ok) throw new Error('לא הצלחתי לטעון את ' + url);
    return r.arrayBuffer();
  }));

  const statusEl = document.getElementById('status');
  const missingEl = document.getElementById('missing');
  const buttonsEl = document.getElementById('buttons');

  function renderButtons() {
    const w = wanted();
    buttonsEl.innerHTML = '';
    if (!w.length) { statusEl.textContent = 'בחרו לפחות טופס אחד למעלה.'; return; }
    statusEl.textContent = '';
    for (const key of ['commitment', 'settlement']) {
      if (!w.includes(key)) continue;
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'btn'; b.dataset.form = key;
      b.textContent = 'הורדת ' + (key === 'commitment' ? 'טופס משיכת אש״ל' : 'טופס ההתחשבנות');
      buttonsEl.append(b);
    }
  }

  buttonsEl.addEventListener('click', async ev => {
    const btn = ev.target.closest('button[data-form]');
    if (!btn) return;
    const key = btn.dataset.form;
    const a = collect();

    // Hard requirement (cannot be skipped): confirm the bank account approval form will be sent.
    if (key === 'commitment' && !document.getElementById('bankAck').checked) {
      const box = document.getElementById('bankNotice');
      box.scrollIntoView({ behavior: 'smooth', block: 'center' });
      box.classList.remove('shake'); void box.offsetWidth; box.classList.add('shake');
      statusEl.textContent = 'לפני ההורדה צריך לאשר שקראת: יש לשלוח גם טופס אישור ניהול חשבון בנק לקצין הסימולטורים.';
      return;
    }
    const missing = missingFor(key, a);
    form.querySelectorAll('.invalid').forEach(el => el.classList.remove('invalid'));
    [...REQUIRED.common, ...REQUIRED[key]].forEach(([n]) => { if (!a[n]) field(n).classList.add('invalid'); });
    if (missing.length && btn.dataset.confirm !== '1') {
      missingEl.hidden = false;
      missingEl.textContent = 'חסרים: ' + missing.join(', ') + '. אפשר להשלים, או ללחוץ שוב כדי להוריד בכל זאת.';
      btn.dataset.confirm = '1';
      return;
    }
    missingEl.hidden = true; delete btn.dataset.confirm;

    btn.disabled = true; statusEl.textContent = 'ממלא את הטופס…';
    try {
      const def = FormFiller.FORMS[key];
      const [pdfBytes, fontBytes] = await Promise.all([getBytes(def.file), getBytes('fonts/Alef-Regular.ttf')]);
      let rec = { out: [], failed: [] };
      if (key === 'settlement' && receipts.length) { statusEl.textContent = 'מכין את הקבלות…'; rec = await prepareReceipts(); }
      const badPdf = [];
      const out = await FormFiller.fill(key, { PDFLib, fontkit, pdfBytes, fontBytes, answers: a, signaturePng: signaturePng(),
        receipts: rec.out, onReceiptError: name => badPdf.push(name) });
      const failed = [...rec.failed, ...badPdf];
      const url = URL.createObjectURL(new Blob([out], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url; link.download = `${def.fileName}${a.name ? ' - ' + a.name : ''}.pdf`;
      document.body.append(link); link.click(); link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 60000);
      const cardMissing = key === 'commitment' && !(a.cardNumber && a.cardExpiry && a.cvv);
      statusEl.textContent = cardMissing
        ? '✓ הטופס הורד. שימו לב: פרטי האשראי לא מולאו – צריך להשלים אותם ידנית בקובץ לפני ההגשה.'
        : failed.length
          ? `✓ הטופס הורד, אבל ${failed.length === 1 ? 'קבלה אחת לא צורפה' : failed.length + ' קבלות לא צורפו'}: ${failed.join(', ')}.`
          : `✓ הטופס הורד${rec.out.length ? ` עם ${rec.out.length === 1 ? 'קבלה אחת' : rec.out.length + ' קבלות'}` : ''}. כדאי לפתוח ולבדוק אותו לפני ההגשה.`;
    } catch (err) {
      console.error(err);
      statusEl.textContent = 'משהו השתבש: ' + err.message;
    } finally { btn.disabled = false; }
  });
  form.addEventListener('input', () => { if (!missingEl.hidden) { missingEl.hidden = true; buttonsEl.querySelectorAll('[data-confirm]').forEach(b => delete b.dataset.confirm); } });

  // Load the YouTube video only when the guide is opened (nothing is sent to YouTube before that).
  document.querySelectorAll('details.help').forEach(d => d.addEventListener('toggle', () => {
    const f = d.querySelector('iframe[data-src]');
    if (d.open && f && !f.src) f.src = f.dataset.src;
  }));

  document.getElementById('bankAck').addEventListener('change', e => {
    document.getElementById('bankNotice').classList.toggle('ok', e.target.checked);
    if (e.target.checked) statusEl.textContent = '';
  });

  // ---------- Start ----------
  field('fillDate').value = new Date().toLocaleDateString('en-CA');
  form.querySelectorAll('input[name=want]').forEach(i => i.addEventListener('change', refreshVisibility));
  refreshVisibility();
  sizeCanvas();
})();
