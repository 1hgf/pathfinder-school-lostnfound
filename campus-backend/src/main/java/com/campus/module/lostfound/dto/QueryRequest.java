package com.campus.module.lostfound.dto;

import lombok.Data;

/**
 * 查询失物招领列表请求
 */
@Data
public class QueryRequest {

    private String type; // LOST/FOUND，不传则查全部

    private String category; // 分类筛选

    private String keyword; // 关键词搜索（标题、描述）

    private String status; // OPEN/CLAIMED/CLOSED

    private Long userId; // 查询某个用户发布的

    private Integer pageNum = 1;

    private Integer pageSize = 10;
}
