package com.example.todo.service;

import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.example.todo.entity.Project;
import com.example.todo.entity.ProjectStatus;
import com.example.todo.entity.Todo;
import com.example.todo.repository.ProjectRepository;
import com.example.todo.repository.ProjectStatusRepository;
import com.example.todo.repository.TodoRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
@Transactional
public class ProjectStatusService {

    private record DefaultStatus(String key, String name, Todo.Status semanticStatus, int position, String color) {}

    private static final List<DefaultStatus> DEFAULT_STATUSES = List.of(
            new DefaultStatus(Todo.Status.TODO.name(), "할 일", Todo.Status.TODO, 0, "#2563EB"),
            new DefaultStatus(Todo.Status.IN_PROGRESS.name(), "진행 중", Todo.Status.IN_PROGRESS, 1, "#D97706"),
            new DefaultStatus(Todo.Status.DONE.name(), "완료", Todo.Status.DONE, 2, "#059669")
    );

    private final ProjectStatusRepository projectStatusRepository;
    private final ProjectRepository projectRepository;
    private final TodoRepository todoRepository;

    public List<ProjectStatus> listStatuses(Long projectId) {
        ensureDefaults(projectId);
        List<ProjectStatus> statuses = projectStatusRepository.findByProject_IdAndActiveTrueOrderByPositionAscIdAsc(projectId);
        boolean changed = false;
        for (ProjectStatus status : statuses) {
            if (status.getColor() == null || status.getColor().isBlank()) {
                status.setColor(defaultColor(status.getSemanticStatus()));
                changed = true;
            }
        }
        if (changed) {
            projectStatusRepository.saveAll(statuses);
        }
        return statuses;
    }

    public ProjectStatus createStatus(Long projectId, String name, Todo.Status semanticStatus, String color) {
        ensureDefaults(projectId);
        String cleanName = requireName(name);
        Todo.Status effectiveSemanticStatus = semanticStatus != null ? semanticStatus : Todo.Status.IN_PROGRESS;
        Project project = getProject(projectId);
        String statusKey = generateStatusKey(projectId);
        Integer maxPosition = projectStatusRepository.findMaxPosition(projectId);

        ProjectStatus status = ProjectStatus.builder()
                .project(project)
                .statusKey(statusKey)
                .name(cleanName)
                .color(resolveColor(color, effectiveSemanticStatus))
                .semanticStatus(effectiveSemanticStatus)
                .position(maxPosition + 1)
                .systemStatus(false)
                .active(true)
                .build();

        return projectStatusRepository.save(status);
    }

    public ProjectStatus updateStatus(Long projectId, String statusKey, String name, String color) {
        ProjectStatus status = getActiveStatus(projectId, statusKey);
        if (name != null) {
            if (status.isSystemStatus()) {
                throw new IllegalArgumentException("기본 상태 이름은 변경할 수 없습니다.");
            }
            status.setName(requireName(name));
        }
        if (color != null) {
            status.setColor(requireColor(color));
        }
        return projectStatusRepository.save(status);
    }

    public void deleteStatus(Long projectId, String statusKey) {
        ProjectStatus status = getActiveStatus(projectId, statusKey);
        if (status.isSystemStatus()) {
            throw new IllegalArgumentException("기본 상태는 삭제할 수 없습니다.");
        }
        long todoCount = todoRepository.countByProjectIdAndStatusKey(projectId, status.getStatusKey());
        if (todoCount > 0) {
            throw new IllegalArgumentException("해당 상태에 일감이 있어 삭제할 수 없습니다.");
        }
        status.setActive(false);
        projectStatusRepository.save(status);
    }

    public List<ProjectStatus> reorderStatuses(Long projectId, List<String> orderedKeys) {
        List<ProjectStatus> statuses = listStatuses(projectId);
        Map<String, ProjectStatus> byKey = statuses.stream()
                .collect(Collectors.toMap(ProjectStatus::getStatusKey, status -> status));

        LinkedHashSet<String> normalizedKeys = orderedKeys == null
                ? new LinkedHashSet<>()
                : orderedKeys.stream()
                    .map(this::normalizeStatusKey)
                    .filter(key -> !key.isBlank())
                    .collect(Collectors.toCollection(LinkedHashSet::new));

        List<ProjectStatus> ordered = new ArrayList<>();
        for (String key : normalizedKeys) {
            ProjectStatus status = byKey.get(key);
            if (status != null) {
                ordered.add(status);
            }
        }
        for (ProjectStatus status : statuses) {
            if (!normalizedKeys.contains(status.getStatusKey())) {
                ordered.add(status);
            }
        }

        for (int i = 0; i < ordered.size(); i++) {
            ordered.get(i).setPosition(i);
        }
        projectStatusRepository.saveAll(ordered);
        return projectStatusRepository.findByProject_IdAndActiveTrueOrderByPositionAscIdAsc(projectId);
    }

