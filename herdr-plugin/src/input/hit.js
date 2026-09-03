// herdr-plugin/src/input/hit.js

/**
 * 좌표에 놓인 영역을 찾는다. 오른쪽·아래 경계는 포함하지 않는다.
 * 나중에 추가된 영역이 위에 있다고 보고 뒤에서부터 찾는다.
 */
export function hitTest(regions, x, y) {
  for (let i = regions.length - 1; i >= 0; i--) {
    const r = regions[i];
    if (x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h) return r;
  }
  return null;
}

/**
 * x 좌표가 어느 칸에 속하는지 본다. 드래그로 카드를 떨어뜨릴 칸을 정할 때 쓴다.
 * 카드가 없는 빈 칸에도 떨어뜨릴 수 있어야 하므로 칸 머리의 x 범위만 본다.
 */
export function columnAt(layout, x) {
  for (const r of layout.regions) {
    if (r.kind !== 'column-header') continue;
    if (x >= r.x && x < r.x + r.w) return r.id;
  }
  return null;
}
