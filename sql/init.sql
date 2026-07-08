-- ============================================
-- 校园寻路与失物招领系统 数据库初始化脚本
-- 数据库：campus
-- 字符集：utf8mb4
-- 关联方式：统一逻辑关联，不使用物理外键
-- ============================================

-- 强制连接字符集为 utf8mb4，避免中文按 latin1 膨胀导致 "Data too long"
SET NAMES utf8mb4;

CREATE DATABASE IF NOT EXISTS campus
  DEFAULT CHARACTER SET utf8mb4
  DEFAULT COLLATE utf8mb4_unicode_ci;

USE campus;


-- ============================================
-- 一、建表
-- ============================================

-- -------------------------------------------
-- 1. 用户表
-- -------------------------------------------
DROP TABLE IF EXISTS `user`;
CREATE TABLE `user` (
    `id`          BIGINT       NOT NULL AUTO_INCREMENT  COMMENT '用户ID',
    `student_id`  VARCHAR(20)  NOT NULL                 COMMENT '学号（唯一）',
    `username`    VARCHAR(50)  NOT NULL                 COMMENT '用户名/昵称',
    `password`    VARCHAR(255) NOT NULL                 COMMENT '密码（BCrypt加密）',
    `phone`       VARCHAR(20)  DEFAULT NULL             COMMENT '手机号',
    `email`       VARCHAR(100) DEFAULT NULL             COMMENT '邮箱',
    `role`        VARCHAR(10)  NOT NULL DEFAULT 'USER'  COMMENT '角色：USER/ADMIN',
    `avatar_url`  VARCHAR(500) DEFAULT NULL             COMMENT '头像URL',
    `is_banned`   TINYINT      NOT NULL DEFAULT 0       COMMENT '是否封禁：0否 1是',
    `created_at`  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    `updated_at`  DATETIME     DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    `is_deleted`  TINYINT      NOT NULL DEFAULT 0       COMMENT '软删除：0否 1是',
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_student_id` (`student_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户表';


-- -------------------------------------------
-- 2. 地图节点表
--    （先于 lost_found 建表：逻辑关联无外键，顺序其实无所谓，
--      但把被引用表放前面更符合阅读直觉）
-- -------------------------------------------
DROP TABLE IF EXISTS `map_node`;
CREATE TABLE `map_node` (
    `id`          BIGINT       NOT NULL AUTO_INCREMENT  COMMENT '节点ID',
    `name`        VARCHAR(100) NOT NULL                 COMMENT '地点名称',
    `type`        VARCHAR(20)  NOT NULL                 COMMENT '类型：BUILDING/CANTEEN/DORM/GATE/CROSSROAD/OTHER',
    `x`           DOUBLE       NOT NULL                 COMMENT 'X坐标（像素）',
    `y`           DOUBLE       NOT NULL                 COMMENT 'Y坐标（像素）',
    `floor`       INT          DEFAULT 1                COMMENT '楼层（默认1层）',
    `description` VARCHAR(500) DEFAULT NULL             COMMENT '地点描述',
    `open_time`   VARCHAR(100) DEFAULT NULL             COMMENT '开放时间',
    `building_id` BIGINT       DEFAULT NULL             COMMENT '所属建筑ID（路口节点为空）',
    `icon_emoji`  VARCHAR(10)  DEFAULT NULL             COMMENT '图标Emoji',
    `color`       VARCHAR(20)  DEFAULT NULL             COMMENT '标注颜色',
    PRIMARY KEY (`id`),
    KEY `idx_type` (`type`),
    KEY `idx_name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='地图节点表';


-- -------------------------------------------
-- 3. 地图边表（路径）
-- -------------------------------------------
DROP TABLE IF EXISTS `map_edge`;
CREATE TABLE `map_edge` (
    `id`             BIGINT  NOT NULL AUTO_INCREMENT  COMMENT '边ID',
    `from_node`      BIGINT  NOT NULL                 COMMENT '起始节点ID',
    `to_node`        BIGINT  NOT NULL                 COMMENT '终止节点ID',
    `distance`       DOUBLE  DEFAULT NULL             COMMENT '距离（像素，留空则后端按坐标计算）',
    `walk_time`      INT     DEFAULT NULL             COMMENT '步行时间（秒）',
    `bike_time`      INT     DEFAULT NULL             COMMENT '骑行时间（秒）',
    `is_accessible`  TINYINT NOT NULL DEFAULT 1       COMMENT '是否无障碍通行：0否 1是',
    `edge_type`      VARCHAR(20) DEFAULT 'ROAD'       COMMENT '类型：ROAD(车行道)/PATH(人行道)/INDOOR/STAIRS/ELEVATOR',
    `accessible_by`  VARCHAR(20) DEFAULT 'BOTH'       COMMENT '可通行方式：WALK/BIKE/BOTH',
    PRIMARY KEY (`id`),
    KEY `idx_from_node` (`from_node`),
    KEY `idx_to_node` (`to_node`),
    KEY `idx_edge_type` (`edge_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='地图边表';


-- -------------------------------------------
-- 4. 失物招领表
-- -------------------------------------------
DROP TABLE IF EXISTS `lost_found`;
CREATE TABLE `lost_found` (
    `id`          BIGINT       NOT NULL AUTO_INCREMENT  COMMENT '主键ID',
    `user_id`     BIGINT       NOT NULL                 COMMENT '发布者用户ID（逻辑关联 user.id）',
    `type`        VARCHAR(10)  NOT NULL                 COMMENT '类型：LOST/FOUND',
    `title`       VARCHAR(200) NOT NULL                 COMMENT '标题',
    `description` TEXT         DEFAULT NULL             COMMENT '详细描述',
    `category`    VARCHAR(50)  NOT NULL                 COMMENT '物品分类',
    `location`    VARCHAR(200) DEFAULT NULL             COMMENT '丢失/捡到地点（文字描述）',
    `loc_x`       DOUBLE       DEFAULT NULL             COMMENT '地图标注X坐标（像素）',
    `loc_y`       DOUBLE       DEFAULT NULL             COMMENT '地图标注Y坐标（像素）',
    `nearest_node_id` BIGINT   DEFAULT NULL             COMMENT '就近吸附的路网节点ID（逻辑关联 map_node.id）',
    `image_urls`  JSON         DEFAULT NULL             COMMENT '图片URL数组',
    `contact`     VARCHAR(200) NOT NULL                 COMMENT '联系方式',
    `status`      VARCHAR(10)  NOT NULL DEFAULT 'OPEN'  COMMENT '状态：OPEN/CLAIMED/CLOSED',
    `occurred_at` DATETIME     DEFAULT NULL             COMMENT '事发时间',
    `created_at`  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    `updated_at`  DATETIME     DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    `is_deleted`  TINYINT      NOT NULL DEFAULT 0       COMMENT '软删除：0否 1是',
    PRIMARY KEY (`id`),
    KEY `idx_user_id` (`user_id`),
    KEY `idx_type_status` (`type`, `status`),
    KEY `idx_category` (`category`),
    KEY `idx_created_at` (`created_at` DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='失物招领表';


-- ============================================
-- 二、专用数据库用户（逻辑关联，最小权限）
-- ============================================
-- 应用连接使用此账号，而非 root
CREATE USER IF NOT EXISTS 'campus_user'@'localhost' IDENTIFIED BY 'campus123';
GRANT SELECT, INSERT, UPDATE, DELETE ON campus.* TO 'campus_user'@'localhost';
FLUSH PRIVILEGES;


-- ============================================
-- 三、初始数据
-- ============================================

-- 3.1 管理员账号（密码 admin123 的 BCrypt 值）
INSERT INTO `user` (`student_id`, `username`, `password`, `role`) VALUES
('admin', '系统管理员', '$2a$10$N.zmdr9k7uOCQb376NoUnuTJ8iAt6Z5EHsM8lE9lBOsl7iKTVKIUi', 'ADMIN');

-- 3.2 测试普通用户（密码 admin123，同上 hash，仅供开发测试）
INSERT INTO `user` (`student_id`, `username`, `password`, `role`, `email`) VALUES
('2021001234', '张三', '$2a$10$N.zmdr9k7uOCQb376NoUnuTJ8iAt6Z5EHsM8lE9lBOsl7iKTVKIUi', 'USER', 'zhangsan@stu.edu.cn');

-- 3.3 地图节点与边数据
--     由 proj-map-new.html 硬编码数组转换，见 sql/map_data.sql
--     （120 路口 + 63 建筑 = 183 节点；133 ROAD + 102 PATH = 235 条边）
--     执行完本脚本后，再执行：  SOURCE sql/map_data.sql;
--     （或用工具直接运行 map_data.sql）

-- 3.4 失物招领测试数据
--     user_id=2 为测试用户张三；location 文字 + loc_x/loc_y 像素坐标示例
--     （nearest_node_id 留空，由后端发布逻辑吸附填充）
INSERT INTO `lost_found`
  (`user_id`, `type`, `title`, `description`, `category`, `location`, `loc_x`, `loc_y`, `image_urls`, `contact`, `status`, `occurred_at`) VALUES
(2, 'LOST',  '丢失一张校园卡',     '在图书馆附近丢失一张校园卡，卡上姓名张三', 'card',     '图书馆',   1070.5, 816.5, '[]', '微信: zhangsan', 'OPEN',    '2024-12-20 14:00:00'),
(2, 'FOUND', '捡到一把黑色雨伞',   '在第一食堂门口捡到一把黑色长柄雨伞',       'umbrella', '第一食堂', 1350.5, 859.1, '[]', 'QQ: 123456',     'OPEN',    '2024-12-19 16:30:00'),
(2, 'LOST',  '丢失一串钥匙',       '三把钥匙，带一个蓝色钥匙扣',               'keys',     '第二食堂', 940.4,  487.8, '[]', '电话: 13800138000','OPEN',    '2024-12-18 12:00:00'),
(2, 'FOUND', '捡到一本高等数学教材', '在教学A楼捡到',                            'book',     '教学A楼', 1350.5, 859.1, '[]', '微信: zhangsan', 'CLAIMED', '2024-12-17 10:00:00');


-- ============================================
-- 完成。接下来执行地图数据：SOURCE sql/map_data.sql;
-- ============================================
