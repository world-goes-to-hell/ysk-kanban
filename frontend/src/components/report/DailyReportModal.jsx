import { useState, useEffect, useCallback } from 'react';
import Modal from '../common/Modal';
import reportsAPI from '../../api/reports';
import todoAPI from '../../api/todos';
import commentAPI from '../../api/comments';
import { useToast } from '../../hooks/useToast';
import { useProjects } from '../../contexts/ProjectContext';
import styles from '../../styles/dailyReport.module.css';

function formatToday() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function ManualEntry({ onAdd, projects }) {
  const [projectId, setProjectId] = useState('');
  const [todos, setTodos] = useState([]);
  const [selectedTodoId, setSelectedTodoId] = useState('');
  const [isCustomTask, setIsCustomTask] = useState(false);
  const [customTask, setCustomTask] = useState('');
  const [detail, setDetail] = useState('');
  const [saveAsComment, setSaveAsComment] = useState(false);
  const [saving, setSaving] = useState(false);
  const showToast = useToast();

  useEffect(() => {
    if (!projectId) {
      setTodos([]);
      setSelectedTodoId('');
      return;
    }
    todoAPI.list(projectId).then(data => {
      setTodos(Array.isArray(data) ? data : []);
      setSelectedTodoId('');
    });
  }, [projectId]);

  const taskName = isCustomTask
    ? customTask.trim()
    : (todos.find(t => String(t.id) === String(selectedTodoId))?.summary || '');

  const handleAdd = async (section) => {
    if (!taskName) return;
    const proj = projects.find(p => String(p.id) === String(projectId));
    const projName = proj ? proj.name : '기타';

    if (saveAsComment && selectedTodoId && detail.trim()) {
      setSaving(true);
      try {
        await commentAPI.create(selectedTodoId, detail.trim());
        showToast('댓글이 등록되었습니다.', 'success');
      } catch (err) {
        showToast(`댓글 등록 실패: ${err.message}`, 'error');
      } finally {
        setSaving(false);
      }
    }

    onAdd(section, {
      project: projName,
      task: taskName,
      detail: detail.trim(),
      todoId: isCustomTask ? null : selectedTodoId || null,
    });
    setCustomTask('');
    setDetail('');
    setSaveAsComment(false);
  };

  const canSaveComment = !isCustomTask && selectedTodoId && detail.trim();

  return (
    <div className={styles.manualEntry}>
      <div className={styles.manualRow}>
        <label className={styles.manualLabel}>프로젝트</label>
        <select
          className={styles.manualSelect}
          value={projectId}
          onChange={e => { setProjectId(e.target.value); setIsCustomTask(false); }}
        >
          <option value="">선택</option>
          {projects.map(p => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      </div>
      <div className={styles.manualRow}>
        <label className={styles.manualLabel}>일감</label>
        {isCustomTask ? (
          <input
            className={styles.manualInput}
            value={customTask}
            onChange={e => setCustomTask(e.target.value)}
            placeholder="일감 제목을 입력하세요"
          />
        ) : (
          <select
            className={styles.manualSelect}
            value={selectedTodoId}
            onChange={e => setSelectedTodoId(e.target.value)}
            disabled={!projectId}
          >
            <option value="">일감 선택</option>
            {['TODO', 'IN_PROGRESS', 'DONE'].map(status => {
              const filtered = todos.filter(t => t.status === status);
              if (filtered.length === 0) return null;
              const label = status === 'TODO' ? '할 일' : status === 'IN_PROGRESS' ? '진행 중' : '완료';
              return (
                <optgroup key={status} label={label}>
                  {filtered.map(t => (
                    <option key={t.id} value={t.id}>{t.summary}</option>
                  ))}
                </optgroup>
              );
            })}
          </select>
        )}
        <button
          className={styles.manualToggleBtn}
          onClick={() => { setIsCustomTask(prev => !prev); setSelectedTodoId(''); setCustomTask(''); }}
          type="button"
        >
          {isCustomTask ? '목록' : '직접'}
        </button>
      </div>
      <div className={styles.manualRow}>
        <label className={styles.manualLabel}>내용</label>
        <input
          className={styles.manualInput}
          value={detail}
          onChange={e => setDetail(e.target.value)}
          placeholder="상세 내용 (선택)"
        />
      </div>
      <div className={styles.manualBottomRow}>
        <label className={styles.checkboxLabel}>
          <input
            type="checkbox"
            checked={saveAsComment}
            onChange={e => setSaveAsComment(e.target.checked)}
            disabled={!canSaveComment}
          />
          댓글로 등록
        </label>
        <div className={styles.manualActions}>
          <button
            className={styles.manualAddBtn}
            onClick={() => handleAdd('progress')}
            disabled={!taskName || saving}
          >
            금일 진행에 추가
          </button>
          <button
            className={styles.manualAddBtn}
            onClick={() => handleAdd('upcoming')}
            disabled={!taskName || saving}
          >
            진행 예정에 추가
          </button>
        </div>
      </div>
    </div>
  );
}

function mergeManualEntries(report, progressEntries, upcomingEntries) {
  if (progressEntries.length === 0 && upcomingEntries.length === 0) return report;

  const lines = report.split('\n');
  const progressIdx = lines.findIndex(l => l.includes('[금일 진행 사항]'));
  const upcomingIdx = lines.findIndex(l => l.includes('[진행 예정 사항]'));

  const result = [...lines];
  let offset = 0;

  const insertEntries = (entries, sectionStart, sectionEnd) => {
    for (const entry of entries) {
      const projectLine = `📁 ${entry.project}`;
      const taskLine = `    📌 ${entry.task}`;
      const detailLine = entry.detail ? `        💬 ${entry.detail}` : null;

      // 1. 해당 섹션에서 프로젝트 찾기
      let projectIdx = -1;
      for (let i = sectionStart + offset; i < sectionEnd + offset; i++) {
        if (result[i] && result[i].includes(projectLine)) {
          projectIdx = i;
          break;
        }
      }

      if (projectIdx !== -1) {
        // 프로젝트 존재 → 같은 일감이 있는지 찾기
        let taskIdx = -1;
        let searchEnd = projectIdx + 1;
        while (searchEnd < result.length && result[searchEnd] && result[searchEnd].startsWith('    ')) {
          if (result[searchEnd].includes(taskLine)) {
            taskIdx = searchEnd;
          }
          searchEnd++;
        }

        if (taskIdx !== -1 && detailLine) {
          // 일감 존재 → 💬 내용만 추가
          let commentInsert = taskIdx + 1;
          while (commentInsert < result.length && result[commentInsert] && result[commentInsert].startsWith('        ')) {
            commentInsert++;
          }
          result.splice(commentInsert, 0, detailLine);
          offset += 1;
        } else if (taskIdx === -1) {
          // 일감 없음 → 프로젝트 하위 끝에 일감+내용 추가
          const newLines = [taskLine];
          if (detailLine) newLines.push(detailLine);
          result.splice(searchEnd, 0, ...newLines);
          offset += newLines.length;
        }
      } else {
        // 프로젝트 없음 → 새 블록 추가
        let insertAt = sectionEnd + offset;
        while (insertAt > 0 && result[insertAt - 1] === '') {
          insertAt--;
        }
        const block = [projectLine, taskLine];
        if (detailLine) block.push(detailLine);
        result.splice(insertAt, 0, ...block);
        offset += block.length;
      }
    }
  };

  if (progressEntries.length > 0 && progressIdx !== -1) {
    const end = upcomingIdx !== -1 ? upcomingIdx : lines.length;
    insertEntries(progressEntries, progressIdx, end);
  }

  if (upcomingEntries.length > 0 && upcomingIdx !== -1) {
    insertEntries(upcomingEntries, upcomingIdx + offset, lines.length + offset);
  }

  return result.join('\n');
}

export default function DailyReportModal({ onClose }) {
  const { projects } = useProjects();
  const [date, setDate] = useState(formatToday);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showManual, setShowManual] = useState(false);
  const [progressEntries, setProgressEntries] = useState([]);
  const [upcomingEntries, setUpcomingEntries] = useState([]);
  // AI 양식 추출: 'off' | 'input' | 'result'
  const [aiMode, setAiMode] = useState('off');
  const [aiInput, setAiInput] = useState('');
  const [aiResult, setAiResult] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const showToast = useToast();

  const fetchReport = useCallback(async (targetDate) => {
    setLoading(true);
    setCopied(false);
    try {
      const result = await reportsAPI.daily(targetDate);
      setData(result);
    } catch (err) {
      showToast(`보고서 생성 실패: ${err.message}`, 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchReport(date);
    setProgressEntries([]);
    setUpcomingEntries([]);
    setAiMode('off');
    setAiInput('');
    setAiResult('');
  }, [date, fetchReport]);

  const handleAddManual = (section, entry) => {
    if (!entry.task) return;
    if (section === 'progress') {
      setProgressEntries(prev => [...prev, entry]);
    } else {
      setUpcomingEntries(prev => [...prev, entry]);
    }
    showToast(`${section === 'progress' ? '금일 진행' : '진행 예정'}에 추가되었습니다.`, 'success');
  };

  const finalReport = data?.report
    ? mergeManualEntries(data.report, progressEntries, upcomingEntries)
    : '';

  const copyTarget = aiMode === 'result' ? aiResult : finalReport;

  const handleCopy = async () => {
    if (!copyTarget) return;
    try {
      await navigator.clipboard.writeText(copyTarget);
      setCopied(true);
      showToast('클립보드에 복사되었습니다.', 'success');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      showToast('복사에 실패했습니다.', 'error');
    }
  };

  const handleEnterAiMode = () => {
    setShowManual(false);
    setAiInput(finalReport);
    setAiResult('');
    setAiMode('input');
  };

  const handleGenerateAi = async () => {
    if (!aiInput.trim()) {
      showToast('변환할 업무 내용을 입력하세요.', 'error');
      return;
    }
    setAiLoading(true);
    try {
      const result = await reportsAPI.aiFormat(aiInput, date);
      setAiResult(result?.report || '');
      setAiMode('result');
      setCopied(false);
    } catch (err) {
      showToast(`AI 양식 추출 실패: ${err.message}`, 'error');
    } finally {
      setAiLoading(false);
    }
  };

  const datePickerEl = (
    <input
      type="date"
      className={styles.datePicker}
      value={date}
      onChange={e => setDate(e.target.value)}
    />
  );

  const manualCount = progressEntries.length + upcomingEntries.length;

  let footerEl;
  if (aiMode === 'input') {
    footerEl = (
      <>
        <button className="btn btn-ghost" onClick={() => setAiMode('off')} disabled={aiLoading}>
          취소
        </button>
        <div style={{ flex: 1 }} />
        <button className="btn btn-primary" onClick={handleGenerateAi} disabled={aiLoading || !aiInput.trim()}>
          {aiLoading ? '생성 중...' : 'AI 양식 생성'}
        </button>
      </>
    );
  } else if (aiMode === 'result') {
    footerEl = (
      <>
        <button className="btn btn-ghost" onClick={() => setAiMode('input')}>
          다시 편집
        </button>
        <div style={{ flex: 1 }} />
        <button className="btn btn-ghost" onClick={onClose}>닫기</button>
        <button className="btn btn-primary" onClick={handleCopy} disabled={!aiResult}>
          복사
        </button>
      </>
    );
  } else {
    footerEl = (
      <>
        <button className="btn btn-ghost" onClick={() => setShowManual(prev => !prev)}>
          {showManual ? '수동 입력 닫기' : '업무 수동추가'}
          {manualCount > 0 && ` (${manualCount})`}
        </button>
        <button className="btn btn-ghost" onClick={handleEnterAiMode} disabled={!finalReport}>
          AI로 양식 추출
        </button>
        <div style={{ flex: 1 }} />
        <button className="btn btn-ghost" onClick={onClose}>닫기</button>
        <button className="btn btn-primary" onClick={handleCopy} disabled={!finalReport}>
          복사
        </button>
      </>
    );
  }

  return (
    <Modal
      title="일일 업무보고"
      wide
      onClose={onClose}
      headerRight={datePickerEl}
      footer={footerEl}
    >
      <div className={styles.reportContent}>
        {aiMode === 'input' && (
          <div className={styles.aiInputWrap}>
            <p className={styles.aiHint}>
              아래 업무 내용을 자유롭게 수정한 뒤 <strong>AI 양식 생성</strong>을 누르면
              회사 표준 양식으로 변환됩니다. (진척률 등 없는 정보는 AI가 지어내지 않습니다)
            </p>
            <textarea
              className={styles.aiTextarea}
              value={aiInput}
              onChange={e => setAiInput(e.target.value)}
              placeholder="오늘 한 업무를 자유 형식으로 입력하세요."
              disabled={aiLoading}
            />
          </div>
        )}

        {aiMode === 'result' && (
          <>
            <div className={styles.reportMeta}>
              <span className={styles.metaBadgeAi}>AI 표준 양식</span>
            </div>
            <div className={styles.reportTextWrap}>
              <button
                className={copied ? styles.copiedBtn : styles.copyBtn}
                onClick={handleCopy}
              >
                {copied ? '복사됨' : '복사'}
              </button>
              <div className={styles.reportText}>
                {aiResult}
              </div>
            </div>
          </>
        )}

        {aiMode === 'off' && (
          <>
            {loading && (
              <div className={styles.loading}>보고서 생성 중...</div>
            )}

            {!loading && data && (
              <>
                <div className={styles.reportMeta}>
                  <span className={styles.metaBadgeDone}>완료 {data.completedCount}건</span>
                  <span className={styles.metaBadgeWip}>진행 {data.createdCount}건</span>
                  <span className={styles.metaBadgeComment}>댓글 {data.commentCount}건</span>
                  {manualCount > 0 && (
                    <span className={styles.metaBadgeManual}>수동 {manualCount}건</span>
                  )}
                </div>

                {showManual && (
                  <ManualEntry onAdd={handleAddManual} projects={projects} />
                )}

                <div className={styles.reportTextWrap}>
                  <button
                    className={copied ? styles.copiedBtn : styles.copyBtn}
                    onClick={handleCopy}
                  >
                    {copied ? '복사됨' : '복사'}
                  </button>
                  <div className={styles.reportText}>
                    {finalReport}
                  </div>
                </div>
              </>
            )}

            {!loading && data && data.completedCount === 0
              && data.createdCount === 0 && data.commentCount === 0 && manualCount === 0 && (
              <div className={styles.emptyState}>
                해당 날짜에 활동 내역이 없습니다.
              </div>
            )}
          </>
        )}
      </div>
    </Modal>
  );
}
