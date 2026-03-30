<?php
if ( ! defined( 'ABSPATH' ) ) { exit; }

class ICU_Plugin {
    public function init() {
        ( new ICU_Assets() )->init();
        ( new ICU_Ajax_Upload() )->init();
    }
}
