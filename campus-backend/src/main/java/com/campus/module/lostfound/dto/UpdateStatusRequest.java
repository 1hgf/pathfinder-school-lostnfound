package com.campus.module.lostfound.dto;

import lombok.Data;

/**
 * 更新失物招领状态请求
 */
@Data
public class UpdateStatusRequest {
    private String status; // OPEN/CLAIMED/CLOSED
}
