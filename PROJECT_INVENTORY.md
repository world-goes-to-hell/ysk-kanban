# JIRA-TEST Project Inventory

## Project Overview
- **Project Name**: jira-todo
- **Type**: Full-Stack Spring Boot Application (Java backend + Vanilla JavaScript frontend)
- **Build Tool**: Gradle with Spring Boot 3.2.3
- **Java Version**: 17
- **Database**: H2 (in-memory)
- **Architecture**: Layered (Controller → Service → Repository → Entity)

---

## 1. DIRECTORY STRUCTURE: src/main/java

```
src/main/java/com/example/todo/
├── JiraTodoApplication.java (12 lines) - Main application entry point
├── config/
│   ├── DataInitializer.java (45 lines) - Initializes sample data
│   └── SecurityConfig.java (47 lines) - Spring Security configuration
├── controller/ (6 files, 514 lines)
│   ├── AttachmentController.java (76 lines)
│   ├── AuthController.java (100 lines)
│   ├── CommentController.java (73 lines)
│   ├── DashboardController.java (95 lines)
│   ├── ProjectController.java (70 lines)
│   └── TodoController.java (120 lines)
├── entity/ (6 files, 327 lines)
│   ├── Attachment.java (62 lines)
│   ├── Comment.java (62 lines)
│   ├── Priority.java (5 lines)
│   ├── Project.java (54 lines)
│   ├── Todo.java (96 lines)
│   └── User.java (48 lines)
├── repository/ (5 files, 86 lines)
│   ├── AttachmentRepository.java (12 lines)
│   ├── CommentRepository.java (12 lines)
│   ├── ProjectRepository.java (14 lines)
│   ├── TodoRepository.java (34 lines)
│   └── UserRepository.java (14 lines)
└── service/ (6 files, 336 lines)
    ├── AttachmentService.java (130 lines)
    ├── CommentService.java (69 lines)
    ├── CustomUserDetailsService.java (35 lines)
    ├── ProjectService.java (63 lines)
    ├── TodoService.java (96 lines)
    └── UserService.java (42 lines)
```

---

## 2. JAVA FILES BY LINE COUNT (26 files, 1,486 lines total)

### Largest Files (Top 10)
| File | Lines | Category |
|------|-------|----------|
| AttachmentService.java | 130 | Service |
| TodoController.java | 120 | Controller |
| AuthController.java | 100 | Controller |
| TodoService.java | 96 | Service |
| Todo.java | 96 | Entity |
| DashboardController.java | 95 | Controller |
| AttachmentController.java | 76 | Controller |
| CommentController.java | 73 | Controller |
| ProjectController.java | 70 | Controller |
| CommentService.java | 69 | Service |

### By Category
**Controllers** (6 files, 514 lines)
- TodoController.java: 120
- AuthController.java: 100
- DashboardController.java: 95
- AttachmentController.java: 76
- CommentController.java: 73
- ProjectController.java: 70

**Services** (6 files, 336 lines)
- AttachmentService.java: 130
- TodoService.java: 96
- CommentService.java: 69
- ProjectService.java: 63
- UserService.java: 42
- CustomUserDetailsService.java: 35

**Entities** (6 files, 327 lines)
- Todo.java: 96
- Comment.java: 62
- Attachment.java: 62
- Project.java: 54
- User.java: 48
- Priority.java: 5

**Repositories** (5 files, 86 lines)
- TodoRepository.java: 34
- UserRepository.java: 14
- ProjectRepository.java: 14
- CommentRepository.java: 12
- AttachmentRepository.java: 12

**Configuration** (2 files, 92 lines)
- SecurityConfig.java: 47
- DataInitializer.java: 45

**Application Entry** (1 file, 12 lines)
- JiraTodoApplication.java: 12

---

## 3. DIRECTORY STRUCTURE: src/main/resources

```
src/main/resources/
├── application.yml (32 lines) - Spring Boot configuration
└── static/
    ├── index.html (312 lines)
    ├── css/
    │   └── style.css (1,827 lines)
    └── js/
        └── app.js (1,514 lines)
```

