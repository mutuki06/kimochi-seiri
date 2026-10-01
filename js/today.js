// 「今日の自分」の選択肢と声かけ。
// 目的は、当たり前に見える行動を一緒に拾うこと。数や達成率では評価しない。
// 文言ルール：大げさに褒めない／「頑張ったね」を乱用しない／もっと頑張ることを求めない／
// できなかったことを失敗扱いしない／休むことを失敗扱いしない／医療的な判断をしない。
// id は保存データに使うので変更しないこと。

export const CONDITIONS = [
  { id: 'genki', emoji: '😊', label: '元気', lines: ['今日は元気なんだね。いいね。', '元気な日なんだね。その感じ、覚えておけるといいね。'] },
  { id: 'maamaa', emoji: '🙂', label: 'まあまあ', lines: ['まあまあ、なんだね。そういう日も、ちゃんと一日だよ。', 'まあまあの日だね。それくらいがちょうどいい日もあるよね。'] },
  { id: 'futsu', emoji: '😐', label: '普通', lines: ['普通の日だね。普通に過ごせてるのも、大事なことだよ。', '普通の日なんだね。'] },
  { id: 'bitheavy', emoji: '😵', label: 'ちょっとしんどい', rest: true, lines: ['ちょっとしんどいんだね。今日は少し、ペースを落としてもいいかも。', 'しんどいんだね。今日は休もうか。'] },
  { id: 'veryheavy', emoji: '🫠', label: 'かなりしんどい', rest: true, lines: ['かなりしんどいんだね。今日は、休むことを優先してもいいよ。', '今日は休もうか。やらなくていいことは、置いておこう。'] },
  { id: 'unknown', emoji: '❓', label: 'わからない', lines: ['わからない日もあるよね。わからないままでいいよ。', 'うまく言えない日だね。それでも、ここに来たね。'] },
];

// 「今日できたこと」。lines は選んだときにシマエナガが言うひとこと（いくつかから選ぶ）。
export const DONE_ITEMS = [
  { id: 'woke', label: '起きた', lines: ['ちゃんと起きたね。', '今日も起きて、ここまで来たね。'] },
  { id: 'dressed', label: '着替えた', lines: ['着替えたんだね。一日を始める準備、ちゃんとしたね。', '着替えるのも、ひとつの切り替えだよね。'] },
  { id: 'washface', label: '顔を洗った', lines: ['顔を洗ったんだね。自分のことを、少し整えたね。'] },
  { id: 'ate', label: 'ご飯を食べた', lines: ['ちゃんと食べたんだね。それも今日の自分を大切にすることだよ。', 'ご飯を食べたんだね。体に、ちゃんと届いてるよ。'] },
  { id: 'water', label: '水分をとった', lines: ['水分、とれたんだね。地味だけど、大事なこと。'] },
  { id: 'work', label: '仕事に行った', lines: ['今日も仕事に行ったんだね。よくやったね。', '仕事に行ったんだね。行くだけでも、けっこう力を使うよね。'] },
  { id: 'school', label: '学校に行った', lines: ['学校に行ったんだね。', '学校に行ったんだね。それだけで、ちゃんと一日を過ごしてるよ。'] },
  { id: 'talked', label: '人と話した', lines: ['人と話したんだね。それ、意外と力を使うことだよ。'] },
  { id: 'out', label: '外に出た', lines: ['外に出たんだね。', 'ドアの外まで行けたんだね。'] },
  { id: 'shopping', label: '買い物をした', lines: ['買い物してきたんだね。自分の生活を、ちゃんと回してるね。'] },
  { id: 'chores', label: '家事をした', lines: ['家事をしたんだね。誰かに見られなくても、ちゃんと暮らしを支えてる。'] },
  { id: 'bath', label: 'お風呂に入った', lines: ['お風呂に入ったんだね。今日の自分を、ちゃんといたわったね。'] },
  { id: 'care', label: '薬・必要なケアをした', lines: ['必要なケアをしたんだね。自分のことを見てあげられたね。'] },
  { id: 'home', label: '帰ってきた', lines: ['今日も一日を終えて、ちゃんと帰ってきたね。', 'おかえり。ちゃんと帰ってきたね。'] },
  { id: 'rested', label: 'ちゃんと休んだ', lines: ['ちゃんと休んだんだね。休むのも、今日やったことのひとつだよ。', '休めたんだね。それも大事なこと。'] },
  { id: 'sleepprep', label: '眠る準備をした', lines: ['眠る準備をしたんだね。明日の自分に、やさしいことをしたね。'] },
];

