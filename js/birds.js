// マスコットの鳥。静的な SVG なので innerHTML で差し込んでよい。
// 役割：シマエナガ＝気持ちを受け止める／タカ＝少し離れて別の見方を見せる

const ENAGA = `
<svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="kb-enaga-fluff" cx="45%" cy="38%" r="70%">
      <stop offset="0.6" stop-color="#fdfcf9"/><stop offset="1" stop-color="#ebe6dd"/>
    </radialGradient>
    <clipPath id="kb-enaga-body"><ellipse cx="58" cy="66" rx="38" ry="34"/></clipPath>
  </defs>
  <path d="M86 78 L116 97 Q118 102 113 103 L82 88 Z" fill="#4b4843"/>
  <path d="M88 82 L111 97" stroke="#77726b" stroke-width="1.5"/>
  <ellipse cx="58" cy="66" rx="38" ry="34" fill="url(#kb-enaga-fluff)"/>
  <g clip-path="url(#kb-enaga-body)">
    <path d="M70 56 C 82 48, 100 56, 100 74 C 100 90, 88 98, 80 96 C 74 84, 70 70, 70 56 Z" fill="#5a5651"/>
    <path d="M74 58 C 84 56, 94 64, 96 78" stroke="#c9b09a" stroke-width="4" fill="none" stroke-linecap="round"/>
    <path d="M78 68 C 84 70, 90 78, 91 88" stroke="#efe9e1" stroke-width="1.8" fill="none" stroke-linecap="round" opacity=".7"/>
  </g>
  <ellipse cx="58" cy="66" rx="38" ry="34" fill="none" stroke="#dcd6cc" stroke-width="1.2"/>
  <circle cx="42" cy="60" r="3" fill="#1f1d1b"/>
  <circle cx="58" cy="60" r="3" fill="#1f1d1b"/>
  <circle cx="43" cy="59" r=".9" fill="#fff"/>
  <circle cx="59" cy="59" r=".9" fill="#fff"/>
  <path d="M47.5 65 L52.5 65 L50 68.5 Z" fill="#2a2724"/>
  <path d="M48 99 v6 M60 99 v6" stroke="#6b6660" stroke-width="2" stroke-linecap="round"/>
</svg>`;

const TAKA = `
<svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg">
  <path d="M46 94 L40 116 L64 116 L60 94 Z" fill="#6c5a49"/>
  <path d="M46 102 L60 102 M44 109 L62 109" stroke="#8a7461" stroke-width="2"/>
  <path d="M32 62 C 28 86, 40 102, 55 102 C 72 102, 80 86, 76 62 C 72 44, 38 42, 32 62 Z" fill="#8a7461"/>
  <path d="M50 56 C 43 74, 49 96, 58 99 C 69 95, 73 76, 70 58 Z" fill="#efe7da"/>
  <g stroke="#a88f76" stroke-width="2" fill="none" stroke-linecap="round">
    <path d="M52 68 q3 2 6 0"/><path d="M60 66 q3 2 6 0"/>
    <path d="M52 77 q3 2 6 0"/><path d="M60 75 q3 2 6 0"/>
    <path d="M55 86 q3 2 6 0"/><path d="M62 84 q3 2 5 0"/>
  </g>
  <path d="M34 62 C 31 80, 37 96, 49 101 C 45 86, 46 72, 46 60 C 42 56, 36 58, 34 62 Z" fill="#6c5a49"/>
  <path d="M38 70 q4 6 6 14 M40 80 q3 6 5 12" stroke="#5a4a3c" stroke-width="1.5" fill="none"/>
  <circle cx="60" cy="40" r="19" fill="#8a7461"/>
  <path d="M60 32 C 74 28, 82 40, 77 52 C 70 57, 58 50, 60 32 Z" fill="#efe7da"/>
  <path d="M66 43 C 60 46, 53 45, 47 40" stroke="#5a4a3c" stroke-width="3" fill="none" stroke-linecap="round"/>
  <circle cx="70" cy="40" r="4" fill="#e2b84d"/>
  <circle cx="70.6" cy="40" r="2" fill="#1f1d1b"/>
  <path d="M77 40 h4 v6 h-4 Z" fill="#e2b84d"/>
  <path d="M80 39 C 89 39, 92 46, 88 53 C 86 49, 83 47, 80 47 Z" fill="#3b3631"/>
  <path d="M51 102 v5 M61 102 v5" stroke="#d8b35a" stroke-width="2.5" stroke-linecap="round"/>
</svg>`;

export const BIRDS = {
  enaga: { name: 'シマエナガ', svg: ENAGA },
  taka: { name: 'タカ', svg: TAKA },
};
