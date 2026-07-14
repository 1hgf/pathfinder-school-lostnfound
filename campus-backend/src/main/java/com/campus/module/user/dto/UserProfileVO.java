package com.campus.module.user.dto;

import lombok.Data;

import java.time.LocalDateTime;

/**
 * 用户个人信息 VO（不含密码等敏感字段）
 */
@Data
public class UserProfileVO {

    private Long id;
    private String studentId;
    private String username;
    private String phone;
    private String email;
    private String role;
    private String avatarUrl;
    private LocalDateTime createdAt;
}
