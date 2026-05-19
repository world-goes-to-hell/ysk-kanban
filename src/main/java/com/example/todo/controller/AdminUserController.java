package com.example.todo.controller;

import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.example.todo.entity.User;
import com.example.todo.service.UserService;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/admin/users")
@RequiredArgsConstructor
public class AdminUserController {

    private static final String ADMIN_USERNAME = "admin";

    private final UserService userService;

    @GetMapping
    public ResponseEntity<List<Map<String, Object>>> getUsers(Authentication authentication) {
        requireAdmin(authentication);
        List<Map<String, Object>> users = userService.findAll().stream()
                .sorted(Comparator.comparing(User::getId))
                .map(this::toUserView)
                .toList();
        return ResponseEntity.ok(users);
    }

    @PostMapping
    public ResponseEntity<Map<String, Object>> createUser(
            Authentication authentication,
            @RequestBody Map<String, String> body
    ) {
        requireAdmin(authentication);
        String username = clean(body.get("username"));
        String password = body.get("password");
        String displayName = clean(body.get("displayName"));

        if (username == null || password == null || displayName == null) {
            throw new IllegalArgumentException("아이디, 비밀번호, 표시이름을 모두 입력해주세요.");
        }
        validatePassword(password);

        User user = userService.register(username, password, displayName);
        return ResponseEntity.status(HttpStatus.CREATED).body(toUserView(user));
    }

    @PatchMapping("/{userId}")
    public ResponseEntity<Map<String, Object>> updateUser(
            Authentication authentication,
            @PathVariable Long userId,
            @RequestBody Map<String, String> body
    ) {
        requireAdmin(authentication);
        String displayName = clean(body.get("displayName"));
        if (displayName == null) {
            throw new IllegalArgumentException("표시이름을 입력해주세요.");
        }

        User user = userService.updateDisplayName(userId, displayName);
        return ResponseEntity.ok(toUserView(user));
    }

    @PatchMapping("/{userId}/password")
    public ResponseEntity<Map<String, String>> resetPassword(
            Authentication authentication,
            @PathVariable Long userId,
            @RequestBody Map<String, String> body
    ) {
        requireAdmin(authentication);
        String newPassword = body.get("newPassword");
        validatePassword(newPassword);
        userService.resetPassword(userId, newPassword);
        return ResponseEntity.ok(Map.of("message", "비밀번호가 재설정되었습니다."));
    }

    private void requireAdmin(Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()
                || "anonymousUser".equals(authentication.getPrincipal())
                || !ADMIN_USERNAME.equals(authentication.getName())) {
            throw new SecurityException("관리자만 사용할 수 있습니다.");
        }
    }

    private void validatePassword(String password) {
        if (password == null || password.length() < 4) {
            throw new IllegalArgumentException("비밀번호는 4자 이상이어야 합니다.");
        }
    }

    private String clean(String value) {
        if (value == null) return null;
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private Map<String, Object> toUserView(User user) {
        Map<String, Object> view = new LinkedHashMap<>();
        view.put("id", user.getId());
        view.put("username", user.getUsername());
        view.put("displayName", user.getDisplayName());
        view.put("bot", Boolean.TRUE.equals(user.getBot()));
        view.put("createdAt", user.getCreatedAt());
        return view;
    }
}
