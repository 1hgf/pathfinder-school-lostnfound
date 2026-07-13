package com.campus.module.lostfound.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.campus.common.exception.BusinessException;
import com.campus.module.lostfound.dto.*;
import com.campus.module.lostfound.entity.LostFound;
import com.campus.module.lostfound.mapper.LostFoundMapper;
import com.campus.module.navigation.entity.MapNode;
import com.campus.module.navigation.mapper.MapNodeMapper;
import com.campus.module.user.entity.User;
import com.campus.module.user.mapper.UserMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.BeanUtils;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * 失物招领服务
 */
@Service
@RequiredArgsConstructor
public class LostFoundService {

    private final LostFoundMapper lostFoundMapper;
    private final UserMapper userMapper;
    private final MapNodeMapper mapNodeMapper;

    /**
     * 发布失物招领
     */
    public Long publish(Long userId, PublishRequest request) {
        LostFound lostFound = new LostFound();
        BeanUtils.copyProperties(request, lostFound);
        lostFound.setUserId(userId);
        lostFound.setStatus("OPEN");

        // 坐标吸附：如果用户提供了地图坐标，自动吸附到最近的节点
        if (request.getLocX() != null && request.getLocY() != null) {
            Long nearestNodeId = findNearestNode(request.getLocX(), request.getLocY());
            lostFound.setNearestNodeId(nearestNodeId);
        }

        lostFoundMapper.insert(lostFound);
        return lostFound.getId();
    }

    /**
     * 查询列表（分页 + 筛选）
     */
    public IPage<LostFoundVO> queryList(QueryRequest request) {
        Page<LostFound> page = new Page<>(request.getPageNum(), request.getPageSize());

        LambdaQueryWrapper<LostFound> wrapper = new LambdaQueryWrapper<>();

        // 类型筛选
        if (StringUtils.hasText(request.getType())) {
            wrapper.eq(LostFound::getType, request.getType());
        }

        // 分类筛选
        if (StringUtils.hasText(request.getCategory())) {
            wrapper.eq(LostFound::getCategory, request.getCategory());
        }

        // 状态筛选
        if (StringUtils.hasText(request.getStatus())) {
            wrapper.eq(LostFound::getStatus, request.getStatus());
        }

        // 用户筛选
        if (request.getUserId() != null) {
            wrapper.eq(LostFound::getUserId, request.getUserId());
        }

        // 关键词搜索
        if (StringUtils.hasText(request.getKeyword())) {
            wrapper.and(w -> w.like(LostFound::getTitle, request.getKeyword())
                    .or().like(LostFound::getDescription, request.getKeyword()));
        }

        // 按创建时间倒序
        wrapper.orderByDesc(LostFound::getCreatedAt);

        IPage<LostFound> lostFoundPage = lostFoundMapper.selectPage(page, wrapper);

        // 转换为 VO
        return lostFoundPage.convert(this::toVO);
    }

    /**
     * 查询详情
     */
    public LostFoundVO getDetail(Long id) {
        LostFound lostFound = lostFoundMapper.selectById(id);
        if (lostFound == null) {
            throw new BusinessException("失物招领信息不存在");
        }
        return toVO(lostFound);
    }

    /**
     * 更新失物招领
     */
    public void update(Long id, Long userId, UpdateRequest request) {
        LostFound lostFound = lostFoundMapper.selectById(id);
        if (lostFound == null) {
            throw new BusinessException("失物招领信息不存在");
        }

        // 只有发布者本人可以修改
        if (!lostFound.getUserId().equals(userId)) {
            throw new BusinessException("无权修改此信息");
        }

        BeanUtils.copyProperties(request, lostFound, "id", "userId", "type");

        // 如果坐标更新了，重新吸附
        if (request.getLocX() != null && request.getLocY() != null) {
            Long nearestNodeId = findNearestNode(request.getLocX(), request.getLocY());
            lostFound.setNearestNodeId(nearestNodeId);
        }

        lostFoundMapper.updateById(lostFound);
    }

    /**
     * 删除失物招领（软删除）
     */
    public void delete(Long id, Long userId) {
        LostFound lostFound = lostFoundMapper.selectById(id);
        if (lostFound == null) {
            throw new BusinessException("失物招领信息不存在");
        }

        // 只有发布者本人可以删除
        if (!lostFound.getUserId().equals(userId)) {
            throw new BusinessException("无权删除此信息");
        }

        lostFoundMapper.deleteById(id);
    }

    /**
     * 实体转 VO
     */
    private LostFoundVO toVO(LostFound lostFound) {
        LostFoundVO vo = new LostFoundVO();
        BeanUtils.copyProperties(lostFound, vo);

        // 查询发布者用户名
        User user = userMapper.selectById(lostFound.getUserId());
        if (user != null) {
            vo.setUsername(user.getUsername());
        }

        // 查询最近节点名称
        if (lostFound.getNearestNodeId() != null) {
            MapNode node = mapNodeMapper.selectById(lostFound.getNearestNodeId());
            if (node != null) {
                vo.setNearestNodeName(node.getName());
            }
        }

        return vo;
    }

    /**
     * 坐标吸附：找到最近的地图节点
     */
    private Long findNearestNode(Double x, Double y) {
        List<MapNode> nodes = mapNodeMapper.selectList(null);

        if (nodes.isEmpty()) {
            return null;
        }

        MapNode nearest = null;
        double minDistance = Double.MAX_VALUE;

        for (MapNode node : nodes) {
            double distance = Math.sqrt(
                    Math.pow(node.getX() - x, 2) + Math.pow(node.getY() - y, 2)
            );
            if (distance < minDistance) {
                minDistance = distance;
                nearest = node;
            }
        }

        return nearest != null ? nearest.getId() : null;
    }
}
