package com.campus.module.user.service;

import com.campus.common.exception.BusinessException;
import com.campus.module.user.dto.ChangePasswordDTO;
import com.campus.module.user.dto.UpdateProfileDTO;
import com.campus.module.user.dto.UserProfileVO;
import com.campus.module.user.entity.User;
import com.campus.module.user.mapper.UserMapper;
import org.springframework.beans.BeanUtils;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

/**
 * 用户服务：个人信息、修改资料、修改密码
 */
@Service
public class UserService {

    private final UserMapper userMapper;
    private final BCryptPasswordEncoder passwordEncoder = new BCryptPasswordEncoder();

    public UserService(UserMapper userMapper) {
        this.userMapper = userMapper;
    }

    /** 获取个人信息 */
    public UserProfileVO getProfile(Long userId) {
        User user = userMapper.selectById(userId);
        if (user == null) {
            throw new BusinessException("用户不存在");
        }
        UserProfileVO vo = new UserProfileVO();
        BeanUtils.copyProperties(user, vo);
        return vo;
    }

    /** 修改个人资料 */
    public void updateProfile(Long userId, UpdateProfileDTO dto) {
        User user = userMapper.selectById(userId);
        if (user == null) {
            throw new BusinessException("用户不存在");
        }

        if (StringUtils.hasText(dto.getUsername())) {
            user.setUsername(dto.getUsername());
        }
        if (dto.getPhone() != null) {
            user.setPhone(dto.getPhone());
        }
        if (dto.getEmail() != null) {
            user.setEmail(dto.getEmail());
        }
        if (dto.getAvatarUrl() != null) {
            user.setAvatarUrl(dto.getAvatarUrl());
        }

        userMapper.updateById(user);
    }

    /** 修改密码 */
    public void changePassword(Long userId, ChangePasswordDTO dto) {
        User user = userMapper.selectById(userId);
        if (user == null) {
            throw new BusinessException("用户不存在");
        }
        if (!passwordEncoder.matches(dto.getOldPassword(), user.getPassword())) {
            throw new BusinessException("原密码错误");
        }

        user.setPassword(passwordEncoder.encode(dto.getNewPassword()));
        userMapper.updateById(user);
    }
}
