package com.example.todo.config;

import java.util.Map;
import java.util.NoSuchElementException;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<Map<String, String>> handleIllegalArgument(IllegalArgumentException e) {
        return ResponseEntity.badRequest().body(Map.of("error", toUserMessage(e.getMessage())));
    }

    @ExceptionHandler(SecurityException.class)
    public ResponseEntity<Map<String, String>> handleSecurity(SecurityException e) {
        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", e.getMessage()));
    }

    @ExceptionHandler(NoSuchElementException.class)
    public ResponseEntity<Map<String, String>> handleNotFound(NoSuchElementException e) {
        String msg = (e.getMessage() != null && !e.getMessage().isEmpty())
                ? e.getMessage()
                : "요청한 리소스를 찾을 수 없습니다.";
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", msg));
    }

    @ExceptionHandler(NumberFormatException.class)
    public ResponseEntity<Map<String, String>> handleNumberFormat(NumberFormatException e) {
        return ResponseEntity.badRequest().body(Map.of("error", "잘못된 숫자 형식입니다."));
    }

    private String toUserMessage(String message) {
        if (message == null) return "잘못된 요청입니다.";
        if (message.startsWith("Project key already exists")) {
            return "이미 사용 중인 프로젝트 키입니다.";
        }
        if (message.startsWith("Parent project not found")) {
            return "상위 프로젝트를 찾을 수 없습니다.";
        }
        if (message.contains("cannot be its own parent")) {
            return "자기 자신을 상위 프로젝트로 지정할 수 없습니다.";
        }
        if (message.contains("Circular parent reference")) {
            return "순환 참조가 감지되었습니다.";
        }
        return message;
    }
}
