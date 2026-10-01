import * as db from './db.js';
import {
  MOODS, SCENARIOS, EMOTIONS, EVENTS, THOUGHTS, CONCERNS, PERSPECTIVE_RESPONSES, ACTIONS, OUTCOMES, SUPPORT_PLACES,
  byId, labelOf, current,
} from './data.js';
import * as L from './logic.js';
import { BIRDS } from './birds.js';
import * as T from './today.js';

const main = document.getElementById('main');
const SAVE_ERROR = '記録を保存できませんでした。入力内容を確認して、もう一度試してください。';
const LOAD_ERROR = '記録を読み込めませんでした。ページを再読み込みして、もう一度試してください。';

// ---------------------------------------------------------------- helpers

function h(tag, attrs, ...children) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
    else if (k === 'value') el.value = v;
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const c of children.flat(Infinity)) {
    if (c == null || c === false) continue;
    el.append(c instanceof Node ? c : String(c));
  }
  return el;
}

function toast(message, { error = false } = {}) {
  const el = document.getElementById('toast');
  el.textContent = message;
  el.className = `toast show${error ? ' error' : ''}`;
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => { el.className = 'toast'; }, error ? 7000 : 3500);
}

function confirmDialog({ title, body, ok = 'OK', cancel = 'キャンセル', danger = false }) {
  const dlg = document.getElementById('dialog');
  return new Promise((resolve) => {
    const done = (v) => { dlg.close(); resolve(v); };
    dlg.replaceChildren(
      h('h2', { id: 'dlg-title' }, title),
      body ? h('p', {}, body) : null,
      h('div', { class: 'row end' },
        h('button', { type: 'button', class: 'btn', onclick: () => done(false) }, cancel),
        h('button', { type: 'button', class: `btn ${danger ? 'danger' : 'primary'}`, onclick: () => done(true) }, ok)),
    );
    dlg.setAttribute('aria-labelledby', 'dlg-title');
    dlg.oncancel = (e) => { e.preventDefault(); done(false); };
    dlg.showModal();
  });
}

const fmtDate = (iso) => new Intl.DateTimeFormat('ja-JP', { month: 'numeric', day: 'numeric', weekday: 'short' }).format(new Date(iso));
const fmtDateTime = (iso) => new Intl.DateTimeFormat('ja-JP', { year: 'numeric', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(iso));
const clip = (s, n = 60) => (s.length > n ? `${s.slice(0, n)}…` : s);

function debounce(fn, ms = 500) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
}

async function persist(record, opts) {
  try {
    const saved = await db.saveRecord(record, opts);
    record.updatedAt = saved.updatedAt;
    return true;
  } catch (e) {
    console.error(e);
    toast(SAVE_ERROR, { error: true });
    return false;
  }
}

// 複数選択 / 単一選択のボタン群
function chips({ items, selected, multiple = true, label, onChange }) {
  const group = h('div', { class: 'chips', role: 'group', 'aria-label': label });
  const draw = () => {
    group.replaceChildren(...items.map((it) => {
      const on = selected.includes(it.value);
      return h('button', {
        type: 'button', class: 'chip', 'aria-pressed': String(on),
        onclick: () => {
          if (on) selected.splice(selected.indexOf(it.value), 1);
          else { if (!multiple) selected.length = 0; selected.push(it.value); }
          draw();
          onChange?.(it.value, !on);
          group.querySelector(`[data-v="${CSS.escape(it.value)}"]`)?.focus();
        },
        'data-v': it.value,
      }, it.emoji ? h('span', { 'aria-hidden': 'true', class: 'emoji' }, it.emoji) : null, it.label);
    }));
  };
  draw();
  return group;
}

// 文字列リストの入力欄（追加・削除）
function listEditor({ items, label, placeholder, onChange }) {
  const wrap = h('div', { class: 'list-editor' });
  const ul = h('ul', { class: 'items' });
  const input = h('input', { type: 'text', placeholder, 'aria-label': `${label}を追加`, enterkeyhint: 'done' });
  const add = () => {
    const v = input.value.trim();
    if (!v) return;
    if (!items.includes(v)) items.push(v);
    input.value = '';
    draw();
    onChange?.();
    input.focus();
  };
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.isComposing) { e.preventDefault(); add(); }
  });
  const draw = () => {
    ul.replaceChildren(...items.map((it, i) => h('li', {},
      h('span', { class: 'item-text' }, it),
      h('button', {
        type: 'button', class: 'icon-btn', 'aria-label': `「${it}」を消す`,
        onclick: () => { items.splice(i, 1); draw(); onChange?.(); input.focus(); },
      }, '×'))));
    ul.hidden = !items.length;
  };
  draw();
  wrap.append(ul, h('div', { class: 'add-row' }, input, h('button', { type: 'button', class: 'btn', onclick: add }, '追加')));
  wrap.redraw = draw;
  return wrap;
}

function safetyCard() {
  return h('section', { class: 'card safety', 'aria-labelledby': 'safety-title' },
    h('h2', { id: 'safety-title' }, '今ひとりで抱えるには、重すぎる状態かもしれません'),
    h('p', {}, '身近な人や専門機関など、現実の支援につながることも考えてください。このアプリは診断や治療を行うものではありません。'),
    h('p', {}, h('strong', {}, '命の危険を感じるときは、すぐに 119（救急）や 110（警察）に連絡してください。')),
    h('p', {}, '話せる相手・相談できる場所の例：'),
    h('ul', { class: 'plain dots' }, SUPPORT_PLACES.map((p) => h('li', {}, p))),
    h('p', { class: 'muted small' }, '日本国外にいる場合は、その地域の緊急番号や相談窓口に連絡してください。'),
  );
}

function backLink(href, text) {
  return h('a', { href, class: 'back-link' }, h('span', { 'aria-hidden': 'true' }, '← '), text);
}

function field(labelText, control, desc) {
  const id = `f-${Math.random().toString(36).slice(2, 8)}`;
  control.id = id;
  const descId = desc ? `${id}-d` : null;
  if (descId) control.setAttribute('aria-describedby', descId);
  return h('div', { class: 'field' },
    h('label', { for: id }, labelText),
    desc ? h('p', { id: descId, class: 'muted small' }, desc) : null,
    control);
}

// 鳥が話しかける吹き出し。setText で中身を差し替えられる（空なら隠す）。
// cont: 同じ鳥が続けて話すとき（鳥の絵を省く）
function say(bird, text, { live = false, cont = false } = {}) {
  const b = BIRDS[bird];
  const avatar = h('div', { class: 'bird', 'aria-hidden': 'true' });
  avatar.innerHTML = b.svg;
  const p = h('p', {}, text);
  const bubble = h('div', { class: 'bubble' }, h('span', { class: 'who' }, b.name), p);
  const el = h('div', { class: `say say-${bird}${cont ? ' cont' : ''}`, 'aria-live': live ? 'polite' : null }, avatar, bubble);
  el.setText = (t) => { p.textContent = t; el.classList.toggle('empty', !t); };
  el.setText(text);
  return el;
}

// ---------------------------------------------------------------- router

const routes = [
  [/^\/?$/, screenHome],
  [/^\/moyamoya$/, screenMoyamoya],
  [/^\/today(?:\/([\d-]+))?$/, (m) => screenToday(m[1])],
  [/^\/history\/days$/, screenHistoryDays],
  [/^\/consult\/new\/(\w+)(?:\/(\w+))?$/, (m) => startConsult(m[1], m[2])],
  [/^\/consult\/([\w-]+)$/, (m) => screenConsult(m[1])],
  [/^\/reflect\/([\w-]+)$/, (m) => screenReflect(m[1])],
  [/^\/history$/, screenHistory],
  [/^\/record\/([\w-]+)$/, (m) => screenRecord(m[1])],
  [/^\/memo$/, screenMemo],
  [/^\/settings$/, screenSettings],
  [/^\/support$/, screenSupport],
  [/^\/welcome$/, screenWelcome],
];

// はじめての人には、使う前に保存のしくみを伝える（相談先だけは説明の前でも開ける）
const WELCOME_FREE = ['/welcome', '/support'];

