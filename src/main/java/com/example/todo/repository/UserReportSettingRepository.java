package com.example.todo.repository;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import com.example.todo.entity.UserReportSetting;

public interface UserReportSettingRepository extends JpaRepository<UserReportSetting, Long> {
    Optional<UserReportSetting> findByUserIdAndProjectId(Long userId, Long projectId);
    List<UserReportSetting> findByUserIdAndExcludedTrue(Long userId);
    List<UserReportSetting> findByUserId(Long userId);
}
