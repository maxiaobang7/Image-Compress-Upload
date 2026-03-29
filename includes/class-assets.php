<?php
if ( ! defined( 'ABSPATH' ) ) { exit; }

class ICU_Assets {

    public function init() {
        add_action( 'enqueue_block_editor_assets', array( $this, 'enqueue' ) );
    }

    public function enqueue() {
        // 只在文章/页面编辑屏加载
        $screen = get_current_screen();
        if ( ! $screen || ! $screen->is_block_editor() ) {
            return;
        }

        wp_enqueue_script(
            'icu-gutenberg',
            ICU_PLUGIN_URL . 'assets/js/gutenberg-plugin.js',
            array( 'wp-plugins', 'wp-edit-post', 'wp-element', 'wp-components', 'wp-data', 'wp-block-editor', 'wp-i18n', 'wp-notices' ),
            ICU_VERSION,
            true
        );

        wp_localize_script( 'icu-gutenberg', 'ICU_DATA', array(
            'ajaxUrl'  => admin_url( 'admin-ajax.php' ),
            'nonce'    => wp_create_nonce( 'icu_upload_nonce' ),
            'maxWidth' => 1920,
            'quality'  => 0.8,
        ) );

        wp_enqueue_style(
            'icu-gutenberg-style',
            ICU_PLUGIN_URL . 'assets/css/compress-upload.css',
            array(),
            ICU_VERSION
        );
    }
}
