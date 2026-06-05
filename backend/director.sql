/*
 Navicat Premium Dump SQL

 Source Server         : director
 Source Server Type    : MySQL
 Source Server Version : 80045 (8.0.45)
 Source Host           : localhost:13306
 Source Schema         : director

 Target Server Type    : MySQL
 Target Server Version : 80045 (8.0.45)
 File Encoding         : 65001

 Date: 06/06/2026 00:55:23
*/

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ----------------------------
-- Table structure for alembic_version
-- ----------------------------
DROP TABLE IF EXISTS `alembic_version`;
CREATE TABLE `alembic_version`  (
  `version_num` varchar(32) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`version_num`) USING BTREE
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Records of alembic_version
-- ----------------------------
INSERT INTO `alembic_version` VALUES ('20260604_000001');

-- ----------------------------
-- Table structure for character_appearances
-- ----------------------------
DROP TABLE IF EXISTS `character_appearances`;
CREATE TABLE `character_appearances`  (
  `id` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `character_id` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `appearance_index` int NOT NULL DEFAULT 0,
  `description` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
  `image_prompt` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
  `image_url` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
  `image_media_id` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `candidate_images` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
  `selected` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`) USING BTREE,
  INDEX `image_media_id`(`image_media_id` ASC) USING BTREE,
  INDEX `ix_character_appearances_character_id`(`character_id` ASC) USING BTREE,
  CONSTRAINT `character_appearances_ibfk_1` FOREIGN KEY (`character_id`) REFERENCES `novel_promotion_characters` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT,
  CONSTRAINT `character_appearances_ibfk_2` FOREIGN KEY (`image_media_id`) REFERENCES `media_objects` (`id`) ON DELETE SET NULL ON UPDATE RESTRICT
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Records of character_appearances
-- ----------------------------

-- ----------------------------
-- Table structure for episodes
-- ----------------------------
DROP TABLE IF EXISTS `episodes`;
CREATE TABLE `episodes`  (
  `id` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `project_id` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `episode_number` int NOT NULL,
  `name` varchar(120) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
  `novel_text` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
  `srt_content` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
  `audio_media_id` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE INDEX `uq_project_episode_number`(`project_id` ASC, `episode_number` ASC) USING BTREE,
  INDEX `audio_media_id`(`audio_media_id` ASC) USING BTREE,
  INDEX `ix_episodes_project_id`(`project_id` ASC) USING BTREE,
  CONSTRAINT `episodes_ibfk_1` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT,
  CONSTRAINT `episodes_ibfk_2` FOREIGN KEY (`audio_media_id`) REFERENCES `media_objects` (`id`) ON DELETE SET NULL ON UPDATE RESTRICT
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Records of episodes
-- ----------------------------
INSERT INTO `episodes` VALUES ('00627645-49f2-45c6-b30e-ad4b2b86d9ce', 'aeffc2fa-afc8-4b06-871e-05580084062d', 3, '第 3 集：黑暗中的微光', '两人在酒吧角落谈起孤独与活着的理由，这场偶遇让李铭在黑暗中重新感受到一丝温暖和希望。', '李铭沉默了一会儿，终于开口：“孤单的确让人感觉踏实，但有时也会让人忘记自己为什么而活。”\n\n“或许，我们都在寻找一个理由吧。”女人轻声说道，仿佛在对自己说，也在对李铭说。\n\n那一刻，李铭突然意识到，也许孤独并不是生命的全部。就像这间酒吧，虽然黑暗、安静，却依然有一丝温暖在流动。而他，或许也应该学会在这样的黑暗中，找到属于自己的光。\n\n酒吧里的灯光再次闪烁，仿佛照亮了他心中的一片空白。他深吸了一口气，抬头望向女人的眼睛，突然明白了什么。', NULL, NULL, '2026-04-25 14:03:16', '2026-04-25 14:03:16');
INSERT INTO `episodes` VALUES ('59852ccf-192e-40a4-9524-dd2e952a5530', 'aeffc2fa-afc8-4b06-871e-05580084062d', 2, '第 2 集：陌生人的靠近', '一个神秘女人走进酒吧，与李铭的目光相遇，并主动坐到他的身边，打破了沉寂的夜晚。', '就在这时，一个女人走进了酒吧。她穿着一件简洁的黑色大衣，长发披散在肩头，眼神里透露出一丝疲惫，却又不失坚韧。她走到吧台，点了一杯红酒，随后环顾四周，似乎在寻找着什么。李铭不自觉地盯着她，眼前的这个女人，与他心中那个曾经热情四溢的世界，似乎有着某种难以言喻的联系。\n\n她看见了李铭的目光，微微一笑，然后走向他。\n\n“一个人？”她坐下，轻轻抿了一口酒。\n\n李铭愣了一下，随即点了点头。“是的，一个人。”\n\n女人看着他，眼神中没有任何轻视，只有一种让人难以抗拒的温柔。“我也是。这个世界总是让人觉得，孤单才是最安全的状态。”', NULL, NULL, '2026-04-25 14:03:16', '2026-04-25 14:03:16');
INSERT INTO `episodes` VALUES ('84052888-478a-426b-a28d-555f5953e166', 'aeffc2fa-afc8-4b06-871e-05580084062d', 1, '第 1 集：冬夜失色', '失业多年的李铭在寒冷的城市中游走，带着破败生活留下的疲惫与倔强，最终走进一家冷清的小酒吧。', '在一个寒冷的冬夜，城市的灯光在雾霾中显得有些模糊。李铭穿行在小巷里，身上披着一件破旧的风衣，头发凌乱，眼神却异常坚定。这个城市对于他来说，早已没有了温暖的颜色。曾经繁华的街道，如今已被灰色的建筑和疲惫的人们所填满。他是一个失业多年的年轻人，所有的梦想与希望，都早已被日复一日的忙碌生活所消磨殆尽。\n\n他走进了一间昏暗的小酒吧。酒吧的门口挂着一盏摇摇欲坠的霓虹灯，灯光微弱，却足够吸引过路人的注意。酒吧里没有太多的喧闹，只有几个人在低声交谈，桌上散落着未饮尽的酒杯和被烟雾笼罩的空气。\n\n李铭点了一杯最便宜的啤酒，坐在角落的位置。他的目光扫过酒吧里的每一张面孔，却没有发现熟悉的人。这种感觉并不陌生——孤独，已经成为了他生活的一部分。', NULL, NULL, '2026-04-25 14:03:16', '2026-04-25 14:03:16');

-- ----------------------------
-- Table structure for location_images
-- ----------------------------
DROP TABLE IF EXISTS `location_images`;
CREATE TABLE `location_images`  (
  `id` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `location_id` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `image_prompt` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
  `image_url` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
  `image_media_id` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`) USING BTREE,
  INDEX `image_media_id`(`image_media_id` ASC) USING BTREE,
  INDEX `ix_location_images_location_id`(`location_id` ASC) USING BTREE,
  CONSTRAINT `location_images_ibfk_1` FOREIGN KEY (`location_id`) REFERENCES `novel_promotion_locations` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT,
  CONSTRAINT `location_images_ibfk_2` FOREIGN KEY (`image_media_id`) REFERENCES `media_objects` (`id`) ON DELETE SET NULL ON UPDATE RESTRICT
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Records of location_images
-- ----------------------------

