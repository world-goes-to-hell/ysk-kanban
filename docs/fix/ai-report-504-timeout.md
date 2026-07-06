# AI 업무보고 504 Gateway Time-out 수정

## 증상
`POST /api/reports/ai-format` 호출 시 `AiReportFormatService`에서
`HttpServerErrorException$GatewayTimeout: 504 Gateway Time-out` (nginx HTML) 발생.

## 원인
- 사내 OpenWebUI(`https://why.coreit.co.kr`) 앞단에 nginx 리버스 프록시가 있음.
- 논스트리밍(`stream` 미지정) 요청은 모델이 **전체 응답을 완성한 뒤** 한 번에 반환.
- `gpt-oss:120b`가 표준 양식 보고서를 생성하는 시간이 nginx `proxy_read_timeout`
  (기본 60초 추정)을 초과 → 모델이 끝나기 전에 nginx가 업스트림 연결을 끊고 504 반환.
- 우리 RestClient read timeout(60s)과 무관하게, nginx가 먼저 504를 응답.

## 해결
OpenAI 호환 **스트리밍(SSE)** 로 전환.
- 요청 payload에 `"stream": true` 추가.
- 응답을 `RestClient.exchange()`로 받아 `text/event-stream`을 라인 단위로 파싱:
  - `data: {json}` 조각에서 `choices[0].delta.content` 누적
  - `data: [DONE]` 만나면 종료
- 토큰이 생성되는 즉시 바이트가 흐르므로 nginx idle 타임아웃이 리셋되어 504 미발생.
- 백엔드→프론트 응답 계약은 그대로(`{ report }` 단일 JSON). 스트리밍은 백엔드↔OpenWebUI
  구간에만 적용하고, 백엔드는 완성본을 합쳐 한 번에 반환.
- read timeout 120초로 상향(스트리밍이라도 전체 생성 시간 여유 필요).

## 향후
- 프론트까지 실시간 스트리밍 UX가 필요하면 백엔드도 SSE passthrough로 확장 가능(현재는 불필요, YAGNI).
