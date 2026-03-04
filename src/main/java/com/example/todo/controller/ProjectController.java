package com.example.todo.controller;

import java.util.List;
import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.example.todo.entity.Project;
import com.example.todo.entity.User;
import com.example.todo.service.ProjectService;
import com.example.todo.service.UserService;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/projects")
@RequiredArgsConstructor
public class ProjectController {

    private final ProjectService projectService;
    private final UserService userService;

    @GetMapping
    public ResponseEntity<List<Project>> getAllProjects() {
        User currentUser = getCurrentUser();
        return ResponseEntity.ok(projectService.getProjectsByUser(currentUser.getId()));
    }

    @GetMapping("/tree")
    public ResponseEntity<List<Map<String, Object>>> getProjectTree() {
        User currentUser = getCurrentUser();
        return ResponseEntity.ok(projectService.getProjectTreeByUser(currentUser.getId()));
    }

    @PostMapping
    public ResponseEntity<Project> createProject(@RequestBody Map<String, String> body) {
        String name = body.get("name");
        String description = body.getOrDefault("description", "");
        String projectKey = body.get("projectKey");
        String parentIdStr = body.get("parentId");
        Long parentId = (parentIdStr != null && !parentIdStr.isEmpty()) ? Long.parseLong(parentIdStr) : null;

        User currentUser = getCurrentUser();
        Project created = projectService.createProject(name, description, projectKey, currentUser, parentId);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> updateProject(
            @PathVariable Long id,
            @RequestBody Map<String, String> body) {
        User currentUser = getCurrentUser();
        try {
            projectService.validateMaster(id, currentUser.getId());
        } catch (SecurityException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", e.getMessage()));
        }
        String name = body.get("name");
        String description = body.getOrDefault("description", "");
        String parentIdStr = body.get("parentId");
        Long parentId = (parentIdStr != null && !parentIdStr.isEmpty()) ? Long.parseLong(parentIdStr) : null;
        Project updated = projectService.updateProject(id, name, description, parentId);
        return ResponseEntity.ok(updated);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteProject(@PathVariable Long id) {
        User currentUser = getCurrentUser();
        try {
            projectService.validateMaster(id, currentUser.getId());
        } catch (SecurityException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", e.getMessage()));
        }
        projectService.deleteProject(id);
        return ResponseEntity.noContent().build();
    }

    private User getCurrentUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        return userService.findByUsername(authentication.getName());
    }
}
