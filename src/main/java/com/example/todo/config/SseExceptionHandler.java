package com.example.todo.config;

import java.io.IOException;

import org.apache.catalina.connector.ClientAbortException;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ExceptionHandler;

import com.example.todo.controller.SseController;

import lombok.extern.slf4j.Slf4j;

@Slf4j
@ControllerAdvice(assignableTypes = SseController.class)
@Order(Ordered.HIGHEST_PRECEDENCE)
public class SseExceptionHandler {

    @ExceptionHandler({
            ClientAbortException.class,
            IOException.class,
            IllegalStateException.class
    })
    public void handleClientDisconnect(Exception e) throws Exception {
        if (!isClientDisconnect(e)) {
            throw e;
        }
        log.debug("클라이언트 연결 종료로 응답 전송 중단: {}", summarize(e));
    }

    private boolean isClientDisconnect(Throwable throwable) {
        Throwable current = throwable;
        while (current != null) {
            String className = current.getClass().getName();
            String message = current.getMessage();
            if (className.contains("ClientAbortException")
                    || className.contains("AsyncRequestNotUsableException")) {
                return true;
            }
            if (message != null) {
                String lower = message.toLowerCase();
                if (lower.contains("broken pipe")
                        || lower.contains("connection reset")
                        || lower.contains("connection aborted")
                        || lower.contains("clientabort")) {
                    return true;
                }
            }
            current = current.getCause();
        }
        return false;
    }

    private String summarize(Throwable throwable) {
        String message = throwable.getMessage();
        return message == null || message.isBlank()
                ? throwable.getClass().getSimpleName()
                : message;
    }
}
