// ルールベースの整理ロジック。生成AIは使わない。
// 将来AIを足す場合は adviceProvider を差し替えられるようにしてある。
//
// 文言のルール：診断しない／性格を断定しない／「みんなそう」と一般化しない／
// 「気にしすぎ」と片付けない／根拠なく「大丈夫」と言わない／相手の意図を推測しない。

import { THOUGHTS, EMOTIONS, MOODS, labelOf, byId } from './data.js';

// ---- 考え（解釈）のタグ付け ----
const TAG_PATTERNS = {
  amae: /甘え/,
  weak: /弱い|弱さ/,
  shouldtry: /頑張るべき|頑張らなきゃ|頑張らないと|努力が足りない/,
  toosensitive: /気にしすぎ|考えすぎ|繊細すぎ/,
  onlyme: /自分だけ|私だけ|みんなは|普通に(でき|や)/,
  disliked: /嫌われ|嫌がられ|会いたくない|避けられ|うざ|見捨て/,
  selfblame: /自分が悪|私が悪|僕が悪|俺が悪|自分のせい|私のせい|僕のせい|俺のせい/,
  again: /また|いつも|毎回|繰り返/,
  notvalued: /大切にされ|大事にされ|軽く見られ|どうでもいい|後回し|優先されない/,
  onesided: /私ばかり|自分ばかり|私だけ楽しみ/,
  burden: /迷惑|邪魔|負担/,
  judged: /変に思われ|引かれ|笑われ|バカにされ|呆れられ/,
  worthless: /ダメ|だめ|価値がない|無能|情けない|最低/,
  future: /うまくいかない|どうせ|終わり|この先|一生/,
};

export function tagsOf(texts = []) {
  const tags = new Set();
  for (const t of texts) {
    for (const chip of THOUGHTS) if (chip.label === t) tags.add(chip.tag);
    for (const [tag, re] of Object.entries(TAG_PATTERNS)) if (re.test(t)) tags.add(tag);
  }
  return [...tags];
}

const SCENARIO_TAGS = {
  amae: ['amae', 'weak', 'shouldtry', 'toosensitive'],
  disliked: ['disliked', 'onesided', 'judged', 'notvalued'],
  behind: ['onlyme', 'worthless', 'future'],
};

// ホームで選んだシナリオ → 気分 → 考えのタグ、の順で推定する
export function scenarioOf(record) {
  if (record.scenario) return record.scenario;
  const fromMood = byId(MOODS, record.initialMood)?.scenario;
  if (fromMood) return fromMood;
  const tags = tagsOf(record.interpretations);
  let best = '';
  let bestN = 0;
  for (const [s, ts] of Object.entries(SCENARIO_TAGS)) {
    const n = ts.filter((t) => tags.includes(t)).length;
    if (n > bestN) { best = s; bestN = n; }
  }
  return best;
}

// ---- シマエナガ：考えを選んだときのひとこと ----
const THOUGHT_REPLY = {
  amae: '“甘えている”って言葉が出てきたんだね。\nもしかすると、“もっと頑張らなきゃいけない”という気持ちも一緒にあるのかな？',
  weak: '“弱いのかな”って思ったんだね。\n傷ついたのは、それだけ大事なことだったから、なのかもしれないね。',
  shouldtry: '“もっと頑張るべき”って声が聞こえたんだね。\nその声、いつもはどれくらいの大きさかな。',
  toosensitive: '“気にしすぎかな”って思ったんだね。\n気になった、ということ自体は、そのままにしておいていいよ。',
  onlyme: '“自分だけ”って感じたんだね。',
  disliked: '“嫌われたのかな”って思ったんだね。それ、気になっちゃうよね。',
  selfblame: '“私が悪いのかな”って思ったんだね。',
  notvalued: '“大切にされないのかな”って思ったんだね。',
  onesided: '楽しみにしてた分、気持ちが大きかったんだね。',
  worthless: '“ダメだ”って言葉が出てきたんだね。',
  othercontext: '相手の事情も考えられたんだね。それでも、残る気持ちはあるよね。',
};
const REPLY_PRIORITY = ['amae', 'weak', 'shouldtry', 'toosensitive', 'onlyme', 'disliked', 'selfblame', 'notvalued', 'onesided', 'worthless', 'othercontext'];