-- ----------------------------
-- Table structure for media_objects
-- ----------------------------
DROP TABLE IF EXISTS `media_objects`;
CREATE TABLE `media_objects`  (
  `id` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `storage_key` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `bucket` varchar(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `mime_type` varchar(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `size_bytes` int NULL DEFAULT NULL,
  `width` int NULL DEFAULT NULL,
  `height` int NULL DEFAULT NULL,
  `duration_ms` int NULL DEFAULT NULL,
  `sha256` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `user_id` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE INDEX `storage_key`(`storage_key` ASC) USING BTREE,
  INDEX `ix_media_objects_user_id`(`user_id` ASC) USING BTREE,
  CONSTRAINT `fk_media_objects_user_id_users` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE RESTRICT
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Records of media_objects
-- ----------------------------

-- ----------------------------
-- Table structure for model_configs
-- ----------------------------
DROP TABLE IF EXISTS `model_configs`;
CREATE TABLE `model_configs`  (
  `id` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `user_id` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `provider_id` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `model_id` varchar(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `display_name` varchar(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `capability` varchar(32) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `request_path` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `extra_headers` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
  `default_params` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  `protocol` varchar(32) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'openai',
  `enabled` tinyint(1) NOT NULL DEFAULT 1,
  `compat_media_template` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
  `compat_media_template_source` varchar(16) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `compat_media_template_checked_at` datetime NULL DEFAULT NULL,
  PRIMARY KEY (`id`) USING BTREE,
  INDEX `ix_model_configs_user_id`(`user_id` ASC) USING BTREE,
  INDEX `ix_model_configs_provider_id`(`provider_id` ASC) USING BTREE,
  INDEX `ix_model_configs_capability`(`capability` ASC) USING BTREE,
  CONSTRAINT `model_configs_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT,
  CONSTRAINT `model_configs_ibfk_2` FOREIGN KEY (`provider_id`) REFERENCES `model_providers` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Records of model_configs
-- ----------------------------
INSERT INTO `model_configs` VALUES ('17a9bc4a-2906-427e-82a2-a3799350da8f', 'b7bdd7ba-3a06-41a2-9aeb-62b67aa6e6a7', 'd5ce94de-2259-4c1b-b31c-25776d10e19f', 'nano-banana-pro', 'nano-banana-pro', 'image', '/pg/chat/completions', NULL, NULL, '2026-04-24 11:01:22', '2026-04-25 03:37:28', 'openai-image', 1, '{\"version\": 1, \"mediaType\": \"image\", \"mode\": \"sync\", \"create\": {\"method\": \"POST\", \"path\": \"/images/generations\", \"contentType\": \"application/json\", \"bodyTemplate\": {\"model\": \"{{model}}\", \"prompt\": \"{{prompt}}\"}}, \"response\": {\"outputUrlPath\": \"$.data[0].url\", \"outputUrlsPath\": \"$.data\", \"errorPath\": \"$.error.message\"}}', 'manual', NULL);
INSERT INTO `model_configs` VALUES ('1af09aab-bf2f-4fdf-b135-a16dd2e5ef71', 'b7bdd7ba-3a06-41a2-9aeb-62b67aa6e6a7', 'd21d0e5b-e658-4f53-afad-df34c5fb3b4b', 'claude-opus-4-8', 'claude-opus-4-8', 'chat', '/v1/chat/completions', NULL, NULL, '2026-06-03 14:05:38', '2026-06-03 14:05:38', 'anthropic', 1, NULL, NULL, NULL);
INSERT INTO `model_configs` VALUES ('8982d1ce-66de-4a9b-9e6b-45cfbbaac763', 'b7bdd7ba-3a06-41a2-9aeb-62b67aa6e6a7', '45633574-be8b-45eb-907c-5a727552f1a0', 'gpt-5.5', 'gpt-5.5', 'chat', '/v1/chat/completions', NULL, NULL, '2026-06-03 15:10:31', '2026-06-03 15:22:21', 'openai', 1, NULL, NULL, NULL);

-- ----------------------------
-- Table structure for model_providers
-- ----------------------------
DROP TABLE IF EXISTS `model_providers`;
CREATE TABLE `model_providers`  (
  `id` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `user_id` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `base_url` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `api_key_encrypted` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  `api_type` varchar(32) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'openai',
  PRIMARY KEY (`id`) USING BTREE,
  INDEX `ix_model_providers_user_id`(`user_id` ASC) USING BTREE,
  CONSTRAINT `model_providers_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Records of model_providers
-- ----------------------------
INSERT INTO `model_providers` VALUES ('45633574-be8b-45eb-907c-5a727552f1a0', 'b7bdd7ba-3a06-41a2-9aeb-62b67aa6e6a7', '冰佬', 'https://icoe.pp.ua', 'gAAAAABqIEPTKjpHJ_0-1T_17H1UK_r0fVPNihH0fq6tynmhm605wWYJb73jBSqxPPUdHMqnJdwyBAXGGnmRd7v_B_-pD-0kLnZ78JyIk5H5aqdiLkkGAWltzlwUzCwmvFaPEbSai1zbFksKZ00Qrk329v4LOpfaK_4oBofkED4FlOE3EAalugU=', '2026-06-03 15:10:11', '2026-06-03 15:10:11', 'openai');
INSERT INTO `model_providers` VALUES ('d21d0e5b-e658-4f53-afad-df34c5fb3b4b', 'b7bdd7ba-3a06-41a2-9aeb-62b67aa6e6a7', 'cpa', 'https://a-ocnfniawgw.cn-shanghai.fcapp.run', 'gAAAAABqIENq5ueeFeLwRxaEeUWMK5-jps0uZbEsn98I9sT_d95e7epxU3D9iZYiXq5zZ-bPlZuo49lP-pcTB1J62AqZ7aqJ3e-4ZTj-F0Yh5Scz-YuVEJbl1NDKtJYY-594yt3hgxIOj3lkB64IAWxRVeX76kqV7w==', '2026-04-25 05:04:29', '2026-06-03 15:08:26', 'openai');
INSERT INTO `model_providers` VALUES ('d5ce94de-2259-4c1b-b31c-25776d10e19f', 'b7bdd7ba-3a06-41a2-9aeb-62b67aa6e6a7', 'huan', 'https://ai.huan666.de', 'gAAAAABp7DXTZQGat-Nj7wjX6SNTtBvRPKQUsg0c8mnypo9yLm3zwQbtPiIGK0hYSjfk12fwnW_n6lrFBcpELIrzYXsmyP-t03aDmnn3m-fzed904SZmQ1jbk4RJ4oXIR-QbWIgbaMH0VLW1tdnVenHahSRufqOT-Q==', '2026-04-24 11:00:23', '2026-04-25 03:32:35', 'openai');

-- ----------------------------
-- Table structure for novel_promotion_characters
-- ----------------------------
DROP TABLE IF EXISTS `novel_promotion_characters`;
CREATE TABLE `novel_promotion_characters`  (
  `id` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `np_project_id` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `aliases` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
  `custom_voice_url` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
  `custom_voice_media_id` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `voice_id` varchar(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `voice_type` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `profile_data` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
  `profile_confirmed` tinyint(1) NOT NULL DEFAULT 0,
  `introduction` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
  `source_global_character_id` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`) USING BTREE,
  INDEX `custom_voice_media_id`(`custom_voice_media_id` ASC) USING BTREE,
  INDEX `ix_np_characters_np_project_id`(`np_project_id` ASC) USING BTREE,
  CONSTRAINT `novel_promotion_characters_ibfk_1` FOREIGN KEY (`np_project_id`) REFERENCES `novel_promotion_projects` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT,
  CONSTRAINT `novel_promotion_characters_ibfk_2` FOREIGN KEY (`custom_voice_media_id`) REFERENCES `media_objects` (`id`) ON DELETE SET NULL ON UPDATE RESTRICT
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Records of novel_promotion_characters
-- ----------------------------

-- ----------------------------
-- Table structure for novel_promotion_clips
-- ----------------------------
DROP TABLE IF EXISTS `novel_promotion_clips`;
CREATE TABLE `novel_promotion_clips`  (
  `id` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `episode_id` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `start` int NULL DEFAULT NULL,
  `end` int NULL DEFAULT NULL,
  `duration` int NULL DEFAULT NULL,
  `summary` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `location` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
  `content` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `characters` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
  `props` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
  `start_text` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
  `end_text` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
  `shot_count` int NULL DEFAULT NULL,
  `screenplay` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`) USING BTREE,
  INDEX `ix_np_clips_episode_id`(`episode_id` ASC) USING BTREE,
  CONSTRAINT `novel_promotion_clips_ibfk_1` FOREIGN KEY (`episode_id`) REFERENCES `novel_promotion_episodes` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Records of novel_promotion_clips
-- ----------------------------

-- ----------------------------
-- Table structure for novel_promotion_episodes
-- ----------------------------
DROP TABLE IF EXISTS `novel_promotion_episodes`;
CREATE TABLE `novel_promotion_episodes`  (
  `id` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `np_project_id` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `episode_number` int NOT NULL,
  `name` varchar(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
  `novel_text` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
  `audio_url` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
  `audio_media_id` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `srt_content` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
  `speaker_voices` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE INDEX `uq_np_episode_number`(`np_project_id` ASC, `episode_number` ASC) USING BTREE,
  INDEX `audio_media_id`(`audio_media_id` ASC) USING BTREE,
  INDEX `ix_np_episodes_np_project_id`(`np_project_id` ASC) USING BTREE,
  CONSTRAINT `novel_promotion_episodes_ibfk_1` FOREIGN KEY (`np_project_id`) REFERENCES `novel_promotion_projects` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT,
  CONSTRAINT `novel_promotion_episodes_ibfk_2` FOREIGN KEY (`audio_media_id`) REFERENCES `media_objects` (`id`) ON DELETE SET NULL ON UPDATE RESTRICT
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Records of novel_promotion_episodes
-- ----------------------------

-- ----------------------------
-- Table structure for novel_promotion_locations
-- ----------------------------
DROP TABLE IF EXISTS `novel_promotion_locations`;
CREATE TABLE `novel_promotion_locations`  (
  `id` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `np_project_id` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `summary` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
  `asset_kind` varchar(32) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'location',
  `source_global_location_id` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `selected_image_id` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`) USING BTREE,
  INDEX `ix_np_locations_np_project_id`(`np_project_id` ASC) USING BTREE,
  CONSTRAINT `novel_promotion_locations_ibfk_1` FOREIGN KEY (`np_project_id`) REFERENCES `novel_promotion_projects` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Records of novel_promotion_locations
-- ----------------------------

-- ----------------------------
-- Table structure for novel_promotion_panels
-- ----------------------------
DROP TABLE IF EXISTS `novel_promotion_panels`;
CREATE TABLE `novel_promotion_panels`  (
  `id` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `storyboard_id` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `panel_index` int NOT NULL,
  `panel_number` int NULL DEFAULT NULL,
  `shot_type` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
  `camera_move` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
  `description` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
  `location` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
  `characters` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
  `props` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
  `srt_segment` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
  `srt_start` float NULL DEFAULT NULL,
  `srt_end` float NULL DEFAULT NULL,
  `duration` float NULL DEFAULT NULL,
  `image_prompt` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
  `image_url` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
  `image_media_id` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `image_history` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
  `video_prompt` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
  `first_last_frame_prompt` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
  `video_url` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
  `video_generation_mode` varchar(32) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `video_media_id` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `scene_type` varchar(32) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `candidate_images` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
  `linked_to_next_panel` tinyint(1) NOT NULL DEFAULT 0,
  `lip_sync_task_id` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `lip_sync_video_url` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
  `lip_sync_video_media_id` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `sketch_image_url` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
  `sketch_image_media_id` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `previous_image_url` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
  `previous_image_media_id` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `photography_rules` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
  `acting_notes` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE INDEX `uq_np_panel_index`(`storyboard_id` ASC, `panel_index` ASC) USING BTREE,
  INDEX `image_media_id`(`image_media_id` ASC) USING BTREE,
  INDEX `video_media_id`(`video_media_id` ASC) USING BTREE,
  INDEX `lip_sync_video_media_id`(`lip_sync_video_media_id` ASC) USING BTREE,
  INDEX `sketch_image_media_id`(`sketch_image_media_id` ASC) USING BTREE,
  INDEX `previous_image_media_id`(`previous_image_media_id` ASC) USING BTREE,
  INDEX `ix_np_panels_storyboard_id`(`storyboard_id` ASC) USING BTREE,
  CONSTRAINT `novel_promotion_panels_ibfk_1` FOREIGN KEY (`storyboard_id`) REFERENCES `novel_promotion_storyboards` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT,
  CONSTRAINT `novel_promotion_panels_ibfk_2` FOREIGN KEY (`image_media_id`) REFERENCES `media_objects` (`id`) ON DELETE SET NULL ON UPDATE RESTRICT,
  CONSTRAINT `novel_promotion_panels_ibfk_3` FOREIGN KEY (`video_media_id`) REFERENCES `media_objects` (`id`) ON DELETE SET NULL ON UPDATE RESTRICT,
  CONSTRAINT `novel_promotion_panels_ibfk_4` FOREIGN KEY (`lip_sync_video_media_id`) REFERENCES `media_objects` (`id`) ON DELETE SET NULL ON UPDATE RESTRICT,
  CONSTRAINT `novel_promotion_panels_ibfk_5` FOREIGN KEY (`sketch_image_media_id`) REFERENCES `media_objects` (`id`) ON DELETE SET NULL ON UPDATE RESTRICT,
  CONSTRAINT `novel_promotion_panels_ibfk_6` FOREIGN KEY (`previous_image_media_id`) REFERENCES `media_objects` (`id`) ON DELETE SET NULL ON UPDATE RESTRICT
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Records of novel_promotion_panels
-- ----------------------------

-- ----------------------------
-- Table structure for novel_promotion_projects
-- ----------------------------
DROP TABLE IF EXISTS `novel_promotion_projects`;
CREATE TABLE `novel_promotion_projects`  (
  `id` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `project_id` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `analysis_model` varchar(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `image_model` varchar(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `video_model` varchar(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `audio_model` varchar(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `character_model` varchar(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `location_model` varchar(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `storyboard_model` varchar(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `edit_model` varchar(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `video_ratio` varchar(16) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '9:16',
  `tts_rate` varchar(16) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '+50%',
  `art_style` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'american-comic',
  `art_style_prompt` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
  `video_resolution` varchar(32) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '720p',
  `image_resolution` varchar(32) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '2K',
  `workflow_mode` varchar(32) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'srt',
  `global_asset_text` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
  `capability_overrides` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
  `last_episode_id` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `import_status` varchar(32) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE INDEX `project_id`(`project_id` ASC) USING BTREE,
  CONSTRAINT `novel_promotion_projects_ibfk_1` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Records of novel_promotion_projects
-- ----------------------------
INSERT INTO `novel_promotion_projects` VALUES ('fde53c4d-ccbd-462e-913d-0122a354bb46', 'aeffc2fa-afc8-4b06-871e-05580084062d', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '9:16', '+50%', 'american-comic', NULL, '720p', '2K', 'srt', NULL, NULL, NULL, NULL, '2026-04-25 14:03:16', '2026-04-25 14:03:16');

-- ----------------------------
-- Table structure for novel_promotion_shots
-- ----------------------------
DROP TABLE IF EXISTS `novel_promotion_shots`;
CREATE TABLE `novel_promotion_shots`  (
  `id` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `episode_id` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `clip_id` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `shot_id` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `srt_start` int NOT NULL DEFAULT 0,
  `srt_end` int NOT NULL DEFAULT 0,
  `srt_duration` float NOT NULL DEFAULT 0,
  `sequence` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
  `locations` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
  `characters` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
  `plot` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
  `image_prompt` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
  `scale` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
  `module` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
  `focus` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
  `zh_summarize` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
  `pov` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
  `image_url` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
  `image_media_id` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`) USING BTREE,
  INDEX `image_media_id`(`image_media_id` ASC) USING BTREE,
  INDEX `ix_np_shots_episode_id`(`episode_id` ASC) USING BTREE,
  INDEX `ix_np_shots_clip_id`(`clip_id` ASC) USING BTREE,
  INDEX `ix_np_shots_shot_id`(`shot_id` ASC) USING BTREE,
  CONSTRAINT `novel_promotion_shots_ibfk_1` FOREIGN KEY (`episode_id`) REFERENCES `novel_promotion_episodes` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT,
  CONSTRAINT `novel_promotion_shots_ibfk_2` FOREIGN KEY (`clip_id`) REFERENCES `novel_promotion_clips` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT,
  CONSTRAINT `novel_promotion_shots_ibfk_3` FOREIGN KEY (`image_media_id`) REFERENCES `media_objects` (`id`) ON DELETE SET NULL ON UPDATE RESTRICT
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Records of novel_promotion_shots
-- ----------------------------

-- ----------------------------
-- Table structure for novel_promotion_storyboards
-- ----------------------------
DROP TABLE IF EXISTS `novel_promotion_storyboards`;
CREATE TABLE `novel_promotion_storyboards`  (
  `id` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `episode_id` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `clip_id` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `storyboard_image_url` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
  `panel_count` int NOT NULL DEFAULT 9,
  `storyboard_text_json` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
  `image_history` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
  `candidate_images` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
  `last_error` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `photography_plan` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE INDEX `clip_id`(`clip_id` ASC) USING BTREE,
  INDEX `ix_np_storyboards_episode_id`(`episode_id` ASC) USING BTREE,
  CONSTRAINT `novel_promotion_storyboards_ibfk_1` FOREIGN KEY (`episode_id`) REFERENCES `novel_promotion_episodes` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT,
  CONSTRAINT `novel_promotion_storyboards_ibfk_2` FOREIGN KEY (`clip_id`) REFERENCES `novel_promotion_clips` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Records of novel_promotion_storyboards
-- ----------------------------

-- ----------------------------
-- Table structure for novel_promotion_voice_lines
-- ----------------------------
DROP TABLE IF EXISTS `novel_promotion_voice_lines`;
CREATE TABLE `novel_promotion_voice_lines`  (
  `id` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `episode_id` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `line_index` int NOT NULL DEFAULT 0,
  `speaker` varchar(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '',
  `content` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `voice_preset_id` varchar(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `audio_url` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
  `audio_media_id` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `matched_panel_id` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `srt_start` float NULL DEFAULT NULL,
  `srt_end` float NULL DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`) USING BTREE,
  INDEX `audio_media_id`(`audio_media_id` ASC) USING BTREE,
  INDEX `ix_np_voice_lines_episode_id`(`episode_id` ASC) USING BTREE,
  INDEX `ix_np_voice_lines_matched_panel_id`(`matched_panel_id` ASC) USING BTREE,
  INDEX `ix_np_voice_lines_episode_line`(`episode_id` ASC, `line_index` ASC) USING BTREE,
  CONSTRAINT `novel_promotion_voice_lines_ibfk_1` FOREIGN KEY (`episode_id`) REFERENCES `novel_promotion_episodes` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT,
  CONSTRAINT `novel_promotion_voice_lines_ibfk_2` FOREIGN KEY (`audio_media_id`) REFERENCES `media_objects` (`id`) ON DELETE SET NULL ON UPDATE RESTRICT,
  CONSTRAINT `novel_promotion_voice_lines_ibfk_3` FOREIGN KEY (`matched_panel_id`) REFERENCES `novel_promotion_panels` (`id`) ON DELETE SET NULL ON UPDATE RESTRICT
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Records of novel_promotion_voice_lines
-- ----------------------------

-- ----------------------------
-- Table structure for project_assets
-- ----------------------------
DROP TABLE IF EXISTS `project_assets`;
CREATE TABLE `project_assets`  (
  `id` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `project_id` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `kind` varchar(32) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(120) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  `preview_media_id` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  PRIMARY KEY (`id`) USING BTREE,
  INDEX `ix_project_assets_project_id`(`project_id` ASC) USING BTREE,
  INDEX `ix_project_assets_kind`(`kind` ASC) USING BTREE,
  INDEX `fk_project_assets_preview_media_id_media_objects`(`preview_media_id` ASC) USING BTREE,
  CONSTRAINT `fk_project_assets_preview_media_id_media_objects` FOREIGN KEY (`preview_media_id`) REFERENCES `media_objects` (`id`) ON DELETE SET NULL ON UPDATE RESTRICT,
  CONSTRAINT `project_assets_ibfk_1` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Records of project_assets
-- ----------------------------

-- ----------------------------
-- Table structure for project_settings
-- ----------------------------
DROP TABLE IF EXISTS `project_settings`;
CREATE TABLE `project_settings`  (
  `id` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `project_id` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `analysis_model` varchar(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `character_model` varchar(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `location_model` varchar(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `storyboard_model` varchar(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `video_model` varchar(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `audio_model` varchar(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `art_style` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `video_ratio` varchar(16) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `video_resolution` varchar(32) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE INDEX `project_id`(`project_id` ASC) USING BTREE,
  CONSTRAINT `project_settings_ibfk_1` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Records of project_settings
-- ----------------------------
INSERT INTO `project_settings` VALUES ('4cdf82bf-c0f8-4f44-b48e-fcec82f92d2e', 'aeffc2fa-afc8-4b06-871e-05580084062d', 'gpt-5.5', 'nano-banana-pro', 'nano-banana-pro', 'gpt-5.5', NULL, NULL, '电影级二次元写实', '16:9', '1080p', '2026-04-25 05:10:40', '2026-06-03 16:26:22');

-- ----------------------------
-- Table structure for projects
-- ----------------------------
DROP TABLE IF EXISTS `projects`;
CREATE TABLE `projects`  (
  `id` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `user_id` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  `intake_novel_text` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
  PRIMARY KEY (`id`) USING BTREE,
  INDEX `ix_projects_user_id`(`user_id` ASC) USING BTREE,
  CONSTRAINT `projects_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Records of projects
-- ----------------------------
INSERT INTO `projects` VALUES ('aeffc2fa-afc8-4b06-871e-05580084062d', 'b7bdd7ba-3a06-41a2-9aeb-62b67aa6e6a7', '漫剧', '做漫剧', '2026-04-25 05:10:39', '2026-04-25 05:10:39', NULL);

-- ----------------------------
-- Table structure for refresh_tokens
-- ----------------------------
DROP TABLE IF EXISTS `refresh_tokens`;
CREATE TABLE `refresh_tokens`  (
  `id` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `user_id` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `token_hash` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `expires_at` datetime NOT NULL,
  `created_at` datetime NOT NULL,
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE INDEX `token_hash`(`token_hash` ASC) USING BTREE,
  UNIQUE INDEX `ix_refresh_tokens_token_hash`(`token_hash` ASC) USING BTREE,
  INDEX `ix_refresh_tokens_user_id`(`user_id` ASC) USING BTREE,
  CONSTRAINT `refresh_tokens_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Records of refresh_tokens
-- ----------------------------
INSERT INTO `refresh_tokens` VALUES ('0217b884-befd-4221-8ab0-581132ffd5e1', 'b7bdd7ba-3a06-41a2-9aeb-62b67aa6e6a7', '960bdb4084ca5b62337a8e420040cf070eff5aef798e27c7c4da646b1d5207c0', '2026-05-25 01:56:49', '2026-04-25 01:56:49');
INSERT INTO `refresh_tokens` VALUES ('0c1ca976-b2b9-460a-a9fc-693bbcbec93d', 'b7bdd7ba-3a06-41a2-9aeb-62b67aa6e6a7', 'fbb467248de5cb542532fcfb8b101ff72d524ac17d40bb6f5169860e25f2796d', '2026-05-24 06:21:13', '2026-04-24 06:21:13');
INSERT INTO `refresh_tokens` VALUES ('0c478d21-190c-4eaa-86b8-56b94c6e424f', 'b7bdd7ba-3a06-41a2-9aeb-62b67aa6e6a7', '5048521aa21d4509db38649ca31a570e9e708c444b93ee74047a8ecb6de737df', '2026-05-17 10:15:54', '2026-04-17 10:15:54');
INSERT INTO `refresh_tokens` VALUES ('151fdb11-577f-4c31-8ac9-91154fa52875', 'b7bdd7ba-3a06-41a2-9aeb-62b67aa6e6a7', 'c5d1721b04a43dfb2a3e948e3a048bbf9b7a2afd9a0b18a8eafb25ca377958a4', '2026-05-24 11:29:19', '2026-04-24 11:29:19');
INSERT INTO `refresh_tokens` VALUES ('1b779d9b-a31d-419b-ae62-634f435352aa', 'b7bdd7ba-3a06-41a2-9aeb-62b67aa6e6a7', '9d77a2e27864760704497932497a5fba306c28783460c63b724de6e297a0020d', '2026-05-26 16:39:14', '2026-04-26 16:39:14');
INSERT INTO `refresh_tokens` VALUES ('295fe947-3853-4bf7-afca-a2984a220800', 'b7bdd7ba-3a06-41a2-9aeb-62b67aa6e6a7', 'ce92d70e2c189407bc879a1d807f1121dd0c88e42b690e9cd7a4c8821cb72bda', '2026-05-25 05:01:20', '2026-04-25 05:01:20');
INSERT INTO `refresh_tokens` VALUES ('35fc9613-def1-4c25-be8d-6438049c9fbf', 'b7bdd7ba-3a06-41a2-9aeb-62b67aa6e6a7', '61405852accf6ad96e349d4703eff56b6c1aae8c27da0f72c0bc82b6ce35c62d', '2026-07-03 17:22:02', '2026-06-03 17:22:02');
INSERT INTO `refresh_tokens` VALUES ('3bc23eb1-9a58-4ecf-b138-0b24592c8a2d', 'b7bdd7ba-3a06-41a2-9aeb-62b67aa6e6a7', 'b8c36220e767b313491aecb89937b3bbbff21f2804960fca93e005d836a9502b', '2026-05-25 11:09:03', '2026-04-25 11:09:03');
INSERT INTO `refresh_tokens` VALUES ('480fb461-5d4f-4283-b01e-61e8867043be', 'b7bdd7ba-3a06-41a2-9aeb-62b67aa6e6a7', 'd3d802c8ce77f8ff4bdca9505d69151fc622460c1ace62e3fb7656e4610eb6ad', '2026-07-03 17:10:52', '2026-06-03 17:10:52');
INSERT INTO `refresh_tokens` VALUES ('48dda024-248c-452a-9244-db1ea9d77eb6', 'b7bdd7ba-3a06-41a2-9aeb-62b67aa6e6a7', 'a266ca12a20f349f4db30dc2bc139ffdd20a19f9758ede0912e0f1d353e462f0', '2026-05-25 13:59:43', '2026-04-25 13:59:43');
INSERT INTO `refresh_tokens` VALUES ('4bf31a6c-8512-4e5e-a65e-3130064b2f62', 'b7bdd7ba-3a06-41a2-9aeb-62b67aa6e6a7', '8ad0e564ec6d34745289beda2699ff33e2dc2d4753996299789cc49491e67316', '2026-05-24 10:46:20', '2026-04-24 10:46:20');
INSERT INTO `refresh_tokens` VALUES ('57c4c6af-8dbb-4e3d-ae59-13788673e8e5', 'b7bdd7ba-3a06-41a2-9aeb-62b67aa6e6a7', 'fa4a24e5d361cb62a667068e2711f064fb922913de4eef48d8218b909efcc651', '2026-05-24 06:05:28', '2026-04-24 06:05:28');
INSERT INTO `refresh_tokens` VALUES ('60855a4e-7c36-49f9-ab5e-8ddfc51e6d07', 'b7bdd7ba-3a06-41a2-9aeb-62b67aa6e6a7', '0188325b70012c90687128d1d2a4193fd8a87fdfef1cb74f2a3f34d65665cd5f', '2026-06-29 15:02:55', '2026-05-30 15:02:55');
INSERT INTO `refresh_tokens` VALUES ('6708726d-a36a-4188-ae09-9d57872c0cc6', 'b7bdd7ba-3a06-41a2-9aeb-62b67aa6e6a7', '38cdc402d42f38645813344fb543f2b7d132363107313e527a3840603d6f6bb4', '2026-05-24 06:06:45', '2026-04-24 06:06:45');
INSERT INTO `refresh_tokens` VALUES ('69b74871-9327-4995-bb54-a1452d8b619c', 'b7bdd7ba-3a06-41a2-9aeb-62b67aa6e6a7', 'cc97be24ffebeda9bf2662d97872a4c781cd01685e384bf64ebb0726791b8708', '2026-05-24 11:18:34', '2026-04-24 11:18:34');
INSERT INTO `refresh_tokens` VALUES ('79849e35-4cc4-48a9-8ec0-9fb6d3e585ce', 'b7bdd7ba-3a06-41a2-9aeb-62b67aa6e6a7', '8c8d471911ba407dfa7cfe48582c82783b040591e613e435ae09e06a9fbb7ff4', '2026-05-24 06:47:12', '2026-04-24 06:47:12');
INSERT INTO `refresh_tokens` VALUES ('7a7e59bd-6d9b-4560-9757-241e862d0911', 'b7bdd7ba-3a06-41a2-9aeb-62b67aa6e6a7', '27a19c4e23d1330870aed50627d629ef397c180cb8d3201e00a53ab1b5c81c69', '2026-05-26 09:17:54', '2026-04-26 09:17:54');
INSERT INTO `refresh_tokens` VALUES ('7ddb150b-7286-46a9-b726-ed6edb268e55', 'b7bdd7ba-3a06-41a2-9aeb-62b67aa6e6a7', '37bc53ba65fccbc32b0bf857920c4a00c7f2458886f5f28c395a929bc810fbc6', '2026-05-22 04:02:59', '2026-04-22 04:02:59');
INSERT INTO `refresh_tokens` VALUES ('84bc0398-feaa-49f0-a53b-978426f284ba', 'b7bdd7ba-3a06-41a2-9aeb-62b67aa6e6a7', 'ec0ed9401403cf5ec81874b1f90c076d87819ef5d82ec15a45785cd68ca5af6d', '2026-06-29 10:50:39', '2026-05-30 10:50:39');
INSERT INTO `refresh_tokens` VALUES ('877d94c5-37de-4458-82f5-2ee924e78e75', 'b7bdd7ba-3a06-41a2-9aeb-62b67aa6e6a7', '0149976d555c5d11c6d2c6c9aad2135cb3b96aeea7957f71a392271b9333a30f', '2026-05-21 02:17:12', '2026-04-21 02:17:12');
INSERT INTO `refresh_tokens` VALUES ('8e5116b5-f66e-4e58-8e08-ffda324b6696', 'b7bdd7ba-3a06-41a2-9aeb-62b67aa6e6a7', 'f953916880f4b16fdac27f4c397347041b7da25768b5bd59d01d0363717c3292', '2026-05-24 07:22:42', '2026-04-24 07:22:42');
INSERT INTO `refresh_tokens` VALUES ('98c72abe-24bb-453f-a5e0-a852fa8398eb', 'b7bdd7ba-3a06-41a2-9aeb-62b67aa6e6a7', '73519358d3664db1bf0fd3398937ac2ddf64fb9a6a4c821b0f2138bbb2c885c1', '2026-07-03 17:21:34', '2026-06-03 17:21:34');
INSERT INTO `refresh_tokens` VALUES ('9c93bdc8-a432-4a7d-bb2d-97c1bd775e8d', 'b7bdd7ba-3a06-41a2-9aeb-62b67aa6e6a7', 'a99cc5fabfddf9e8da9ef8e6eb0b08856f3e3b8004087bbca9bb10704191d660', '2026-07-03 16:41:59', '2026-06-03 16:41:59');
INSERT INTO `refresh_tokens` VALUES ('a7375418-b531-4155-9126-c0d5495c505e', 'b7bdd7ba-3a06-41a2-9aeb-62b67aa6e6a7', 'f010b08065c255eba04e3dd2ff2c190adf76a33a767ac4698c653320de6811c5', '2026-05-24 10:58:41', '2026-04-24 10:58:41');
INSERT INTO `refresh_tokens` VALUES ('a746089d-679d-49ad-a389-e65c3c0f041c', 'b7bdd7ba-3a06-41a2-9aeb-62b67aa6e6a7', '4522665f78251196e540e258c57179d6134f46bb385a28a52f5d537153d373a0', '2026-05-24 06:05:16', '2026-04-24 06:05:16');
INSERT INTO `refresh_tokens` VALUES ('b85a64f1-9862-4ba1-8359-3a4401947140', 'b7bdd7ba-3a06-41a2-9aeb-62b67aa6e6a7', '46639320434810b1b35e2aa7037e01cb74d0cf625b2ea1e5ad60d4ae0827a918', '2026-07-03 15:22:08', '2026-06-03 15:22:08');
INSERT INTO `refresh_tokens` VALUES ('c7ecc483-6f26-41e8-b19e-00ebb340c7b9', 'b7bdd7ba-3a06-41a2-9aeb-62b67aa6e6a7', '861573c0f5e3fdf67b628a063e7de4f95bf325cb3523fcc95b9c6304a6da45fe', '2026-06-29 13:11:55', '2026-05-30 13:11:55');
INSERT INTO `refresh_tokens` VALUES ('e6ca0dc6-51a1-4b62-9c50-1e9031461134', 'b7bdd7ba-3a06-41a2-9aeb-62b67aa6e6a7', '0e25d462b2277dcbb4f290f063343dd4a1efe1a7f0e70109c9f474a233772dec', '2026-05-24 11:20:39', '2026-04-24 11:20:39');
INSERT INTO `refresh_tokens` VALUES ('f060fddc-c3f2-4856-8fa1-109a33110a34', 'b7bdd7ba-3a06-41a2-9aeb-62b67aa6e6a7', '31d7aa0e9ac78154068bf3d3edfa5140459f5dff77695b87e7b0b3d1737a6c93', '2026-07-03 13:49:17', '2026-06-03 13:49:17');
INSERT INTO `refresh_tokens` VALUES ('f65bbfe1-7900-4857-aed5-ae238a7bbb96', 'b7bdd7ba-3a06-41a2-9aeb-62b67aa6e6a7', 'aed77366af1d967e31cd4af05ae19e868a22c6c802f879f2ddbd4068eb22bc85', '2026-07-01 15:16:46', '2026-06-01 15:16:46');
INSERT INTO `refresh_tokens` VALUES ('f8849408-0753-4eee-a3ce-d85364aa59c4', 'b7bdd7ba-3a06-41a2-9aeb-62b67aa6e6a7', 'f00851fdf05c702b20575642e061ab18892234b320353f146be96dcfef2d0aab', '2026-06-29 13:12:01', '2026-05-30 13:12:01');
INSERT INTO `refresh_tokens` VALUES ('fca2d9d4-b392-4139-8cba-5bf8d8e29abd', 'b7bdd7ba-3a06-41a2-9aeb-62b67aa6e6a7', '575eef1c4b23ff2e02fcfd86c999677560aa36504729b776ede1114436c852d1', '2026-05-22 04:03:10', '2026-04-22 04:03:10');
INSERT INTO `refresh_tokens` VALUES ('fda6450b-17a4-4410-977e-a7b576c5aad1', 'b7bdd7ba-3a06-41a2-9aeb-62b67aa6e6a7', '97021bf61a8ad4343749c2416a70ad0cfce48bde63e7ab9e4bd7d2b8efcde5e8', '2026-05-21 03:30:04', '2026-04-21 03:30:04');

-- ----------------------------
-- Table structure for storyboard_panels
-- ----------------------------
DROP TABLE IF EXISTS `storyboard_panels`;
CREATE TABLE `storyboard_panels`  (
  `id` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `storyboard_id` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `panel_index` int NOT NULL,
  `description` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `image_prompt` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
  `video_prompt` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
  `image_media_id` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `video_media_id` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE INDEX `uq_storyboard_panel_index`(`storyboard_id` ASC, `panel_index` ASC) USING BTREE,
  INDEX `image_media_id`(`image_media_id` ASC) USING BTREE,
  INDEX `video_media_id`(`video_media_id` ASC) USING BTREE,
  INDEX `ix_storyboard_panels_storyboard_id`(`storyboard_id` ASC) USING BTREE,
  CONSTRAINT `storyboard_panels_ibfk_1` FOREIGN KEY (`storyboard_id`) REFERENCES `storyboards` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT,
  CONSTRAINT `storyboard_panels_ibfk_2` FOREIGN KEY (`image_media_id`) REFERENCES `media_objects` (`id`) ON DELETE SET NULL ON UPDATE RESTRICT,
  CONSTRAINT `storyboard_panels_ibfk_3` FOREIGN KEY (`video_media_id`) REFERENCES `media_objects` (`id`) ON DELETE SET NULL ON UPDATE RESTRICT
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Records of storyboard_panels
-- ----------------------------

-- ----------------------------
-- Table structure for storyboards
-- ----------------------------
DROP TABLE IF EXISTS `storyboards`;
CREATE TABLE `storyboards`  (
  `id` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `user_id` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `project_id` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `episode_id` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `panel_count` int NOT NULL,
  `source_task_id` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`) USING BTREE,
  INDEX `source_task_id`(`source_task_id` ASC) USING BTREE,
  INDEX `ix_storyboards_user_id`(`user_id` ASC) USING BTREE,
  INDEX `ix_storyboards_project_id`(`project_id` ASC) USING BTREE,
  INDEX `ix_storyboards_episode_id`(`episode_id` ASC) USING BTREE,
  CONSTRAINT `storyboards_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT,
  CONSTRAINT `storyboards_ibfk_2` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT,
  CONSTRAINT `storyboards_ibfk_3` FOREIGN KEY (`episode_id`) REFERENCES `episodes` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT,
  CONSTRAINT `storyboards_ibfk_4` FOREIGN KEY (`source_task_id`) REFERENCES `tasks` (`id`) ON DELETE SET NULL ON UPDATE RESTRICT
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Records of storyboards
-- ----------------------------

-- ----------------------------
-- Table structure for supplementary_panels
-- ----------------------------
DROP TABLE IF EXISTS `supplementary_panels`;
CREATE TABLE `supplementary_panels`  (
  `id` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `storyboard_id` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `source_type` varchar(32) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `source_panel_id` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `description` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
  `image_prompt` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
  `image_url` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
  `image_media_id` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `characters` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
  `location` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`) USING BTREE,
  INDEX `image_media_id`(`image_media_id` ASC) USING BTREE,
  INDEX `ix_supplementary_panels_storyboard_id`(`storyboard_id` ASC) USING BTREE,
  CONSTRAINT `supplementary_panels_ibfk_1` FOREIGN KEY (`storyboard_id`) REFERENCES `novel_promotion_storyboards` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT,
  CONSTRAINT `supplementary_panels_ibfk_2` FOREIGN KEY (`image_media_id`) REFERENCES `media_objects` (`id`) ON DELETE SET NULL ON UPDATE RESTRICT
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Records of supplementary_panels
-- ----------------------------

-- ----------------------------
-- Table structure for task_events
-- ----------------------------
DROP TABLE IF EXISTS `task_events`;
CREATE TABLE `task_events`  (
  `id` int NOT NULL AUTO_INCREMENT,
  `task_id` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `project_id` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `user_id` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `event_type` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `payload_json` json NULL,
  `created_at` datetime NOT NULL,
  PRIMARY KEY (`id`) USING BTREE,
  INDEX `ix_task_events_task_id`(`task_id` ASC) USING BTREE,
  INDEX `ix_task_events_project_id`(`project_id` ASC) USING BTREE,
  INDEX `ix_task_events_user_id`(`user_id` ASC) USING BTREE,
  CONSTRAINT `task_events_ibfk_1` FOREIGN KEY (`task_id`) REFERENCES `tasks` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT,
  CONSTRAINT `task_events_ibfk_2` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT,
  CONSTRAINT `task_events_ibfk_3` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT
) ENGINE = InnoDB AUTO_INCREMENT = 31 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Records of task_events
-- ----------------------------
INSERT INTO `task_events` VALUES (1, '980e1cd9-d182-40b6-b61a-aa939f9e2ecd', 'aeffc2fa-afc8-4b06-871e-05580084062d', 'b7bdd7ba-3a06-41a2-9aeb-62b67aa6e6a7', 'task.created', '{\"stage\": \"queued\", \"task_type\": \"story_to_script_run\"}', '2026-04-25 14:03:47');
INSERT INTO `task_events` VALUES (2, '980e1cd9-d182-40b6-b61a-aa939f9e2ecd', 'aeffc2fa-afc8-4b06-871e-05580084062d', 'b7bdd7ba-3a06-41a2-9aeb-62b67aa6e6a7', 'task.processing', '{\"stage\": \"processing\", \"progress\": 10}', '2026-04-25 14:03:47');
INSERT INTO `task_events` VALUES (3, '980e1cd9-d182-40b6-b61a-aa939f9e2ecd', 'aeffc2fa-afc8-4b06-871e-05580084062d', 'b7bdd7ba-3a06-41a2-9aeb-62b67aa6e6a7', 'task.completed', '{\"stage\": \"completed\", \"progress\": 100}', '2026-04-25 14:03:47');
INSERT INTO `task_events` VALUES (4, '94320e2d-23a0-40bf-9391-274b7621326d', 'aeffc2fa-afc8-4b06-871e-05580084062d', 'b7bdd7ba-3a06-41a2-9aeb-62b67aa6e6a7', 'task.created', '{\"stage\": \"queued\", \"task_type\": \"np_intake_preview\"}', '2026-04-26 16:40:27');
INSERT INTO `task_events` VALUES (5, '94320e2d-23a0-40bf-9391-274b7621326d', 'aeffc2fa-afc8-4b06-871e-05580084062d', 'b7bdd7ba-3a06-41a2-9aeb-62b67aa6e6a7', 'task.started', '{\"stage\": \"started\", \"message\": null, \"payload\": {}, \"task_id\": \"94320e2d-23a0-40bf-9391-274b7621326d\", \"progress\": 0, \"timestamp\": \"2026-04-26T16:40:28.941718+00:00\"}', '2026-04-26 16:40:29');
INSERT INTO `task_events` VALUES (6, '94320e2d-23a0-40bf-9391-274b7621326d', 'aeffc2fa-afc8-4b06-871e-05580084062d', 'b7bdd7ba-3a06-41a2-9aeb-62b67aa6e6a7', 'task.progress', '{\"stage\": \"resolve-model\", \"message\": null, \"payload\": {}, \"task_id\": \"94320e2d-23a0-40bf-9391-274b7621326d\", \"progress\": 5, \"timestamp\": \"2026-04-26T16:40:29.036747+00:00\"}', '2026-04-26 16:40:29');
INSERT INTO `task_events` VALUES (7, '94320e2d-23a0-40bf-9391-274b7621326d', 'aeffc2fa-afc8-4b06-871e-05580084062d', 'b7bdd7ba-3a06-41a2-9aeb-62b67aa6e6a7', 'task.progress', '{\"stage\": \"prepare-input\", \"message\": null, \"payload\": {}, \"task_id\": \"94320e2d-23a0-40bf-9391-274b7621326d\", \"progress\": 15, \"timestamp\": \"2026-04-26T16:40:29.196586+00:00\"}', '2026-04-26 16:40:29');
INSERT INTO `task_events` VALUES (8, '94320e2d-23a0-40bf-9391-274b7621326d', 'aeffc2fa-afc8-4b06-871e-05580084062d', 'b7bdd7ba-3a06-41a2-9aeb-62b67aa6e6a7', 'task.progress', '{\"stage\": \"llm-call\", \"message\": \"model=gpt-5.4\", \"payload\": {}, \"task_id\": \"94320e2d-23a0-40bf-9391-274b7621326d\", \"progress\": 55, \"timestamp\": \"2026-04-26T16:40:29.265336+00:00\"}', '2026-04-26 16:40:29');
INSERT INTO `task_events` VALUES (9, '94320e2d-23a0-40bf-9391-274b7621326d', 'aeffc2fa-afc8-4b06-871e-05580084062d', 'b7bdd7ba-3a06-41a2-9aeb-62b67aa6e6a7', 'task.progress', '{\"stage\": \"parse-output\", \"message\": null, \"payload\": {}, \"task_id\": \"94320e2d-23a0-40bf-9391-274b7621326d\", \"progress\": 75, \"timestamp\": \"2026-04-26T16:42:30.836014+00:00\"}', '2026-04-26 16:42:31');
INSERT INTO `task_events` VALUES (10, '94320e2d-23a0-40bf-9391-274b7621326d', 'aeffc2fa-afc8-4b06-871e-05580084062d', 'b7bdd7ba-3a06-41a2-9aeb-62b67aa6e6a7', 'task.progress', '{\"stage\": \"normalize-preview\", \"message\": null, \"payload\": {}, \"task_id\": \"94320e2d-23a0-40bf-9391-274b7621326d\", \"progress\": 90, \"timestamp\": \"2026-04-26T16:42:30.915283+00:00\"}', '2026-04-26 16:42:31');
INSERT INTO `task_events` VALUES (11, '94320e2d-23a0-40bf-9391-274b7621326d', 'aeffc2fa-afc8-4b06-871e-05580084062d', 'b7bdd7ba-3a06-41a2-9aeb-62b67aa6e6a7', 'task.progress', '{\"stage\": \"completed\", \"message\": null, \"payload\": {}, \"task_id\": \"94320e2d-23a0-40bf-9391-274b7621326d\", \"progress\": 100, \"timestamp\": \"2026-04-26T16:42:30.984923+00:00\"}', '2026-04-26 16:42:31');
INSERT INTO `task_events` VALUES (12, '94320e2d-23a0-40bf-9391-274b7621326d', 'aeffc2fa-afc8-4b06-871e-05580084062d', 'b7bdd7ba-3a06-41a2-9aeb-62b67aa6e6a7', 'task.completed', '{\"stage\": \"completed\", \"message\": null, \"payload\": {\"analysis\": {\"pace\": \"steady\", \"genre\": \"都市现实,情感治愈\", \"scenes\": [{\"index\": 1, \"preview\": \"在一个寒冷的冬夜，城市的灯光在雾霾中显得有些模糊。李铭穿行在小巷里\", \"location\": \"冬夜城市小巷\", \"positionRatio\": 0.0}, {\"index\": 2, \"preview\": \"他走进了一间昏暗的小酒吧。酒吧的门口挂着一盏摇摇欲坠的霓虹灯\", \"location\": \"昏暗小酒吧\", \"positionRatio\": 0.23}, {\"index\": 3, \"preview\": \"她看见了李铭的目光，微微一笑，然后走向他。\\\"一个人？\\\"她坐下\", \"location\": \"酒吧角落座位\", \"positionRatio\": 0.53}], \"dialogue\": {\"totalLines\": 5, \"averageLength\": 14, \"longestLength\": 29, \"ratioOfTotalText\": 0.19}, \"emotions\": [{\"key\": \"loneliness\", \"count\": 5, \"label\": \"孤独\"}, {\"key\": \"weariness\", \"count\": 3, \"label\": \"疲惫\"}, {\"key\": \"warmth\", \"count\": 2, \"label\": \"温暖\"}, {\"key\": \"hope\", \"count\": 2, \"label\": \"希望\"}, {\"key\": \"determination\", \"count\": 2, \"label\": \"坚定\"}], \"keywords\": [{\"word\": \"李铭\", \"frequency\": 7}, {\"word\": \"酒吧\", \"frequency\": 6}, {\"word\": \"女人\", \"frequency\": 5}, {\"word\": \"孤单\", \"frequency\": 3}, {\"word\": \"温暖\", \"frequency\": 2}, {\"word\": \"世界\", \"frequency\": 2}, {\"word\": \"城市\", \"frequency\": 2}, {\"word\": \"光\", \"frequency\": 2}], \"characters\": [{\"name\": \"李铭\", \"lineCount\": 2, \"wordCount\": 31, \"sampleQuote\": \"孤单的确让人感觉踏实，但有时也会让人忘记自己为什么而活。\", \"firstAppearanceRatio\": 0.03}, {\"name\": \"女人\", \"lineCount\": 3, \"wordCount\": 43, \"sampleQuote\": \"或许，我们都在寻找一个理由吧。\", \"firstAppearanceRatio\": 0.45}], \"totalChars\": 819, \"totalWords\": 441, \"sentenceCount\": 28, \"paragraphCount\": 11, \"sentimentScore\": -0.12}, \"model_used\": \"gpt-5.4\", \"request_url\": \"http://188.239.23.49:8317/v1/chat/completions\", \"split_episodes\": [{\"title\": \"第 1 集：冬夜与酒吧\", \"number\": 1, \"content\": \"在一个寒冷的冬夜，城市的灯光在雾霾中显得有些模糊。李铭穿行在小巷里，身上披着一件破旧的风衣，头发凌乱，眼神却异常坚定。这个城市对于他来说，早已没有了温暖的颜色。曾经繁华的街道，如今已被灰色的建筑和疲惫的人们所填满。他是一个失业多年的年轻人，所有的梦想与希望，都早已被日复一日的忙碌生活所消磨殆尽。\\n\\n他走进了一间昏暗的小酒吧。酒吧的门口挂着一盏摇摇欲坠的霓虹灯，灯光微弱，却足够吸引过路人的注意。酒吧里没有太多的喧闹，只有几个人在低声交谈，桌上散落着未饮尽的酒杯和被烟雾笼罩的空气。\\n\\n李铭点了一杯最便宜的啤酒，坐在角落的位置。他的目光扫过酒吧里的每一张面孔，却没有发现熟悉的人。这种感觉并不陌生——孤独，已经成为了他生活的一部分。\", \"summary\": \"失业多年的李铭在寒冷冬夜中穿行城市，带着被现实磨损的心走进一间昏暗酒吧，独自坐在角落里与孤独相伴。\", \"wordCount\": 284}, {\"title\": \"第 2 集：她走向他\", \"number\": 2, \"content\": \"就在这时，一个女人走进了酒吧。她穿着一件简洁的黑色大衣，长发披散在肩头，眼神里透露出一丝疲惫，却又不失坚韧。她走到吧台，点了一杯红酒，随后环顾四周，似乎在寻找着什么。李铭不自觉地盯着她，眼前的这个女人，与他心中那个曾经热情四溢的世界，似乎有着某种难以言喻的联系。\\n\\n她看见了李铭的目光，微微一笑，然后走向他。\\n\\n“一个人？”她坐下，轻轻抿了一口酒。\\n\\n李铭愣了一下，随即点了点头。“是的，一个人。”\\n\\n女人看着他，眼神中没有任何轻视，只有一种让人难以抗拒的温柔。“我也是。这个世界总是让人觉得，孤单才是最安全的状态。”\", \"summary\": \"一个神秘而温柔的女人走进酒吧，在与李铭对视后主动靠近，两人以“一个人”为开端，展开关于孤单与安全感的试探性对话。\", \"wordCount\": 215}, {\"title\": \"第 3 集：黑暗中的光\", \"number\": 3, \"content\": \"李铭沉默了一会儿，终于开口：“孤单的确让人感觉踏实，但有时也会让人忘记自己为什么而活。”\\n\\n“或许，我们都在寻找一个理由吧。”女人轻声说道，仿佛在对自己说，也在对李铭说。\\n\\n那一刻，李铭突然意识到，也许孤独并不是生命的全部。就像这间酒吧，虽然黑暗、安静，却依然有一丝温暖在流动。而他，或许也应该学会在这样的黑暗中，找到属于自己的光。\\n\\n酒吧里的灯光再次闪烁，仿佛照亮了他心中的一片空白。他深吸了一口气，抬头望向女人的眼睛，突然明白了什么。\", \"summary\": \"李铭在女人的话语中被触动，第一次重新审视孤独与活着的意义，并在酒吧昏暗灯光中感受到久违的温暖与希望。\", \"wordCount\": 185}]}, \"task_id\": \"94320e2d-23a0-40bf-9391-274b7621326d\", \"progress\": 100, \"timestamp\": \"2026-04-26T16:42:31.036645+00:00\"}', '2026-04-26 16:42:31');
INSERT INTO `task_events` VALUES (13, '24ca3d5c-c9c9-4318-b065-ef7e29461f95', 'aeffc2fa-afc8-4b06-871e-05580084062d', 'b7bdd7ba-3a06-41a2-9aeb-62b67aa6e6a7', 'task.created', '{\"stage\": \"queued\", \"task_type\": \"story_to_script_run\"}', '2026-05-30 10:56:51');
INSERT INTO `task_events` VALUES (14, '24ca3d5c-c9c9-4318-b065-ef7e29461f95', 'aeffc2fa-afc8-4b06-871e-05580084062d', 'b7bdd7ba-3a06-41a2-9aeb-62b67aa6e6a7', 'task.processing', '{\"stage\": \"processing\", \"progress\": 10}', '2026-05-30 10:56:51');
INSERT INTO `task_events` VALUES (15, '24ca3d5c-c9c9-4318-b065-ef7e29461f95', 'aeffc2fa-afc8-4b06-871e-05580084062d', 'b7bdd7ba-3a06-41a2-9aeb-62b67aa6e6a7', 'task.completed', '{\"stage\": \"completed\", \"progress\": 100}', '2026-05-30 10:56:51');
INSERT INTO `task_events` VALUES (16, 'ef93c29a-456a-4dae-9ec9-e65b96b368c1', 'aeffc2fa-afc8-4b06-871e-05580084062d', 'b7bdd7ba-3a06-41a2-9aeb-62b67aa6e6a7', 'task.created', '{\"stage\": \"queued\", \"task_type\": \"np_intake_preview\"}', '2026-05-30 13:41:07');
INSERT INTO `task_events` VALUES (17, 'ef93c29a-456a-4dae-9ec9-e65b96b368c1', 'aeffc2fa-afc8-4b06-871e-05580084062d', 'b7bdd7ba-3a06-41a2-9aeb-62b67aa6e6a7', 'task.started', '{\"stage\": \"started\", \"message\": null, \"payload\": {}, \"task_id\": \"ef93c29a-456a-4dae-9ec9-e65b96b368c1\", \"progress\": 0, \"timestamp\": \"2026-05-30T13:41:08.109938+00:00\"}', '2026-05-30 13:41:08');
INSERT INTO `task_events` VALUES (18, 'ef93c29a-456a-4dae-9ec9-e65b96b368c1', 'aeffc2fa-afc8-4b06-871e-05580084062d', 'b7bdd7ba-3a06-41a2-9aeb-62b67aa6e6a7', 'task.progress', '{\"stage\": \"resolve-model\", \"message\": null, \"payload\": {}, \"task_id\": \"ef93c29a-456a-4dae-9ec9-e65b96b368c1\", \"progress\": 5, \"timestamp\": \"2026-05-30T13:41:08.220916+00:00\"}', '2026-05-30 13:41:08');
INSERT INTO `task_events` VALUES (19, 'ef93c29a-456a-4dae-9ec9-e65b96b368c1', 'aeffc2fa-afc8-4b06-871e-05580084062d', 'b7bdd7ba-3a06-41a2-9aeb-62b67aa6e6a7', 'task.progress', '{\"stage\": \"prepare-input\", \"message\": null, \"payload\": {}, \"task_id\": \"ef93c29a-456a-4dae-9ec9-e65b96b368c1\", \"progress\": 15, \"timestamp\": \"2026-05-30T13:41:08.333073+00:00\"}', '2026-05-30 13:41:08');
INSERT INTO `task_events` VALUES (20, 'ef93c29a-456a-4dae-9ec9-e65b96b368c1', 'aeffc2fa-afc8-4b06-871e-05580084062d', 'b7bdd7ba-3a06-41a2-9aeb-62b67aa6e6a7', 'task.progress', '{\"stage\": \"llm-call\", \"message\": \"model=gpt-5.5\", \"payload\": {}, \"task_id\": \"ef93c29a-456a-4dae-9ec9-e65b96b368c1\", \"progress\": 55, \"timestamp\": \"2026-05-30T13:41:08.382874+00:00\"}', '2026-05-30 13:41:08');
INSERT INTO `task_events` VALUES (21, 'ef93c29a-456a-4dae-9ec9-e65b96b368c1', 'aeffc2fa-afc8-4b06-871e-05580084062d', 'b7bdd7ba-3a06-41a2-9aeb-62b67aa6e6a7', 'task.failed', '{\"stage\": \"failed\", \"message\": \"network error: \", \"payload\": {}, \"task_id\": \"ef93c29a-456a-4dae-9ec9-e65b96b368c1\", \"progress\": null, \"timestamp\": \"2026-05-30T13:43:15.027182+00:00\"}', '2026-05-30 13:43:15');
INSERT INTO `task_events` VALUES (22, '87147725-9f38-4d3d-a562-c7068ab9b033', 'aeffc2fa-afc8-4b06-871e-05580084062d', 'b7bdd7ba-3a06-41a2-9aeb-62b67aa6e6a7', 'task.created', '{\"stage\": \"queued\", \"task_type\": \"np_intake_preview\"}', '2026-05-30 15:03:22');
INSERT INTO `task_events` VALUES (23, '87147725-9f38-4d3d-a562-c7068ab9b033', 'aeffc2fa-afc8-4b06-871e-05580084062d', 'b7bdd7ba-3a06-41a2-9aeb-62b67aa6e6a7', 'task.started', '{\"stage\": \"started\", \"message\": null, \"payload\": {}, \"task_id\": \"87147725-9f38-4d3d-a562-c7068ab9b033\", \"progress\": 0, \"timestamp\": \"2026-05-30T15:03:22.805323+00:00\"}', '2026-05-30 15:03:23');
INSERT INTO `task_events` VALUES (24, '87147725-9f38-4d3d-a562-c7068ab9b033', 'aeffc2fa-afc8-4b06-871e-05580084062d', 'b7bdd7ba-3a06-41a2-9aeb-62b67aa6e6a7', 'task.progress', '{\"stage\": \"resolve-model\", \"message\": null, \"payload\": {}, \"task_id\": \"87147725-9f38-4d3d-a562-c7068ab9b033\", \"progress\": 5, \"timestamp\": \"2026-05-30T15:03:22.847567+00:00\"}', '2026-05-30 15:03:23');
INSERT INTO `task_events` VALUES (25, '87147725-9f38-4d3d-a562-c7068ab9b033', 'aeffc2fa-afc8-4b06-871e-05580084062d', 'b7bdd7ba-3a06-41a2-9aeb-62b67aa6e6a7', 'task.progress', '{\"stage\": \"prepare-input\", \"message\": null, \"payload\": {}, \"task_id\": \"87147725-9f38-4d3d-a562-c7068ab9b033\", \"progress\": 15, \"timestamp\": \"2026-05-30T15:03:22.932926+00:00\"}', '2026-05-30 15:03:23');
INSERT INTO `task_events` VALUES (26, '87147725-9f38-4d3d-a562-c7068ab9b033', 'aeffc2fa-afc8-4b06-871e-05580084062d', 'b7bdd7ba-3a06-41a2-9aeb-62b67aa6e6a7', 'task.progress', '{\"stage\": \"llm-call\", \"message\": \"model=gpt-5.5\", \"payload\": {}, \"task_id\": \"87147725-9f38-4d3d-a562-c7068ab9b033\", \"progress\": 55, \"timestamp\": \"2026-05-30T15:03:22.967939+00:00\"}', '2026-05-30 15:03:23');
INSERT INTO `task_events` VALUES (27, '87147725-9f38-4d3d-a562-c7068ab9b033', 'aeffc2fa-afc8-4b06-871e-05580084062d', 'b7bdd7ba-3a06-41a2-9aeb-62b67aa6e6a7', 'task.failed', '{\"stage\": \"failed\", \"message\": \"network error: \", \"payload\": {}, \"task_id\": \"87147725-9f38-4d3d-a562-c7068ab9b033\", \"progress\": null, \"timestamp\": \"2026-05-30T15:05:26.213318+00:00\"}', '2026-05-30 15:05:26');
INSERT INTO `task_events` VALUES (28, '7dd223ca-6cde-4a46-b5cd-3eec4222190c', 'aeffc2fa-afc8-4b06-871e-05580084062d', 'b7bdd7ba-3a06-41a2-9aeb-62b67aa6e6a7', 'task.created', '{\"stage\": \"queued\", \"task_type\": \"story_to_script_run\"}', '2026-06-03 15:22:48');
INSERT INTO `task_events` VALUES (29, '7dd223ca-6cde-4a46-b5cd-3eec4222190c', 'aeffc2fa-afc8-4b06-871e-05580084062d', 'b7bdd7ba-3a06-41a2-9aeb-62b67aa6e6a7', 'task.processing', '{\"stage\": \"processing\", \"progress\": 10}', '2026-06-03 15:22:48');
INSERT INTO `task_events` VALUES (30, '7dd223ca-6cde-4a46-b5cd-3eec4222190c', 'aeffc2fa-afc8-4b06-871e-05580084062d', 'b7bdd7ba-3a06-41a2-9aeb-62b67aa6e6a7', 'task.completed', '{\"stage\": \"completed\", \"progress\": 100}', '2026-06-03 15:22:49');

-- ----------------------------
-- Table structure for tasks
-- ----------------------------
DROP TABLE IF EXISTS `tasks`;
CREATE TABLE `tasks`  (
  `id` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `user_id` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `project_id` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `episode_id` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `task_type` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `target_type` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `target_id` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` varchar(32) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `progress` int NOT NULL,
  `payload_json` json NULL,
  `result_json` json NULL,
  `error_code` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `error_message` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
  `queued_at` datetime NOT NULL,
  `started_at` datetime NULL DEFAULT NULL,
  `finished_at` datetime NULL DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`) USING BTREE,
  INDEX `ix_tasks_user_id`(`user_id` ASC) USING BTREE,
  INDEX `ix_tasks_project_id`(`project_id` ASC) USING BTREE,
  INDEX `ix_tasks_episode_id`(`episode_id` ASC) USING BTREE,
  INDEX `ix_tasks_task_type`(`task_type` ASC) USING BTREE,
  INDEX `ix_tasks_target_id`(`target_id` ASC) USING BTREE,
  INDEX `ix_tasks_status`(`status` ASC) USING BTREE,
  CONSTRAINT `tasks_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT,
  CONSTRAINT `tasks_ibfk_2` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT,
  CONSTRAINT `tasks_ibfk_3` FOREIGN KEY (`episode_id`) REFERENCES `episodes` (`id`) ON DELETE SET NULL ON UPDATE RESTRICT
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Records of tasks
-- ----------------------------
INSERT INTO `tasks` VALUES ('24ca3d5c-c9c9-4318-b065-ef7e29461f95', 'b7bdd7ba-3a06-41a2-9aeb-62b67aa6e6a7', 'aeffc2fa-afc8-4b06-871e-05580084062d', '84052888-478a-426b-a28d-555f5953e166', 'story_to_script_run', 'episode', '84052888-478a-426b-a28d-555f5953e166', 'completed', 100, '{}', '{\"script\": {\"title\": \"Story Script\", \"scenes\": [{\"description\": \"Untitled story\", \"scene_index\": 1}], \"summary\": \"Untitled story\"}}', NULL, NULL, '2026-05-30 10:56:51', '2026-05-30 10:56:51', '2026-05-30 10:56:51', '2026-05-30 10:56:51', '2026-05-30 10:56:51');
INSERT INTO `tasks` VALUES ('7dd223ca-6cde-4a46-b5cd-3eec4222190c', 'b7bdd7ba-3a06-41a2-9aeb-62b67aa6e6a7', 'aeffc2fa-afc8-4b06-871e-05580084062d', '84052888-478a-426b-a28d-555f5953e166', 'story_to_script_run', 'episode', '84052888-478a-426b-a28d-555f5953e166', 'completed', 100, '{}', '{\"script\": {\"title\": \"Story Script\", \"scenes\": [{\"description\": \"Untitled story\", \"scene_index\": 1}], \"summary\": \"Untitled story\"}}', NULL, NULL, '2026-06-03 15:22:48', '2026-06-03 15:22:48', '2026-06-03 15:22:48', '2026-06-03 15:22:48', '2026-06-03 15:22:48');
INSERT INTO `tasks` VALUES ('87147725-9f38-4d3d-a562-c7068ab9b033', 'b7bdd7ba-3a06-41a2-9aeb-62b67aa6e6a7', 'aeffc2fa-afc8-4b06-871e-05580084062d', NULL, 'np_intake_preview', 'np_project', 'fde53c4d-ccbd-462e-913d-0122a354bb46', 'failed', 55, '{\"content\": \"青玄山下雪的时候，整座外门都安静得像一口封了百年的井。\\n\\n林照夜抱着一捆湿柴，从山脚走回杂役院时，天色已经暗了。雪粒打在他肩头，很快融成冰水，顺着破旧的麻衣往里钻。他却像感觉不到冷，只低头看着怀里的柴，生怕再被风雪浸坏。\\n\\n今日是外门弟子领取灵米的日子，杂役弟子本也有半斗，可等林照夜赶到膳堂时，只剩下空桶和几声嘲笑。\\n\\n“灵根残缺的人，吃了灵米也是浪费。”管事弟子赵衡把登记木牌往桌上一丢，眼皮都懒得抬，“你这个月的份例，折成柴火任务了。”\\n\\n林照夜没有争。\\n\\n在青玄宗，争辩只属于有靠山的人。他没有靠山，只有一枚被磨得发亮的旧铜钱。那是娘亲临终前塞给他的，说若有一日走投无路，便握着它，别怕。\\n\\n他回到杂役院时，院中灯火稀疏，几个同住的杂役正围着炉子喝热粥。见他进门，有人瞥了一眼，故意把粥碗端远些。\\n\\n林照夜把湿柴堆到墙角，转身去了后山废殿。\\n\\n那地方原是青玄宗供奉祖师的旧殿，后来山体滑塌，灵脉偏移，便荒废了。外门弟子嫌那里阴气重，从不靠近。林照夜却常去，因为那里没有人抢他的地方，也没有人笑他的灵根。\\n\\n废殿里漏着风，半边屋顶塌了，雪从裂缝中落下，铺在碎石和断香炉上。林照夜在角落生起一盏青油灯，火光微弱，却照亮了供台后方半截残碑。\\n\\n碑上刻着残缺的经文。\\n\\n三年前，他第一次在这里避雨时发现了它。经文不知是何人所留，字迹古朴，许多地方已经模糊。他照着上面的吐纳法练了三年，体内却始终只有一丝若有若无的灵气，像寒夜里快熄灭的火星。\\n\\n今夜，他仍旧盘膝坐下。\\n\\n风雪声在殿外呼啸，林照夜闭上眼，将那缕微弱灵气沿着经脉缓缓运转。每过一处窍穴，便像细针刺骨，疼得他额头冒汗。残缺灵根吸纳灵气极慢，外门传功长老曾断言，他此生最多炼气一层。\\n\\n可他不信。\\n\\n若天生道路断绝，那便用命去凿。\\n\\n不知过了多久，怀中的旧铜钱忽然发烫。\\n\\n林照夜猛地睁眼，只见铜钱自行飞出，悬在青灯之上。灯火一晃，原本昏黄的火苗竟变成幽青色，照向那半截残碑。\\n\\n下一刻，残碑上那些模糊不清的字迹仿佛活了过来，一笔一画浮出石面，化作细小金光，涌入他的眉心。\\n\\n剧痛轰然炸开。\\n\\n林照夜只觉天地倒转，耳边似有万古钟声响起。破败废殿不见了，风雪不见了，他站在一片无边星海中，脚下是一条由白骨铺成的长路。长路尽头，有人背对众生而立，衣袍猎猎，手中提着一盏青灯。\\n\\n那人没有回头，只淡淡开口：“后来者，既点燃长夜灯，便承我一脉因果。”\\n\\n林照夜想问他是谁，喉咙却发不出声音。\\n\\n青灯骤然大亮。\\n\\n无数文字如星河垂落，印入他的识海——《长夜归墟经》。\\n\\n与此同时，他体内那条堵塞多年的经脉，竟在青光冲刷下寸寸贯通。灵气从四面八方涌来，穿过废殿裂缝，穿过漫天风雪，疯狂灌入他的身体。\\n\\n炼气一层。\\n\\n炼气二层。\\n\\n直到第三道灵气漩涡在丹田凝成时，林照夜才咳出一口黑血，重重倒在地上。\\n\\n青灯恢复昏暗，铜钱落回掌心。\\n\\n殿外雪声渐止。\\n\\n林照夜撑着残碑慢慢站起，眼中第一次有了锋芒。他能清晰感觉到，天地间的灵气不再拒他于门外，反而像听见了某种召唤，温顺地绕在他身边。\\n\\n就在这时，废殿外忽然传来脚步声。\\n\\n“奇怪，方才明明有灵气波动。”\\n\\n是赵衡的声音。\\n\\n林照夜将铜钱收进袖中，转身望向殿门。风吹开残破木门，雪光映入殿内，也映出赵衡惊疑的脸。\\n\\n两人目光相撞。\\n\\n赵衡先是一愣，随即冷笑：“原来是你这个废物躲在这里。说，你刚才得了什么东西？”\\n\\n林照夜没有回答。\\n\\n他只是抬起手，掌心青光一闪。\\n\\n那盏残破的青油灯，忽然无风自燃。\"}', NULL, 'HANDLER_ERROR', 'network error: ', '2026-05-30 15:03:22', '2026-05-30 15:03:23', '2026-05-30 15:05:26', '2026-05-30 15:03:22', '2026-05-30 15:05:26');
INSERT INTO `tasks` VALUES ('94320e2d-23a0-40bf-9391-274b7621326d', 'b7bdd7ba-3a06-41a2-9aeb-62b67aa6e6a7', 'aeffc2fa-afc8-4b06-871e-05580084062d', NULL, 'np_intake_preview', 'np_project', 'fde53c4d-ccbd-462e-913d-0122a354bb46', 'completed', 100, '{\"content\": \"在一个寒冷的冬夜，城市的灯光在雾霾中显得有些模糊。李铭穿行在小巷里，身上披着一件破旧的风衣，头发凌乱，眼神却异常坚定。这个城市对于他来说，早已没有了温暖的颜色。曾经繁华的街道，如今已被灰色的建筑和疲惫的人们所填满。他是一个失业多年的年轻人，所有的梦想与希望，都早已被日复一日的忙碌生活所消磨殆尽。\\n\\n他走进了一间昏暗的小酒吧。酒吧的门口挂着一盏摇摇欲坠的霓虹灯，灯光微弱，却足够吸引过路人的注意。酒吧里没有太多的喧闹，只有几个人在低声交谈，桌上散落着未饮尽的酒杯和被烟雾笼罩的空气。\\n\\n李铭点了一杯最便宜的啤酒，坐在角落的位置。他的目光扫过酒吧里的每一张面孔，却没有发现熟悉的人。这种感觉并不陌生——孤独，已经成为了他生活的一部分。\\n\\n就在这时，一个女人走进了酒吧。她穿着一件简洁的黑色大衣，长发披散在肩头，眼神里透露出一丝疲惫，却又不失坚韧。她走到吧台，点了一杯红酒，随后环顾四周，似乎在寻找着什么。李铭不自觉地盯着她，眼前的这个女人，与他心中那个曾经热情四溢的世界，似乎有着某种难以言喻的联系。\\n\\n她看见了李铭的目光，微微一笑，然后走向他。\\n\\n“一个人？”她坐下，轻轻抿了一口酒。\\n\\n李铭愣了一下，随即点了点头。“是的，一个人。”\\n\\n女人看着他，眼神中没有任何轻视，只有一种让人难以抗拒的温柔。“我也是。这个世界总是让人觉得，孤单才是最安全的状态。”\\n\\n李铭沉默了一会儿，终于开口：“孤单的确让人感觉踏实，但有时也会让人忘记自己为什么而活。”\\n\\n“或许，我们都在寻找一个理由吧。”女人轻声说道，仿佛在对自己说，也在对李铭说。\\n\\n那一刻，李铭突然意识到，也许孤独并不是生命的全部。就像这间酒吧，虽然黑暗、安静，却依然有一丝温暖在流动。而他，或许也应该学会在这样的黑暗中，找到属于自己的光。\\n\\n酒吧里的灯光再次闪烁，仿佛照亮了他心中的一片空白。他深吸了一口气，抬头望向女人的眼睛，突然明白了什么。\"}', '{\"analysis\": {\"pace\": \"steady\", \"genre\": \"都市现实,情感治愈\", \"scenes\": [{\"index\": 1, \"preview\": \"在一个寒冷的冬夜，城市的灯光在雾霾中显得有些模糊。李铭穿行在小巷里\", \"location\": \"冬夜城市小巷\", \"positionRatio\": 0.0}, {\"index\": 2, \"preview\": \"他走进了一间昏暗的小酒吧。酒吧的门口挂着一盏摇摇欲坠的霓虹灯\", \"location\": \"昏暗小酒吧\", \"positionRatio\": 0.23}, {\"index\": 3, \"preview\": \"她看见了李铭的目光，微微一笑，然后走向他。\\\"一个人？\\\"她坐下\", \"location\": \"酒吧角落座位\", \"positionRatio\": 0.53}], \"dialogue\": {\"totalLines\": 5, \"averageLength\": 14, \"longestLength\": 29, \"ratioOfTotalText\": 0.19}, \"emotions\": [{\"key\": \"loneliness\", \"count\": 5, \"label\": \"孤独\"}, {\"key\": \"weariness\", \"count\": 3, \"label\": \"疲惫\"}, {\"key\": \"warmth\", \"count\": 2, \"label\": \"温暖\"}, {\"key\": \"hope\", \"count\": 2, \"label\": \"希望\"}, {\"key\": \"determination\", \"count\": 2, \"label\": \"坚定\"}], \"keywords\": [{\"word\": \"李铭\", \"frequency\": 7}, {\"word\": \"酒吧\", \"frequency\": 6}, {\"word\": \"女人\", \"frequency\": 5}, {\"word\": \"孤单\", \"frequency\": 3}, {\"word\": \"温暖\", \"frequency\": 2}, {\"word\": \"世界\", \"frequency\": 2}, {\"word\": \"城市\", \"frequency\": 2}, {\"word\": \"光\", \"frequency\": 2}], \"characters\": [{\"name\": \"李铭\", \"lineCount\": 2, \"wordCount\": 31, \"sampleQuote\": \"孤单的确让人感觉踏实，但有时也会让人忘记自己为什么而活。\", \"firstAppearanceRatio\": 0.03}, {\"name\": \"女人\", \"lineCount\": 3, \"wordCount\": 43, \"sampleQuote\": \"或许，我们都在寻找一个理由吧。\", \"firstAppearanceRatio\": 0.45}], \"totalChars\": 819, \"totalWords\": 441, \"sentenceCount\": 28, \"paragraphCount\": 11, \"sentimentScore\": -0.12}, \"model_used\": \"gpt-5.4\", \"request_url\": \"http://188.239.23.49:8317/v1/chat/completions\", \"split_episodes\": [{\"title\": \"第 1 集：冬夜与酒吧\", \"number\": 1, \"content\": \"在一个寒冷的冬夜，城市的灯光在雾霾中显得有些模糊。李铭穿行在小巷里，身上披着一件破旧的风衣，头发凌乱，眼神却异常坚定。这个城市对于他来说，早已没有了温暖的颜色。曾经繁华的街道，如今已被灰色的建筑和疲惫的人们所填满。他是一个失业多年的年轻人，所有的梦想与希望，都早已被日复一日的忙碌生活所消磨殆尽。\\n\\n他走进了一间昏暗的小酒吧。酒吧的门口挂着一盏摇摇欲坠的霓虹灯，灯光微弱，却足够吸引过路人的注意。酒吧里没有太多的喧闹，只有几个人在低声交谈，桌上散落着未饮尽的酒杯和被烟雾笼罩的空气。\\n\\n李铭点了一杯最便宜的啤酒，坐在角落的位置。他的目光扫过酒吧里的每一张面孔，却没有发现熟悉的人。这种感觉并不陌生——孤独，已经成为了他生活的一部分。\", \"summary\": \"失业多年的李铭在寒冷冬夜中穿行城市，带着被现实磨损的心走进一间昏暗酒吧，独自坐在角落里与孤独相伴。\", \"wordCount\": 284}, {\"title\": \"第 2 集：她走向他\", \"number\": 2, \"content\": \"就在这时，一个女人走进了酒吧。她穿着一件简洁的黑色大衣，长发披散在肩头，眼神里透露出一丝疲惫，却又不失坚韧。她走到吧台，点了一杯红酒，随后环顾四周，似乎在寻找着什么。李铭不自觉地盯着她，眼前的这个女人，与他心中那个曾经热情四溢的世界，似乎有着某种难以言喻的联系。\\n\\n她看见了李铭的目光，微微一笑，然后走向他。\\n\\n“一个人？”她坐下，轻轻抿了一口酒。\\n\\n李铭愣了一下，随即点了点头。“是的，一个人。”\\n\\n女人看着他，眼神中没有任何轻视，只有一种让人难以抗拒的温柔。“我也是。这个世界总是让人觉得，孤单才是最安全的状态。”\", \"summary\": \"一个神秘而温柔的女人走进酒吧，在与李铭对视后主动靠近，两人以“一个人”为开端，展开关于孤单与安全感的试探性对话。\", \"wordCount\": 215}, {\"title\": \"第 3 集：黑暗中的光\", \"number\": 3, \"content\": \"李铭沉默了一会儿，终于开口：“孤单的确让人感觉踏实，但有时也会让人忘记自己为什么而活。”\\n\\n“或许，我们都在寻找一个理由吧。”女人轻声说道，仿佛在对自己说，也在对李铭说。\\n\\n那一刻，李铭突然意识到，也许孤独并不是生命的全部。就像这间酒吧，虽然黑暗、安静，却依然有一丝温暖在流动。而他，或许也应该学会在这样的黑暗中，找到属于自己的光。\\n\\n酒吧里的灯光再次闪烁，仿佛照亮了他心中的一片空白。他深吸了一口气，抬头望向女人的眼睛，突然明白了什么。\", \"summary\": \"李铭在女人的话语中被触动，第一次重新审视孤独与活着的意义，并在酒吧昏暗灯光中感受到久违的温暖与希望。\", \"wordCount\": 185}]}', NULL, NULL, '2026-04-26 16:40:27', '2026-04-26 16:40:29', '2026-04-26 16:42:31', '2026-04-26 16:40:27', '2026-04-26 16:42:31');
INSERT INTO `tasks` VALUES ('980e1cd9-d182-40b6-b61a-aa939f9e2ecd', 'b7bdd7ba-3a06-41a2-9aeb-62b67aa6e6a7', 'aeffc2fa-afc8-4b06-871e-05580084062d', '84052888-478a-426b-a28d-555f5953e166', 'story_to_script_run', 'episode', '84052888-478a-426b-a28d-555f5953e166', 'completed', 100, '{}', '{\"script\": {\"title\": \"Story Script\", \"scenes\": [{\"description\": \"Untitled story\", \"scene_index\": 1}], \"summary\": \"Untitled story\"}}', NULL, NULL, '2026-04-25 14:03:47', '2026-04-25 14:03:47', '2026-04-25 14:03:47', '2026-04-25 14:03:47', '2026-04-25 14:03:47');
INSERT INTO `tasks` VALUES ('ef93c29a-456a-4dae-9ec9-e65b96b368c1', 'b7bdd7ba-3a06-41a2-9aeb-62b67aa6e6a7', 'aeffc2fa-afc8-4b06-871e-05580084062d', NULL, 'np_intake_preview', 'np_project', 'fde53c4d-ccbd-462e-913d-0122a354bb46', 'failed', 55, '{\"content\": \"青玄山下雪的时候，整座外门都安静得像一口封了百年的井。\\n\\n林照夜抱着一捆湿柴，从山脚走回杂役院时，天色已经暗了。雪粒打在他肩头，很快融成冰水，顺着破旧的麻衣往里钻。他却像感觉不到冷，只低头看着怀里的柴，生怕再被风雪浸坏。\\n\\n今日是外门弟子领取灵米的日子，杂役弟子本也有半斗，可等林照夜赶到膳堂时，只剩下空桶和几声嘲笑。\\n\\n“灵根残缺的人，吃了灵米也是浪费。”管事弟子赵衡把登记木牌往桌上一丢，眼皮都懒得抬，“你这个月的份例，折成柴火任务了。”\\n\\n林照夜没有争。\\n\\n在青玄宗，争辩只属于有靠山的人。他没有靠山，只有一枚被磨得发亮的旧铜钱。那是娘亲临终前塞给他的，说若有一日走投无路，便握着它，别怕。\\n\\n他回到杂役院时，院中灯火稀疏，几个同住的杂役正围着炉子喝热粥。见他进门，有人瞥了一眼，故意把粥碗端远些。\\n\\n林照夜把湿柴堆到墙角，转身去了后山废殿。\\n\\n那地方原是青玄宗供奉祖师的旧殿，后来山体滑塌，灵脉偏移，便荒废了。外门弟子嫌那里阴气重，从不靠近。林照夜却常去，因为那里没有人抢他的地方，也没有人笑他的灵根。\\n\\n废殿里漏着风，半边屋顶塌了，雪从裂缝中落下，铺在碎石和断香炉上。林照夜在角落生起一盏青油灯，火光微弱，却照亮了供台后方半截残碑。\\n\\n碑上刻着残缺的经文。\\n\\n三年前，他第一次在这里避雨时发现了它。经文不知是何人所留，字迹古朴，许多地方已经模糊。他照着上面的吐纳法练了三年，体内却始终只有一丝若有若无的灵气，像寒夜里快熄灭的火星。\\n\\n今夜，他仍旧盘膝坐下。\\n\\n风雪声在殿外呼啸，林照夜闭上眼，将那缕微弱灵气沿着经脉缓缓运转。每过一处窍穴，便像细针刺骨，疼得他额头冒汗。残缺灵根吸纳灵气极慢，外门传功长老曾断言，他此生最多炼气一层。\\n\\n可他不信。\\n\\n若天生道路断绝，那便用命去凿。\\n\\n不知过了多久，怀中的旧铜钱忽然发烫。\\n\\n林照夜猛地睁眼，只见铜钱自行飞出，悬在青灯之上。灯火一晃，原本昏黄的火苗竟变成幽青色，照向那半截残碑。\\n\\n下一刻，残碑上那些模糊不清的字迹仿佛活了过来，一笔一画浮出石面，化作细小金光，涌入他的眉心。\\n\\n剧痛轰然炸开。\\n\\n林照夜只觉天地倒转，耳边似有万古钟声响起。破败废殿不见了，风雪不见了，他站在一片无边星海中，脚下是一条由白骨铺成的长路。长路尽头，有人背对众生而立，衣袍猎猎，手中提着一盏青灯。\\n\\n那人没有回头，只淡淡开口：“后来者，既点燃长夜灯，便承我一脉因果。”\\n\\n林照夜想问他是谁，喉咙却发不出声音。\\n\\n青灯骤然大亮。\\n\\n无数文字如星河垂落，印入他的识海——《长夜归墟经》。\\n\\n与此同时，他体内那条堵塞多年的经脉，竟在青光冲刷下寸寸贯通。灵气从四面八方涌来，穿过废殿裂缝，穿过漫天风雪，疯狂灌入他的身体。\\n\\n炼气一层。\\n\\n炼气二层。\\n\\n直到第三道灵气漩涡在丹田凝成时，林照夜才咳出一口黑血，重重倒在地上。\\n\\n青灯恢复昏暗，铜钱落回掌心。\\n\\n殿外雪声渐止。\\n\\n林照夜撑着残碑慢慢站起，眼中第一次有了锋芒。他能清晰感觉到，天地间的灵气不再拒他于门外，反而像听见了某种召唤，温顺地绕在他身边。\\n\\n就在这时，废殿外忽然传来脚步声。\\n\\n“奇怪，方才明明有灵气波动。”\\n\\n是赵衡的声音。\\n\\n林照夜将铜钱收进袖中，转身望向殿门。风吹开残破木门，雪光映入殿内，也映出赵衡惊疑的脸。\\n\\n两人目光相撞。\\n\\n赵衡先是一愣，随即冷笑：“原来是你这个废物躲在这里。说，你刚才得了什么东西？”\\n\\n林照夜没有回答。\\n\\n他只是抬起手，掌心青光一闪。\\n\\n那盏残破的青油灯，忽然无风自燃。\"}', NULL, 'HANDLER_ERROR', 'network error: ', '2026-05-30 13:41:07', '2026-05-30 13:41:08', '2026-05-30 13:43:15', '2026-05-30 13:41:07', '2026-05-30 13:43:15');

-- ----------------------------
-- Table structure for usage_costs
-- ----------------------------
DROP TABLE IF EXISTS `usage_costs`;
CREATE TABLE `usage_costs`  (
  `id` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `user_id` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `project_id` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `api_type` varchar(32) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `model` varchar(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `action` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `quantity` int NOT NULL DEFAULT 0,
  `unit` varchar(32) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'tokens',
  `cost` decimal(18, 6) NOT NULL DEFAULT 0.000000,
  `metadata` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
  `created_at` datetime NOT NULL,
  PRIMARY KEY (`id`) USING BTREE,
  INDEX `ix_usage_costs_user_id`(`user_id` ASC) USING BTREE,
  INDEX `ix_usage_costs_project_id`(`project_id` ASC) USING BTREE,
  INDEX `ix_usage_costs_api_type`(`api_type` ASC) USING BTREE,
  INDEX `ix_usage_costs_created_at`(`created_at` ASC) USING BTREE,
  CONSTRAINT `usage_costs_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT,
  CONSTRAINT `usage_costs_ibfk_2` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Records of usage_costs
-- ----------------------------

-- ----------------------------
-- Table structure for user_preferences
-- ----------------------------
DROP TABLE IF EXISTS `user_preferences`;
CREATE TABLE `user_preferences`  (
  `id` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `user_id` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `analysis_model` varchar(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `image_model` varchar(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `video_model` varchar(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `audio_model` varchar(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `art_style` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `video_ratio` varchar(16) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `video_resolution` varchar(32) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE INDEX `user_id`(`user_id` ASC) USING BTREE,
  CONSTRAINT `user_preferences_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Records of user_preferences
-- ----------------------------
INSERT INTO `user_preferences` VALUES ('69919f7e-9073-469f-aca0-edd3cb53a03f', 'b7bdd7ba-3a06-41a2-9aeb-62b67aa6e6a7', 'gpt-5.4', 'nano-banana-pro', NULL, NULL, 'american-comic', '9:16', '720p', '2026-04-17 10:14:13', '2026-04-25 11:09:30');

-- ----------------------------
-- Table structure for users
-- ----------------------------
DROP TABLE IF EXISTS `users`;
CREATE TABLE `users`  (
  `id` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `username` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `password_hash` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE INDEX `username`(`username` ASC) USING BTREE,
  UNIQUE INDEX `ix_users_username`(`username` ASC) USING BTREE
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Records of users
-- ----------------------------
INSERT INTO `users` VALUES ('b7bdd7ba-3a06-41a2-9aeb-62b67aa6e6a7', 'admin', 'admin@example.com', '$pbkdf2-sha256$29000$/R8jRKj13ptz7p1TqpXSmg$o6JgSB6OwnEPBTFi88sdDZv17Vew.YUDKdY9jch2V1s', '2026-04-17 10:14:13', '2026-04-17 10:14:13');

-- ----------------------------
-- Table structure for workflow_events
-- ----------------------------
DROP TABLE IF EXISTS `workflow_events`;
CREATE TABLE `workflow_events`  (
  `id` int NOT NULL AUTO_INCREMENT,
  `run_id` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `project_id` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `user_id` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `event_type` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `step_key` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `seq` int NOT NULL,
  `payload_json` json NULL,
  `created_at` datetime NOT NULL,
  PRIMARY KEY (`id`) USING BTREE,
  INDEX `ix_workflow_events_run_id`(`run_id` ASC) USING BTREE,
  INDEX `ix_workflow_events_project_id`(`project_id` ASC) USING BTREE,
  INDEX `ix_workflow_events_user_id`(`user_id` ASC) USING BTREE,
  CONSTRAINT `workflow_events_ibfk_1` FOREIGN KEY (`run_id`) REFERENCES `workflow_runs` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT,
  CONSTRAINT `workflow_events_ibfk_2` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT,
  CONSTRAINT `workflow_events_ibfk_3` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT
) ENGINE = InnoDB AUTO_INCREMENT = 13 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Records of workflow_events
-- ----------------------------
INSERT INTO `workflow_events` VALUES (1, '40d0752f-b9db-4c22-a82c-889b32efd54e', 'aeffc2fa-afc8-4b06-871e-05580084062d', 'b7bdd7ba-3a06-41a2-9aeb-62b67aa6e6a7', 'run.start', NULL, 1, '{\"message\": \"Run started\"}', '2026-04-25 14:03:47');
INSERT INTO `workflow_events` VALUES (2, '40d0752f-b9db-4c22-a82c-889b32efd54e', 'aeffc2fa-afc8-4b06-871e-05580084062d', 'b7bdd7ba-3a06-41a2-9aeb-62b67aa6e6a7', 'step.start', 'story_to_script', 1, '{\"stepKey\": \"story_to_script\", \"stepIndex\": 1, \"stepTitle\": \"Story to Script\", \"stepTotal\": 1}', '2026-04-25 14:03:47');
INSERT INTO `workflow_events` VALUES (3, '40d0752f-b9db-4c22-a82c-889b32efd54e', 'aeffc2fa-afc8-4b06-871e-05580084062d', 'b7bdd7ba-3a06-41a2-9aeb-62b67aa6e6a7', 'step.complete', 'story_to_script', 2, '{\"done\": true, \"stepKey\": \"story_to_script\", \"stepIndex\": 1, \"stepTitle\": \"Story to Script\", \"stepTotal\": 1}', '2026-04-25 14:03:47');
INSERT INTO `workflow_events` VALUES (4, '40d0752f-b9db-4c22-a82c-889b32efd54e', 'aeffc2fa-afc8-4b06-871e-05580084062d', 'b7bdd7ba-3a06-41a2-9aeb-62b67aa6e6a7', 'run.complete', NULL, 2, '{\"result\": {\"script\": {\"title\": \"Story Script\", \"scenes\": [{\"description\": \"Untitled story\", \"scene_index\": 1}], \"summary\": \"Untitled story\"}}, \"message\": \"Run completed\"}', '2026-04-25 14:03:47');
INSERT INTO `workflow_events` VALUES (5, '24ad9daa-81f3-40a9-85b4-7d3b017b061e', 'aeffc2fa-afc8-4b06-871e-05580084062d', 'b7bdd7ba-3a06-41a2-9aeb-62b67aa6e6a7', 'run.start', NULL, 1, '{\"message\": \"Run started\"}', '2026-05-30 10:56:51');
INSERT INTO `workflow_events` VALUES (6, '24ad9daa-81f3-40a9-85b4-7d3b017b061e', 'aeffc2fa-afc8-4b06-871e-05580084062d', 'b7bdd7ba-3a06-41a2-9aeb-62b67aa6e6a7', 'step.start', 'story_to_script', 1, '{\"stepKey\": \"story_to_script\", \"stepIndex\": 1, \"stepTitle\": \"Story to Script\", \"stepTotal\": 1}', '2026-05-30 10:56:51');
INSERT INTO `workflow_events` VALUES (7, '24ad9daa-81f3-40a9-85b4-7d3b017b061e', 'aeffc2fa-afc8-4b06-871e-05580084062d', 'b7bdd7ba-3a06-41a2-9aeb-62b67aa6e6a7', 'step.complete', 'story_to_script', 2, '{\"done\": true, \"stepKey\": \"story_to_script\", \"stepIndex\": 1, \"stepTitle\": \"Story to Script\", \"stepTotal\": 1}', '2026-05-30 10:56:51');
INSERT INTO `workflow_events` VALUES (8, '24ad9daa-81f3-40a9-85b4-7d3b017b061e', 'aeffc2fa-afc8-4b06-871e-05580084062d', 'b7bdd7ba-3a06-41a2-9aeb-62b67aa6e6a7', 'run.complete', NULL, 2, '{\"result\": {\"script\": {\"title\": \"Story Script\", \"scenes\": [{\"description\": \"Untitled story\", \"scene_index\": 1}], \"summary\": \"Untitled story\"}}, \"message\": \"Run completed\"}', '2026-05-30 10:56:51');
INSERT INTO `workflow_events` VALUES (9, '28215325-f2ee-4214-947e-0b614a159c58', 'aeffc2fa-afc8-4b06-871e-05580084062d', 'b7bdd7ba-3a06-41a2-9aeb-62b67aa6e6a7', 'run.start', NULL, 1, '{\"message\": \"Run started\"}', '2026-06-03 15:22:48');
INSERT INTO `workflow_events` VALUES (10, '28215325-f2ee-4214-947e-0b614a159c58', 'aeffc2fa-afc8-4b06-871e-05580084062d', 'b7bdd7ba-3a06-41a2-9aeb-62b67aa6e6a7', 'step.start', 'story_to_script', 1, '{\"stepKey\": \"story_to_script\", \"stepIndex\": 1, \"stepTitle\": \"Story to Script\", \"stepTotal\": 1}', '2026-06-03 15:22:48');
INSERT INTO `workflow_events` VALUES (11, '28215325-f2ee-4214-947e-0b614a159c58', 'aeffc2fa-afc8-4b06-871e-05580084062d', 'b7bdd7ba-3a06-41a2-9aeb-62b67aa6e6a7', 'step.complete', 'story_to_script', 2, '{\"done\": true, \"stepKey\": \"story_to_script\", \"stepIndex\": 1, \"stepTitle\": \"Story to Script\", \"stepTotal\": 1}', '2026-06-03 15:22:49');
INSERT INTO `workflow_events` VALUES (12, '28215325-f2ee-4214-947e-0b614a159c58', 'aeffc2fa-afc8-4b06-871e-05580084062d', 'b7bdd7ba-3a06-41a2-9aeb-62b67aa6e6a7', 'run.complete', NULL, 2, '{\"result\": {\"script\": {\"title\": \"Story Script\", \"scenes\": [{\"description\": \"Untitled story\", \"scene_index\": 1}], \"summary\": \"Untitled story\"}}, \"message\": \"Run completed\"}', '2026-06-03 15:22:49');

-- ----------------------------
-- Table structure for workflow_runs
-- ----------------------------
DROP TABLE IF EXISTS `workflow_runs`;
CREATE TABLE `workflow_runs`  (
  `id` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `task_id` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `user_id` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `project_id` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `episode_id` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `workflow_type` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `target_type` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `target_id` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` varchar(32) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `input_json` json NULL,
  `output_json` json NULL,
  `error_code` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `error_message` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE INDEX `task_id`(`task_id` ASC) USING BTREE,
  INDEX `ix_workflow_runs_user_id`(`user_id` ASC) USING BTREE,
  INDEX `ix_workflow_runs_project_id`(`project_id` ASC) USING BTREE,
  INDEX `ix_workflow_runs_episode_id`(`episode_id` ASC) USING BTREE,
  INDEX `ix_workflow_runs_workflow_type`(`workflow_type` ASC) USING BTREE,
  INDEX `ix_workflow_runs_target_id`(`target_id` ASC) USING BTREE,
  INDEX `ix_workflow_runs_status`(`status` ASC) USING BTREE,
  CONSTRAINT `workflow_runs_ibfk_1` FOREIGN KEY (`task_id`) REFERENCES `tasks` (`id`) ON DELETE SET NULL ON UPDATE RESTRICT,
  CONSTRAINT `workflow_runs_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT,
  CONSTRAINT `workflow_runs_ibfk_3` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT,
  CONSTRAINT `workflow_runs_ibfk_4` FOREIGN KEY (`episode_id`) REFERENCES `episodes` (`id`) ON DELETE SET NULL ON UPDATE RESTRICT
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Records of workflow_runs
-- ----------------------------
INSERT INTO `workflow_runs` VALUES ('24ad9daa-81f3-40a9-85b4-7d3b017b061e', '24ca3d5c-c9c9-4318-b065-ef7e29461f95', 'b7bdd7ba-3a06-41a2-9aeb-62b67aa6e6a7', 'aeffc2fa-afc8-4b06-871e-05580084062d', '84052888-478a-426b-a28d-555f5953e166', 'story_to_script', 'episode', '84052888-478a-426b-a28d-555f5953e166', 'completed', '{}', '{\"script\": {\"title\": \"Story Script\", \"scenes\": [{\"description\": \"Untitled story\", \"scene_index\": 1}], \"summary\": \"Untitled story\"}}', NULL, NULL, '2026-05-30 10:56:51', '2026-05-30 10:56:51');
INSERT INTO `workflow_runs` VALUES ('28215325-f2ee-4214-947e-0b614a159c58', '7dd223ca-6cde-4a46-b5cd-3eec4222190c', 'b7bdd7ba-3a06-41a2-9aeb-62b67aa6e6a7', 'aeffc2fa-afc8-4b06-871e-05580084062d', '84052888-478a-426b-a28d-555f5953e166', 'story_to_script', 'episode', '84052888-478a-426b-a28d-555f5953e166', 'completed', '{}', '{\"script\": {\"title\": \"Story Script\", \"scenes\": [{\"description\": \"Untitled story\", \"scene_index\": 1}], \"summary\": \"Untitled story\"}}', NULL, NULL, '2026-06-03 15:22:48', '2026-06-03 15:22:48');
INSERT INTO `workflow_runs` VALUES ('40d0752f-b9db-4c22-a82c-889b32efd54e', '980e1cd9-d182-40b6-b61a-aa939f9e2ecd', 'b7bdd7ba-3a06-41a2-9aeb-62b67aa6e6a7', 'aeffc2fa-afc8-4b06-871e-05580084062d', '84052888-478a-426b-a28d-555f5953e166', 'story_to_script', 'episode', '84052888-478a-426b-a28d-555f5953e166', 'completed', '{}', '{\"script\": {\"title\": \"Story Script\", \"scenes\": [{\"description\": \"Untitled story\", \"scene_index\": 1}], \"summary\": \"Untitled story\"}}', NULL, NULL, '2026-04-25 14:03:47', '2026-04-25 14:03:47');

-- ----------------------------
-- Table structure for workflow_steps
-- ----------------------------
DROP TABLE IF EXISTS `workflow_steps`;
CREATE TABLE `workflow_steps`  (
  `id` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `run_id` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `step_key` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `step_title` varchar(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` varchar(32) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `current_attempt` int NOT NULL,
  `step_index` int NOT NULL,
  `step_total` int NOT NULL,
  `started_at` datetime NULL DEFAULT NULL,
  `finished_at` datetime NULL DEFAULT NULL,
  PRIMARY KEY (`id`) USING BTREE,
  INDEX `ix_workflow_steps_run_id`(`run_id` ASC) USING BTREE,
  CONSTRAINT `workflow_steps_ibfk_1` FOREIGN KEY (`run_id`) REFERENCES `workflow_runs` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Records of workflow_steps
-- ----------------------------
INSERT INTO `workflow_steps` VALUES ('2c53d09a-05b7-439d-9105-eded73e6d3e9', '28215325-f2ee-4214-947e-0b614a159c58', 'story_to_script', 'Story to Script', 'completed', 1, 1, 1, '2026-06-03 15:22:48', '2026-06-03 15:22:48');
INSERT INTO `workflow_steps` VALUES ('6bb8e46d-3140-4c21-a66a-b45b99fb9975', '40d0752f-b9db-4c22-a82c-889b32efd54e', 'story_to_script', 'Story to Script', 'completed', 1, 1, 1, '2026-04-25 14:03:47', '2026-04-25 14:03:47');
INSERT INTO `workflow_steps` VALUES ('c81189f3-5255-4605-8d15-e0fb047bc20e', '24ad9daa-81f3-40a9-85b4-7d3b017b061e', 'story_to_script', 'Story to Script', 'completed', 1, 1, 1, '2026-05-30 10:56:51', '2026-05-30 10:56:51');

SET FOREIGN_KEY_CHECKS = 1;