---

## 4. STATIC FRONTEND FILES (3 files, 3,653 lines total)

| File | Lines | Type | Purpose |
|------|-------|------|---------|
| css/style.css | 1,827 | CSS | Application styling |
| js/app.js | 1,514 | JavaScript | Application logic & DOM manipulation |
| index.html | 312 | HTML | Single page markup |

**Frontend Framework**: Vanilla JavaScript (No React, Vue, Angular, or any framework)
**CSS Framework**: Custom CSS (No Tailwind, Bootstrap, or preprocessor detected)
**Build Tooling**: NONE (no webpack, Vite, Parcel)
**Package Manager**: NONE (no package.json, no npm)

---

## 5. BUILD CONFIGURATION

### build.gradle (831 bytes)
```gradle
plugins {
    id 'java'
    id 'org.springframework.boot' version '3.2.3'
    id 'io.spring.dependency-management' version '1.1.4'
}

java.sourceCompatibility = '17'

Dependencies:
- org.springframework.boot:spring-boot-starter-web
- org.springframework.boot:spring-boot-starter-data-jpa
- org.springframework.boot:spring-boot-starter-security
- org.projectlombok:lombok
- com.h2database:h2 (runtime)
- org.springframework.boot:spring-boot-starter-test (test)
```

### settings.gradle (31 bytes)
```
rootProject.name = 'jira-todo'
```

---

## 6. APPLICATION CONFIGURATION

### application.yml (32 lines)
```yaml
server:
  port: 8080

spring:
  datasource:
    url: jdbc:h2:mem:tododb
    driver-class-name: org.h2.Driver
    username: sa
    password:
  h2:
    console:
      enabled: true
      path: /h2-console
  jpa:
    hibernate:
      ddl-auto: create
    show-sql: false
  servlet:
    multipart:
      max-file-size: 10MB
      max-request-size: 10MB

file:
  upload-dir: uploads

logging:
  level:
    com.example.todo: DEBUG
```

---

## 7. PROJECT SCOPE

### Backend: Java/Spring Boot (1,486 lines)
- **Framework**: Spring Boot 3.2.3
- **Architecture**: Layered MVC
- **Features**:
  - User authentication & authorization (Spring Security)
  - Todo item management
  - Project management
  - Comments on todos
  - File attachments (upload/download)
  - Dashboard view
  - Role-based access control

- **Core Entities**: 6 (User, Project, Todo, Comment, Attachment, Priority)
- **REST Controllers**: 6
- **Business Services**: 6
- **Data Repositories**: 5 (Spring Data JPA)
- **Configuration Classes**: 2

### Frontend: Static Web App (3,653 lines)
- **Type**: Single Page Application (SPA)
- **Framework**: None (Vanilla JavaScript)
- **Language**: JavaScript + HTML + CSS
- **Build Process**: None (static files served directly)
- **Deployment**: Embedded in src/main/resources/static/
- **Features**:
  - DOM-based UI updates
  - Client-side form handling
  - Fetch API for backend communication
  - CSS styling (custom)

---

## 8. TEST FILES

**Status**: NONE FOUND (0 test files in src/test/java)
- JUnit platform is configured in build.gradle but no actual tests have been written

---

## 9. FILES AT ROOT DIRECTORY

| File | Size | Type |
|------|------|------|
| build.gradle | 831 bytes | Gradle config |
| settings.gradle | 31 bytes | Gradle settings |
| gradlew | 2,385 bytes | Gradle wrapper (Unix) |
| gradlew.bat | 2,798 bytes | Gradle wrapper (Windows) |
| .gitignore | 358 bytes | Git ignore rules |

---

## 10. TECHNOLOGY STACK

| Component | Technology | Version |
|-----------|-----------|---------|
| **JDK** | Java | 17 |
| **Web Framework** | Spring Boot | 3.2.3 |
| **Web Layer** | Spring MVC | 3.2.3 |
| **Data/ORM** | Spring Data JPA | 3.2.3 |
| **Database** | H2 Database | Latest (runtime) |
| **Security** | Spring Security | 3.2.3 |
| **Boilerplate** | Lombok | Latest |
| **Build Tool** | Gradle | Latest (gradle wrapper) |
| **Frontend** | Vanilla JavaScript | ES6+ |
| **Styling** | CSS3 | Custom (no framework) |
| **Module Bundler** | NONE | N/A |
| **Package Manager** | NONE | N/A |