export function thoughtReply(interpretations) {
  if (!interpretations.length) return '';
  // いちばん最後に選んだ考えを優先する
  const lastTags = tagsOf([interpretations[interpretations.length - 1]]);
  const tag = REPLY_PRIORITY.find((t) => lastTags.includes(t))
    || REPLY_PRIORITY.find((t) => tagsOf(interpretations).includes(t));
  return tag ? THOUGHT_REPLY[tag] : 'そう思ったんだね。';
}

// ---- シマエナガ：「本当につらかったのは？」の問いかけ ----
export function deeperPrompt(record) {
  const fact = record.facts[0] || '';
  if (record.initialMood === 'irritated' || record.emotions.includes('angry')) {
    return 'もし怒りの下に別の気持ちがあるとしたら、何が近いかな？';
  }
  if (record.emotions.includes('pretend')) {
    return '何とも思わないふりをしているなら、その奥に、何か隠れているかもしれないね。';
  }
  if (fact && scenarioOf(record) === 'disliked') return `本当につらかったのは、「${clip(fact, 20)}」こと？\nそれとも、その奥に何かあるかな。`;
  return '本当につらかったのは、どのあたりかな。';
}

// ---- タカ：別の見方 ----
const VIEW_BY_TAG = {
  disliked: '“嫌われた”という出来事と、“嫌われたかもしれない”という不安は、少し分けて考えてみてもいいかもしれない。',
  amae: '“甘えているかどうか”を決める前に、“今どれくらい疲れているか”を先に見てみる、という順番もある。',
  shouldtry: '“もっと頑張るべき”という声が、誰の声なのか。一度だけ、離れて眺めてみてもいい。',
  weak: '傷つくかどうかと、強いか弱いかは、別の話なのかもしれない。',
  toosensitive: '“気にしすぎかどうか”より先に、“気になった”という事実のほうを置いておこう。',
  onlyme: '見えているのは、ほかの人の“うまくいっている部分”だけ、ということもある。',
  worthless: 'ひとつの出来事で、自分全体の評価まで決めなくてもいいかもしれない。',
  selfblame: '起きたことの全部が自分のせい、と決められる材料は、今そろっているだろうか。',
  again: '“また”と感じるのは、つらさが重なっているから。今回の出来事は、今回の分だけで見てもいい。',
  notvalued: '“大切にされていない”と感じたことは、本物の気持ち。ただ、相手がどう思っているかは、まだ別のこととして置いておける。',
  onesided: '楽しみにしていた気持ちと、相手の気持ちの大きさは、今はまだ比べられないのかもしれない。',
  burden: '迷惑だったかどうかは、相手に聞いてみないとわからない部分もある。',
  judged: '相手がどう受け取ったかは、今の時点ではまだ確認できていない。',
  future: 'この先のことは、まだ起きていない。今わかっているのは、どこまでだろう。',
};

export function alternativeViews(record) {
  const tags = tagsOf(record.interpretations);
  const lines = tags.map((t) => VIEW_BY_TAG[t]).filter(Boolean).slice(0, 3);
  if (!lines.length) {
    lines.push(record.interpretations.length
      ? '浮かんだ考えは、今の時点では“考えのひとつ”として置いておける。'
      : '言葉にならないままでも、しんどさがあることは本当のこと。');
  }
  return lines;
}

