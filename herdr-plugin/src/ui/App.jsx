// herdr-plugin/src/ui/App.jsx
import { useEffect, useState, useSyncExternalStore } from 'react';
import { Text, useApp, useInput, useStdout } from 'ink';
import { computeLayout } from '../layout.js';
import { resolveKey } from '../input/keys.js';
import { Board } from './Board.jsx';
import { useTerminalSize } from './useTerminalSize.js';
import { Chrome } from './Chrome.jsx';

export function App({ store }) {
  const { exit } = useApp();
  const { stdout } = useStdout();
  const { columns, rows } = useTerminalSize(stdout);
  const state = useSyncExternalStore(store.subscribe, store.getState);
  const [connected] = useState(false);

  useEffect(() => { store.loadProjects(); }, [store]);

  useInput((input, key) => {
    const action = resolveKey(input, key);
    if (!action) return;

    switch (action.type) {
      case 'move-down':  return store.moveSelection(1);
      case 'move-up':    return store.moveSelection(-1);
      case 'move-left':  return store.moveColumn(-1);
      case 'move-right': return store.moveColumn(1);
      case 'refresh':    return void store.loadBoard(state.projectId);
      case 'quit':       return exit();
      default:           return;   // 나머지는 이후 태스크에서 붙인다
    }
  });

  if (state.loading && state.statuses.length === 0) {
    return <Text color="gray">불러오는 중…</Text>;
  }

  // pane 크기는 layout 계산과 Chrome 에 같은 값이 들어가야 한다.
  // 다른 값을 넣으면 그리는 곳과 마우스 판정이 어긋난다.
  const layout = computeLayout({
    columns, rows,
    statuses: state.statuses,
    cardsByStatus: state.cardsByStatus,
    scroll: state.scroll,
    collapsed: state.collapsed,
    columnOffset: state.columnOffset,
  });

  const projectName = state.projects.find(p => p.id === state.projectId)?.name;

  return (
    <Chrome projectName={projectName} columns={columns} rows={rows}
            connected={connected} error={state.error}>
      <Board layout={layout} statuses={state.statuses}
             cardsByStatus={state.cardsByStatus} selected={state.selected} />
    </Chrome>
  );
}
