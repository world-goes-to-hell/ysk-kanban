package com.example.todo.config;

import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import com.example.todo.entity.Project;
import com.example.todo.entity.User;
import com.example.todo.repository.ProjectRepository;
import com.example.todo.repository.UserRepository;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Component
@RequiredArgsConstructor
public class DataInitializer implements CommandLineRunner {

    private final UserRepository userRepository;
    private final ProjectRepository projectRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    public void run(String... args) {
        if (userRepository.count() == 0) {
            User admin = User.builder()
                    .username("admin")
                    .password(passwordEncoder.encode("admin123"))
                    .displayName("관리자")
                    .build();
            admin = userRepository.save(admin);
            log.info("Created admin user: {}", admin.getUsername());

            Project defaultProject = Project.builder()
                    .name("기본 프로젝트")
                    .description("기본 프로젝트입니다.")
                    .projectKey("DEFAULT")
                    .createdBy(admin)
                    .build();
            projectRepository.save(defaultProject);
            log.info("Created default project: {}", defaultProject.getName());
        }
    }
}
