# ── Stage 1: Frontend Build ──────────────────────────
FROM node:18-alpine AS frontend

WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# ── Stage 2: Backend Build ──────────────────────────
FROM gradle:8.6-jdk17 AS build

WORKDIR /app
COPY build.gradle settings.gradle ./
COPY gradle/ gradle/
COPY src/ src/
COPY .claude/ .claude/
COPY --from=frontend /app/src/main/resources/static/ src/main/resources/static/
RUN gradle bootJar -x test --no-daemon

# ── Stage 3: Runtime ────────────────────────────────
FROM eclipse-temurin:17-jre-alpine

WORKDIR /app
RUN apk add --no-cache tzdata && cp /usr/share/zoneinfo/Asia/Seoul /etc/localtime && echo "Asia/Seoul" > /etc/timezone
RUN mkdir -p /app/data /app/uploads

COPY --from=build /app/build/libs/*.jar app.jar
COPY --from=build /app/.claude/ /app/.claude/

VOLUME ["/app/data", "/app/uploads"]
EXPOSE 8080

ENTRYPOINT ["java", "-Duser.timezone=Asia/Seoul", "-jar", "app.jar"]
