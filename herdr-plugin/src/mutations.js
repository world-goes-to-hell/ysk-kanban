/** 상태 저장소에서 카드 하나를 찾는다. */
function findCard(state, cardId) {
  for (const list of Object.values(state.cardsByStatus)) {
    const hit = list.find(c => c.id === cardId);
    if (hit) return hit;
  }
  return null;
}

/** statusKey 가 완료 의미인지 본다. */
function isDoneStatus(state, statusKey) {
  const s = state.statuses.find(x => x.statusKey === statusKey);
  return (s?.semanticStatus ?? statusKey) === 'DONE';
}

export function createMutations({ store, client }) {
  /** 낙관적 갱신 공통 절차: 먼저 바꾸고, 실패하면 되돌린다. */
  async function optimistic({ before, apply, request, rollback }) {
    apply();
    try {
      const result = await request();
      return { ok: true, result };
    } catch (e) {
      rollback(before);
      store.setError(e.message);
      return { ok: false };
    }
  }

  return {
    async changeStatus(cardId, statusKey, { confirmSubtasks = false } = {}) {
      const state = store.getState();
      const card = findCard(state, cardId);
      if (!card) return 'failed';
      if ((card.statusKey ?? card.status) === statusKey) return 'done';

      // 완료로 옮길 때만 하위 일감을 확인한다
      if (!confirmSubtasks && isDoneStatus(state, statusKey)) {
        let subs = [];
        try {
          subs = await client.listSubtasks(cardId);
        } catch {
          subs = [];   // 확인에 실패해도 이동 자체는 막지 않는다
        }
        const pending = subs.filter(s => (s.statusKey ?? s.status) !== 'DONE');
        if (pending.length > 0) return 'needs-confirm';
      }

      const r = await optimistic({
        before: card,
        apply: () => store.upsertCard({ ...card, statusKey, status: statusKey }),
        request: () => client.changeStatus(cardId, statusKey),
        rollback: (orig) => store.upsertCard(orig),
      });

      if (!r.ok) return 'failed';
      if (r.result) store.upsertCard(r.result);
      return 'done';
    },
  };
}
