package com.example.todo.controller;

import java.util.List;
import java.util.Map;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.example.todo.config.ApiKeyAuthFilter;
import com.example.todo.entity.ProjectStatus;
import com.example.todo.entity.Todo;
import com.example.todo.entity.User;
import com.example.todo.repository.ProjectMemberRepository;
import com.example.todo.service.ProjectService;
import com.example.todo.service.ProjectStatusService;
import com.example.todo.service.UserService;

import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;

@RestController
@RequiredArgsConstructor
public class ProjectStatusController {

    private final ProjectStatusService projectStatusService;
    private final ProjectService projectService;
    private final UserService userService;
    private final ProjectMemberRepository projectMemberRepository;

    @GetMapping("/api/projects/{projectId}/statuses")
    public ResponseEntity<List<ProjectStatus>> list(@PathVariable Long projectId) {
        validateAccess(projectId);
        return ResponseEntity.ok(projectStatusService.listStatuses(projectId));
    }

    @GetMapping("/api/statuses")
    public ResponseEntity<?> listForApi(
            @RequestParam(required = false) Long projectId,
            HttpServletRequest request) {
        Long effectiveProjectId = resolveProjectId(projectId, request);
        if (effectiveProjectId == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "프로젝트가 필요합니다."));
        }
        validateAccess(effectiveProjectId);
        return ResponseEntity.ok(projectStatusService.listStatuses(effectiveProjectId));
    }

    @PostMapping("/api/projects/{projectId}/statuses")
    public ResponseEntity<ProjectStatus> create(
            @PathVariable Long projectId,
            @RequestBody Map<String, String> body) {
        validateMaster(projectId);
        Todo.Status semanticStatus = parseSemanticStatus(body.get("semanticStatus"));
        ProjectStatus created = projectStatusService.createStatus(projectId, body.get("name"), semanticStatus, body.get("color"));
        return ResponseEntity.status(201).body(created);
    }

    @PutMapping("/api/projects/{projectId}/statuses/reorder")
    public ResponseEntity<List<ProjectStatus>> reorder(
            @PathVariable Long projectId,
            @RequestBody Map<String, Object> body) {
        validateMaster(projectId);
        @SuppressWarnings("unchecked")
        List<String> orderedKeys = (List<String>) body.get("orderedKeys");
        return ResponseEntity.ok(projectStatusService.reorderStatuses(projectId, orderedKeys));
    }

    @PutMapping("/api/projects/{projectId}/statuses/{statusKey}")
    public ResponseEntity<ProjectStatus> update(
            @PathVariable Long projectId,
            @PathVariable String statusKey,
            @RequestBody Map<String, String> body) {
        validateMaster(projectId);
        return ResponseEntity.ok(projectStatusService.updateStatus(projectId, statusKey, body.get("name"), body.get("color")));
    }

    @DeleteMapping("/api/projects/{projectId}/statuses/{statusKey}")
    public ResponseEntity<Void> delete(
            @PathVariable Long projectId,
            @PathVariable String statusKey) {
        validateMaster(projectId);
        projectStatusService.deleteStatus(projectId, statusKey);
        return ResponseEntity.noContent().build();
    }

    private Todo.Status parseSemanticStatus(String raw) {
        if (raw == null || raw.isBlank()) {
            return Todo.Status.IN_PROGRESS;
        }
        return Todo.Status.valueOf(raw.trim());
    }

    private void validateAccess(Long projectId) {
        User currentUser = getCurrentUser();
        if ("admin".equals(currentUser.getUsername())) {
            return;
        }
        if (!projectMemberRepository.existsByProjectIdAndUserId(projectId, currentUser.getId())) {
            throw new SecurityException("프로젝트 접근 권한이 없습니다.");
        }
    }

    private void validateMaster(Long projectId) {
        User currentUser = getCurrentUser();
        projectService.validateMaster(projectId, currentUser.getId());
    }

    private User getCurrentUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        return userService.findByUsername(authentication.getName());
    }

    private Long resolveProjectId(Long projectId, HttpServletRequest request) {
        if (projectId != null) return projectId;
        Object apiKeyProjectId = request.getAttribute(ApiKeyAuthFilter.PROJECT_ID_ATTR);
        if (apiKeyProjectId instanceof Long) return (Long) apiKeyProjectId;
        return null;
    }
}