async function render() {
  const path = decodeURIComponent(location.hash.replace(/^#/, '')) || '/';
  if (!loadPrefs().welcomed && !WELCOME_FREE.includes(path)) { location.replace('#/welcome'); return; }
  const hit = routes.find(([re]) => re.test(path));
  if (!hit) { location.replace('#/'); return; }
  try {
    const view = await hit[1](path.match(hit[0]));
    if (view) mount(view);
  } catch (e) {
    console.error(e);
    mount(h('div', { class: 'screen' },
      h('h1', {}, '表示できませんでした'),
      h('p', {}, LOAD_ERROR),
      h('a', { href: '#/', class: 'btn' }, 'ホームへ戻る')));
  }
}

function mount(view) {
  main.replaceChildren(view);
  window.scrollTo(0, 0);
  const h1 = main.querySelector('h1');
  if (h1) { h1.tabIndex = -1; h1.focus({ preventScroll: true }); }
  document.title = h1 ? `${h1.textContent} | 気持ちの整理` : '気持ちの整理';
}

// ---------------------------------------------------------------- Home

async function screenHome() {
  let draft = null;
  let today = null;
  try {
    [draft, today] = await Promise.all([
      db.getAllRecords().then((list) => list.find((r) => r.status === 'draft')),
      db.getDay(T.dateKey()),
    ]);
  } catch (e) { console.error(e); }

  return h('div', { class: 'screen home' },
    say('enaga', T.greeting(T.dateKey(), { hasRecord: !!today })),
    h('h1', { class: 'hero' }, '今日は、どうする？'),
    h('div', { class: 'entry-list' },
      h('a', { href: '#/moyamoya', class: 'entry' },
        h('span', { class: 'entry-icon', 'aria-hidden': 'true' }, '🐦'),
        h('span', { class: 'entry-body' },
          h('span', { class: 'entry-title' }, 'モヤモヤしたとき'),
          h('span', { class: 'entry-sub' }, 'ちょっと聞いてほしい'))),
      h('a', { href: '#/today', class: 'entry' },
        h('span', { class: 'entry-icon', 'aria-hidden': 'true' }, '🌱'),
        h('span', { class: 'entry-body' },
          h('span', { class: 'entry-title' }, '今日の自分'),
          h('span', { class: 'entry-sub' }, today ? '今日の続きを見る' : '今日ここまでやってきたことを見てみよう')))),
    draft ? h('section', { class: 'card quiet' },
      h('h2', { class: 'h3' }, '途中の整理があります'),
      h('p', { class: 'muted small' }, `${fmtDateTime(draft.createdAt)}　${draft.eventText ? clip(draft.eventText, 30) : ''}`),
      h('a', { href: `#/consult/${draft.id}`, class: 'btn' }, '続きから')) : null,
    h('nav', { class: 'home-nav', 'aria-label': 'そのほかの画面' },
      h('a', { href: '#/history', class: 'nav-item' }, '過去の記録'),
      h('a', { href: '#/memo', class: 'nav-item' }, '自分へのメモ'),
      h('a', { href: '#/settings', class: 'nav-item' }, '設定')),
    h('p', { class: 'center small' }, h('a', { href: '#/support', class: 'text-link' }, 'つらさがとても強いとき・今すぐ助けが必要なとき')),
  );
}

// モヤモヤしたとき：気分の選択（以前のホーム画面）
function screenMoyamoya() {
  return h('div', { class: 'screen moyamoya' },
    backLink('#/', 'ホーム'),
    say('enaga', 'うまく説明できなくても大丈夫。選ぶだけでもいいよ。'),
    h('h1', { class: 'hero' }, '今日は、どんな感じ？'),
    h('div', { class: 'mood-grid' }, current(MOODS).map((m) => h('a', {
      href: `#/consult/new/${m.id}`, class: 'mood-btn',
    }, m.label))),
    h('section', { class: 'scenario-start', 'aria-labelledby': 'sc-title' },
      h('h2', { id: 'sc-title', class: 'h3 muted' }, 'こんな気持ちから始めてもいいよ'),
      // 気分の選択肢と同じもの（嫌われた気がする）は重ねて出さない
      h('div', { class: 'stack' }, SCENARIOS.filter((s) => !current(MOODS).some((m) => m.label === s.label)).map((s) => h('a', { href: `#/consult/new/none/${s.id}`, class: 'scenario-btn' }, s.label)))),
  );
}

// ---------------------------------------------------------------- 今日の自分

async function screenToday(dateParam) {
  const date = dateParam && T.isDateKey(dateParam) ? dateParam : T.dateKey();
  const isToday = date === T.dateKey();
  const [existing, allDays] = await Promise.all([db.getDay(date), db.getAllDays()]);
  const day = existing || db.normalizeDay({ date });
  let saved = !!existing;

  // 前の日に「明日の自分に渡した」こと（今日の画面のときだけ）
  const prev = isToday ? allDays.find((d) => d.date < date && d.carried.length) : null;

  const status = h('p', { class: 'save-status muted small', 'aria-live': 'polite' });
  const safetySlot = h('div', { 'aria-live': 'polite' });
  const save = debounce(async () => {
    try {
      const res = await db.saveDay(day);
      day.createdAt = res.createdAt;
      day.updatedAt = res.updatedAt;
      saved = true;
      status.textContent = '保存しました';
    } catch (e) {
      console.error(e);
      toast(SAVE_ERROR, { error: true });
    }
  }, 500);
  const changed = () => {
    const texts = [day.memo, ...day.doneOther, ...day.notDoneOther];
    if (texts.some((t) => L.textHasCrisis(t)) && !safetySlot.firstChild) safetySlot.append(safetyCard());
    status.textContent = '';
    save();
    drawClosing();
  };

  let seq = 0; // 声かけが毎回同じにならないように
  const line = (list) => T.pick(list, `${date}-${seq++}`);

  // ---- 気分 ----
  const condReply = say('enaga', '', { live: true });
  const restSlot = h('div', { 'aria-live': 'polite' });
  const drawRest = () => {
    const c = byId(T.CONDITIONS, day.condition);
    restSlot.replaceChildren(c?.rest ? h('section', { class: 'card rest', 'aria-labelledby': 'rest-title' },
      h('h2', { id: 'rest-title', class: 'h3' }, '今日は、休むことを優先してもいいよ'),
      h('p', { class: 'muted small' }, 'できそうなものがあれば。どれもできなくてもいい。'),
      h('ul', { class: 'plain dots' }, T.REST_IDEAS.map((r) => h('li', {}, r))),
      h('p', { class: 'muted small' }, 'つらい状態が続く場合は、必要に応じて医療機関などに相談してね。',
        day.condition === 'veryheavy' ? [' ', h('a', { href: '#/support', class: 'text-link' }, '相談先の案内')] : null)) : '');
  };
  const condSel = day.condition ? [day.condition] : [];
  const condChips = chips({
    items: T.CONDITIONS.map((c) => ({ value: c.id, label: c.label, emoji: c.emoji })), selected: condSel, multiple: false, label: '今日の自分の調子',
    onChange: () => {
      day.condition = condSel[0] || '';
      const c = byId(T.CONDITIONS, day.condition);
      condReply.setText(c ? line(c.lines) : '');
      drawRest();
      changed();
    },
  });
  drawRest();

  // ---- できたこと ----
  const doneReply = say('enaga', '', { live: true });
  const doneChips = chips({
    items: T.DONE_ITEMS.map((d) => ({ value: d.id, label: d.label })), selected: day.done, label: '今日できたこと',
    onChange: (id, on) => {
      const item = byId(T.DONE_ITEMS, id);
      doneReply.setText(on && item ? line(item.lines) : '');
      changed();
    },
  });
  let doneOtherLen = day.doneOther.length;
  const doneOther = listEditor({
    items: day.doneOther, label: 'その他にできたこと', placeholder: '例：ゴミを出した',
    onChange: () => {
      const added = day.doneOther.length > doneOtherLen;
      doneOtherLen = day.doneOther.length;
      doneReply.setText(added ? T.otherDoneLine(day.doneOther[day.doneOther.length - 1]) : '');
      changed();
    },
  });

  // ---- できなかったこと → 明日の自分に渡す ----
  const notDoneReply = say('enaga', '', { live: true });
  const carryList = h('div', { 'aria-live': 'polite' });
  const taskOf = (id) => byId(T.NOT_DONE_ITEMS, id)?.task ?? id;
  const allNotDone = () => [...day.notDone.map(taskOf), ...day.notDoneOther];
  // できなかったことは、基本的に「明日の自分に渡す」。やらなくていいことにした分だけ外す。
  const syncCarry = (added) => {
    const tasks = allNotDone();
    day.carried = day.carried.filter((t) => tasks.includes(t));
    if (added && !day.carried.includes(added)) day.carried.push(added);
  };
  const drawCarry = () => {
    const tasks = allNotDone();
    carryList.replaceChildren(tasks.length ? h('div', { class: 'card quiet carry' },
      h('h3', {}, '明日の自分に渡しておくもの'),
      h('ul', { class: 'carry-list' }, tasks.map((t) => {
        const kept = day.carried.includes(t);
        return h('li', { class: kept ? '' : 'released' },
          h('span', {}, t, kept ? null : h('span', { class: 'tag' }, 'やらなくていい')),
          h('button', {
            type: 'button', class: 'btn small', 'aria-pressed': String(!kept),
            'aria-label': kept ? `「${t}」をやらなくていいことにする` : `「${t}」を明日の自分に渡す`,
            onclick: () => {
              if (kept) day.carried = day.carried.filter((x) => x !== t);
              else day.carried.push(t);
              notDoneReply.setText(kept ? 'うん、それはやらなくていいことにしよう。' : '明日の自分に渡しておくね。急がなくていいよ。');
              drawCarry();
              changed();
            },
          }, kept ? 'やらなくていいことにする' : '明日に渡す'));
      })),
      h('p', { class: 'muted small' }, '明日やらなくても大丈夫。渡しておくだけ。')) : '');
  };
  const notDoneChips = chips({
    items: T.NOT_DONE_ITEMS.map((d) => ({ value: d.id, label: d.label })), selected: day.notDone, label: '今日はできなかったこと',
    onChange: (id, on) => {
      syncCarry(on ? taskOf(id) : null);
      notDoneReply.setText(on ? line(T.NOT_DONE_LINES) : '');
      drawCarry();
      changed();
    },
  });
  let notDoneOtherLen = day.notDoneOther.length;
  const notDoneOther = listEditor({
    items: day.notDoneOther, label: 'その他にできなかったこと', placeholder: '例：メールの返信',
    onChange: () => {
      const added = day.notDoneOther.length > notDoneOtherLen;
      notDoneOtherLen = day.notDoneOther.length;
      const last = added ? day.notDoneOther[day.notDoneOther.length - 1] : '';
      syncCarry(last || null);
      notDoneReply.setText(last ? line(T.NOT_DONE_LINES) : '');
      drawCarry();
      changed();
    },
  });
  drawCarry();

  // ---- 前の日から預かっていること ----
  let prevSection = null;
  if (prev) {
    const handled = new Set();
    const prevList = h('ul', { class: 'carry-list' });
    const drawPrev = () => prevList.replaceChildren(...prev.carried.map((t) => {
      const doneToday = day.doneOther.includes(t);
      const passed = day.carried.includes(t);
      return h('li', {},
        h('span', {}, t, doneToday ? h('span', { class: 'tag' }, '今日できた') : passed ? h('span', { class: 'tag' }, 'また明日に') : null),
        handled.has(t) || doneToday || passed ? null : h('span', { class: 'row tight' },
          h('button', { type: 'button', class: 'btn small', onclick: () => {
            day.doneOther.push(t); doneOtherLen++; handled.add(t); doneOther.redraw(); doneReply.setText(T.otherDoneLine(t)); drawPrev(); changed();
          } }, '今日できた'),
          h('button', { type: 'button', class: 'btn small', onclick: () => {
            day.notDoneOther.push(t); notDoneOtherLen++; if (!day.carried.includes(t)) day.carried.push(t); handled.add(t); notDoneOther.redraw(); drawCarry(); drawPrev(); changed();
          } }, 'また明日に渡す')));
    }));
    drawPrev();
    prevSection = h('section', { class: 'card quiet', 'aria-labelledby': 'prev-title' },
      h('h2', { id: 'prev-title', class: 'h3' }, `${fmtDate(T.parseDateKey(prev.date).toISOString())}の自分から、預かってるよ`),
      h('p', { class: 'muted small' }, '今日じゃなくてもいいからね。'),
      prevList);
  }

  // ---- メモ ----
  const memo = h('textarea', { rows: 3, placeholder: '今日のこと、なんでも', value: day.memo });
  memo.addEventListener('input', () => { day.memo = memo.value; changed(); });

  // ---- 今日の自分へ（夜の振り返り） ----
  const closingSlot = h('div');
  let showClosing = !isToday || T.timeOfDay() === 'night';
  function drawClosing() {
    if (!showClosing) {
      closingSlot.replaceChildren(h('button', { type: 'button', class: 'btn wide', onclick: () => { showClosing = true; drawClosing(); closingSlot.querySelector('h2')?.focus(); } }, '今日の振り返りを見る'));
      return;
    }
    const doneLabels = [...day.done.map((id) => labelOf(T.DONE_ITEMS, id)), ...day.doneOther];
    const bird = h('div', { class: 'bird today-bird', 'aria-hidden': 'true' });
    bird.innerHTML = BIRDS.enaga.svg;
    closingSlot.replaceChildren(h('section', { class: 'today day-closing', 'aria-labelledby': 'closing-title' },
      bird,
      h('h2', { id: 'closing-title', tabindex: '-1' }, isToday ? '今日の自分へ' : 'この日の自分へ'),
      doneLabels.length ? h('div', { class: 'closing-block' },
        h('p', { class: 'muted small' }, isToday ? '今日できたこと' : 'この日できたこと'),
        h('ul', { class: 'plain closing-list' }, doneLabels.map((l) => h('li', {}, l)))) : null,
      day.carried.length ? h('div', { class: 'closing-block' },
        h('p', { class: 'muted small' }, '明日の自分に渡したこと'),
        h('ul', { class: 'plain closing-list' }, day.carried.map((l) => h('li', {}, l)))) : null,
      h('p', { class: 'today-message' }, T.closing(day))));
  }
  drawClosing();

  const del = async () => {
    const ok = await confirmDialog({ title: 'この日の記録を削除しますか？', body: '削除した記録は元に戻せません。', ok: '削除する', danger: true });
    if (!ok) return;
    try { await db.deleteDay(date); toast('削除しました。'); location.hash = '#/history/days'; } catch (e) { console.error(e); toast('削除できませんでした。もう一度試してください。', { error: true }); }
  };

  const dateLabel = fmtDate(T.parseDateKey(date).toISOString());
  return h('div', { class: 'screen today-screen' },
    backLink(isToday ? '#/' : '#/history/days', isToday ? 'ホーム' : '過去の記録'),
    say('enaga', T.greeting(date, { hasRecord: saved })),
    h('h1', {}, isToday ? '今日の自分はどう？' : `${dateLabel}の自分`),
    h('p', { class: 'muted small' }, isToday ? `${dateLabel}　全部書かなくていいよ。` : '書き足したり、直したりできるよ。'),
    safetySlot,
    condChips, condReply, restSlot,
    prevSection,
    h('section', { class: 'day-sec', 'aria-labelledby': 'done-title' },
      h('h2', { id: 'done-title' }, isToday ? '今日できたこと' : 'この日できたこと'),
      h('p', { class: 'muted small' }, '「こんなの当たり前」と思うことも、入れていいよ。'),
      doneChips,
      h('div', { class: 'field' }, h('p', { class: 'label' }, 'その他'), doneOther),
      doneReply),
    h('section', { class: 'day-sec', 'aria-labelledby': 'notdone-title' },
      h('h2', { id: 'notdone-title' }, 'やろうと思ってたけど、できなかったこと'),
      h('p', { class: 'muted small' }, 'あれば。できなかったことは、明日の自分に渡しておけるよ。'),
      notDoneChips,
      h('div', { class: 'field' }, h('p', { class: 'label' }, 'その他'), notDoneOther),
      notDoneReply,
      carryList),
    h('section', { class: 'day-sec' }, field('自由メモ', memo)),
    status,
    closingSlot,
    !isToday && existing ? h('div', { class: 'danger-zone' },
      h('button', { type: 'button', class: 'btn danger-outline', onclick: del }, 'この日の記録を削除')) : null,
  );
}

// ---------------------------------------------------------------- Consultation

async function startConsult(mood, scenario) {
  const record = db.normalizeRecord({
    initialMood: byId(current(MOODS), mood) ? mood : '',
    scenario: byId(SCENARIOS, scenario) ? scenario : '',
    draftStep: 0,
  });
  if (await persist(record)) location.replace(`#/consult/${record.id}`);
  else location.replace('#/');
  return null;
}

// 気持ち → 出来事 → 頭に浮かんだこと → その奥の気持ち → 別の見方 →（結果画面で）今日の言葉
const STEPS = ['emotions', 'event', 'thoughts', 'deeper', 'view'];

async function screenConsult(id) {
  const record = await db.getRecord(id);
  if (!record) { toast('この整理は見つかりませんでした。'); location.replace('#/'); return null; }
  let step = Math.min(Math.max(record.draftStep || 0, 0), STEPS.length - 1);

  const root = h('div', { class: 'screen consult' });
  const saveSoon = debounce(() => persist(record, { touch: true }), 600);

  const safetySlot = h('div', { 'aria-live': 'polite' });
  const checkSafety = () => {
    if (L.detectCrisis(record)) record.safetyFlag = true;
    if (record.safetyFlag && !safetySlot.firstChild) safetySlot.append(safetyCard());
  };
  const changed = () => { checkSafety(); saveSoon(); };

  const go = async (next) => {
    record.draftStep = next;
    if (!(await persist(record))) return;
    if (next >= STEPS.length) { location.hash = `#/reflect/${record.id}`; return; }
    step = next;
    draw();
    mount(root);
  };

  const finishNow = async () => {
    record.status = 'saved';
    if (await persist(record)) { toast('ここまでを記録しました。'); location.hash = '#/'; }
  };
  const discard = async () => {
    const ok = await confirmDialog({
      title: 'この整理を記録せずにやめますか？',
      body: 'ここまで入力した内容は残りません。',
      ok: '記録せずにやめる', danger: true,
    });
    if (!ok) return;
    try { await db.deleteRecord(record.id); location.hash = '#/'; } catch (e) { console.error(e); toast(SAVE_ERROR, { error: true }); }
  };

  const scenario = () => L.scenarioOf(record);

  const bodies = {
    emotions() {
      const ack = byId(SCENARIOS, record.scenario)?.ack
        || byId(MOODS, record.initialMood)?.ack
        || '来てくれてありがとう。ゆっくりでいいよ。';
      return [
        say('enaga', ack),
        h('h1', {}, '今、いちばん近い気持ちは？'),
        h('p', { class: 'muted' }, 'いくつ選んでも、選ばなくても大丈夫。'),
        chips({ items: EMOTIONS.map((e) => ({ value: e.id, label: e.label })), selected: record.emotions, label: '今の気持ち', onChange: changed }),
      ];
    },
    event() {
      const em = record.emotions;
      let lead = '';
      if (em.includes('pretend')) lead = '何とも思わないふりをするのも、けっこう疲れるよね。';
      else if (em.length && em.every((e) => e === 'unsure')) lead = 'よくわからない、でもいいよ。';
      else if (em.length) lead = `「${L.emotionLabels(em).join('」「')}」って気持ちなんだね。`;
      const ta = h('textarea', { rows: 3, placeholder: '例：友達との予定が、またキャンセルになった', value: record.eventText });
      ta.addEventListener('input', () => { record.eventText = ta.value; changed(); });
      const events = EVENTS[scenario()] || EVENTS.none;
      return [
        say('enaga', `${lead ? `${lead}\n` : ''}何があったか、少しだけ教えてくれる？`),
        h('h1', {}, '何があった？'),
        h('p', { class: 'muted' }, '選ぶだけでも、書かなくても大丈夫。'),
        chips({ items: events.map((e) => ({ value: e, label: e })), selected: record.facts, label: '起きたこと', onChange: changed }),
        field('言葉にするなら（任意）', ta),
      ];
    },
    thoughts() {
      const s = scenario();
      const DEFAULT = ['嫌われたのかな', '私って甘えてるのかな', 'みんなは普通にできるのに', '私が悪いのかな', '私が気にしすぎ？', 'またか、と思った', 'この先もうまくいかない', '相手にも事情があると思った'];
      const primary = s
        ? THOUGHTS.filter((t) => t.scenario === s || !t.scenario).map((t) => t.label)
        : DEFAULT;
      const rest = THOUGHTS.map((t) => t.label).filter((l) => !primary.includes(l));
      const known = THOUGHTS.map((t) => t.label);
      const custom = record.interpretations.filter((i) => !known.includes(i));
      const picked = record.interpretations.filter((i) => known.includes(i));
      const sync = () => { record.interpretations = [...picked, ...custom]; };

      const reaction = say('enaga', L.thoughtReply(record.interpretations), { live: true });
      const onPick = (label, on) => {
        sync();
        reaction.setText(on ? L.thoughtReply([label]) : L.thoughtReply(record.interpretations));
        changed();
      };
      let showAll = rest.some((l) => picked.includes(l));
      const chipWrap = h('div');
      const drawChips = () => chipWrap.replaceChildren(
        chips({ items: (showAll ? [...primary, ...rest] : primary).map((l) => ({ value: l, label: l })), selected: picked, label: '頭に浮かんだこと', onChange: onPick }),
        rest.length && !showAll ? h('button', { type: 'button', class: 'text-link small', onclick: () => { showAll = true; drawChips(); } }, 'ほかの考えも見る') : null,
      );
      drawChips();

      return [
        say('enaga', '近いものがあったら、選んでみて。ぴったりじゃなくてもいいよ。'),
        h('h1', {}, 'そのとき、頭に浮かんだのは？'),
        chipWrap,
        h('div', { class: 'field' },
          h('p', { class: 'label' }, 'その他（自分の言葉で）'),
          listEditor({ items: custom, label: '頭に浮かんだこと', placeholder: '例：私ばかり頑張ってる', onChange: () => { sync(); reaction.setText(L.thoughtReply(record.interpretations)); changed(); } })),
        reaction,
      ];
    },
    deeper() {
      const options = CONCERNS[scenario()] || CONCERNS.none;
      const selected = options.some((c) => c.label === record.coreConcern) ? [record.coreConcern] : [];
      const reaction = say('enaga', '', { live: true });
      const free = h('input', { type: 'text', placeholder: '例：わかってもらえなかったこと', value: selected.length ? '' : record.coreConcern });
      const chipWrap = h('div');
      const drawChips = () => chipWrap.replaceChildren(chips({
        items: options.map((c) => ({ value: c.label, label: c.label })), selected, multiple: false, label: '本当につらかったこと',
        onChange: () => {
          record.coreConcern = selected[0] || '';
          free.value = '';
          const c = options.find((o) => o.label === record.coreConcern);
          reaction.setText(c ? (c.reply || 'そこが、引っかかっていたんだね。') : '');
          changed();
        },
      }));
      free.addEventListener('input', () => {
        record.coreConcern = free.value;
        if (selected.length) { selected.length = 0; drawChips(); }
        reaction.setText('');
        changed();
      });
      drawChips();
      return [
        say('enaga', L.deeperPrompt(record)),
        h('h1', {}, '本当につらかったのは？'),
        h('p', { class: 'muted' }, 'いちばん近いものをひとつ。わからなければ、そのまま次へ進んでいいよ。'),
        chipWrap,
        field('ほかの言葉で書くなら', free),
        reaction,
      ];
    },
    view() {
      const fact = record.facts.length ? record.facts.join('／') : record.eventText.trim();
      const thoughts = record.interpretations;
      const others = L.othersToo(record);

      let separation = null;
      if (thoughts.length) {
        separation = h('section', { class: 'card sep', 'aria-label': '出来事と考えを分ける' },
          fact ? h('div', { class: 'sep-item' },
            h('p', { class: 'sep-quote' }, `「${clip(fact, 60)}」`),
            h('p', { class: 'sep-label' }, 'これは、起きた出来事。')) : null,
          h('div', { class: 'sep-item' },
            h('p', { class: 'sep-quote' }, thoughts.map((t) => `「${t}」`).join('\n')),
            h('p', { class: 'sep-label' }, 'これは、そこから考えたこと。')),
          h('p', { class: 'sep-note' }, fact
            ? 'どちらも今のあなたにとっては本物の気持ちだけど、同じものではないんだよ。'
            : '今の時点では、“考えのひとつ”として置いておこう。間違いという意味ではないよ。'));
      }

      const unknownSel = record.unknowns;
      const unknownItems = [...new Set([...L.suggestUnknowns(thoughts), ...unknownSel])];

      const reaction = say('enaga', '', { live: true });
      const respSel = record.perspectiveResponse ? [record.perspectiveResponse] : [];

      return [
        say('taka', thoughts.length
          ? 'ちょっとだけ、離れたところから一緒に見てみよう。'
          : '浮かんだ考えが言葉にならなくても、それでいい。少し離れたところから見てみよう。'),
        h('h1', {}, 'ちょっとだけ整理してみよう'),
        separation,
        say('taka', `別の可能性も、一度だけ見てみようか。\n\n${L.alternativeViews(record).join('\n\n')}`),
        others ? say('enaga', others) : null,
        unknownItems.length ? h('section', { class: 'field' },
          h('h2', { class: 'h3' }, 'まだ確かめられていないこと'),
          h('p', { class: 'muted small' }, '当てはまるものがあれば、残しておけるよ。'),
          chips({ items: unknownItems.map((u) => ({ value: u, label: u })), selected: unknownSel, label: 'まだ確かめられていないこと', onChange: changed })) : null,
        h('section', { class: 'field' },
          h('h2', { class: 'h3' }, 'この見方、どうかな？'),
          chips({
            items: PERSPECTIVE_RESPONSES.map((p) => ({ value: p.id, label: p.label })), selected: respSel, multiple: false, label: 'この見方への感じ方',
            onChange: () => {
              record.perspectiveResponse = respSel[0] || '';
              reaction.setText(byId(PERSPECTIVE_RESPONSES, record.perspectiveResponse)?.reply || '');
              changed();
            },
          })),
        reaction,
      ];
    },
  };

  const draw = () => {
    const last = step === STEPS.length - 1;
    root.replaceChildren(
      h('p', { class: 'progress muted small', 'aria-label': `全${STEPS.length}ステップ中 ${step + 1}ステップ目` },
        STEPS.map((_, i) => h('span', { class: `dot${i <= step ? ' on' : ''}`, 'aria-hidden': 'true' }))),
      safetySlot,
      ...bodies[STEPS[step]](),
      h('div', { class: 'step-nav' },
        step > 0
          ? h('button', { type: 'button', class: 'btn', onclick: () => go(step - 1) }, '戻る')
          : h('a', { href: '#/', class: 'btn' }, 'ホーム'),
        h('button', { type: 'button', class: 'btn primary', onclick: () => go(step + 1) }, last ? '今日のあなたへ' : '次へ')),
      h('div', { class: 'step-exit' },
        h('button', { type: 'button', class: 'text-link', onclick: finishNow }, '今日はここまでにして記録する'),
        h('button', { type: 'button', class: 'text-link muted', onclick: discard }, '記録せずにやめる')),
    );
    checkSafety();
  };

  draw();
  return root;
}

// ---------------------------------------------------------------- Reflection（今日のあなたへ）

function summary(record) {
  const rows = [
    ['はじめに選んだこと', [record.initialMood ? labelOf(MOODS, record.initialMood) : '', record.scenario ? labelOf(SCENARIOS, record.scenario) : ''].filter(Boolean).join('／')],
    ['気持ち', L.emotionLabels(record.emotions).join('、')],
    ['起きたこと', record.facts],
    ['言葉にしたこと', record.eventText],
    ['頭に浮かんだこと（考え）', record.interpretations],
    ['本当につらかったこと', record.coreConcern],
    ['まだ確かめられていないこと', record.unknowns],
  ].filter(([, v]) => (Array.isArray(v) ? v.length : v));
  if (!rows.length) return h('p', { class: 'muted' }, '今回は何も書かなかったね。それでもいいよ。');
  return h('dl', { class: 'summary' }, rows.map(([k, v]) => [
    h('dt', {}, k),
    h('dd', {}, Array.isArray(v) ? h('ul', { class: 'plain' }, v.map((x) => h('li', {}, x))) : v),
  ]));
}

function similarList(record, all, { caption = true } = {}) {
  const found = L.findSimilar(record, all);
  if (!found.length) return h('p', { class: 'muted' }, '似た記録は、まだ見つかりませんでした。');
  return h('div', {},
    caption ? h('p', { class: 'muted small' }, '過去の記録は参考のひとつ。今回も同じになるとは限らないよ。') : null,
    h('ul', { class: 'record-list' }, found.map(({ record: r, reasons }) => h('li', {},
      h('a', { href: `#/record/${r.id}`, class: 'record-item' },
        h('span', { class: 'record-date' }, fmtDate(r.createdAt)),
        h('span', { class: 'record-text' }, recordTitle(r)),
        h('span', { class: 'tags' }, reasons.map((x) => h('span', { class: 'tag' }, x))),
        h('span', { class: 'record-outcome' }, 'その後：',
          r.outcome ? `${labelOf(OUTCOMES, r.outcome)}${r.outcomeNote ? `（${clip(r.outcomeNote, 40)}）` : ''}` : 'まだ記録していない'))))));
}

// 一覧で見出しにする文
function recordTitle(r) {
  const text = r.eventText.trim() || r.facts.join('／') || r.interpretations[0] || '';
  return text ? `「${clip(text, 50)}」` : '（出来事の記録なし）';
}

function breathing() {
  const status = h('p', { class: 'breath-text', 'aria-live': 'polite' }, '');
  const circle = h('div', { class: 'breath-circle', 'aria-hidden': 'true' });
  const btn = h('button', { type: 'button', class: 'btn' }, 'ゆっくり呼吸する（約1分）');
  let timer = null;
  const stop = () => { clearTimeout(timer); timer = null; circle.className = 'breath-circle'; status.textContent = ''; btn.textContent = 'ゆっくり呼吸する（約1分）'; };
  const cycle = (n) => {
    if (n >= 6) { stop(); status.textContent = 'おつかれさま。'; return; }
    circle.className = 'breath-circle in';
    status.textContent = '吸って…（4秒）';
    timer = setTimeout(() => {
      circle.className = 'breath-circle out';
      status.textContent = 'ゆっくり吐いて…（6秒）';
      timer = setTimeout(() => cycle(n + 1), 6000);
    }, 4000);
  };
  btn.addEventListener('click', () => {
    if (timer) { stop(); return; }
    btn.textContent = 'やめる';
    cycle(0);
  });
  return h('div', { class: 'breath' }, circle, status, btn);
}

function adviceBlock(record) {
  const a = L.adviceProvider.get(record);
  const sec = (title, lines) => h('div', { class: 'advice-sec' }, h('h3', {}, title), h('ul', { class: 'plain dots' }, lines.map((l) => h('li', {}, l))));
  return h('div', { class: 'advice' },
    sec('今確認できること', a.facts),
    sec('考えとして置いておけること', a.interpretations),
    sec('今できること', a.actions));
}

function actionPanel(record, save) {
  const memoArea = (key, labelText, placeholder, desc) => {
    const ta = h('textarea', { rows: 5, placeholder, value: record[key] });
    ta.addEventListener('input', () => { record[key] = ta.value; save(); });
    return field(labelText, ta, desc);
  };
  switch (record.chosenAction) {
    case 'talk':
      return h('div', { class: 'panel' },
        say('enaga', 'よかったら、もう少し聞かせて。\n思いつくままでいいよ。'),
        memoArea('personalMemo', 'もう少し話したいこと', '', 'ここに書いたことは、この端末の中にだけ残ります。'));
    case 'organize':
      return h('section', { class: 'card panel' },
        h('h2', {}, '今日の整理'),
        summary(record));
    case 'perspective':
      return h('div', { class: 'panel' },
        say('taka', 'いくつか、別の見方を置いておくね。\n合わないと思ったら、流してしまっていい。'),
        h('section', { class: 'card' }, adviceBlock(record)));
    case 'action':
      return h('section', { class: 'card panel' },
        h('h2', {}, '今できる、小さなこと'),
        h('p', { class: 'muted small' }, 'どれかひとつでも、どれもしなくてもいい。'),
        breathing(),
        h('ul', { class: 'plain dots' },
          h('li', {}, '肩と、あごの力を抜いてみる'),
          h('li', {}, '温かいもの・冷たいものを一口飲む'),
          h('li', {}, '少しのあいだ、画面から目を離す'),
          h('li', {}, '返事や決めごとは、明日に回す')),
        h('details', { class: 'sub' },
          h('summary', {}, '相手への返事を考えてみる'),
          h('ul', { class: 'plain dots' },
            h('li', {}, 'その返事は、今すぐ必要かな？'),
            h('li', {}, '一番伝えたいことを、ひとつにするとしたら？'),
            h('li', {}, '相手の気持ちを決めつけずに、「自分はこう感じた」という形にすると伝わりやすいことがあるよ。')),
          memoArea('replyDraft', '下書きメモ', '例：今回は残念だったけど、また都合のいい日を教えてね',
            'ここに書いても、どこにも送信されません。')));
    case 'end':
      return h('div', { class: 'panel' },
        say('enaga', '今日はここまでにしよう。\n来てくれてありがとう。'),
        h('p', { class: 'muted small center' }, '下の「記録して終わる」で、今日の整理を残せるよ。残さなくてもいい。'));
    default:
      return null;
  }
}

async function screenReflect(id) {
  const [record, all] = await Promise.all([db.getRecord(id), db.getAllRecords()]);
  if (!record) { toast('この整理は見つかりませんでした。'); location.replace('#/'); return null; }
  if (L.detectCrisis(record)) record.safetyFlag = true;
  const message = L.todayMessage(record);
  const save = debounce(() => persist(record), 600);

  const panel = h('div', { 'aria-live': 'polite' });
  const drawPanel = () => panel.replaceChildren(actionPanel(record, save) || '');
  if (!byId(current(ACTIONS), record.chosenAction)) record.chosenAction = '';
  const selected = record.chosenAction ? [record.chosenAction] : [];
  drawPanel();

  const similarCount = L.findSimilar(record, all).length;

  const finish = async () => {
    record.status = 'saved';
    record.todayMessage = message;
    delete record.draftStep;
    if (await persist(record)) { toast('記録しました。'); location.hash = '#/'; }
  };
  const discard = async () => {
    const ok = await confirmDialog({ title: '記録せずに終わりますか？', body: '今回の整理は残りません。', ok: '記録せずに終わる', danger: true });
    if (!ok) return;
    try { await db.deleteRecord(record.id); location.hash = '#/'; } catch (e) { console.error(e); toast(SAVE_ERROR, { error: true }); }
  };

  const bird = h('div', { class: 'bird today-bird', 'aria-hidden': 'true' });
  bird.innerHTML = BIRDS.enaga.svg;

  return h('div', { class: 'screen reflect' },
    h('h1', {}, '今日のあなたへ'),
    record.safetyFlag ? safetyCard() : null,
    h('section', { class: 'today' }, bird, h('p', { class: 'today-message' }, message)),
    h('section', { class: 'field', 'aria-labelledby': 'next-title' },
      h('h2', { id: 'next-title' }, '今はどうしたい？'),
      chips({
        items: current(ACTIONS).map((a) => ({ value: a.id, label: a.label })), selected, multiple: false, label: '今はどうしたいか',
        onChange: () => {
          record.chosenAction = selected[0] || '';
          if (record.chosenAction === 'perspective') record.adviceViewed = true;
          drawPanel();
          save();
        },
      })),
    panel,
    similarCount ? h('details', { class: 'card' },
      h('summary', {}, `以前にも似たことがあったよ（${similarCount}件）`),
      similarList(record, all)) : null,
    h('div', { class: 'finish' },
      h('button', { type: 'button', class: 'btn primary wide', onclick: finish }, '記録して終わる'),
      h('a', { href: `#/consult/${record.id}`, class: 'btn wide' }, '戻って見直す'),
      h('button', { type: 'button', class: 'text-link muted', onclick: discard }, '記録せずに終わる')),
  );
}

// ---------------------------------------------------------------- History

async function screenHistory() {
  const all = await db.getAllRecords();
  const state = { q: '', emotion: [], pending: false };
  const list = h('div', { 'aria-live': 'polite' });

  const matches = (r) => {
    if (state.emotion.length && !r.emotions.includes(state.emotion[0])) return false;
    if (state.pending && (r.outcome || r.status !== 'saved')) return false;
    if (state.q) {
      const hay = [r.eventText, r.coreConcern, r.personalMemo, r.reflectionNote, r.outcomeNote, ...r.facts, ...r.interpretations, ...r.unknowns].join('\n').toLowerCase();
      if (!state.q.toLowerCase().split(/\s+/).filter(Boolean).every((w) => hay.includes(w))) return false;
    }
    return true;
  };

  const draw = () => {
    const shown = all.filter(matches);
    list.replaceChildren(
      h('p', { class: 'muted small' }, all.length ? `${shown.length}件` : ''),
      shown.length ? h('ul', { class: 'record-list' }, shown.map((r) => h('li', {},
        h('a', { href: `#/record/${r.id}`, class: 'record-item' },
          h('span', { class: 'record-date' }, fmtDate(r.createdAt),
            r.status === 'draft' ? h('span', { class: 'tag' }, '途中') : null,
            r.initialMood || r.scenario ? h('span', { class: 'muted' }, `　${r.initialMood ? labelOf(MOODS, r.initialMood) : labelOf(SCENARIOS, r.scenario)}`) : null),
          h('span', { class: 'record-text' }, recordTitle(r)),
          r.emotions.length ? h('span', { class: 'tags' }, r.emotions.map((e) => h('span', { class: 'tag' }, labelOf(EMOTIONS, e)))) : null,
          r.outcome ? h('span', { class: 'record-outcome' }, `その後：${labelOf(OUTCOMES, r.outcome)}`) : null))))
        : h('p', { class: 'muted' }, all.length ? '条件に合う記録はありません。' : 'まだ記録はありません。'),
    );
  };

  const search = h('input', { type: 'search', placeholder: '例：返信、友達', enterkeyhint: 'search' });
  search.addEventListener('input', () => { state.q = search.value.trim(); draw(); });
  const pending = h('input', { type: 'checkbox', id: 'pending' });
  pending.addEventListener('change', () => { state.pending = pending.checked; draw(); });

  draw();
  return h('div', { class: 'screen history' },
    backLink('#/', 'ホーム'),
    h('h1', {}, '過去の記録'),
    historyTabs('records'),
    field('キーワードで探す', search),
    h('div', { class: 'field' },
      h('p', { class: 'label' }, '気持ちで絞り込む'),
      chips({ items: EMOTIONS.map((e) => ({ value: e.id, label: e.label })), selected: state.emotion, multiple: false, label: '気持ちで絞り込む', onChange: draw })),
    h('div', { class: 'check-row' }, pending, h('label', { for: 'pending' }, '「その後」をまだ書いていないものだけ')),
    list);
}

function historyTabs(active) {
  const tab = (href, label, key) => h('a', { href, class: `tab${active === key ? ' on' : ''}`, 'aria-current': active === key ? 'page' : null }, label);
  return h('nav', { class: 'tabs', 'aria-label': '記録の種類' },
    tab('#/history', 'モヤモヤの記録', 'records'),
    tab('#/history/days', '今日の自分', 'days'));
}

async function screenHistoryDays() {
  const days = await db.getAllDays();
  return h('div', { class: 'screen history' },
    backLink('#/', 'ホーム'),
    h('h1', {}, '過去の記録'),
    historyTabs('days'),
    days.length ? h('ul', { class: 'record-list' }, days.map((d) => {
      const cond = byId(T.CONDITIONS, d.condition);
      const done = [...d.done.map((id) => labelOf(T.DONE_ITEMS, id)), ...d.doneOther];
      return h('li', {},
        h('a', { href: `#/today/${d.date}`, class: 'record-item' },
          h('span', { class: 'record-date' }, fmtDate(T.parseDateKey(d.date).toISOString()),
            cond ? h('span', { class: 'muted' }, `　${cond.emoji} ${cond.label}`) : null),
          done.length ? h('span', { class: 'record-text' }, clip(done.join('、'), 60)) : h('span', { class: 'record-text muted' }, '（ここに来た日）'),
          d.carried.length ? h('span', { class: 'record-outcome' }, `明日に渡したこと：${clip(d.carried.join('、'), 40)}`) : null));
    })) : h('p', { class: 'muted' }, 'まだ記録はありません。書かない日があっても、大丈夫。'));
}

// ---------------------------------------------------------------- Record detail

async function screenRecord(id) {
  const [record, all] = await Promise.all([db.getRecord(id), db.getAllRecords()]);
  if (!record) { toast('この記録は見つかりませんでした。'); location.replace('#/history'); return null; }

  const block = (title, content) => (content ? h('section', { class: 'detail-sec' }, h('h2', { class: 'h3' }, title), content) : null);
  const ul = (arr) => (arr.length ? h('ul', { class: 'plain dots' }, arr.map((x) => h('li', {}, x))) : null);

  // その後どうなった？
  const outcomeSel = record.outcome ? [record.outcome] : [];
  const outcomeNote = h('textarea', { rows: 3, placeholder: '例：翌日に普通に連絡が来た', value: record.outcomeNote });
  const saveOutcome = async () => {
    record.outcome = outcomeSel[0] || '';
    record.outcomeNote = outcomeNote.value;
    record.outcomeDate = record.outcome || record.outcomeNote ? new Date().toISOString() : '';
    if (await persist(record)) { toast('「その後」を記録しました。'); render(); }
  };

  const reflection = h('textarea', { rows: 3, placeholder: '今の自分から見て、思うこと', value: record.reflectionNote });
  const memo = h('textarea', { rows: 3, value: record.personalMemo });
  const saveNotes = async () => {
    record.reflectionNote = reflection.value;
    record.personalMemo = memo.value;
    if (await persist(record)) toast('保存しました。');
  };

  const remove = async () => {
    const ok = await confirmDialog({ title: 'この記録を削除しますか？', body: '削除した記録は元に戻せません。', ok: '削除する', danger: true });
    if (!ok) return;
    try { await db.deleteRecord(record.id); toast('削除しました。'); location.hash = '#/history'; } catch (e) { console.error(e); toast('削除できませんでした。もう一度試してください。', { error: true }); }
  };

  return h('div', { class: 'screen record' },
    backLink('#/history', '過去の記録'),
    h('h1', {}, `${fmtDate(record.createdAt)}の記録`),
    h('p', { class: 'muted small' }, fmtDateTime(record.createdAt)),
    record.status === 'draft' ? h('div', { class: 'card quiet' },
      h('p', {}, 'この整理は途中です。'),
      h('a', { href: `#/consult/${record.id}`, class: 'btn' }, '続きから整理する')) : null,
    record.safetyFlag ? safetyCard() : null,

    h('section', { class: 'card' },
      block('はじめに選んだこと', record.initialMood || record.scenario ? h('p', {},
        [record.initialMood ? labelOf(MOODS, record.initialMood) : null, record.scenario ? labelOf(SCENARIOS, record.scenario) : null].filter(Boolean).join('／')) : null),
      block('当時の気持ち', record.emotions.length ? h('p', {}, record.emotions.map((e) => labelOf(EMOTIONS, e)).join('、')) : null),
      block('起きたこと', ul(record.facts)),
      block('当時の出来事', record.eventText ? h('p', { class: 'prewrap' }, record.eventText) : null),
      block('頭に浮かんだこと（考え）', ul(record.interpretations)),
      block('本当につらかったこと', record.coreConcern ? h('p', {}, record.coreConcern) : null),
      block('まだ確かめられていなかったこと', ul(record.unknowns)),
      block('今日のあなたへ', record.todayMessage ? h('p', { class: 'prewrap today-small' }, record.todayMessage) : null),
      block('選んだこと', record.chosenAction ? h('p', {}, labelOf(ACTIONS, record.chosenAction)) : null),
      block('返事の下書きメモ', record.replyDraft ? h('p', { class: 'prewrap' }, record.replyDraft) : null)),

    h('section', { class: 'card' },
      h('h2', {}, 'その後どうなった？'),
      h('p', { class: 'muted small' }, '結論が出ていなければ、書かなくても大丈夫。'),
      chips({ items: OUTCOMES.map((o) => ({ value: o.id, label: o.label })), selected: outcomeSel, multiple: false, label: 'その後どうなったか' }),
      field('くわしく（任意）', outcomeNote),
      h('button', { type: 'button', class: 'btn primary', onclick: saveOutcome }, '「その後」を保存'),
      record.outcomeDate ? h('p', { class: 'muted small' }, `記録日：${fmtDateTime(record.outcomeDate)}`) : null),

    record.interpretations.length && record.outcome ? h('section', { class: 'card compare', 'aria-label': 'そのときの考えとその後の比較' },
      h('div', {}, h('h2', { class: 'h3' }, 'そのときの考え'), ul(record.interpretations)),
      h('div', {}, h('h2', { class: 'h3' }, '実際にはその後'), h('p', {}, labelOf(OUTCOMES, record.outcome)), record.outcomeNote ? h('p', { class: 'prewrap muted' }, record.outcomeNote) : null)) : null,

    h('section', { class: 'card' },
      field('今振り返ると、どう感じる？', reflection),
      field('メモ', memo),
      h('button', { type: 'button', class: 'btn', onclick: saveNotes }, '保存')),

    record.status === 'saved' ? h('section', { class: 'card quiet' },
      h('h2', { class: 'h3' }, '似た記録'),
      similarList(record, all)) : null,

    h('div', { class: 'danger-zone' },
      h('button', { type: 'button', class: 'btn danger-outline', onclick: remove }, 'この記録を削除')),
  );
}

// ---------------------------------------------------------------- Memo

async function screenMemo() {
  const memos = await db.getAllMemos();
  const list = h('ul', { class: 'memo-list' });
  const input = h('textarea', { rows: 4, placeholder: '例：散歩すると少し楽になった／自分に「よくやってるよ」と言ってあげる' });

  const draw = () => {
    list.replaceChildren(...memos.map((m) => {
      const li = h('li', { class: 'card' });
      const view = () => li.replaceChildren(
        h('p', { class: 'prewrap' }, m.text),
        h('p', { class: 'muted small' }, fmtDateTime(m.createdAt)),
        h('div', { class: 'row' },
          h('button', { type: 'button', class: 'btn small', onclick: edit }, '編集'),
          h('button', { type: 'button', class: 'btn small danger-outline', onclick: del }, '削除')));
      const edit = () => {
        const ta = h('textarea', { rows: 4, value: m.text, 'aria-label': 'メモを編集' });
        li.replaceChildren(ta, h('div', { class: 'row' },
          h('button', { type: 'button', class: 'btn small primary', onclick: async () => {
            try { Object.assign(m, await db.saveMemo({ ...m, text: ta.value })); view(); toast('保存しました。'); } catch (e) { console.error(e); toast(SAVE_ERROR, { error: true }); }
          } }, '保存'),
          h('button', { type: 'button', class: 'btn small', onclick: view }, 'キャンセル')));
        ta.focus();
      };
      const del = async () => {
        if (!(await confirmDialog({ title: 'このメモを削除しますか？', ok: '削除する', danger: true }))) return;
        try { await db.deleteMemo(m.id); memos.splice(memos.indexOf(m), 1); draw(); } catch (e) { console.error(e); toast('削除できませんでした。もう一度試してください。', { error: true }); }
      };
      view();
      return li;
    }));
  };
  draw();

  const add = async () => {
    const text = input.value.trim();
    if (!text) { input.focus(); return; }
    try {
      memos.unshift(await db.saveMemo({ text }));
      input.value = '';
      draw();
      toast('メモを残しました。');
    } catch (e) { console.error(e); toast(SAVE_ERROR, { error: true }); }
  };

  return h('div', { class: 'screen memo' },
    backLink('#/', 'ホーム'),
    h('h1', {}, '自分へのメモ'),
    h('p', { class: 'muted' }, '落ち着けたこと、自分にかけたい言葉など。自由に置いておける場所。'),
    field('新しいメモ', input),
    h('button', { type: 'button', class: 'btn primary', onclick: add }, 'メモを残す'),
    list);
}

// ---------------------------------------------------------------- Settings

const PREF_KEY = 'kimochi-prefs';
function loadPrefs() {
  try { return { size: 'normal', theme: 'auto', ...JSON.parse(localStorage.getItem(PREF_KEY) || '{}') }; } catch { return { size: 'normal', theme: 'auto' }; }
}
function applyPrefs(p) {
  const root = document.documentElement;
  root.dataset.size = p.size;
  if (p.theme === 'auto') delete root.dataset.theme; else root.dataset.theme = p.theme;
}
function savePrefs(p) {
  applyPrefs(p);
  try { localStorage.setItem(PREF_KEY, JSON.stringify(p)); } catch { /* 保存できなくても表示には反映済み */ }
}

async function screenSettings() {
  const prefs = loadPrefs();
  const radios = (name, legend, options) => h('fieldset', { class: 'radios' },
    h('legend', {}, legend),
    options.map(([value, label]) => {
      const id = `${name}-${value}`;
      const input = h('input', { type: 'radio', name, id, value, checked: prefs[name] === value });
      input.addEventListener('change', () => { prefs[name] = value; savePrefs(prefs); });
      return h('div', { class: 'radio-row' }, input, h('label', { for: id }, label));
    }));

  const doExport = async () => {
    try {
      const data = await db.exportAll();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const d = new Date();
      const name = `kimochi-backup-${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}.json`;
      const a = h('a', { href: URL.createObjectURL(blob), download: name });
      document.body.append(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
      toast(`バックアップを作りました（相談${data.records.length}件・今日の自分${data.days.length}日分・メモ${data.memos.length}件）。`);
    } catch (e) { console.error(e); toast('バックアップを作れませんでした。もう一度試してください。', { error: true }); }
  };

  const fileInput = h('input', { type: 'file', accept: 'application/json,.json', id: 'import-file', class: 'visually-hidden' });
  fileInput.addEventListener('change', async () => {
    const file = fileInput.files[0];
    fileInput.value = '';
    if (!file) return;
    let data;
    try { data = JSON.parse(await file.text()); } catch {
      toast('ファイルを読み込めませんでした。このアプリで作ったバックアップ（.json）を選んでください。', { error: true });
      return;
    }
    const ok = await confirmDialog({
      title: 'バックアップを読み込みますか？',
      body: '今ある記録は消さずに、バックアップの内容を追加します。同じ記録がある場合は、新しいほうを残します。',
      ok: '読み込む',
    });
    if (!ok) return;
    try {
      const c = await db.importAll(data);
      toast(`読み込みました（追加${c.added}件・更新${c.updated}件）。`);
    } catch (e) {
      console.error(e);
      toast(e.message === 'invalid-format'
        ? 'このファイルは、このアプリのバックアップではないようです。'
        : '読み込めませんでした。ファイルを確認して、もう一度試してください。', { error: true });
    }
  });

  const clear = async () => {
    const ok1 = await confirmDialog({
      title: 'すべての記録とメモを削除しますか？',
      body: 'この端末に保存されている相談の記録・今日の自分・メモがすべて消え、元に戻せません。必要ならさきにバックアップを作ってください。',
      ok: '次へ', danger: true,
    });
    if (!ok1) return;
    const ok2 = await confirmDialog({ title: '本当に削除しますか？', body: 'この操作は取り消せません。', ok: 'すべて削除する', danger: true });
    if (!ok2) return;
    try { await db.clearAll(); toast('すべてのデータを削除しました。'); } catch (e) { console.error(e); toast('削除できませんでした。もう一度試してください。', { error: true }); }
  };

  return h('div', { class: 'screen settings' },
    backLink('#/', 'ホーム'),
    h('h1', {}, '設定'),

    h('section', { class: 'card' },
      h('h2', {}, '表示'),
      radios('size', '文字の大きさ', [['normal', '標準'], ['large', '大きめ']]),
      radios('theme', '画面の明るさ', [['auto', '端末に合わせる'], ['light', '明るい'], ['dark', '暗い']])),

    h('section', { class: 'card' },
      h('h2', {}, 'データ'),
      h('p', {}, 'このアプリの記録はこの端末内（このブラウザ内）に保存されます。外部のサーバーには送信しません。'),
      h('p', { class: 'muted small' }, 'ブラウザのデータ削除、端末の故障や買い替えなどで記録が失われることがあります。残しておきたい記録は、ときどきバックアップしておくと安心です。'),
      h('div', { class: 'stack' },
        h('button', { type: 'button', class: 'btn', onclick: doExport }, 'バックアップを作る（JSONで保存）'),
        h('label', { for: 'import-file', class: 'btn', tabindex: '0', role: 'button',
          onkeydown: (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileInput.click(); } } }, 'バックアップから読み込む'),
        fileInput,
        h('button', { type: 'button', class: 'btn danger-outline', onclick: clear }, 'すべてのデータを削除'))),

    h('section', { class: 'card' },
      h('h2', {}, 'つらさが強いとき'),
      h('p', {}, h('a', { href: '#/support', class: 'text-link' }, '相談先・緊急時の案内を見る'))),

    h('section', { class: 'card' },
      h('h2', {}, 'このアプリについて'),
      h('p', {}, '嫌なことがあったとき、自分まで嫌いになってしまう前に、一緒に整理する場所です。'),
      h('p', {}, '無理に前向きになるためではなく、出来事・気持ち・考えを分けて、自分を必要以上に責めない状態に戻ることを目指しています。'),
      h('p', { class: 'muted small' }, 'このアプリは医療・診断・カウンセリングを目的としたものではありません。表示されるヒントは、決まったルールで作られた参考のひとつです。'),
      h('p', {}, h('a', { href: '#/welcome', class: 'text-link' }, 'はじめの説明をもう一度見る'))),

    h('section', { class: 'card' },
      h('h2', {}, 'プライバシーについて'),
      h('ul', { class: 'plain dots' },
        h('li', {}, 'ログインやアカウント登録はありません。'),
        h('li', {}, '入力した内容は、この端末のブラウザ内に保存されます。アプリが外部に送信することはありません。'),
        h('li', {}, '同じ端末・ブラウザを使える人は、記録を見られる可能性があります。自分専用の端末で、画面ロックもあわせて使ってください。'),
        h('li', {}, 'シークレットモード（プライベートブラウズ）では、閉じたときに記録が消えます。'),
        h('li', {}, 'バックアップファイルには記録の内容がそのまま入っています。保存場所に気をつけてください。'))),
  );
}

// ---------------------------------------------------------------- Support

function screenSupport() {
  return h('div', { class: 'screen support' },
    backLink('#/', 'ホーム'),
    h('h1', {}, '相談先・緊急時の案内'),
    h('p', {}, 'ひとりで抱えるには重いと感じたら、身近な人や専門の窓口を頼ってください。'),
    safetyCard());
}

// ---------------------------------------------------------------- Welcome（はじめて開いたとき）

function screenWelcome() {
  const prefs = loadPrefs();
  const again = !!prefs.welcomed;
  const accept = () => {
    savePrefs({ ...loadPrefs(), welcomed: true });
    location.replace('#/');
  };
  return h('div', { class: 'screen welcome' },
    h('h1', { class: 'hero' }, again ? 'はじめの説明' : 'はじめまして'),
    say('enaga', 'ここは、嫌なことがあったときに、気持ちを少しずつほどいていく場所だよ。'),
    say('enaga', '書いた内容は、あなたのスマホ（この端末）の中だけに保存されて、誰にも送られないよ。', { cont: true }),
    say('enaga', 'だから、いくつかお願いがあるんだ。', { cont: true }),
    h('ul', { class: 'card welcome-list' },
      h('li', {}, '自分専用のスマホで使って、画面ロックをかけておいてね'),
      h('li', {}, 'シークレットモード（プライベートブラウズ）だと、閉じたときに記録が消えちゃうから、普通のモードで使ってね'),
      h('li', {}, '消したくなったら「設定 → すべてのデータを削除」で消せるよ')),
    h('p', { class: 'muted small' }, 'このアプリは医療・診断・カウンセリングを目的としたものではありません。'),
    h('div', { class: 'finish' },
      h('button', { type: 'button', class: 'btn primary wide', onclick: accept }, again ? 'ホームに戻る' : 'わかった、使ってみる')),
    h('p', { class: 'center small' }, h('a', { href: '#/support', class: 'text-link' }, 'つらさがとても強いとき・今すぐ助けが必要なとき')),
  );
}

// ---------------------------------------------------------------- boot

applyPrefs(loadPrefs());
window.addEventListener('hashchange', render);
render();

if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  navigator.serviceWorker.register('sw.js').catch((e) => console.warn('SW registration failed', e));
}
