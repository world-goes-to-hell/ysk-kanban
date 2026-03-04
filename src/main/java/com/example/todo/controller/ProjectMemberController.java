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

import org.springframework.transaction.annotation.Transactional;

import com.example.todo.entity.ProjectMember;
import com.example.todo.entity.ProjectRole;
import com.example.todo.entity.User;
import com.example.todo.repository.ProjectMemberRepository;
import com.example.todo.repository.ProjectRepository;
import com.example.todo.repository.UserRepository;
import com.example.todo.service.UserService;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/projects/{projectId}/members")
@RequiredArgsConstructor
public class ProjectMemberController {

    private final ProjectMemberRepository memberRepository;
    private final ProjectRepository projectRepository;
    private final UserRepository userRepository;
    private final UserService userService;

    @GetMapping
    public ResponseEntity<List<ProjectMember>> getMembers(@PathVariable Long projectId) {
        return ResponseEntity.ok(memberRepository.findByProjectId(projectId));
    }

    @PostMapping
    public ResponseEntity<?> addMember(@PathVariable Long projectId, @RequestBody Map<String, Object> body) {
        User currentUser = getCurrentUser();
        if (!isMaster(projectId, currentUser.getId())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "MASTER 권한이 필요합니다."));
        }

        Long userId = ((Number) body.get("userId")).longValue();
        String roleStr = (String) body.getOrDefault("role", "MEMBER");
        ProjectRole role = ProjectRole.valueOf(roleStr);

        if (memberRepository.existsByProjectIdAndUserId(projectId, userId)) {
            return ResponseEntity.badRequest().body(Map.of("error", "이미 참여 중인 사용자입니다."));
        }

        ProjectMember member = ProjectMember.builder()
                .project(projectRepository.findById(projectId).orElseThrow())
                .user(userRepository.findById(userId).orElseThrow())
                .role(role)
                .build();

        return ResponseEntity.status(HttpStatus.CREATED).body(memberRepository.save(member));
    }

    @PutMapping("/{userId}")
    public ResponseEntity<?> updateRole(
            @PathVariable Long projectId,
            @PathVariable Long userId,
            @RequestBody Map<String, String> body) {
        User currentUser = getCurrentUser();
        if (!isMaster(projectId, currentUser.getId())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "MASTER 권한이 필요합니다."));
        }

        ProjectMember member = memberRepository.findByProjectIdAndUserId(projectId, userId)
                .orElseThrow(() -> new IllegalArgumentException("멤버를 찾을 수 없습니다."));

        ProjectRole newRole = ProjectRole.valueOf(body.get("role"));
        member.setRole(newRole);
        return ResponseEntity.ok(memberRepository.save(member));
    }

    @Transactional
    @DeleteMapping("/{userId}")
    public ResponseEntity<?> removeMember(@PathVariable Long projectId, @PathVariable Long userId) {
        User currentUser = getCurrentUser();
        if (!isMaster(projectId, currentUser.getId())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "MASTER 권한이 필요합니다."));
        }

        if (currentUser.getId().equals(userId)) {
            return ResponseEntity.badRequest().body(Map.of("error", "자기 자신을 제거할 수 없습니다."));
        }

        memberRepository.deleteByProjectIdAndUserId(projectId, userId);
        return ResponseEntity.noContent().build();
    }

    private boolean isMaster(Long projectId, Long userId) {
        return memberRepository.findByProjectIdAndUserId(projectId, userId)
                .map(m -> m.getRole() == ProjectRole.MASTER)
                .orElse(false);
    }

    private User getCurrentUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return userService.findByUsername(auth.getName());
    }
}
