# Changelog

All notable changes to this project will be documented in this file.

## [1.1.0] - 2026-03-30

### Added
- 质量滑块设置通过 `localStorage` 持久化，刷新页面后自动恢复上次设定
- Quality slider value is now persisted via `localStorage` (`wpicu_quality_pct`)

### Fixed
- 图片不再强制插入文章末尾，改为插入到当前光标选中块的正下方
- Images are now inserted below the currently selected block instead of always appending to the end

### Changed
- 插件重命名为 WP Image Compress Upload
- Plugin renamed to WP Image Compress Upload
- 版本号更新至 1.1.0

---

## [1.0.3] - 2026-03-29

### Added
- 压缩前后图片体积对比面板（Before/after file size comparison panel）
- 图片质量调节滑块，默认 80%（Adjustable quality slider, default 80%）

### Fixed
- 版本号升级机制，避免浏览器缓存旧 JS（Version bump to bust browser cache）

---

## [1.0.0] - 2026-03-28

### Added
- 初始版本发布（Initial release）
- Gutenberg 侧边栏「压缩上传」面板
- 浏览器本地压缩为 WebP，质量 80%，最大宽度 1920px
- AJAX 上传到 WordPress 媒体库
- Nonce + 后端 MIME 双重安全校验
- 上传成功后自动插入图片块