// ---- 「こんな人もいる」（「みんなそう」とは言わない） ----
const OTHERS_OPENING = {
  amae: '休みたい、頼りたいと感じて、それを“甘え”だと責めてしまう人もいるよ。',
  behind: '周りと比べて、自分だけできていない気がする人もいるよ。',
  disliked: '相手の反応ひとつで、嫌われたかもって不安になる人もいるよ。',
};
export function othersToo(record) {
  const tags = tagsOf(record.interpretations);
  const s = scenarioOf(record);
  const relevant = s || ['weak', 'toosensitive', 'onlyme', 'amae'].some((t) => tags.includes(t));
  if (!relevant) return '';
  const opening = OTHERS_OPENING[s] || 'こういうことで傷ついたり、不安になったりする人もいるよ。';
  return `${opening}\nでも、みんなが同じ感じ方をするわけでもない。\nだから、“普通はこう”と決めなくても大丈夫。`;
}

// ---- 今日のあなたへ ----
export function todayMessage(record) {
  const tags = tagsOf(record.interpretations);
  const s = scenarioOf(record);
  const nothing = !record.eventText.trim() && !record.facts.length && !record.interpretations.length && !record.coreConcern;

  if (tags.includes('amae') || (s === 'amae' && !tags.length)) {
    return '「甘えているのかな」と思った今日は、\n甘えているかどうかを決める前に、\n「本当は何がつらかったんだろう」と見てあげてもいい。\n\n今日すぐ答えが出なくても大丈夫。';
  }
  if (tags.includes('disliked') || tags.includes('judged') || s === 'disliked') {
    return '誰かの反応ひとつで、\n自分の価値まで決めなくてもいい。\n\n今日わかったのは、\n「あなたがその出来事をどう感じたか」まで。\n\nそこから先は、まだ決めなくていいよ。';
  }
  if (tags.includes('onlyme') || tags.includes('worthless') || s === 'behind') {
    return '「自分だけうまくできない」と感じた今日は、\n誰かと比べる前に、\n自分が何に困っていたのかを見てあげてもいい。\n\n答えは、急がなくていいよ。';
  }
  if (tags.includes('selfblame')) {
    return '「私が悪いのかな」と思った今日は、\n悪いかどうかを決める前に、\n「何がつらかったのか」を先に置いてみてもいい。';
  }
  if (nothing) {
    return 'うまく言葉にならない日もある。\n\n今日はここに来て、少し立ち止まった。\nそれだけの日があってもいい。';
  }
  return '今日わかったのは、\n「あなたがその出来事をどう感じたか」まで。\n\nそこから先は、まだ決めなくていいよ。';
}

// ---- まだわからないこと ----
const UNKNOWN_BY_TAG = {
  disliked: '相手が本当はどう思っているか',
  selfblame: '何がどのくらい影響したのか',
  again: '次も同じことになるかどうか',
  notvalued: '相手の事情や気持ち',
  onesided: '相手がどのくらい楽しみにしていたか',
  burden: '相手が迷惑だと感じたかどうか',
  judged: '相手が実際にどう受け取ったか',
  worthless: 'この出来事が、自分全体をどのくらい表しているか',
  future: 'この先どうなるか',
  onlyme: 'ほかの人が、本当はどのくらい困っているか',
  amae: '今の自分に、どのくらい休みが必要か',
};

export function suggestUnknowns(interpretations, already = []) {
  const out = tagsOf(interpretations).map((t) => UNKNOWN_BY_TAG[t]).filter(Boolean);
  return [...new Set(out)].filter((u) => !already.includes(u));
}

// ---- アドバイス（「別の見方を知りたい」を選んだときだけ表示） ----
const clip = (s, n = 40) => (s.length > n ? `${s.slice(0, n)}…` : s);

