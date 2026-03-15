package com.example.todo.controller;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.example.todo.entity.User;
import com.example.todo.entity.UserReportSetting;
import com.example.todo.repository.UserRepository;
import com.example.todo.repository.UserReportSettingRepository;
import com.example.todo.service.DailyReportService;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/reports")
@RequiredArgsConstructor
public class DailyReportController {

    private final DailyReportService dailyReportService;
    private final UserRepository userRepository;
    private final UserReportSettingRepository userReportSettingRepository;

    @GetMapping("/daily")
    public ResponseEntity<Map<String, Object>> getDailyReport(
            @RequestParam(required = false) String date) {
        LocalDate targetDate = (date != null) ? LocalDate.parse(date) : LocalDate.now();
        User currentUser = getCurrentUser();
        Map<String, Object> report = dailyReportService.generateReport(targetDate, currentUser);
        return ResponseEntity.ok(report);
    }

    @GetMapping("/report-settings")
    public ResponseEntity<List<UserReportSetting>> getReportSettings() {
        User currentUser = getCurrentUser();
        List<UserReportSetting> settings = userReportSettingRepository.findByUserId(currentUser.getId());
        return ResponseEntity.ok(settings);
    }

    @PutMapping("/report-settings/{projectId}")
    public ResponseEntity<UserReportSetting> toggleReportSetting(
            @PathVariable Long projectId,
            @RequestBody Map<String, Boolean> body) {
        User currentUser = getCurrentUser();
        boolean excluded = body.getOrDefault("excluded", false);

        UserReportSetting setting = userReportSettingRepository
                .findByUserIdAndProjectId(currentUser.getId(), projectId)
                .orElse(UserReportSetting.builder()
                        .userId(currentUser.getId())
                        .projectId(projectId)
                        .build());
        setting.setExcluded(excluded);
        userReportSettingRepository.save(setting);
        return ResponseEntity.ok(setting);
    }

    private User getCurrentUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        String username = authentication.getName();
        return userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("사용자를 찾을 수 없습니다."));
    }
}
