package com.campus.module.lostfound.dto;

import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;

/**
 * 失物招领详情 VO
 */
@Data
public class LostFoundVO {

    private Long id;

    private Long userId;

    private String username; // 发布者用户名

    private String type;

    private String title;

    private String description;

    private String category;

    private String location;

    private Double locX;

    private Double locY;

    private Long nearestNodeId;

    private String nearestNodeName; // 最近节点名称

    private List<String> imageUrls;

    private String contact;

    private String status;

    private LocalDateTime occurredAt;

    private LocalDateTime createdAt;

    private LocalDateTime updatedAt;
}
