package com.example.todo.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.example.todo.entity.ProjectFavorite;

public interface ProjectFavoriteRepository extends JpaRepository<ProjectFavorite, Long> {

    List<ProjectFavorite> findByUserId(Long userId);

    boolean existsByUserIdAndProjectId(Long userId, Long projectId);

    Optional<ProjectFavorite> findByUserIdAndProjectId(Long userId, Long projectId);

    void deleteByUserIdAndProjectId(Long userId, Long projectId);

    void deleteByProjectId(Long projectId);
}