---

## 11. PROJECT CHARACTERISTICS

### Classification
✓ **Full-Stack Application** (Java backend + JavaScript frontend)
✗ **Monolithic** (Backend and frontend in single project)
✓ **Layered Architecture** (Clear separation of concerns)
✗ **Microservices** (Single monolithic application)
✗ **Has Module Bundler** (Static files, no build process)
✗ **Has Package.json** (Gradle only)
✗ **Has Frontend Framework** (Vanilla JavaScript)

### Code Quality
- **Well-Organized**: Clear package structure (controller/service/repository/entity)
- **Configuration-Driven**: Uses Spring Boot YAML configuration
- **Security-Enabled**: Spring Security integrated for authentication
- **Modular**: Each feature has dedicated controller/service/repository
- **Test-Ready**: JUnit configured but not implemented
- **Lombok**: Using annotations to reduce boilerplate

---

## 12. COMPLETE FILE LISTING

### src/main/java (26 files, 1,486 lines)

**Root Package** (1 file)
- JiraTodoApplication.java (12)

**config/** (2 files, 92 lines)
- DataInitializer.java (45)
- SecurityConfig.java (47)

**controller/** (6 files, 514 lines)
- AttachmentController.java (76)
- AuthController.java (100)
- CommentController.java (73)
- DashboardController.java (95)
- ProjectController.java (70)
- TodoController.java (120)

**entity/** (6 files, 327 lines)
- Attachment.java (62)
- Comment.java (62)
- Priority.java (5)
- Project.java (54)
- Todo.java (96)
- User.java (48)

**repository/** (5 files, 86 lines)
- AttachmentRepository.java (12)
- CommentRepository.java (12)
- ProjectRepository.java (14)
- TodoRepository.java (34)
- UserRepository.java (14)

**service/** (6 files, 336 lines)
- AttachmentService.java (130)
- CommentService.java (69)
- CustomUserDetailsService.java (35)
- ProjectService.java (63)
- TodoService.java (96)
- UserService.java (42)

### src/main/resources (1 file + static/)
- application.yml (32)

**static/** (3 files, 3,653 lines)
- index.html (312)
- css/style.css (1,827)
- js/app.js (1,514)

---

## 13. KEY INSIGHTS

1. **No Tests Yet**: Testing framework is configured but no test files exist
2. **Static Frontend**: No build process, frontend served as static files
3. **In-Memory Database**: Uses H2 for development (not suitable for production data persistence)
4. **Security Framework**: Spring Security is integrated and configured
5. **File Handling**: Supports file uploads/attachments with 10MB limit
6. **Traditional Stack**: Classic Java Spring Boot with minimal modern tooling (no Docker, no containerization noted)
7. **Vanilla JavaScript**: Frontend uses no frameworks, just vanilla JS DOM manipulation
8. **DDL Auto-Creation**: Hibernate creates schema automatically (development-friendly)
9. **Debug Logging**: com.example.todo package set to DEBUG level
10. **Single-Page Architecture**: Frontend appears to be SPA with static assets

---

## SUMMARY STATISTICS

```
Total Java Source Files:     26 files
Total Java Lines:            1,486 lines

Total Frontend Files:        3 files
Total Frontend Lines:        3,653 lines
  - HTML:                    312 lines
  - CSS:                     1,827 lines
  - JavaScript:              1,514 lines

Configuration Files:         1 (application.yml)

Total Project Code:          5,139+ lines

Test Files:                  0

Build/Config Files:          5 (build.gradle, settings.gradle, gradlew, gradlew.bat, .gitignore)

Module Bundler:              NONE
Package Manager:             NONE
Frontend Framework:          NONE (Vanilla JS)
CSS Framework:               NONE (Custom CSS)
```

