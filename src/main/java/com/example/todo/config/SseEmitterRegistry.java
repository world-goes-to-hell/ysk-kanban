package com.example.todo.config;

import java.io.IOException;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import lombok.extern.slf4j.Slf4j;

@Slf4j
@Component
public class SseEmitterRegistry {

    private final Map<String, SseEmitter> emitters = new ConcurrentHashMap<>();

    public SseEmitter register() {
        String id = UUID.randomUUID().toString();
        SseEmitter emitter = new SseEmitter(0L); // 타임아웃 없음 — 클라이언트가 재연결 담당

        emitters.put(id, emitter);
        emitter.onCompletion(() -> {
            emitters.remove(id);
            log.debug("SSE 연결 종료: {} (활성: {})", id, emitters.size());
        });
        emitter.onTimeout(() -> emitters.remove(id));
        emitter.onError(e -> emitters.remove(id));

        // 초기 이벤트를 보내야 응답 헤더가 즉시 플러시됨
        try {
            emitter.send(SseEmitter.event().name("connected").data("ok"));
        } catch (IOException e) {
            emitters.remove(id);
        }

        log.debug("SSE 연결 등록: {} (활성: {})", id, emitters.size());
        return emitter;
    }

    public void broadcast(String eventName, Object data) {
        emitters.forEach((id, emitter) -> {
            try {
                emitter.send(SseEmitter.event()
                        .name(eventName)
                        .data(data, MediaType.APPLICATION_JSON));
            } catch (IOException e) {
                emitters.remove(id);
                log.debug("SSE 전송 실패로 연결 제거: {}", id);
            }
        });
    }
}
