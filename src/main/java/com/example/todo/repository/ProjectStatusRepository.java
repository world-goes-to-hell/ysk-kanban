package com.example.todo.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.example.todo.entity.ProjectStatus;

public interface ProjectStatusRepository extends JpaRepository<ProjectStatus, Long> {

    List<ProjectStatus> findByProject_IdAndActiveTrueOrderByPositionAscIdAsc(Long projectId);

    Optional<ProjectStatus> findByProject_IdAndStatusKey(Long projectId, String statusKey);

    Optional<ProjectStatus> findByProject_IdAndStatusKeyAndActiveTrue(Long projectId, String statusKey);

    boolean existsByProject_IdAndStatusKey(Long projectId, String statusKey);

    @Query("SELECT COALESCE(MAX(ps.position), -1) FROM ProjectStatus ps WHERE ps.project.id = :projectId AND ps.active = true")
    Integer findMaxPosition(@Param("projectId") Long projectId);

    void deleteByProject_Id(Long projectId);
}
