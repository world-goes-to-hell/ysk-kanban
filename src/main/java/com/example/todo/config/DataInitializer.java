package com.example.todo.config;

import java.util.List;

import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import com.example.todo.entity.Project;
import com.example.todo.entity.ProjectMember;
import com.example.todo.entity.ProjectRole;
import com.example.todo.entity.User;
import com.example.todo.repository.ProjectMemberRepository;
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
    private final ProjectMemberRepository memberRepository;
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
            defaultProject = projectRepository.save(defaultProject);
            log.info("Created default project: {}", defaultProject.getName());

            ProjectMember masterMember = ProjectMember.builder()
                    .project(defaultProject)
                    .user(admin)
                    .role(ProjectRole.MASTER)
                    .build();
            memberRepository.save(masterMember);
            log.info("Added admin as MASTER of default project");
        }

        // 기존 프로젝트 중 멤버가 없는 프로젝트에 생성자를 MASTER로 등록
        migrateProjectMembers();
    }

    private void migrateProjectMembers() {
        List<Project> projects = projectRepository.findAll();
        for (Project project : projects) {
            if (project.getCreatedBy() != null
                    && !memberRepository.existsByProjectIdAndUserId(project.getId(), project.getCreatedBy().getId())) {
                ProjectMember member = ProjectMember.builder()
                        .project(project)
                        .user(project.getCreatedBy())
                        .role(ProjectRole.MASTER)
                        .build();
                memberRepository.save(member);
                log.info("Migrated: {} is now MASTER of project '{}'",
                        project.getCreatedBy().getUsername(), project.getName());
            }
        }
    }
}