function ruleBasedAdvice(record) {
  const facts = [];
  const interp = [];
  const actions = [];

  if (record.facts.length) {
    facts.push(`今わかっているのは「${record.facts.map((f) => clip(f)).join('」「')}」ということ。`);
  } else if (record.eventText) {
    facts.push(`起きたのは「${clip(record.eventText, 60)}」ということ。このうち、実際に確かめられたのはどこだろう。`);
  } else {
    facts.push('何が起きたか、まだ言葉にならなくても大丈夫。');
  }

  interp.push(...alternativeViews(record));
  if (record.unknowns.length) {
    interp.push(`「${clip(record.unknowns[0])}」は、わからないことのまま置いておいてもいい。`);
  }

  const em = new Set(record.emotions);
  if (em.has('angry') || tagsOf(record.interpretations).includes('disliked')) {
    actions.push('相手への返事は急がず、少し時間を置くという選択もできる。');
  }
  if (em.has('tired') || record.coreConcern.includes('疲れ')) {
    actions.push('疲れているときは、考えるのを明日に回すのもひとつの方法。');
  }
  actions.push('今すぐ何かを決めなくてもいい。後から「その後どうなった？」を記録することもできる。');

  return { facts, interpretations: interp, actions: actions.slice(0, 3) };
}

export const adviceProvider = { get: ruleBasedAdvice };

// ---- 類似記録 ----
// 日本語は単語区切りがないので、文字2-gramで重なりを見る
function bigrams(s) {
  const clean = s.replace(/[\s、。！？!?「」『』（）()・,.]/g, '');
  const set = new Set();
  for (let i = 0; i < clean.length - 1; i++) set.add(clean.slice(i, i + 2));
  return set;
}

function jaccard(a, b) {
  if (!a.size || !b.size) return 0;
  let inter = 0;
  for (const x of a) if (b.has(x)) inter++;
  return inter / (a.size + b.size - inter);
}

export function similarity(a, b) {
  const reasons = [];
  let score = 0;

  const sharedEm = a.emotions.filter((e) => b.emotions.includes(e));
  if (sharedEm.length) { score += sharedEm.length; reasons.push('似た気持ち'); }

  const ta = tagsOf(a.interpretations);
  const tb = tagsOf(b.interpretations);
  const sharedTags = ta.filter((t) => tb.includes(t));
  if (sharedTags.length) { score += sharedTags.length * 2; reasons.push('似た考え'); }

  if (a.coreConcern && a.coreConcern === b.coreConcern) { score += 2; reasons.push('似たつらさ'); }

  const text = (r) => [r.eventText, ...r.facts].join(' ');
  const j = jaccard(bigrams(text(a)), bigrams(text(b)));
  if (j >= 0.12) { score += j * 6; reasons.push('似た出来事'); }

  if (a.initialMood && a.initialMood === b.initialMood) score += 0.5;

  return { score, reasons };
}

export function findSimilar(target, all, limit = 3) {
  return all
    .filter((r) => r.id !== target.id && r.status === 'saved')
    .map((r) => ({ record: r, ...similarity(target, r) }))
    .filter((x) => x.score >= 2 && x.reasons.length)
    .sort((x, y) => y.score - x.score)
    .slice(0, limit);
}

export const emotionLabels = (ids) => ids.map((e) => labelOf(EMOTIONS, e));

// ---- 安全確認 ----
// 深刻な内容が含まれていそうなときは、通常の整理より先に現実の支援を案内する。
const CRISIS_RE = /死にたい|しにたい|死のう|死んでしまいたい|死ねたら|消えたい|きえたい|いなくなりたい|自殺|自死|自傷|リスカ|リストカット|切りたい|生きていたくない|生きてる意味|生きている意味|生きる意味がない|終わりにしたい|飛び降り|首を吊|首をつ|オーバードーズ|過量服薬|殺したい|殺される/;

export function detectCrisis(record) {
  const texts = [
    record.eventText, record.coreConcern, record.personalMemo, record.replyDraft,
    record.reflectionNote, record.outcomeNote,
    ...record.facts, ...record.interpretations, ...record.unknowns,
  ];
  return texts.some((t) => t && CRISIS_RE.test(t));
}
