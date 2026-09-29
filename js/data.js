// 選択肢と文言の定義。id は保存データに使うので変更しないこと（表示ラベルは変えてよい）。
// legacy: true のものは以前のバージョンの記録を表示するためだけに残している。

export const MOODS = [
  { id: 'down', label: '落ち込んでる', ack: 'そっか。落ち込んでるんだね。' },
  { id: 'heavy', label: 'なんかしんどい', ack: 'そっか。今日はちょっと心が疲れてるんだね。' },
  { id: 'moyamoya', label: 'モヤモヤする', ack: 'モヤモヤしてるんだね。うまく形にならない感じかな。' },
  { id: 'anxious', label: '不安', ack: '不安なんだね。何か、気になっちゃってるのかな。' },
  { id: 'irritated', label: 'イライラする', ack: 'イライラしてるんだね。その下に、ほかの気持ちもあるかもしれないね。' },
  { id: 'noconfidence', label: '自信がなくなった', ack: '自信がなくなっちゃったんだね。', scenario: 'behind' },
  { id: 'disliked', label: '誰かに嫌われた気がする', ack: '嫌われた気がしたんだね。それ、気になっちゃったんだね。', scenario: 'disliked' },
  { id: 'unknown', label: '理由はわからない', ack: '理由がわからないままでも、ここにいていいよ。' },
  { id: 'cantsay', label: 'うまく言えない', ack: 'うまく説明できなくても大丈夫。選ぶだけでもいいよ。' },
  // 以前のバージョン
  { id: 'hurt', label: '誰かの言葉が刺さった', legacy: true },
  { id: 'selfdislike', label: '自分が嫌になった', legacy: true },
  { id: 'talk', label: 'ただ話したい', legacy: true },
];

// よくある自己否定のパターン。ホームから直接始められる。
export const SCENARIOS = [
  { id: 'amae', label: '自分が甘えている気がする', ack: '“甘えてるのかな”って思ったんだね。' },
  { id: 'disliked', label: '誰かに嫌われた気がする', ack: '嫌われた気がしたんだね。それ、気になっちゃったんだね。' },
  { id: 'behind', label: '自分だけうまくできない気がする', ack: '自分だけうまくできない気がしたんだね。' },
];

export const EMOTIONS = [
  { id: 'sad', label: '悲しい' },
  { id: 'angry', label: '腹が立つ' },
  { id: 'lonely', label: '寂しい' },
  { id: 'anxious', label: '不安' },
  { id: 'disappointed', label: 'がっかり' },
  { id: 'tired', label: '疲れた' },
  { id: 'ashamed', label: '恥ずかしい' },
  { id: 'rejected', label: '自分を否定された感じ' },
  { id: 'pretend', label: '何とも思わないふりをしている' },
  { id: 'unsure', label: 'よくわからない' },
];

// 出来事の手がかり（押すと「起きたこと」に入る）
export const EVENTS = {
  amae: ['疲れて、やるべきことができなかった', '休みたい・休んだ', '人に頼った・弱音を吐いた', '注意された・何か言われた'],
  disliked: ['返信が来ない・遅い', '予定をキャンセルされた', 'そっけない態度をとられた', '輪に入れなかった気がした'],
  behind: ['ミスをした', '周りについていけない', '人と比べてしまった', '思ったようにできなかった'],
  none: ['人とのこと', '仕事・学校のこと', '自分自身のこと', '特に何もないけど、しんどい'],
};

// 頭に浮かんだこと。tag は掘り下げ・別の見方・類似記録のルールに使う。
export const THOUGHTS = [
  { tag: 'amae', label: '私って甘えてるのかな', scenario: 'amae' },
  { tag: 'weak', label: 'こんなことで傷つく私は弱い？', scenario: 'amae' },
  { tag: 'shouldtry', label: 'もっと頑張るべき？', scenario: 'amae' },
  { tag: 'toosensitive', label: '私が気にしすぎ？', scenario: 'amae' },
  { tag: 'disliked', label: '嫌われたのかな', scenario: 'disliked' },
  { tag: 'disliked', label: '私と会いたくないのかな', scenario: 'disliked' },
  { tag: 'onesided', label: '私ばかり楽しみにしてたのかな', scenario: 'disliked' },
  { tag: 'judged', label: '変に思われたかな', scenario: 'disliked' },
  { tag: 'onlyme', label: 'みんなは普通にできるのに', scenario: 'behind' },
  { tag: 'onlyme', label: '自分だけうまくできない', scenario: 'behind' },
  { tag: 'worthless', label: '私はダメだ', scenario: 'behind' },
  { tag: 'future', label: 'この先もうまくいかない', scenario: 'behind' },
  { tag: 'selfblame', label: '私が悪いのかな' },
  { tag: 'notvalued', label: '私って大切にされないのかな' },
  { tag: 'again', label: 'またか、と思った' },
  { tag: 'othercontext', label: '相手にも事情があると思った' },
];

