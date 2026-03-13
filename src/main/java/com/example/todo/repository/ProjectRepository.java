package com.example.todo.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.example.todo.entity.Project;

public interface ProjectRepository extends JpaRepository<Project, Long> {

    Optional<Project> findByProjectKey(String projectKey);

    boolean existsByProjectKey(String projectKey);

    List<Project> findByParentIsNull();

    List<Project> findByParentId(Long parentId);

    @Query("SELECT p FROM Project p LEFT JOIN FETCH p.parent")
    List<Project> findAllWithParent();

    @Query("SELECT p.id FROM Project p WHERE p.parent.id = :parentId")
    List<Long> findChildProjectIds(@Param("parentId") Long parentId);
}
