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

export function createStore({ client, initialProjectId = null }) {
  let state = { ...INITIAL, projectId: initialProjectId };
  const listeners = new Set();

  const notify = () => { for (const fn of listeners) fn(state); };
  const set = (patch) => { state = { ...state, ...patch }; notify(); };

  function groupByStatus(statuses, todos) {
    const out = {};
    for (const s of statuses) out[s.statusKey] = [];
    for (const t of todos) {
      const key = t.statusKey ?? t.status;
      (out[key] ??= []).push(t);
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
