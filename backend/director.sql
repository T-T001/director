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

 Date: 24/04/2026 20:21:10
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
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Records of alembic_version
-- ----------------------------
INSERT INTO `alembic_version` VALUES ('20260424_000009');

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
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = Dynamic;

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
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Records of episodes
-- ----------------------------

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
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = Dynamic;

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
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = Dynamic;

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
  PRIMARY KEY (`id`) USING BTREE,
  INDEX `ix_model_configs_user_id`(`user_id` ASC) USING BTREE,
  INDEX `ix_model_configs_provider_id`(`provider_id` ASC) USING BTREE,
  INDEX `ix_model_configs_capability`(`capability` ASC) USING BTREE,
  CONSTRAINT `model_configs_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT,
  CONSTRAINT `model_configs_ibfk_2` FOREIGN KEY (`provider_id`) REFERENCES `model_providers` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Records of model_configs
-- ----------------------------
INSERT INTO `model_configs` VALUES ('17a9bc4a-2906-427e-82a2-a3799350da8f', 'b7bdd7ba-3a06-41a2-9aeb-62b67aa6e6a7', 'd5ce94de-2259-4c1b-b31c-25776d10e19f', 'nano-banana-pro', 'nano-banana-pro', 'image', '/v1/images/generations', NULL, NULL, '2026-04-24 11:01:22', '2026-04-24 11:30:32', 'raw', 1);
INSERT INTO `model_configs` VALUES ('2d03dc55-d16c-448b-aac8-af4b6538be24', 'b7bdd7ba-3a06-41a2-9aeb-62b67aa6e6a7', 'b49dbdc6-494b-4280-8262-875cf7be3135', 'nano-banana-pro', 'nano-banana-pro', 'image', '/v1/images/generations', NULL, NULL, '2026-04-24 06:29:26', '2026-04-24 06:29:26', 'openai-image', 1);

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
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Records of model_providers
-- ----------------------------
INSERT INTO `model_providers` VALUES ('b49dbdc6-494b-4280-8262-875cf7be3135', 'b7bdd7ba-3a06-41a2-9aeb-62b67aa6e6a7', 'nanobanana', 'https://ai.huan666.de', 'gAAAAABp6wz9fZ9kBhcCCqZVyQzgu8wIUpKS-Jt0H_O-KiqjNxIwpLtCqhbxpHozXnxqnHrdH_e7c7TNX3NUiqn3bARLgUXrSIvQNbYW6MeRMBUo5xIRuzVYlvzGoc3-bX-qJUPSIuJ4QVPQJL4XwHbiFD1jkha_rA==', '2026-04-24 06:26:05', '2026-04-24 06:26:05', 'openai');
INSERT INTO `model_providers` VALUES ('d5ce94de-2259-4c1b-b31c-25776d10e19f', 'b7bdd7ba-3a06-41a2-9aeb-62b67aa6e6a7', 'huan', 'https://ai.huan666.de', 'gAAAAABp601GWpwFyouDe1ZgLJtMvTStk_gTnMIC2rykfa0aGhaTJ44NJ5uZDkPRTnWt9KfaKiLI0awVFr6xEpv8-Stz1z_VaATYzYYfsBjovj8O_GWJ2g3nD9-BoScNEgKoFvr4GODmvMkspLijSCzDxZxhFI6lsQ==', '2026-04-24 11:00:23', '2026-04-24 11:00:23', 'openai');

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
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = Dynamic;

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
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = Dynamic;

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
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = Dynamic;

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
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = Dynamic;

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
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = Dynamic;

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
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Records of novel_promotion_projects
-- ----------------------------

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
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = Dynamic;

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
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = Dynamic;

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
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = Dynamic;

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
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = Dynamic;

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
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Records of project_settings
-- ----------------------------

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
  PRIMARY KEY (`id`) USING BTREE,
  INDEX `ix_projects_user_id`(`user_id` ASC) USING BTREE,
  CONSTRAINT `projects_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Records of projects