    public ProjectStatus resolveStatus(Long projectId, String statusKey) {
        String normalizedKey = normalizeStatusKey(statusKey);
        if (normalizedKey.isBlank()) {
            normalizedKey = Todo.Status.TODO.name();
        }
        if (projectId == null) {
            return defaultStatusView(normalizedKey);
        }
        ensureDefaults(projectId);
        String finalStatusKey = normalizedKey;
        return projectStatusRepository.findByProject_IdAndStatusKeyAndActiveTrue(projectId, finalStatusKey)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 상태입니다: " + finalStatusKey));
    }

    public boolean existsActiveStatus(Long projectId, String statusKey) {
        if (projectId == null) {
            return isLegacyStatus(statusKey);
        }
        ensureDefaults(projectId);
        return projectStatusRepository.findByProject_IdAndStatusKeyAndActiveTrue(projectId, normalizeStatusKey(statusKey)).isPresent();
    }

    private void ensureDefaults(Long projectId) {
        Project project = getProject(projectId);
        for (DefaultStatus defaultStatus : DEFAULT_STATUSES) {
            ProjectStatus status = projectStatusRepository
                    .findByProject_IdAndStatusKey(projectId, defaultStatus.key())
                    .orElseGet(() -> ProjectStatus.builder()
                            .project(project)
                            .statusKey(defaultStatus.key())
                            .position(defaultStatus.position())
                            .build());

            status.setProject(project);
            status.setName(defaultStatus.name());
            status.setSemanticStatus(defaultStatus.semanticStatus());
            status.setSystemStatus(true);
            status.setActive(true);
            if (status.getColor() == null || status.getColor().isBlank()) {
                status.setColor(defaultStatus.color());
            }
            if (status.getPosition() == null) {
                status.setPosition(defaultStatus.position());
            }
            projectStatusRepository.save(status);
        }
    }

    private ProjectStatus getActiveStatus(Long projectId, String statusKey) {
        ensureDefaults(projectId);
        String normalizedKey = normalizeStatusKey(statusKey);
        return projectStatusRepository.findByProject_IdAndStatusKeyAndActiveTrue(projectId, normalizedKey)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 상태입니다: " + normalizedKey));
    }

    private Project getProject(Long projectId) {
        if (projectId == null) {
            throw new IllegalArgumentException("프로젝트가 필요합니다.");
        }
        return projectRepository.findById(projectId)
                .orElseThrow(() -> new IllegalArgumentException("Project not found: " + projectId));
    }

    private String generateStatusKey(Long projectId) {
        String key;
        do {
            key = "CUSTOM_" + UUID.randomUUID().toString().substring(0, 8).toUpperCase(Locale.ROOT);
        } while (projectStatusRepository.existsByProject_IdAndStatusKey(projectId, key));
        return key;
    }

    private String requireName(String name) {
        String clean = name == null ? "" : name.trim();
        if (clean.isBlank()) {
            throw new IllegalArgumentException("상태 이름을 입력하세요.");
        }
        if (clean.length() > 80) {
            throw new IllegalArgumentException("상태 이름은 80자 이하여야 합니다.");
        }
        return clean;
    }

    private String resolveColor(String color, Todo.Status semanticStatus) {
        if (color != null && !color.isBlank()) {
            return requireColor(color);
        }
        return defaultColor(semanticStatus);
    }

    private String requireColor(String color) {
        String clean = color == null ? "" : color.trim().toUpperCase(Locale.ROOT);
        if (!clean.matches("^#[0-9A-F]{6}$")) {
            throw new IllegalArgumentException("색상은 #RRGGBB 형식이어야 합니다.");
        }
        return clean;
    }

    private String defaultColor(Todo.Status semanticStatus) {
        Todo.Status status = semanticStatus != null ? semanticStatus : Todo.Status.IN_PROGRESS;
        return switch (status) {
            case TODO -> "#2563EB";
            case IN_PROGRESS -> "#D97706";
            case DONE -> "#059669";
        };
    }

    private String normalizeStatusKey(String statusKey) {
        return statusKey == null ? "" : statusKey.trim().toUpperCase(Locale.ROOT);
    }

    private boolean isLegacyStatus(String statusKey) {
        try {
            Todo.Status.valueOf(normalizeStatusKey(statusKey));
            return true;
        } catch (Exception e) {
            return false;
        }
    }

    private ProjectStatus defaultStatusView(String statusKey) {
        for (DefaultStatus defaultStatus : DEFAULT_STATUSES) {
            if (defaultStatus.key().equals(statusKey)) {
                return ProjectStatus.builder()
                        .statusKey(defaultStatus.key())
                        .name(defaultStatus.name())
                        .color(defaultStatus.color())
                        .semanticStatus(defaultStatus.semanticStatus())
                        .position(defaultStatus.position())
                        .systemStatus(true)
                        .active(true)
                        .build();
            }
        }
        return ProjectStatus.builder()
                .statusKey(statusKey)
                .name(statusKey)
                .color(defaultColor(Todo.Status.IN_PROGRESS))
                .semanticStatus(Todo.Status.IN_PROGRESS)
                .position(1)
                .systemStatus(false)
                .active(true)
                .build();
    }
}