// 「本当につらかったのは？」の選択肢。reply は選んだときにシマエナガが返すひとこと。
const UNSURE = { id: 'unsure', label: '自分でもわからない', reply: 'わからないままでも大丈夫。ここまで見てきたことは、ちゃんと残ってるよ。' };
export const CONCERNS = {
  disliked: [
    { id: 'event', label: '予定や約束がなくなったこと' },
    { id: 'postponed', label: '自分が後回しにされた感じ', reply: '後回しにされた感じが、引っかかっていたんだね。' },
    { id: 'notvalued', label: '大切にされていない感じ', reply: 'それが嫌だったというより、“大切にされていない気がした”ことがつらかったのかな。' },
    { id: 'expected', label: '期待してしまった自分', reply: '期待していたのは、それだけ大事に思っていたから、かもしれないね。' },
    { id: 'again', label: 'また同じことが起きたこと', reply: '“また”って感じると、つらさが重なるよね。' },
    UNSURE,
  ],
  amae: [
    { id: 'cantforgive', label: '休んだり頼ったりした自分を許せない感じ', reply: '休んだり頼ったりした自分に、厳しくなっちゃってるのかな。' },
    { id: 'pushed', label: '“もっと頑張らなきゃ”と追い立てられる感じ', reply: '“もっと頑張らなきゃ”って声に、ずっと追いかけられてる感じなのかな。' },
    { id: 'blamed', label: '誰かに責められそうな気がすること' },
    { id: 'tired', label: '本当はかなり疲れていること', reply: '本当は、かなり疲れていたんだね。' },
    { id: 'hideweak', label: '弱い自分を見せたくない気持ち' },
    UNSURE,
  ],
  behind: [
    { id: 'failed', label: 'うまくできなかったこと自体' },
    { id: 'leftbehind', label: '周りと比べて、置いていかれる感じ', reply: '置いていかれる感じが、つらかったんだね。' },
    { id: 'worthless', label: '自分には価値がない気がすること', reply: '出来事ひとつが、自分の価値の話にまで広がっちゃったのかな。' },
    { id: 'expectation', label: '期待に応えられなかったこと' },
    { id: 'again', label: 'また同じことが起きたこと', reply: '“また”って感じると、つらさが重なるよね。' },
    UNSURE,
  ],
  none: [
    { id: 'notvalued', label: '大切にされていない感じ', reply: 'それが嫌だったというより、“大切にされていない気がした”ことがつらかったのかな。' },
    { id: 'notheard', label: '気持ちが伝わらない感じ' },
    { id: 'selfblame', label: '自分を責めてしまうこと', reply: '起きたことより、自分を責める気持ちのほうが重かったのかな。' },
    { id: 'future', label: 'この先が見えない感じ' },
    { id: 'tired', label: 'とにかく疲れていること', reply: '本当は、かなり疲れていたんだね。' },
    UNSURE,
  ],
};
export const ALL_CONCERNS = Object.values(CONCERNS).flat();

// 「別の見方」を見たあとの反応
export const PERSPECTIVE_RESPONSES = [
  { id: 'bit', label: '少しわかる気がする', reply: 'そっか。少しでも、見え方が変わったならよかった。' },
  { id: 'notfit', label: 'ピンとこない', reply: 'それでも大丈夫。合わない見方は、置いておこう。' },
  { id: 'notnow', label: '今は考えたくない', reply: 'うん。今日は、ここまでで十分。' },
];

// 最後の「今はどうしたい？」
export const ACTIONS = [
  { id: 'talk', label: 'もう少し話したい' },
  { id: 'organize', label: '気持ちを整理したい' },
  { id: 'perspective', label: '別の見方を知りたい' },
  { id: 'action', label: '今できることを考えたい' },
  { id: 'end', label: '今日はここで終わる' },
  // 以前のバージョン
  { id: 'calm', label: '今は落ち着きたい', legacy: true },
  { id: 'reply', label: '相手への返事を考えたい', legacy: true },
  { id: 'nothing', label: '今日は何もしない', legacy: true },
  { id: 'past', label: '過去の似た出来事を見たい', legacy: true },
];

export const OUTCOMES = [
  { id: 'nothing', label: '特に何もなかった' },
  { id: 'contacted', label: '相手から連絡が来た' },
  { id: 'resolved', label: '話して解決した' },
  { id: 'calmed', label: '自分の気持ちが落ち着いた' },
  { id: 'changed', label: '関係が変わった' },
  { id: 'unknown', label: 'まだわからない' },
  { id: 'other', label: 'その他' },
];

// 相談先（日本国内）。受付時間は変更されることがあるため、断定的に書かない。
export const SUPPORT_LINES = [
  { name: '緊急のとき（救急）', tel: '119', note: '命の危険があるとき' },
  { name: '緊急のとき（警察）', tel: '110', note: '身の危険があるとき' },
  { name: 'よりそいホットライン', tel: '0120-279-338', note: '無料・24時間（時期により変わることがあります）' },
  { name: 'いのちの電話（ナビダイヤル）', tel: '0570-783-556', note: '受付時間は公式サイトで確認してください' },
  { name: 'こころの健康相談統一ダイヤル', tel: '0570-064-556', note: 'お住まいの地域の窓口につながります' },
];

export const byId = (list, id, key = 'id') => list.find((x) => x[key] === id);
export const labelOf = (list, id) => byId(list, id)?.label ?? id;
export const current = (list) => list.filter((x) => !x.legacy);
