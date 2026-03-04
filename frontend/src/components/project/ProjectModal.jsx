import { useState } from 'react';
import { useProjects } from '../../contexts/ProjectContext';
import ProjectForm from './ProjectForm';

export default function ProjectModal({ mode = 'create', project = null, parentId = null, onClose }) {
  const { createProject, updateProject } = useProjects();
  const [saving, setSaving] = useState(false);
  const isEdit = mode === 'edit' && project;

  const handleSave = async (formData) => {
    setSaving(true);
    try {
      if (isEdit) {
        await updateProject(project.id, {
          name: formData.name,
          description: formData.description,
          parentId: formData.parentId,
        });
      } else {
        await createProject({
          name: formData.name,
          projectKey: formData.projectKey.toUpperCase(),
          description: formData.description,
          parentId: formData.parentId,
        });
      }
      onClose();
    } catch (_) {
      // toast handled in context
    } finally {
      setSaving(false);
    }
  };

  return (
    <ProjectForm
      isEdit={isEdit}
      project={project}
      defaultParentId={parentId}
      saving={saving}
      onSave={handleSave}
      onClose={onClose}
    />
  );
}
