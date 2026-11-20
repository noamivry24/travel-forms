(function () {
  'use strict';
  const form = document.getElementById('app');
  const $ = sel => form.querySelector(sel);
  const field = name => form.elements[name];

  // ---------- Expenses table (settlement form) ----------
  const EXPENSES = [
    { key: 'food', title: 'כלכלה', sub: 'ארוחות לקיזוז', meals: true },
    { key: 'lodging', title: 'לינה', sub: 'עם קבלה מפורטת' },
    { key: 'car', title: 'הוצאות רכב בחו"ל', sub: 'דלק, חניה' },
    { key: 'taxiIL', title: 'מוניות בארץ', sub: 'לשדה התעופה וממנו' },
    { key: 'taxiAbroad', title: 'מוניות בחו"ל', sub: 'לשדה התעופה וממנו' },
    { key: 'other', title: 'אחר', sub: 'בתיאום מראש' },
  ];
  const expBox = document.getElementById('expenses');
  for (const e of EXPENSES) {
    const meals = e.meals ? `
      <label>בוקר <input name="ex_${e.key}_breakfast" inputmode="numeric" placeholder="כמה"></label>
      <label>צהריים <input name="ex_${e.key}_lunch" inputmode="numeric" placeholder="כמה"></label>
      <label>ערב <input name="ex_${e.key}_dinner" inputmode="numeric" placeholder="כמה"></label>` : '';
    expBox.insertAdjacentHTML('beforeend', `
      <div class="exp-row">
        <div class="exp-title">${e.title}<small>${e.sub}</small></div>
        <div class="exp-fields">
          <label>תאריך <input name="ex_${e.key}_date" dir="ltr" placeholder="1-7/11"></label>
          ${meals}
          <label>סכום <input name="ex_${e.key}_sum" inputmode="decimal" dir="ltr"></label>
        </div>
      </div>`);
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

  // ---------- Answers ----------
  function collect() {
    const a = {};
    for (const el of form.elements) if (el.name && !el.name.startsWith('ex_') && el.name !== 'want') a[el.name] = el.value.trim();
    a.expenses = {};
    for (const e of EXPENSES) {
      const row = {};
      for (const col of ['date', 'breakfast', 'lunch', 'dinner', 'sum']) {
        const el = field(`ex_${e.key}_${col}`);
        if (el && el.value.trim()) row[col] = el.value.trim();
      }
      a.expenses[e.key] = row;
    }
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
      const out = await FormFiller.fill(key, { PDFLib, fontkit, pdfBytes, fontBytes, answers: a, signaturePng: signaturePng() });
      const url = URL.createObjectURL(new Blob([out], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url; link.download = `${def.fileName}${a.name ? ' - ' + a.name : ''}.pdf`;
      document.body.append(link); link.click(); link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 60000);
      const cardMissing = key === 'commitment' && !(a.cardNumber && a.cardExpiry && a.cvv);
      statusEl.textContent = cardMissing
        ? '✓ הטופס הורד. שימו לב: פרטי האשראי לא מולאו – צריך להשלים אותם ידנית בקובץ לפני ההגשה.'
        : '✓ הטופס הורד. כדאי לפתוח ולבדוק אותו לפני ההגשה.';
    } catch (err) {
      console.error(err);
      statusEl.textContent = 'משהו השתבש: ' + err.message;
    } finally { btn.disabled = false; }
  });
  form.addEventListener('input', () => { if (!missingEl.hidden) { missingEl.hidden = true; buttonsEl.querySelectorAll('[data-confirm]').forEach(b => delete b.dataset.confirm); } });

  // ---------- Start ----------
  field('fillDate').value = new Date().toLocaleDateString('en-CA');
  form.querySelectorAll('input[name=want]').forEach(i => i.addEventListener('change', refreshVisibility));
  refreshVisibility();
  sizeCanvas();
})();
