/**
 * WP Image Compress Upload — Gutenberg Plugin v1.2.0
 *
 * 使用 wp.element / wp.components 原生 API，无需构建工具。
 * - 质量设置通过 localStorage 持久化
 * - 支持点击选择 + 拖拽上传两种方式
 */
( function () {
    'use strict';

    var el               = wp.element.createElement;
    var Fragment         = wp.element.Fragment;
    var useState         = wp.element.useState;
    var useRef           = wp.element.useRef;
    var useEffect        = wp.element.useEffect;
    var useCallback      = wp.element.useCallback;
    var registerPlugin   = wp.plugins.registerPlugin;
    var PluginSidebar    = wp.editPost.PluginSidebar;
    var PluginSidebarMoreMenuItem = wp.editPost.PluginSidebarMoreMenuItem;
    var PanelBody        = wp.components.PanelBody;
    var Spinner          = wp.components.Spinner;
    var Notice           = wp.components.Notice;
    var RangeControl     = wp.components.RangeControl;
    var dispatch         = wp.data.dispatch;

    var PLUGIN_NAME     = 'wpicu-compress-upload';
    var SIDEBAR_NAME    = PLUGIN_NAME + '/sidebar';
    var MAX_WIDTH       = ICU_DATA.maxWidth || 1920;
    var QUALITY_KEY     = 'wpicu_quality_pct';
    var DEFAULT_QUALITY = 80;
    var ALLOWED_TYPES   = [ 'image/jpeg', 'image/png', 'image/webp' ];

    // ── localStorage helpers ─────────────────────────────────────────
    function getSavedQuality() {
        try {
            var v = parseInt( localStorage.getItem( QUALITY_KEY ), 10 );
            if ( v >= 1 && v <= 100 ) return v;
        } catch (e) {}
        return DEFAULT_QUALITY;
    }
    function saveQuality( val ) {
        try { localStorage.setItem( QUALITY_KEY, String( val ) ); } catch (e) {}
    }

    // ── 计算缩放尺寸 ─────────────────────────────────────────────────
    function resizeDimensions( w, h, maxW ) {
        if ( w <= maxW ) return { width: w, height: h };
        return { width: maxW, height: Math.round( h * maxW / w ) };
    }

    // ── File → WebP File ─────────────────────────────────────────────
    function compressToWebp( file, quality ) {
        quality = ( typeof quality === 'number' ) ? quality : ( DEFAULT_QUALITY / 100 );
        var outputName = file.name.replace( /\.[^.]+$/, '' ) + '-optimized.webp';

        return new Promise( function ( resolve, reject ) {
            function draw( source, nw, nh ) {
                var dim    = resizeDimensions( nw, nh, MAX_WIDTH );
                var canvas = document.createElement( 'canvas' );
                canvas.width  = dim.width;
                canvas.height = dim.height;
                canvas.getContext( '2d' ).drawImage( source, 0, 0, dim.width, dim.height );
                canvas.toBlob( function ( blob ) {
                    if ( ! blob ) { reject( new Error( 'WebP 转换失败' ) ); return; }
                    resolve( new File( [ blob ], outputName, { type: 'image/webp' } ) );
                }, 'image/webp', quality );
            }

            if ( typeof createImageBitmap === 'function' ) {
                createImageBitmap( file )
                    .then( function ( bmp ) { draw( bmp, bmp.width, bmp.height ); } )
                    .catch( fallback );
            } else { fallback(); }

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

    // ── 上传到 WordPress ─────────────────────────────────────────────
    function uploadToWordPress( file ) {
        var fd = new FormData();
        fd.append( 'action', 'icu_upload_image' );
        fd.append( 'nonce',  ICU_DATA.nonce );
        fd.append( 'file',   file, file.name );
        return fetch( ICU_DATA.ajaxUrl, {
            method: 'POST', body: fd, credentials: 'same-origin',
        } ).then( function ( res ) {
            if ( ! res.ok ) throw new Error( '网络错误（HTTP ' + res.status + '）' );
            return res.json();
        } );
    }

    // ── 插入图片块到光标位置 ─────────────────────────────────────────
    function insertImageBlock( attachmentId, url ) {
        if ( ! wp.blocks || ! wp.blocks.createBlock ) return;
        var block            = wp.blocks.createBlock( 'core/image', { id: attachmentId, url: url, alt: '' } );
        var store            = wp.data.select( 'core/block-editor' );
        var selectedClientId = store.getSelectedBlockClientId();
        if ( selectedClientId ) {
            var rootClientId = store.getBlockRootClientId( selectedClientId );
            var index        = store.getBlockIndex( selectedClientId, rootClientId );
            dispatch( 'core/block-editor' ).insertBlocks( block, index + 1, rootClientId, true );
        } else {
            dispatch( 'core/block-editor' ).insertBlocks( block );
        }
    }

    // ── 格式化文件大小 ───────────────────────────────────────────────
    function formatSize( bytes ) {
        if ( bytes >= 1024 * 1024 ) return ( bytes / ( 1024 * 1024 ) ).toFixed( 2 ) + ' MB';
        return ( bytes / 1024 ).toFixed( 1 ) + ' KB';
    }

    // ── 主组件 ───────────────────────────────────────────────────────
    function CompressPanel() {
        var _s1 = useState( 'idle' );  // idle | compressing | uploading | done | error
        var status    = _s1[0]; var setStatus    = _s1[1];
        var _s2 = useState( '' );
        var message   = _s2[0]; var setMessage   = _s2[1];
        var _s3 = useState( null );
        var previewUrl = _s3[0]; var setPreview  = _s3[1];
        var _s4 = useState( getSavedQuality() );
        var qualityPct = _s4[0]; var setQuality  = _s4[1];
        var _s5 = useState( null );
        var sizeInfo  = _s5[0]; var setSizeInfo  = _s5[1];
        var _s6 = useState( false );
        var isDragging = _s6[0]; var setDragging = _s6[1];

        var fileInput = useRef( null );
        var busy      = status === 'compressing' || status === 'uploading';

        useEffect( function () { saveQuality( qualityPct ); }, [ qualityPct ] );

        // ── 核心处理逻辑（点击和拖拽共用） ──────────────────────────
        var processFile = useCallback( function ( file ) {
            if ( ! file ) return;
            if ( ALLOWED_TYPES.indexOf( file.type ) === -1 ) {
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
                        setStatus( 'error' );
                        setMessage( ( res.data && res.data.message ) ? res.data.message : '上传失败' );
                    }
                } )
                .catch( function ( err ) {
                    setStatus( 'error' );
                    setMessage( err && err.message ? err.message : '发生未知错误' );
                } );
        }, [ qualityPct ] );

        // ── input change（点击选择） ──────────────────────────────────
        function handleFileChange( e ) {
            var file = e.target.files && e.target.files[0];
            e.target.value = '';
            processFile( file );
        }

        // ── 拖拽事件 ─────────────────────────────────────────────────
        function handleDragOver( e ) {
            e.preventDefault();
            e.stopPropagation();
            if ( ! busy ) setDragging( true );
        }
        function handleDragLeave( e ) {
            e.preventDefault();
            e.stopPropagation();
            setDragging( false );
        }
        function handleDrop( e ) {
            e.preventDefault();
            e.stopPropagation();
            setDragging( false );
            if ( busy ) return;
            var file = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
            processFile( file );
        }

        // ── 点击拖拽区触发文件选择 ───────────────────────────────────
        function handleZoneClick() {
            if ( ! busy && fileInput.current ) fileInput.current.click();
        }

        // ── 拖拽区 className ─────────────────────────────────────────
        var zoneClass = 'icu-drop-zone'
            + ( isDragging ? ' icu-drop-zone--over' : '' )
            + ( busy       ? ' icu-drop-zone--busy' : '' );

        return el(
            PanelBody,
            { title: '压缩上传', initialOpen: true },

            // 隐藏文件 input
            el( 'input', {
                ref: fileInput, type: 'file',
                accept: 'image/jpeg,image/png,image/webp',
                style: { display: 'none' },
                onChange: handleFileChange,
            } ),

            // 说明文字
            el( 'p', { className: 'icu-hint' },
                '选择图片后，将在浏览器本地压缩为 WebP（质量 ' + qualityPct + '%，最大 1920px），再上传到媒体库并自动插入编辑器。—',
                el( 'a', {
                    href: 'https://www.tudingai.com/', target: '_blank',
                    rel: 'noopener noreferrer', className: 'icu-hint-link',
                }, '图钉AI导航' )
            ),

            // 质量滑块
            el( RangeControl, {
                label: '图片质量', value: qualityPct, min: 1, max: 100, step: 1,
                onChange: function ( val ) { setQuality( val ); },
                disabled: busy,
                help: qualityPct + '% — 数值越高画质越好，文件越大（已自动保存）',
                className: 'icu-quality-slider',
            } ),

            // 拖拽 + 点击上传区域
            el( 'div', {
                className:   zoneClass,
                onClick:     handleZoneClick,
                onDragOver:  handleDragOver,
                onDragLeave: handleDragLeave,
                onDrop:      handleDrop,
            },
                busy
                    ? el( 'div', { className: 'icu-drop-zone__busy' },
                        el( Spinner, null ),
                        el( 'span', { className: 'icu-drop-zone__busy-text' }, message )
                      )
                    : el( Fragment, null,
                        el( 'div', { className: 'icu-drop-zone__icon' } ),
                        el( 'p', { className: 'icu-drop-zone__primary' }, '选择图片并压缩上传' ),
                        el( 'p', { className: 'icu-drop-zone__secondary' }, '或将图片拖拽至此处' ),
                        el( 'p', { className: 'icu-drop-zone__formats' }, 'JPG · PNG · WebP' )
                      )
            ),

            // 成功提示
            ! busy && status === 'done' && el( Notice, {
                status: 'success', isDismissible: false, className: 'icu-notice',
            }, message ),

            // 体积对比
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
                status: 'error', isDismissible: false, className: 'icu-notice',
            }, message ),

            // 预览图
            previewUrl && el( 'div', { className: 'icu-preview' },
                el( 'img', { src: previewUrl, alt: '', className: 'icu-preview__img' } )
            )
        );
    }

    // ── 注册侧边栏 ───────────────────────────────────────────────────
    registerPlugin( PLUGIN_NAME, {
        icon: 'images-alt2',
        render: function () {
            return el( Fragment, null,
                el( PluginSidebarMoreMenuItem, { target: SIDEBAR_NAME }, '压缩上传图片' ),
                el( PluginSidebar,
                    { name: SIDEBAR_NAME, title: '压缩上传图片', icon: 'images-alt2' },
                    el( CompressPanel, null )
                )
            );
        },
    } );

} )();
