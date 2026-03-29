<?php
/**
 * Plugin Name: Image Compress Upload
 * Plugin URI:  https://www.tudingai.com/
 * Description: 在 Gutenberg 编辑器侧边栏新增「压缩上传」面板，图片在浏览器本地压缩为 WebP（质量 0.8，最大宽度 1920px）后再上传到媒体库，并自动插入编辑器。
 * Version:     1.0.3
 * Author:      马小帮
 * Author URI:  https://www.tudingai.com/
 * License:     GPL-2.0+
 * Text Domain: icu
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

define( 'ICU_VERSION',     '1.0.3' );
define( 'ICU_PLUGIN_FILE', __FILE__ );
define( 'ICU_PLUGIN_DIR',  plugin_dir_path( __FILE__ ) );
define( 'ICU_PLUGIN_URL',  plugin_dir_url( __FILE__ ) );

require_once ICU_PLUGIN_DIR . 'includes/class-ajax-upload.php';
require_once ICU_PLUGIN_DIR . 'includes/class-assets.php';
require_once ICU_PLUGIN_DIR . 'includes/class-plugin.php';

function icu_run() {
    ( new ICU_Plugin() )->init();
}
add_action( 'plugins_loaded', 'icu_run' );
