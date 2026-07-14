package com.campus.module.user.controller;

import com.campus.common.Result;
import com.campus.module.user.dto.ChangePasswordDTO;
import com.campus.module.user.dto.UpdateProfileDTO;
import com.campus.module.user.dto.UserProfileVO;
import com.campus.module.user.service.UserService;
import com.campus.security.LoginUserHolder;
import com.campus.security.RequireAuth;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;

/**
 * 用户接口：个人信息、修改资料、修改密码（均需登录）
 */
@RestController
@RequestMapping("/api/user")
@RequireAuth
public class UserController {

    private final UserService userService;

    public UserController(UserService userService) {
        this.userService = userService;
    }

    /** 获取个人信息 */
    @GetMapping("/profile")
    public Result<UserProfileVO> getProfile() {
        Long userId = LoginUserHolder.getUserId();
        return Result.success(userService.getProfile(userId));
    }

    /** 修改个人资料 */
    @PutMapping("/profile")
    public Result<Void> updateProfile(@Valid @RequestBody UpdateProfileDTO dto) {
        Long userId = LoginUserHolder.getUserId();
        userService.updateProfile(userId, dto);
        return Result.success("资料已更新", null);
    }

    /** 修改密码 */
    @PutMapping("/password")
    public Result<Void> changePassword(@Valid @RequestBody ChangePasswordDTO dto) {
        Long userId = LoginUserHolder.getUserId();
        userService.changePassword(userId, dto);
        return Result.success("密码已修改", null);
    }
}
