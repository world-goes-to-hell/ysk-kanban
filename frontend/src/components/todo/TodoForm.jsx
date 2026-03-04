import { useState } from 'react';
import { useProjects } from '../../contexts/ProjectContext';
import FileDropZone from './FileDropZone';
import FilePreviewList from './FilePreviewList';
import ExistingAttachmentList from './ExistingAttachmentList';

export default function TodoForm({ item, projectId, isEdit, pendingFiles, setPendingFiles, deleteQueue, setDeleteQueue, formRef }) {
  const { projects } = useProjects();
  const [summary, setSummary] = useState(item?.summary || '');
  const [description, setDescription] = useState(item?.description || '');
  const [priority, setPriority] = useState(item?.priority || 'MEDIUM');
  const [selectedProject, setSelectedProject] = useState(
    item?.projectId ? String(item.projectId) : (projectId || '')
  );
  const [dueDate, setDueDate] = useState(item?.dueDate || '');
  const [errors, setErrors] = useState({});

  // Expose form data to parent via ref
  if (formRef) {
    formRef.current = {
      validate: () => {
        const newErrors = {};
        if (!summary.trim()) newErrors.summary = true;
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
      },
      getData: () => ({
        summary: summary.trim(),
        description: description.trim(),
        priority,
        projectId: selectedProject || undefined,
        dueDate: dueDate || undefined,
      }),
    };
  }

  const handleAddFiles = (files) => {
    setPendingFiles(prev => [...prev, ...files]);
  };

  const handleRemoveFile = (idx) => {
    setPendingFiles(prev => prev.filter((_, i) => i !== idx));
  };

  return (
    <form noValidate onSubmit={e => e.preventDefault()}>
      <div className="form-group">
        <label className="form-label" htmlFor="todo-form-summary">
          제목 <span className="required">*</span>
        </label>
        <input
          className={`form-input ${errors.summary ? 'is-invalid' : ''}`}
          type="text"
          id="todo-form-summary"
          placeholder="일감 제목을 입력하세요"
          autoComplete="off"
          value={summary}
          onChange={e => setSummary(e.target.value)}
          autoFocus
        />
        {errors.summary && <span className="form-error">제목을 입력해주세요.</span>}
      </div>
      <div className="form-group">
        <label className="form-label" htmlFor="todo-form-description">설명</label>
        <textarea
          className="form-input form-textarea"
          id="todo-form-description"
          placeholder="설명을 입력하세요..."
          rows="3"
          value={description}
          onChange={e => setDescription(e.target.value)}
        />
      </div>
      <div className="form-row">
        <div className="form-group form-group--half">
          <label className="form-label" htmlFor="todo-form-priority">우선순위</label>
          <select
            className="form-input form-select"
            id="todo-form-priority"
            value={priority}
            onChange={e => setPriority(e.target.value)}
          >
            <option value="MEDIUM">보통</option>
            <option value="HIGHEST">최상</option>
            <option value="HIGH">높음</option>
            <option value="LOW">낮음</option>
            <option value="LOWEST">최하</option>
          </select>
        </div>
        <div className="form-group form-group--half">
          <label className="form-label" htmlFor="todo-form-project">프로젝트</label>
          <select
            className="form-input form-select"
            id="todo-form-project"
            value={selectedProject}
            onChange={e => setSelectedProject(e.target.value)}
          >
            <option value="">선택 안 함</option>
            {projects.map(p => (
              <option key={p.id} value={p.id}>{p.name || p.projectKey || ''}</option>
            ))}
          </select>
        </div>
        <div className="form-group form-group--half">
          <label className="form-label" htmlFor="todo-form-duedate">마감기한</label>
          <input
            className="form-input"
            type="date"
            id="todo-form-duedate"
            value={dueDate}
            onChange={e => setDueDate(e.target.value)}
          />
        </div>
      </div>
      <div className="form-group">
        <label className="form-label">파일 첨부</label>
        {isEdit && item?.id && (
          <ExistingAttachmentList
            todoId={item.id}
            deleteQueue={deleteQueue || []}
            setDeleteQueue={setDeleteQueue || (() => {})}
          />
        )}
        <FileDropZone onFiles={handleAddFiles} />
        <FilePreviewList files={pendingFiles} onRemove={handleRemoveFile} />
      </div>
    </form>
  );
}
