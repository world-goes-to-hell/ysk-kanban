package com.example.todo.service;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.example.todo.entity.Project;
import com.example.todo.entity.ProjectMember;
import com.example.todo.entity.ProjectRole;
import com.example.todo.entity.User;
import com.example.todo.repository.ProjectMemberRepository;
import com.example.todo.repository.ProjectRepository;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional
public class ProjectService {

    private final ProjectRepository projectRepository;
    private final ProjectMemberRepository memberRepository;

    @Transactional(readOnly = true)
    public List<Project> getAllProjects() {
        return projectRepository.findAll();
    }

    @Transactional(readOnly = true)
    public List<Project> getProjectsByUser(Long userId) {
        List<Long> projectIds = memberRepository.findByUserId(userId).stream()
                .map(m -> m.getProject().getId())
                .collect(Collectors.toList());
        if (projectIds.isEmpty()) return new ArrayList<>();
        return projectRepository.findAllById(projectIds);
    }

    @Transactional(readOnly = true)
    public Project getProject(Long id) {
        return projectRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Project not found: " + id));
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> getProjectTree() {
        List<Project> allProjects = projectRepository.findAll();
        Map<Long, List<Project>> childrenMap = new HashMap<>();

        for (Project p : allProjects) {
            Long parentId = (p.getParent() != null) ? p.getParent().getId() : null;
            childrenMap.computeIfAbsent(parentId, k -> new ArrayList<>()).add(p);
        }

        List<Project> roots = childrenMap.getOrDefault(null, new ArrayList<>());
        return roots.stream()
                .map(root -> buildTreeNode(root, childrenMap))
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> getProjectTreeByUser(Long userId) {
        List<Project> userProjects = getProjectsByUser(userId);
        java.util.Set<Long> userProjectIds = userProjects.stream()
                .map(Project::getId)
                .collect(java.util.stream.Collectors.toSet());

        Map<Long, List<Project>> childrenMap = new HashMap<>();
        for (Project p : userProjects) {
            Long parentId = (p.getParent() != null && userProjectIds.contains(p.getParent().getId()))
                    ? p.getParent().getId() : null;
            childrenMap.computeIfAbsent(parentId, k -> new ArrayList<>()).add(p);
        }

        List<Project> roots = childrenMap.getOrDefault(null, new ArrayList<>());
        return roots.stream()
                .map(root -> buildTreeNode(root, childrenMap))
                .collect(Collectors.toList());
    }

    private Map<String, Object> buildTreeNode(Project project, Map<Long, List<Project>> childrenMap) {
        Map<String, Object> node = new HashMap<>();
        node.put("id", project.getId());
        node.put("name", project.getName());
        node.put("description", project.getDescription());
        node.put("projectKey", project.getProjectKey());
        node.put("createdBy", project.getCreatedBy());
        node.put("createdAt", project.getCreatedAt());
        node.put("parentId", project.getParent() != null ? project.getParent().getId() : null);

        List<Project> children = childrenMap.getOrDefault(project.getId(), new ArrayList<>());
        node.put("children", children.stream()
                .map(child -> buildTreeNode(child, childrenMap))
                .collect(Collectors.toList()));

        return node;
    }

    public Project createProject(String name, String description, String projectKey, User createdBy) {
        return createProject(name, description, projectKey, createdBy, null);
    }

    public Project createProject(String name, String description, String projectKey, User createdBy, Long parentId) {
        if (projectRepository.existsByProjectKey(projectKey)) {
            throw new IllegalArgumentException("Project key already exists: " + projectKey);
        }

        Project project = Project.builder()
                .name(name)
                .description(description)
                .projectKey(projectKey.toUpperCase())
                .createdBy(createdBy)
                .build();

        if (parentId != null) {
            Project parent = projectRepository.findById(parentId)
                    .orElseThrow(() -> new IllegalArgumentException("Parent project not found: " + parentId));
            project.setParent(parent);
        }

        log.info("Creating project: {} ({})", name, projectKey);
        Project saved = projectRepository.save(project);

        ProjectMember master = ProjectMember.builder()
                .project(saved)
                .user(createdBy)
                .role(ProjectRole.MASTER)
                .build();
        memberRepository.save(master);

        return saved;
    }

    public void validateMaster(Long projectId, Long userId) {
        ProjectMember member = memberRepository.findByProjectIdAndUserId(projectId, userId)
                .orElseThrow(() -> new SecurityException("프로젝트 접근 권한이 없습니다."));
        if (member.getRole() != ProjectRole.MASTER) {
            throw new SecurityException("MASTER 권한이 필요합니다.");
        }
    }

    public Project updateProject(Long id, String name, String description) {
        return updateProject(id, name, description, null);
    }

    public Project updateProject(Long id, String name, String description, Long parentId) {
        Project project = projectRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Project not found: " + id));
        project.setName(name);
        project.setDescription(description);

        if (parentId != null) {
            if (parentId.equals(id)) {
                throw new IllegalArgumentException("Project cannot be its own parent");
            }
            // Check circular reference
            if (isDescendant(id, parentId)) {
                throw new IllegalArgumentException("Circular parent reference detected");
            }
            Project parent = projectRepository.findById(parentId)
                    .orElseThrow(() -> new IllegalArgumentException("Parent project not found: " + parentId));
            project.setParent(parent);
        } else {
            project.setParent(null);
        }

        log.info("Updating project #{}: {}", id, name);
        return projectRepository.save(project);
    }

    private boolean isDescendant(Long ancestorId, Long targetId) {
        List<Project> children = projectRepository.findByParentId(ancestorId);
        for (Project child : children) {
            if (child.getId().equals(targetId)) return true;
            if (isDescendant(child.getId(), targetId)) return true;
        }
        return false;
    }

    public void deleteProject(Long id) {
        log.info("Deleting project #{}", id);
        projectRepository.deleteById(id);
    }
}
