<?php
if ( ! defined( 'ABSPATH' ) ) { exit; }

class ICU_Ajax_Upload {

    public function init() {
        add_action( 'wp_ajax_icu_upload_image', array( $this, 'handle' ) );
        // 不开放给未登录用户（无 nopriv）
    }

    public function handle() {
        // 1. Nonce 校验
        if ( ! check_ajax_referer( 'icu_upload_nonce', 'nonce', false ) ) {
            wp_send_json_error( array( 'message' => 'Nonce 校验失败，请刷新页面重试。' ) );
        }

        // 2. 登录 & 权限
        if ( ! is_user_logged_in() ) {
            wp_send_json_error( array( 'message' => '请先登录。' ) );
        }
        if ( ! current_user_can( 'upload_files' ) ) {
            wp_send_json_error( array( 'message' => '您没有上传文件的权限。' ) );
        }

        // 3. 文件存在性
        if ( empty( $_FILES['file'] ) || $_FILES['file']['error'] !== UPLOAD_ERR_OK ) {
            $code = isset( $_FILES['file']['error'] ) ? intval( $_FILES['file']['error'] ) : -1;
            wp_send_json_error( array( 'message' => '未接收到文件，错误码：' . $code ) );
        }

        // 4. 文件类型（后端只接受 WebP）
        $file  = $_FILES['file'];
        $check = wp_check_filetype_and_ext( $file['tmp_name'], $file['name'] );
        if ( empty( $check['type'] ) || $check['type'] !== 'image/webp' ) {
            wp_send_json_error( array( 'message' => '只允许上传 WebP 格式（前端应已完成压缩转换）。' ) );
        }

        // 5. 写入媒体库
        require_once ABSPATH . 'wp-admin/includes/file.php';
        require_once ABSPATH . 'wp-admin/includes/image.php';
        require_once ABSPATH . 'wp-admin/includes/media.php';

        $uploaded = wp_handle_upload( $file, array(
            'test_form' => false,
            'mimes'     => array( 'webp' => 'image/webp' ),
        ) );

        if ( isset( $uploaded['error'] ) ) {
            wp_send_json_error( array( 'message' => '文件上传失败：' . $uploaded['error'] ) );
        }

        // 6. 创建 attachment
        $attachment_id = wp_insert_attachment( array(
            'post_mime_type' => 'image/webp',
            'post_title'     => sanitize_file_name( pathinfo( $uploaded['file'], PATHINFO_FILENAME ) ),
            'post_content'   => '',
            'post_status'    => 'inherit',
        ), $uploaded['file'] );

        if ( is_wp_error( $attachment_id ) ) {
            wp_send_json_error( array( 'message' => '创建附件失败：' . $attachment_id->get_error_message() ) );
        }

        // 7. 生成缩略图元数据
        $metadata = wp_generate_attachment_metadata( $attachment_id, $uploaded['file'] );
        wp_update_attachment_metadata( $attachment_id, $metadata );

        // 8. 自定义 meta 标记
        update_post_meta( $attachment_id, '_icu_is_optimized',          1 );
        update_post_meta( $attachment_id, '_icu_uploaded_from_editor',  1 );

        wp_send_json_success( array(
            'attachment_id' => $attachment_id,
            'url'           => esc_url( $uploaded['url'] ),
            'filename'      => basename( $uploaded['file'] ),
        ) );
    }
}
