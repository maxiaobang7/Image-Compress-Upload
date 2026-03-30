/**
 * WP Image Compress Upload — Gutenberg Plugin v1.1.0
 *
 * 使用 wp.element / wp.components 原生 API，无需构建工具（Babel/webpack）。
 * 在编辑器右侧侧边栏插件面板中提供「压缩上传」功能。
 * 质量设置通过 localStorage 持久化，刷新后保留上次设定。
 */
( function () {
    'use strict';

    var el               = wp.element.createElement;
    var Fragment         = wp.element.Fragment;
    var useState         = wp.element.useState;
    var useRef           = wp.element.useRef;
    var useEffect        = wp.element.useEffect;
    var registerPlugin   = wp.plugins.registerPlugin;
    var PluginSidebar    = wp.editPost.PluginSidebar;
    var PluginSidebarMoreMenuItem = wp.editPost.PluginSidebarMoreMenuItem;
    var PanelBody        = wp.components.PanelBody;
    var Button           = wp.components.Button;
    var Spinner          = wp.components.Spinner;
    var Notice           = wp.components.Notice;
    var RangeControl     = wp.components.RangeControl;
    var dispatch         = wp.data.dispatch;

    var PLUGIN_NAME  = 'wpicu-compress-upload';
    var SIDEBAR_NAME = PLUGIN_NAME + '/sidebar';
    var MAX_WIDTH    = ICU_DATA.maxWidth || 1920;
    var QUALITY_KEY  = 'wpicu_quality_pct';   // localStorage key
    var DEFAULT_QUALITY = 80;

    // ── 工具：从 localStorage 读取上次保存的质量值 ───────────────────
    function getSavedQuality() {
        try {
            var saved = localStorage.getItem( QUALITY_KEY );
            if ( saved !== null ) {
                var val = parseInt( saved, 10 );
                if ( val >= 1 && val <= 100 ) return val;
            }
        } catch ( e ) { /* 隐私模式下 localStorage 可能不可用 */ }
        return DEFAULT_QUALITY;
    }

    // ── 工具：将质量值写入 localStorage ─────────────────────────────
    function saveQuality( val ) {
        try {
            localStorage.setItem( QUALITY_KEY, String( val ) );
        } catch ( e ) {}
    }

    // ── 工具：计算缩放尺寸 ───────────────────────────────────────────
    function resizeDimensions( w, h, maxW ) {
        if ( w <= maxW ) return { width: w, height: h };
        return { width: maxW, height: Math.round( h * maxW / w ) };
    }

    // ── 工具：File → WebP File（Promise） ────────────────────────────
    function compressToWebp( file, quality ) {
        quality = ( typeof quality === 'number' ) ? quality : ( DEFAULT_QUALITY / 100 );
        var baseName   = file.name.replace( /\.[^.]+$/, '' );
        var outputName = baseName + '-optimized.webp';

        return new Promise( function ( resolve, reject ) {
            function draw( source, nw, nh ) {
                var dim    = resizeDimensions( nw, nh, MAX_WIDTH );
                var canvas = document.createElement( 'canvas' );
                canvas.width  = dim.width;
                canvas.height = dim.height;
                canvas.getContext( '2d' ).drawImage( source, 0, 0, dim.width, dim.height );
                canvas.toBlob(
                    function ( blob ) {
                        if ( ! blob ) { reject( new Error( 'WebP 转换失败' ) ); return; }
                        resolve( new File( [ blob ], outputName, { type: 'image/webp' } ) );
                    },
                    'image/webp',
                    quality
                );
            }

            if ( typeof createImageBitmap === 'function' ) {
                createImageBitmap( file )
                    .then( function ( bmp ) { draw( bmp, bmp.width, bmp.height ); } )
                    .catch( fallback );
            } else {
                fallback();
            }

            function fallback() {
                var reader = new FileReader();
                reader.onerror = function () { reject( new Error( '读取文件失败' ) ); };
                reader.onload  = function ( e ) {
                    var img = new Image();
                    img.onerror = function () { reject( new Error( '图片解码失败' ) ); };
                    img.onload  = function () { draw( img, img.naturalWidth, img.naturalHeight ); };
                    img.src = e.target.result;
                };
                reader.readAsDataURL( file );
            }
        } );
    }

    // ── 工具：上传 WebP 到 WordPress ────────────────────────────────
    function uploadToWordPress( file ) {
        var fd = new FormData();
        fd.append( 'action', 'icu_upload_image' );
        fd.append( 'nonce',  ICU_DATA.nonce );
        fd.append( 'file',   file, file.name );

        return fetch( ICU_DATA.ajaxUrl, {
            method:      'POST',
            body:        fd,
            credentials: 'same-origin',
        } ).then( function ( res ) {
            if ( ! res.ok ) throw new Error( '网络错误（HTTP ' + res.status + '）' );
            return res.json();
        } );
    }

    // ── 工具：将图片插入 Gutenberg 编辑器（在光标所在位置） ──────────
    function insertImageBlock( attachmentId, url ) {
        if ( ! wp.blocks || ! wp.blocks.createBlock ) return;

        var block = wp.blocks.createBlock( 'core/image', {
            id:  attachmentId,
            url: url,
            alt: '',
        } );

        var blockEditorStore = wp.data.select( 'core/block-editor' );
        var selectedClientId = blockEditorStore.getSelectedBlockClientId();

        if ( selectedClientId ) {
            var rootClientId = blockEditorStore.getBlockRootClientId( selectedClientId );
            var index        = blockEditorStore.getBlockIndex( selectedClientId, rootClientId );
            dispatch( 'core/block-editor' ).insertBlocks( block, index + 1, rootClientId, true );
        } else {
            dispatch( 'core/block-editor' ).insertBlocks( block );
        }
    }

    // ── 工具：字节数转可读大小 ───────────────────────────────────────
    function formatSize( bytes ) {
        if ( bytes >= 1024 * 1024 ) {
            return ( bytes / ( 1024 * 1024 ) ).toFixed( 2 ) + ' MB';
        }
        return ( bytes / 1024 ).toFixed( 1 ) + ' KB';
    }

    // ── React 组件：侧边栏面板内容 ───────────────────────────────────
    function CompressPanel() {
        var _useState  = useState( 'idle' );
        var status     = _useState[0];
        var setStatus  = _useState[1];

        var _useStateMsg = useState( '' );
        var message    = _useStateMsg[0];
        var setMessage = _useStateMsg[1];

        var _useStatePreview = useState( null );
        var previewUrl = _useStatePreview[0];
        var setPreview = _useStatePreview[1];

        // 质量滑块：初始值从 localStorage 读取，首次默认 80
        var _useStateQuality = useState( getSavedQuality() );
        var qualityPct  = _useStateQuality[0];
        var setQuality  = _useStateQuality[1];

        // 压缩前后体积信息
        var _useStateSizeInfo = useState( null );
        var sizeInfo    = _useStateSizeInfo[0];
        var setSizeInfo = _useStateSizeInfo[1];

        var fileInput = useRef( null );
        var busy      = status === 'compressing' || status === 'uploading';

        // 每次 qualityPct 变化时同步写入 localStorage
        useEffect( function () {
            saveQuality( qualityPct );
        }, [ qualityPct ] );

        function handleFileChange( e ) {
            var file = e.target.files && e.target.files[0];
            e.target.value = '';
            if ( ! file ) return;

            var allowed = [ 'image/jpeg', 'image/png', 'image/webp' ];
            if ( allowed.indexOf( file.type ) === -1 ) {
                setStatus( 'error' );
                setMessage( '仅支持 JPG / PNG / WebP 格式' );
                return;
            }

            setStatus( 'compressing' );
            setMessage( '正在压缩图片…' );
            setPreview( null );
            setSizeInfo( null );

            var originalSize = file.size;

            compressToWebp( file, qualityPct / 100 )
                .then( function ( webpFile ) {
                    var saved = originalSize - webpFile.size;
                    var ratio = ( ( saved / originalSize ) * 100 ).toFixed( 1 );
                    setSizeInfo( {
                        before: formatSize( originalSize ),
                        after:  formatSize( webpFile.size ),
                        saved:  saved > 0 ? '节省 ' + formatSize( saved ) : '体积略有增加',
                        ratio:  saved > 0 ? ratio + '%' : null,
                    } );
                    setStatus( 'uploading' );
                    setMessage( '正在上传…' );
                    return uploadToWordPress( webpFile );
                } )
                .then( function ( res ) {
                    if ( res.success && res.data && res.data.url ) {
                        setPreview( res.data.url );
                        setStatus( 'done' );
                        setMessage( '上传成功：' + res.data.filename );
                        insertImageBlock( res.data.attachment_id, res.data.url );
                    } else {
                        var msg = ( res.data && res.data.message ) ? res.data.message : '上传失败';
                        setStatus( 'error' );
                        setMessage( msg );
                    }
                } )
                .catch( function ( err ) {
                    setStatus( 'error' );
                    setMessage( err && err.message ? err.message : '发生未知错误' );
                } );
        }

        function triggerPicker() {
            if ( fileInput.current ) fileInput.current.click();
        }

        return el(
            PanelBody,
            { title: '压缩上传', initialOpen: true },

            // 隐藏的文件 input
            el( 'input', {
                ref:      fileInput,
                type:     'file',
                accept:   'image/jpeg,image/png,image/webp',
                style:    { display: 'none' },
                onChange: handleFileChange,
            } ),

            // 说明文字
            el( 'p', { className: 'icu-hint' },
                '选择图片后，将在浏览器本地压缩为 WebP（质量 ' + qualityPct + '%，最大 1920px），再上传到媒体库并自动插入编辑器。—',
                el( 'a', {
                    href:      'https://www.tudingai.com/',
                    target:    '_blank',
                    rel:       'noopener noreferrer',
                    className: 'icu-hint-link',
                }, '图钉AI导航' )
            ),

            // 质量滑块
            el( RangeControl, {
                label:    '图片质量',
                value:    qualityPct,
                min:      1,
                max:      100,
                step:     1,
                onChange: function ( val ) { setQuality( val ); },
                disabled: busy,
                help:     qualityPct + '%（数值越高画质越好，文件越大）已自动保存',
                className: 'icu-quality-slider',
            } ),

            // 主按钮
            el( Button, {
                variant:   'primary',
                onClick:   triggerPicker,
                disabled:  busy,
                className: 'icu-upload-btn',
            },
                busy
                    ? el( Fragment, null, el( Spinner ), ' ', message )
                    : '🗜️ 选择图片并压缩上传'
            ),

            // 成功提示
            ! busy && status === 'done' && el( Notice, {
                status:        'success',
                isDismissible: false,
                className:     'icu-notice',
            }, message ),

            // 压缩前后体积对比
            ! busy && status === 'done' && sizeInfo && el( 'div', { className: 'icu-size-info' },
                el( 'div', { className: 'icu-size-row' },
                    el( 'span', { className: 'icu-size-label' }, '压缩前' ),
                    el( 'span', { className: 'icu-size-val icu-size-val--before' }, sizeInfo.before )
                ),
                el( 'div', { className: 'icu-size-row' },
                    el( 'span', { className: 'icu-size-label' }, '压缩后' ),
                    el( 'span', { className: 'icu-size-val icu-size-val--after' }, sizeInfo.after )
                ),
                el( 'div', { className: 'icu-size-row icu-size-row--saved' },
                    el( 'span', { className: 'icu-size-label' }, '效果' ),
                    el( 'span', { className: 'icu-size-val icu-size-val--saved' },
                        sizeInfo.saved,
                        sizeInfo.ratio && el( 'em', { className: 'icu-size-ratio' }, ' ↓' + sizeInfo.ratio )
                    )
                )
            ),

            // 错误提示
            ! busy && status === 'error' && el( Notice, {
                status:        'error',
                isDismissible: false,
                className:     'icu-notice',
            }, message ),

            // 预览图
            previewUrl && el( 'div', { className: 'icu-preview' },
                el( 'img', { src: previewUrl, alt: '', className: 'icu-preview__img' } )
            )
        );
    }

    // ── 注册侧边栏插件 ───────────────────────────────────────────────
    registerPlugin( PLUGIN_NAME, {
        icon: 'images-alt2',
        render: function () {
            return el(
                Fragment,
                null,
                el( PluginSidebarMoreMenuItem,
                    { target: SIDEBAR_NAME },
                    '压缩上传图片'
                ),
                el( PluginSidebar,
                    {
                        name:  SIDEBAR_NAME,
                        title: '压缩上传图片',
                        icon:  'images-alt2',
                    },
                    el( CompressPanel, null )
                )
            );
        },
    } );

} )();
