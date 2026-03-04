import { useState } from 'react';
import { useProjects } from '../../contexts/ProjectContext';
import Modal from '../common/Modal';

export default function ProjectForm({ isEdit, project, defaultParentId, saving, onSave, onClose }) {
  const { projects } = useProjects();
  const [name, setName] = useState(project?.name || '');
  const [projectKey, setProjectKey] = useState(project?.projectKey || '');
  const [description, setDescription] = useState(project?.description || '');
  const [parentId, setParentId] = useState(project?.parentId ? String(project.parentId) : (defaultParentId ? String(defaultParentId) : ''));
  const [errors, setErrors] = useState({});

  // Filter out self and descendants for parent selection
  const getDescendantIds = (id, allProjects) => {
    const ids = new Set([id]);
    const findChildren = (parentId) => {
      allProjects.forEach(p => {
        if (p.parentId && String(p.parentId) === String(parentId) && !ids.has(p.id)) {
          ids.add(p.id);
          findChildren(p.id);
        }
      });
    };
    findChildren(id);
    return ids;
  };

  const excludedIds = isEdit && project ? getDescendantIds(project.id, projects) : new Set();
  const parentOptions = projects.filter(p => !excludedIds.has(p.id));

  const validate = () => {
    const newErrors = {};
    if (!name.trim()) newErrors.name = true;
    if (!isEdit && !projectKey.trim()) newErrors.projectKey = true;
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;
    onSave({
      name: name.trim(),
      projectKey: projectKey.trim(),
      description: description.trim(),
      parentId: parentId || null,
    });
  };

  const footer = (
    <>
      <button className="btn btn-ghost" onClick={onClose}>취소</button>
      <button className="btn btn-primary" onClick={handleSubmit} disabled={saving}>저장</button>
    </>
  );

  return (
    <Modal title={isEdit ? '프로젝트 편집' : '새 프로젝트'} onClose={onClose} footer={footer}>
      <div className="form-group">
        <label className="form-label" htmlFor="project-form-name">
          프로젝트명 <span className="required">*</span>
        </label>
        <input
          className={`form-input ${errors.name ? 'is-invalid' : ''}`}
          type="text"
          id="project-form-name"
          placeholder="프로젝트명을 입력하세요"
          autoComplete="off"
          value={name}
          onChange={e => setName(e.target.value)}
          autoFocus
        />
        {errors.name && <span className="form-error">프로젝트명을 입력해주세요.</span>}
      </div>
      <div className="form-group">
        <label className="form-label" htmlFor="project-form-key">
          프로젝트 키 <span className="required">*</span>
        </label>
        <input
          className={`form-input ${errors.projectKey ? 'is-invalid' : ''}`}
          type="text"
          id="project-form-key"
          placeholder="대문자 영문 (예: PROJ)"
          autoComplete="off"
          value={projectKey}
          onChange={e => setProjectKey(e.target.value)}
          disabled={isEdit}
          style={{ textTransform: 'uppercase' }}
        />
        {errors.projectKey && <span className="form-error">프로젝트 키를 입력해주세요.</span>}
      </div>
      <div className="form-group">
        <label className="form-label" htmlFor="project-form-parent">상위 프로젝트</label>
        <select
          className="form-input form-select"
          id="project-form-parent"
          value={parentId}
          onChange={e => setParentId(e.target.value)}
        >
          <option value="">없음 (최상위)</option>
          {parentOptions.map(p => (
            <option key={p.id} value={p.id}>{p.name || p.projectKey}</option>
          ))}
        </select>
      </div>
      <div className="form-group">
        <label className="form-label" htmlFor="project-form-desc">설명</label>
        <textarea
          className="form-input form-textarea"
          id="project-form-desc"
          placeholder="프로젝트 설명을 입력하세요..."
          rows="3"
          value={description}
          onChange={e => setDescription(e.target.value)}
        />
      </div>
    </Modal>
  );
}
