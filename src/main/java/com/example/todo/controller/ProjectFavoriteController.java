package com.example.todo.controller;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.example.todo.entity.Project;
import com.example.todo.entity.ProjectFavorite;
import com.example.todo.entity.User;
import com.example.todo.repository.ProjectFavoriteRepository;
import com.example.todo.repository.ProjectRepository;
import com.example.todo.service.UserService;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/projects")
@RequiredArgsConstructor
public class ProjectFavoriteController {

    private final ProjectFavoriteRepository favoriteRepository;
    private final ProjectRepository projectRepository;
    private final UserService userService;

    @PostMapping("/{id}/favorite")
    @Transactional
    public ResponseEntity<Map<String, Boolean>> toggleFavorite(@PathVariable Long id) {
        User user = getCurrentUser();
        boolean exists = favoriteRepository.existsByUserIdAndProjectId(user.getId(), id);

        if (exists) {
            favoriteRepository.deleteByUserIdAndProjectId(user.getId(), id);
            return ResponseEntity.ok(Map.of("favorited", false));
        } else {
            Project project = projectRepository.findById(id)
                    .orElseThrow(() -> new IllegalArgumentException("Project not found: " + id));
            ProjectFavorite fav = ProjectFavorite.builder()
                    .user(user)
                    .project(project)
                    .build();
            favoriteRepository.save(fav);
            return ResponseEntity.ok(Map.of("favorited", true));
        }
    }

    @GetMapping("/favorites")
    @Transactional(readOnly = true)
    public ResponseEntity<List<Long>> getFavorites() {
        User user = getCurrentUser();
        List<Long> ids = favoriteRepository.findByUserId(user.getId())
                .stream()
                .map(f -> f.getProject().getId())
                .collect(Collectors.toList());
        return ResponseEntity.ok(ids);
    }

    private User getCurrentUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        return userService.findByUsername(authentication.getName());
    }
}
