package com.campus.module.lostfound.controller;

import com.baomidou.mybatisplus.core.metadata.IPage;
import com.campus.common.Result;
import com.campus.module.lostfound.dto.*;
import com.campus.module.lostfound.service.LostFoundService;
import com.campus.security.LoginUserHolder;
import lombok.RequiredArgsConstructor;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

/**
 * 失物招领控制器
 */
@RestController
@RequestMapping("/api/lostfound")
@RequiredArgsConstructor
public class LostFoundController {

    private final LostFoundService lostFoundService;

    /**
     * 发布失物招领
     */
    @PostMapping("/publish")
    public Result<Long> publish(@Validated @RequestBody PublishRequest request) {
        Long userId = LoginUserHolder.get().getUserId();
        Long id = lostFoundService.publish(userId, request);
        return Result.success(id);
    }

    /**
     * 查询列表
     */
    @GetMapping("/list")
    public Result<IPage<LostFoundVO>> list(QueryRequest request) {
        IPage<LostFoundVO> page = lostFoundService.queryList(request);
        return Result.success(page);
    }

    /**
     * 查询详情
     */
    @GetMapping("/{id}")
    public Result<LostFoundVO> getDetail(@PathVariable Long id) {
        LostFoundVO vo = lostFoundService.getDetail(id);
        return Result.success(vo);
    }

    /**
     * 更新失物招领
     */
    @PutMapping("/{id}")
    public Result<Void> update(@PathVariable Long id, @Validated @RequestBody UpdateRequest request) {
        Long userId = LoginUserHolder.get().getUserId();
        lostFoundService.update(id, userId, request);
        return Result.success();
    }

    /**
     * 删除失物招领
     */
    @DeleteMapping("/{id}")
    public Result<Void> delete(@PathVariable Long id) {
        Long userId = LoginUserHolder.get().getUserId();
        lostFoundService.delete(id, userId);
        return Result.success();
    }
}