// 「今日はできなかったこと」。task は「明日の自分に渡す」ときの書き方。
export const NOT_DONE_ITEMS = [
  { id: 'laundry', label: '洗濯できなかった', task: '洗濯' },
  { id: 'cleaning', label: '掃除できなかった', task: '掃除' },
  { id: 'shopping', label: '買い物できなかった', task: '買い物' },
  { id: 'papers', label: '書類を片付けられなかった', task: '書類の片付け' },
  { id: 'study', label: '勉強できなかった', task: '勉強' },
];

export const NOT_DONE_LINES = [
  '今日はできなかったんだね。\nでも、それは今日じゃなくてもいいことかもしれないよ。',
  'それ、明日でもいいんじゃない？\n明日の自分に渡しておこう。',
  'できなかったことより、できたことも見てみよう。',
];

// しんどい日に提案する、負担の少ないこと
export const REST_IDEAS = [
  '少しでも、何か食べる',
  '水分をとる',
  '横になる',
  '早めに寝る',
  'やらなくていいことを、ひとつ減らす',
];

const GREETINGS = {
  morning: ['おはよう。今日も来たね。', 'おはよう。ちゃんと起きたね。'],
  day: ['今日も来たね。', '来てくれたんだね。'],
  night: ['おつかれさま。今日も来たね。', '夜だね。今日のこと、少し見てみようか。'],
  again: ['また来たね。', 'おかえり。続きから見てみよう。'],
  past: ['この日の自分を、見てみよう。'],
};

const CLOSINGS = [
  '今日のあなたは、今日をちゃんと終わらせました。',
  '今日も、ここまで来たね。\nあとは、ゆっくり休もう。',
  '今日の分は、これで十分。\nおやすみ。',
];
const CLOSING_EMPTY = '何もできなかったと思っても、ここに来たね。\n今日はそれで、終わりにしよう。';

// ---- 日付 ----
const pad = (n) => String(n).padStart(2, '0');
export const dateKey = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const isDateKey = (s) => /^\d{4}-\d{2}-\d{2}$/.test(s);
export const parseDateKey = (k) => { const [y, m, d] = k.split('-').map(Number); return new Date(y, m - 1, d); };

export function timeOfDay(d = new Date()) {
  const hr = d.getHours();
  if (hr >= 4 && hr < 11) return 'morning';
  if (hr >= 18 || hr < 4) return 'night';
  return 'day';
}

// 同じ日・同じ場面では同じ文が出て、日によって変わるようにする
function hash(s) {
  let x = 0;
  for (const c of s) x = (x * 31 + c.codePointAt(0)) | 0;
  return Math.abs(x);
}
export const pick = (list, seed) => list[hash(seed) % list.length];

export function greeting(date, { hasRecord }) {
  if (date !== dateKey()) return pick(GREETINGS.past, date);
  if (hasRecord) return pick(GREETINGS.again, date);
  return pick(GREETINGS[timeOfDay()], date);
}

export function closing(day) {
  const any = day.done.length || day.doneOther.length;
  return any ? pick(CLOSINGS, day.date) : CLOSING_EMPTY;
}

// 「その他」の自由入力に対するひとこと
export const otherDoneLine = (text) => `「${text}」をしたんだね。それも、ちゃんと今日のことだよ。`;
