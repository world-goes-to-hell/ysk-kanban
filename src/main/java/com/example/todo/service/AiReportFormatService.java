package com.example.todo.service;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

import lombok.extern.slf4j.Slf4j;

/**
 * 사내 AI(OpenWebUI, OpenAI 호환)를 프록시로 호출해
 * 자유 형식 업무 내용을 회사 표준 평문 업무보고 양식으로 변환한다.
 *
 * <p>토큰/호스트는 환경변수(OPENWEBUI_*)로만 주입되며 프론트에 노출되지 않는다.
 */
@Slf4j
@Service
public class AiReportFormatService {

    private static final int TIMEOUT_MS = 60_000;

    /** 회사 표준 업무보고 양식 규칙 — 시스템 프롬프트. */
    private static final String SYSTEM_PROMPT = """
            [역할]
            당신은 일일 업무보고서 작성 도우미다. 사용자가 오늘 한 작업 내용을 자유 형식으로 입력하면,
            아래에 정의된 회사 표준 양식에 정확히 맞춰 평문 텍스트로만 출력한다.

            [출력 형식 규칙 - 절대 위반 금지]
            1. 순수 평문 텍스트로만 출력한다. 마크다운(#, *, -, >, 코드펜스, 표 등) 및 트리 특수문자(├, └, │, ─ 등)를 절대 사용하지 않는다.
            2. 계층 구조는 오직 공백 들여쓰기로만 표현하며, 한 단계당 스페이스 4칸을 사용한다.
            3. 계층 단계는 다음과 같다.
               - 0단계(들여쓰기 0칸)  : 프로젝트명 (예: MBRIS)
               - 1단계(들여쓰기 4칸)  : 업무 단위 (번호. 업무명 : 상태)
               - 2단계(들여쓰기 8칸)  : 세부 항목 (진척률, 진행내용, 이슈, 내일계획, 향후계획)
               - 3단계(들여쓰기 12칸) : 진행내용 등의 하위 나열 항목
            4. 상태 값은 완료 / 진행중 / 대기 / 보류 중에서 선택한다.
            5. 진척률은 퍼센트(%)로 표기한다. 구축·개발형 업무에만 기재하고, 운영·연구성 업무는 생략 가능하다.
            6. 이슈가 없으면 "없음"으로 명시한다.
            7. 향후계획은 중장기 항목으로, 없으면 생략 가능하다.

            [문서 전체 구조]
            [YYYY-MM-DD] 일일 업무보고 / (작성자) (부서)

            [금일 진행 사항]
            (프로젝트별로 그룹핑. 프로젝트명 아래에 업무 단위들을 나열)

            [기타 업무]
            (운영·행정·확인 중 사안 등. 이것도 프로젝트별로 그룹핑한다. 특정 프로젝트에 속하는 업무는
            반드시 해당 프로젝트 그룹 아래에 둔다. 예: Dooray SMTP 관련 업무는 MBRIS 하위로 분류한다)

            [세부 항목 작성 순서 - 1단계 업무 단위마다 아래 순서 고정]
                진척률 : NN%
                진행내용
                    (구체적 내용들을 3단계로 나열)
                이슈 : (지연/장애/리스크, 없으면 "없음")
                내일계획 : (단기)
                향후계획 : (중장기, 선택)

            [작성 지침]
            1. 사용자가 진척률을 명시하지 않으면 임의로 채우지 말고 "진척률 : (확인 필요)"로 표기해 사용자가 직접 채우도록 한다.
            2. 날짜가 주어지지 않으면 [YYYY-MM-DD] 형태를 그대로 두어 사용자가 채우게 한다.
            3. 사용자가 준 정보에 없는 내용을 지어내지 않는다.
            4. 여러 작업을 성격이 비슷하면 하나의 업무 단위로 묶고, 성격이 다르면 별도 업무 단위로 분리한다.
            5. 출력은 보고서 본문만 내보내고, 설명이나 부연 문장을 앞뒤에 붙이지 않는다.
            """;

    private final ObjectMapper objectMapper;
    private final RestClient http;

    @Value("${openwebui.base-url:}")
    private String baseUrl;

    @Value("${openwebui.api-key:}")
    private String apiKey;

    @Value("${openwebui.model:gpt-oss:120b}")
    private String model;

    public AiReportFormatService(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
        this.http = RestClient.builder()
                .requestFactory(clientRequestFactory())
                .build();
    }

    private static org.springframework.http.client.ClientHttpRequestFactory clientRequestFactory() {
        var factory = new org.springframework.http.client.SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(10_000);
        factory.setReadTimeout(TIMEOUT_MS);
        return factory;
    }

    /**
     * 자유 형식 업무 내용을 표준 양식 평문으로 변환한다.
     *
     * @param workText 사용자가 편집한 업무 내용 (자유 형식)
     * @param date     보고 기준일 (YYYY-MM-DD, 비어있으면 placeholder 유지)
     * @param writer   작성자 표시명 (비어있으면 placeholder 유지)
     * @return 표준 양식 평문 보고서
     */
    public String formatReport(String workText, String date, String writer) {
        if (baseUrl == null || baseUrl.isBlank() || apiKey == null || apiKey.isBlank()) {
            throw new IllegalStateException("사내 AI(OPENWEBUI) 설정이 되어있지 않습니다. 관리자에게 문의하세요.");
        }
        if (workText == null || workText.isBlank()) {
            throw new IllegalArgumentException("업무 내용이 비어있습니다.");
        }

        String userMessage = buildUserMessage(workText, date, writer);
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("model", model);
        payload.put("temperature", 0);
        payload.put("messages", List.of(
                Map.of("role", "system", "content", SYSTEM_PROMPT),
                Map.of("role", "user", "content", userMessage)));

        String content;
        try {
            String requestBody = objectMapper.writeValueAsString(payload);
            String responseBody = http.post()
                    .uri(baseUrl.replaceAll("/+$", "") + "/api/chat/completions")
                    .header("Authorization", "Bearer " + apiKey)
                    .header("Content-Type", "application/json")
                    .body(requestBody)
                    .retrieve()
                    .body(String.class);
            JsonNode root = objectMapper.readTree(responseBody);
            content = root.path("choices").path(0).path("message").path("content").asText("");
        } catch (Exception e) {
            log.error("OpenWebUI API 호출 실패", e);
            throw new IllegalStateException("사내 AI 호출에 실패했습니다: " + e.getMessage());
        }

        content = stripCodeFence(content).strip();
        if (content.isEmpty()) {
            throw new IllegalStateException("사내 AI가 빈 응답을 반환했습니다. 잠시 후 다시 시도하세요.");
        }
        return content;
    }

    private String buildUserMessage(String workText, String date, String writer) {
        StringBuilder sb = new StringBuilder();
        sb.append("보고 기준일: ").append(date == null || date.isBlank() ? "(미지정)" : date).append('\n');
        sb.append("작성자: ").append(writer == null || writer.isBlank() ? "(미지정)" : writer).append('\n');
        sb.append("부서: (미지정)").append('\n');
        sb.append("\n[오늘 한 업무 내용]\n");
        sb.append(workText);
        return sb.toString();
    }

    /** 모델이 실수로 코드펜스로 감쌌을 때 제거. */
    private String stripCodeFence(String text) {
        String t = text.strip();
        if (t.startsWith("```")) {
            int firstNl = t.indexOf('\n');
            if (firstNl >= 0) {
                t = t.substring(firstNl + 1);
            }
            if (t.endsWith("```")) {
                t = t.substring(0, t.length() - 3);
            }
        }
        return t;
    }
}
