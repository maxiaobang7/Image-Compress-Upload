<div align="center">

# WP Image Compress Upload

**在 Gutenberg 编辑器中一键压缩并上传图片，自动转换为 WebP 格式**

*Compress & upload images in Gutenberg — client-side WebP conversion, zero server overhead*

[![WordPress](https://img.shields.io/badge/WordPress-6.x-blue?logo=wordpress)](https://wordpress.org)
[![PHP](https://img.shields.io/badge/PHP-7.4%2B-purple?logo=php)](https://php.net)
[![License](https://img.shields.io/badge/License-GPL--2.0%2B-green)](https://www.gnu.org/licenses/gpl-2.0.html)
[![Version](https://img.shields.io/badge/Version-1.1.0-orange)]()

</div>

---

## 中文说明

### 插件简介

WP Image Compress Upload 是一个 WordPress 插件，在 Gutenberg（块编辑器）侧边栏中新增「压缩上传」面板。用户选择图片后，图片会在**浏览器本地**完成压缩并转换为 WebP 格式，再上传到 WordPress 媒体库，全程无需将原图发送到服务器，有效降低带宽消耗和服务器压力。

### 功能特性

- 🗜️ **浏览器端本地压缩**，原图不上传服务器
- 🖼️ **自动转换为 WebP** 格式，文件更小，加载更快
- 🎚️ **质量可调**（1–100%），设置自动保存，刷新后保留
- 📍 **光标位置插入**，图片精准插入到当前选中块的下方
- 📊 **压缩前后体积对比**，直观展示节省效果
- 🔒 **双重安全校验**：前端 Nonce + 后端 MIME 类型验证
- ⚡ 支持 JPG / PNG / WebP 输入，统一输出 WebP

<img src="https://picui.ogmua.cn/s1/2026/03/31/69cb6da9213e3.webp" alt="1774800382-maxiaobang_2026-03-29_16-43-05-optimized.webp" title="1774800382-maxiaobang_2026-03-29_16-43-05-optimized.webp" />

### 安装方法

**方式一：下载 ZIP 安装（推荐）**

1. 前往 [Releases](../../releases) 页面下载最新版 `.zip` 文件
2. 登录 WordPress 后台 → 插件 → 安装插件 → 上传插件
3. 选择下载的 ZIP 文件，点击「立即安装」
4. 安装完成后点击「启用插件」

**方式二：手动安装**

```bash
cd wp-content/plugins/
git clone https://github.com/YOUR_USERNAME/WP-Image-Compress-Upload.git
```

然后在 WordPress 后台启用插件。

### 使用方法

1. 打开任意文章或页面的 Gutenberg 编辑器
2. 点击右上角 **「⋮」（更多工具）→「压缩上传图片」**，打开右侧边栏
3. 用滑块调节图片质量（默认 80%，质量设置自动保存）
4. 点击「🗜️ 选择图片并压缩上传」，选择本地图片
5. 插件自动完成：本地压缩 → WebP 转换 → 上传媒体库 → 插入编辑器
6. 侧边栏显示压缩前后体积对比和预览图

### 技术说明

| 项目 | 说明 |
|------|------|
| 输入格式 | JPG / PNG / WebP |
| 输出格式 | WebP |
| 默认质量 | 80%（可调） |
| 最大宽度 | 1920px（超过自动等比缩小） |
| 压缩方式 | 浏览器 Canvas API（`createImageBitmap` 优先，兼容回退） |
| 质量持久化 | `localStorage`（`wpicu_quality_pct`） |
| 安全机制 | WordPress Nonce + 后端 MIME 校验（只接受 WebP） |
| 无需构建 | 纯 `wp.element` / `wp.components`，无需 Webpack/Babel |

### 系统要求

- WordPress 6.0+
- PHP 7.4+
- 现代浏览器（Chrome / Edge / Firefox / Safari 新版本）
- 用户需具备 `upload_files` 权限

### 常见问题

**Q：上传后在媒体库看不到图片？**  
A：请确认当前用户具有 `upload_files` 权限（编辑者及以上角色默认有此权限）。

**Q：质量滑块调整后刷新页面恢复了？**  
A：1.1.0 版本已通过 `localStorage` 持久化质量设置，刷新后会自动恢复上次设定。

**Q：图片插入到文章末尾而不是光标位置？**  
A：请在点击上传按钮前，先在编辑器中点击一次目标段落，确保有块被选中。

---

## English

### About

WP Image Compress Upload adds a "Compress Upload" panel to the Gutenberg block editor sidebar. Selected images are compressed and converted to WebP **entirely in the browser** before being uploaded to the WordPress Media Library — no original file ever reaches the server.

### Features

- 🗜️ **Client-side compression** — original image never sent to server
- 🖼️ **Auto WebP conversion** — smaller files, faster pages
- 🎚️ **Adjustable quality** (1–100%), persisted across page refreshes
- 📍 **Cursor-aware insertion** — image block inserted below the selected block
- 📊 **Before/after size comparison** panel
- 🔒 **Dual security** — Nonce + server-side MIME verification (WebP only)
- ⚡ Accepts JPG / PNG / WebP input

### Installation

**Option 1: ZIP upload (recommended)**

1. Download the latest `.zip` from the [Releases](../../releases) page
2. Go to WordPress Admin → Plugins → Add New → Upload Plugin
3. Choose the ZIP file and click "Install Now"
4. Click "Activate Plugin"

**Option 2: Manual / Git**

```bash
cd wp-content/plugins/
git clone https://github.com/YOUR_USERNAME/WP-Image-Compress-Upload.git
```

Then activate the plugin from the WordPress admin.

### Usage

1. Open any post or page in the Gutenberg editor
2. Click **⋮ (More tools) → "压缩上传图片"** to open the sidebar
3. Adjust the quality slider (default 80% — setting is saved automatically)
4. Click **"🗜️ 选择图片并压缩上传"** and pick a local image
5. The plugin handles: compress → convert to WebP → upload → insert block
6. A before/after size comparison and preview appear in the sidebar

### Requirements

- WordPress 6.0+
- PHP 7.4+
- Modern browser (Chrome / Edge / Firefox / Safari)
- User must have `upload_files` capability

### File Structure

```
wp-image-compress-upload/
├── wp-image-compress-upload.php   # Plugin entry, constants
├── includes/
│   ├── class-plugin.php           # Bootstrap
│   ├── class-assets.php           # Enqueue scripts & styles
│   └── class-ajax-upload.php      # AJAX handler, media library write
├── assets/
│   ├── js/gutenberg-plugin.js     # Sidebar UI + compress + upload logic
│   └── css/compress-upload.css    # Sidebar styles
└── uninstall.php
```

### License

GPL-2.0+ © [马小帮](https://www.tudingai.com/)  
See [LICENSE](LICENSE) for details.

---

<div align="center">
Made with ❤️ by <a href="https://www.tudingai.com/">图钉AI导航</a>
</div>
