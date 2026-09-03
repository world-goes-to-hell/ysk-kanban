import stringWidth from 'string-width';

const ELLIPSIS = '…';

/** 터미널 화면에서 차지하는 칸 수. 한글·한자·이모지는 두 칸을 쓴다. */
export function width(text) {
  return stringWidth(text ?? '');
}

/**
 * 폭이 넘치든 말든 끝에 … 를 붙여 maxWidth 안에 맞춘다.
 * 글자 단위로 담으므로 두 칸짜리 글자가 반으로 잘리는 일이 없다.
 */
function ellipsize(text, maxWidth) {
  const budget = maxWidth - width(ELLIPSIS);
  if (budget <= 0) return ELLIPSIS;

  let out = '';
  let used = 0;
  for (const ch of text) {
    const w = width(ch);
    if (used + w > budget) break;
    out += ch;
    used += w;
  }
  return out + ELLIPSIS;
}

/** ellipsize 의 거울상. 뒤에서부터 담아 앞쪽을 버리고 맨 앞에 … 를 붙인다. */
function ellipsizeStart(text, maxWidth) {
  const chars = [...text];
  const budget = maxWidth - width(ELLIPSIS);

  let out = '';
  let used = 0;
  if (budget > 0) {
    for (let i = chars.length - 1; i >= 0; i -= 1) {
      const w = width(chars[i]);
      if (used + w > budget) break;
      out = chars[i] + out;
      used += w;
    }
  }

  // 한 글자도 담지 못할 만큼 좁으면 … 를 포기한다.
  // 잘렸다는 표시보다 방금 친 글자가 보이는 편이 낫다.
  if (out === '') {
    const last = chars.at(-1) ?? '';
    return width(last) <= maxWidth ? last : ELLIPSIS;
  }
  return ELLIPSIS + out;
}

/** 폭이 maxWidth 를 넘으면 잘라내고 끝에 … 를 붙인다. 넘지 않으면 원문 그대로다. */
export function truncate(text, maxWidth) {
  const s = text ?? '';
  if (maxWidth <= 0) return '';
  return width(s) <= maxWidth ? s : ellipsize(s, maxWidth);
}

/**
 * 폭이 넘치면 앞쪽을 잘라내고 맨 앞에 … 를 붙인다.
 * 입력창처럼 방금 친 끝부분이 보여야 하는 자리에 쓴다.
 */
export function truncateStart(text, maxWidth) {
  const s = text ?? '';
  if (maxWidth <= 0) return '';
  return width(s) <= maxWidth ? s : ellipsizeStart(s, maxWidth);
}

/**
 * 폭 기준으로 줄을 나눈다. 줄 수가 maxLines 를 넘으면
 * 거기서 끊고 마지막 줄 끝에 … 를 붙여 잘렸음을 알린다.
 */
export function wrap(text, maxWidth, maxLines = Infinity) {
  if (maxWidth <= 0) return [];

  const lines = [];
  for (const para of (text ?? '').split('\n')) {
    let line = '';
    let used = 0;

    for (const ch of para) {
      const w = width(ch);
      if (used + w > maxWidth) {
        lines.push(line);
        line = ch;
        used = w;
      } else {
        line += ch;
        used += w;
      }
    }
    lines.push(line);
  }

  if (lines.length <= maxLines) return lines;

  const kept = lines.slice(0, maxLines);
  kept[kept.length - 1] = ellipsize(kept[kept.length - 1], maxWidth);
  return kept;
}
