const INITIAL = {
  projects: [],
  projectId: null,
  statuses: [],
  cardsByStatus: {},
  selected: null,
  focus: 'board',
  scroll: {},
  collapsed: {},
  columnOffset: 0,
  loading: false,
  error: null,
  filter: { query: '', priority: null },
};

/**
 * 로컬 기준 오늘 날짜를 YYYY-MM-DD 로 만든다.
 * toISOString() 은 UTC 라 우리 시각으로 이른 아침이면 어제 날짜가 나온다.
 */
function todayString(d = new Date()) {
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${month}-${day}`;
}

/**
 * 오늘 끝낸 일감인지 본다.
 *
 * 서버의 completedAt 은 '2026-09-04T11:55:05.304421' 처럼 타임존 표기가 없는
 * 한국 시각이다. Date 로 파싱하면 환경에 따라 UTC 로 읽혀 아홉 시간이 어긋나고,
 * 자정 전후의 일감이 어제나 내일로 밀린다. 그래서 앞 열 자를 문자열 그대로 견준다.
 */
function isCompletedOn(todo, day) {
  const at = todo.completedAt;
  return typeof at === 'string' && at.slice(0, 10) === day;
}

export function createStore({ client, initialProjectId = null, today = null }) {
  let state = { ...INITIAL, projectId: initialProjectId };
  const listeners = new Set();

  const notify = () => { for (const fn of listeners) fn(state); };
  const set = (patch) => { state = { ...state, ...patch }; notify(); };

  // 주입받은 값이 있으면 그것을 쓰고, 없으면 부를 때마다 오늘을 다시 셈한다.
  // 고정해 두면 자정을 넘겨 켜 둔 화면이 어제에 머문다.
  const currentDay = () => today ?? todayString();

  /** 완료 시각. 완료 칸에는 completedAt 이 있는 것만 남으므로 없으면 null 이다. */
  function completedAtOf(todo) {
    const at = todo.completedAt;
    if (!at) return null;
    const t = Date.parse(at);
    return Number.isNaN(t) ? null : t;
  }

  /** 최근 완료가 위로 오도록 견준다. 시각을 알 수 없는 것은 맨 뒤로 보낸다. */
  function byCompletedDesc(a, b) {
    const ra = completedAtOf(a);
    const rb = completedAtOf(b);
    if (ra === rb) return 0;
    if (ra === null) return 1;
    if (rb === null) return -1;
    return rb - ra;
  }

  function groupByStatus(statuses, todos) {
    const out = {};
    for (const s of statuses) out[s.statusKey] = [];
    for (const t of todos) {
      const key = t.statusKey ?? t.status;
      (out[key] ??= []).push(t);
    }

    // 완료 칸에는 오늘 끝낸 것만 남기고 최근 순으로 세운다. 완료 일감은 수백 건까지
    // 쌓이므로 전부 보여 봐야 쓸모가 없다. 칸 이름과 statusKey 는 프로젝트마다
    // 다르므로 semanticStatus 로 판별한다. 나머지 칸은 거르지도 정렬하지도 않는다.
    // 그 순서는 사용자가 웹에서 끌어 정한 것일 수 있다.
    const day = currentDay();
    for (const s of statuses) {
      if (s.semanticStatus !== 'DONE') continue;
      out[s.statusKey] = out[s.statusKey]
        .filter(t => isCompletedOn(t, day))
        .sort(byCompletedDesc);
    }
    return out;
  }

  function matches(card, filter) {
    if (filter.query && !card.summary.toLowerCase().includes(filter.query.toLowerCase())) return false;
    if (filter.priority && card.priority !== filter.priority) return false;
    return true;
  }

  const visibleCards = (statusKey) =>
    (state.cardsByStatus[statusKey] ?? []).filter(c => matches(c, state.filter));

  function firstCardOf(statusKey) {
    const list = visibleCards(statusKey);
    return list.length > 0 ? list[0].id : null;
  }

  return {
    getState: () => state,

    subscribe(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },

    visibleCards,

    async loadProjects() {
      try {
        set({ projects: await client.listProjects() });
      } catch (e) {
        set({ error: e.message });
      }
    },

    async loadBoard(projectId) {
      set({ loading: true, error: null, projectId });
      try {
        const [statuses, todos] = await Promise.all([
          client.listStatuses(projectId),
          client.listTodos(projectId),
        ]);
        const active = statuses.filter(s => s.active !== false)
                               .sort((a, b) => a.position - b.position);
        const cardsByStatus = groupByStatus(active, todos);
        const firstKey = active[0]?.statusKey ?? null;
        const firstId = firstKey ? (cardsByStatus[firstKey][0]?.id ?? null) : null;

        set({
          statuses: active,
          cardsByStatus,
          selected: firstKey ? { statusKey: firstKey, cardId: firstId } : null,
          loading: false,
        });
      } catch (e) {
        set({ loading: false, error: e.message });
      }
    },

    selectCard(statusKey, cardId) {
      set({ selected: { statusKey, cardId } });
    },

    moveSelection(dy) {
      const sel = state.selected;
      if (!sel) return;
      const list = visibleCards(sel.statusKey);
      if (list.length === 0) return;

      const at = list.findIndex(c => c.id === sel.cardId);
      const next = Math.min(list.length - 1, Math.max(0, (at === -1 ? 0 : at) + dy));
      set({ selected: { statusKey: sel.statusKey, cardId: list[next].id } });
    },

    /** 접힌 칸은 건너뛴다. 그 방향에 펼쳐진 칸이 없으면 제자리에 머문다. */
    moveColumn(dx) {
      const sel = state.selected;
      if (!sel || state.statuses.length === 0 || dx === 0) return;

      const at = state.statuses.findIndex(s => s.statusKey === sel.statusKey);
      const step = dx > 0 ? 1 : -1;

      for (let i = at + step; i >= 0 && i < state.statuses.length; i += step) {
        const key = state.statuses[i].statusKey;
        if (state.collapsed[key]) continue;
        set({ selected: { statusKey: key, cardId: firstCardOf(key) } });
        return;
      }
    },

    setFilter(patch) {
      set({ filter: { ...state.filter, ...patch } });
    },

    toggleCollapse(statusKey) {
      set({ collapsed: { ...state.collapsed, [statusKey]: !state.collapsed[statusKey] } });
    },

    scrollColumn(statusKey, delta) {
      const max = Math.max(0, visibleCards(statusKey).length - 1);
      const now = state.scroll[statusKey] ?? 0;
      set({ scroll: { ...state.scroll, [statusKey]: Math.min(max, Math.max(0, now + delta)) } });
    },

    /** 보이는 칸의 시작 위치. 칸이 많아 화면 밖으로 밀려난 칸을 보이게 할 때 쓴다. */
    setColumnOffset(columnOffset) { set({ columnOffset: Math.max(0, columnOffset) }); },

    setFocus(focus) { set({ focus }); },
    setError(error) { set({ error }); },

    /**
     * 서버에서 받은 카드 하나를 반영한다. SSE 와 낙관적 갱신이 함께 쓴다.
     * 칸이 그대로면 제자리에서 갈아 끼우고, 칸이 바뀌었을 때만 옮긴다.
     */
    upsertCard(card) {
      const key = card.statusKey ?? card.status;
      const from = Object.keys(state.cardsByStatus)
        .find(k => state.cardsByStatus[k].some(c => c.id === card.id));

      const next = { ...state.cardsByStatus };
      if (from === key) {
        next[key] = next[key].map(c => (c.id === card.id ? card : c));
      } else {
        if (from !== undefined) next[from] = next[from].filter(c => c.id !== card.id);
        next[key] = [...(next[key] ?? []), card];
      }
      set({ cardsByStatus: next });
    },

    removeCard(cardId) {
      const next = {};
      for (const [k, list] of Object.entries(state.cardsByStatus)) {
        next[k] = list.filter(c => c.id !== cardId);
      }
      set({ cardsByStatus: next });
    },

    replaceBoard(cardsByStatus) { set({ cardsByStatus }); },
  };
}
