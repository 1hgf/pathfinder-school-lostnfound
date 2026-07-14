package com.campus.module.user.dto;

import jakarta.validation.constraints.Size;
import lombok.Data;

/**
 * 修改个人资料请求（学号、角色不可改）
 */
@Data
public class UpdateProfileDTO {

    @Size(min = 2, max = 20, message = "昵称长度为2-20字符")
    private String username;

    private String phone;
    private String email;
    private String avatarUrl;
}
