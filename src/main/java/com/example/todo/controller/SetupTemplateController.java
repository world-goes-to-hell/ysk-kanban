package com.example.todo.controller;

import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Map;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import lombok.extern.slf4j.Slf4j;

@Slf4j
@RestController
@RequestMapping("/api/setup")
public class SetupTemplateController {

    private static final Path SKILL_PATH = Paths.get(".claude/skills/track/SKILL.md");

    @GetMapping("/track-skill")
    public ResponseEntity<Map<String, String>> getTrackSkill() {
        try {
            String content = Files.readString(SKILL_PATH);
            return ResponseEntity.ok(Map.of("content", content));
        } catch (Exception e) {
            log.warn("SKILL.md 읽기 실패: {}", e.getMessage());
            return ResponseEntity.status(404).body(Map.of("error", "track skill template not available"));
        }
    }
}