-- ----------------------------

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
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Records of refresh_tokens
-- ----------------------------
INSERT INTO `refresh_tokens` VALUES ('0c1ca976-b2b9-460a-a9fc-693bbcbec93d', 'b7bdd7ba-3a06-41a2-9aeb-62b67aa6e6a7', 'fbb467248de5cb542532fcfb8b101ff72d524ac17d40bb6f5169860e25f2796d', '2026-05-24 06:21:13', '2026-04-24 06:21:13');
INSERT INTO `refresh_tokens` VALUES ('0c478d21-190c-4eaa-86b8-56b94c6e424f', 'b7bdd7ba-3a06-41a2-9aeb-62b67aa6e6a7', '5048521aa21d4509db38649ca31a570e9e708c444b93ee74047a8ecb6de737df', '2026-05-17 10:15:54', '2026-04-17 10:15:54');
INSERT INTO `refresh_tokens` VALUES ('151fdb11-577f-4c31-8ac9-91154fa52875', 'b7bdd7ba-3a06-41a2-9aeb-62b67aa6e6a7', 'c5d1721b04a43dfb2a3e948e3a048bbf9b7a2afd9a0b18a8eafb25ca377958a4', '2026-05-24 11:29:19', '2026-04-24 11:29:19');
INSERT INTO `refresh_tokens` VALUES ('4bf31a6c-8512-4e5e-a65e-3130064b2f62', 'b7bdd7ba-3a06-41a2-9aeb-62b67aa6e6a7', '8ad0e564ec6d34745289beda2699ff33e2dc2d4753996299789cc49491e67316', '2026-05-24 10:46:20', '2026-04-24 10:46:20');
INSERT INTO `refresh_tokens` VALUES ('57c4c6af-8dbb-4e3d-ae59-13788673e8e5', 'b7bdd7ba-3a06-41a2-9aeb-62b67aa6e6a7', 'fa4a24e5d361cb62a667068e2711f064fb922913de4eef48d8218b909efcc651', '2026-05-24 06:05:28', '2026-04-24 06:05:28');
INSERT INTO `refresh_tokens` VALUES ('6708726d-a36a-4188-ae09-9d57872c0cc6', 'b7bdd7ba-3a06-41a2-9aeb-62b67aa6e6a7', '38cdc402d42f38645813344fb543f2b7d132363107313e527a3840603d6f6bb4', '2026-05-24 06:06:45', '2026-04-24 06:06:45');
INSERT INTO `refresh_tokens` VALUES ('69b74871-9327-4995-bb54-a1452d8b619c', 'b7bdd7ba-3a06-41a2-9aeb-62b67aa6e6a7', 'cc97be24ffebeda9bf2662d97872a4c781cd01685e384bf64ebb0726791b8708', '2026-05-24 11:18:34', '2026-04-24 11:18:34');
INSERT INTO `refresh_tokens` VALUES ('79849e35-4cc4-48a9-8ec0-9fb6d3e585ce', 'b7bdd7ba-3a06-41a2-9aeb-62b67aa6e6a7', '8c8d471911ba407dfa7cfe48582c82783b040591e613e435ae09e06a9fbb7ff4', '2026-05-24 06:47:12', '2026-04-24 06:47:12');
INSERT INTO `refresh_tokens` VALUES ('7ddb150b-7286-46a9-b726-ed6edb268e55', 'b7bdd7ba-3a06-41a2-9aeb-62b67aa6e6a7', '37bc53ba65fccbc32b0bf857920c4a00c7f2458886f5f28c395a929bc810fbc6', '2026-05-22 04:02:59', '2026-04-22 04:02:59');
INSERT INTO `refresh_tokens` VALUES ('877d94c5-37de-4458-82f5-2ee924e78e75', 'b7bdd7ba-3a06-41a2-9aeb-62b67aa6e6a7', '0149976d555c5d11c6d2c6c9aad2135cb3b96aeea7957f71a392271b9333a30f', '2026-05-21 02:17:12', '2026-04-21 02:17:12');
INSERT INTO `refresh_tokens` VALUES ('8e5116b5-f66e-4e58-8e08-ffda324b6696', 'b7bdd7ba-3a06-41a2-9aeb-62b67aa6e6a7', 'f953916880f4b16fdac27f4c397347041b7da25768b5bd59d01d0363717c3292', '2026-05-24 07:22:42', '2026-04-24 07:22:42');
INSERT INTO `refresh_tokens` VALUES ('a7375418-b531-4155-9126-c0d5495c505e', 'b7bdd7ba-3a06-41a2-9aeb-62b67aa6e6a7', 'f010b08065c255eba04e3dd2ff2c190adf76a33a767ac4698c653320de6811c5', '2026-05-24 10:58:41', '2026-04-24 10:58:41');
INSERT INTO `refresh_tokens` VALUES ('a746089d-679d-49ad-a389-e65c3c0f041c', 'b7bdd7ba-3a06-41a2-9aeb-62b67aa6e6a7', '4522665f78251196e540e258c57179d6134f46bb385a28a52f5d537153d373a0', '2026-05-24 06:05:16', '2026-04-24 06:05:16');
INSERT INTO `refresh_tokens` VALUES ('e6ca0dc6-51a1-4b62-9c50-1e9031461134', 'b7bdd7ba-3a06-41a2-9aeb-62b67aa6e6a7', '0e25d462b2277dcbb4f290f063343dd4a1efe1a7f0e70109c9f474a233772dec', '2026-05-24 11:20:39', '2026-04-24 11:20:39');
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
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = Dynamic;

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
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = Dynamic;

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
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = Dynamic;

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
) ENGINE = InnoDB AUTO_INCREMENT = 1 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Records of task_events
-- ----------------------------

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
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Records of tasks
-- ----------------------------

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
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = Dynamic;

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
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Records of user_preferences
-- ----------------------------
INSERT INTO `user_preferences` VALUES ('69919f7e-9073-469f-aca0-edd3cb53a03f', 'b7bdd7ba-3a06-41a2-9aeb-62b67aa6e6a7', NULL, NULL, NULL, NULL, 'american-comic', '9:16', '720p', '2026-04-17 10:14:13', '2026-04-17 10:14:13');

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
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = Dynamic;

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
) ENGINE = InnoDB AUTO_INCREMENT = 1 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Records of workflow_events
-- ----------------------------

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
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Records of workflow_runs
-- ----------------------------

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
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Records of workflow_steps
-- ----------------------------

SET FOREIGN_KEY_CHECKS = 1;
