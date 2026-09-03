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

/** 폭이 maxWidth 를 넘으면 잘라내고 끝에 … 를 붙인다. 넘지 않으면 원문 그대로다. */
export function truncate(text, maxWidth) {
  const s = text ?? '';
  if (maxWidth <= 0) return '';
  return width(s) <= maxWidth ? s : ellipsize(s, maxWidth);
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
