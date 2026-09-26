// ==UserScript==
// @name         MissAV & Jable 综合增强助手
// @namespace    http://tampermonkey.net/
// @version      10.13
// @description  PC端专用、广告清理、SRT字幕加载/偏移/字号高度、偏移按站点记忆、长按画面倍速与HUD、原生画中画、剧照画廊、评分徽章、短评聚合、女优社交直达、观影行为数据大屏、内容过滤与屏蔽、临时加速、快进倒退、区间循环、可拖拽可隐藏UI、实时日志
// @author       Momomo
// @match        *://missav.ws/*
// @match        *://missav.live/*
// @match        *://missav.ai/*
// @match        *://missav.com/*
// @match        *://missav123.com/*
// @match        *://thisav.com/*
// @match        *://missav.fans/*
// @match        *://missav.media/*
// @match        *://jable.tv/*
// @match        *://www.jable.tv/*
// @grant        GM_xmlhttpRequest
// @grant        GM_addStyle
// @grant        GM_openInTab
// @grant        unsafeWindow
// @connect      xunlei.com
// @connect      geilijiasu.com
// @connect      subtitle.v.geilijiasu.com
// @connect      jdforrepam.com
// @connect      javbus.com
// @connect      www.javbus.com
// @connect      javlibrary.com
// @connect      www.javlibrary.com
// @connect      javdb.com
// @connect      api.allorigins.win
// @connect      api.codetabs.com
// @run-at       document-start
// @noframes
// @license      MIT
// @downloadURL  https://update.greasyfork.org/scripts/000000/MissAV%20%26%20Jable%20%E7%BB%BC%E5%90%88%E5%A2%9E%E5%BC%BA%E5%8A%A9%E6%89%8B.user.js
// @updateURL    https://update.greasyfork.org/scripts/000000/MissAV%20%26%20Jable%20%E7%BB%BC%E5%90%88%E5%A2%9E%E5%BC%BA%E5%8A%A9%E6%89%8B.meta.js
// ==/UserScript==
(function () {
    'use strict';
    try {
    const STORAGE_PREFIX = 'avSub:';
    const IS_JABLE = location.hostname.includes('jable');
    const POLL_INTERVAL = 400;
    const POLL_TIMEOUT = 15000;
    const MUTATION_THROTTLE = 400;
    const QUICK_HIDE_DELAY = 2200;
    const QUICK_LEAVE_DELAY = 800;
    const MIN_PLAYER_WIDTH = 480;
    const MIN_PLAYER_HEIGHT = 260;
    const PLAYER_HOST_SELECTOR = '.plyr__video-wrapper, .plyr, .video-js, .vjs-tech, #player, .player-wrapper, .player-container, .artplayer, .dplayer, .jwplayer';
    const PREVIEW_HOST_SELECTOR = '.video-img-box, .thumbnail, .video-item, .list-item, .video-list-item, article.video-card, .jable-carousel, .owl-carousel, .owl-stage, .owl-stage-outer, .owl-item, .horizontal-img-box, .av-info-section, .av-analytics-page, .custom-ui-layer, .custom-control-panel, .custom-quick-controls, .av-stills-grid, .av-review-list, .av-list-grid';
    const REPEAT_SEEK_INTERVAL = 120;
    const PANEL_WIDTH = 310;
    const SPEED_MIN = 0.1;
    const SPEED_MAX = 16;
    const SKIP_MIN = 1;
    const SKIP_MAX = 600;
    const OFFSET_MIN = -60;
    const OFFSET_MAX = 60;
    const FONT_SIZE_MIN = 12;
    const FONT_SIZE_MAX = 64;
    const SUBTITLE_BOTTOM_MIN = 0;
    const SUBTITLE_BOTTOM_MAX = 80;
    const SUPPORTED_SUBTITLE_EXT = /\.(srt|vtt|ass|ssa)(?:$|[?#])/i;
    const JUMP_PRESETS = {
        back: [600, 300, 60, 10],
        forward: [10, 60, 300, 600]
    };
    const LOOP_PRESETS = [5, 10, 60];
    const HOLD_DELAY = 240;
    const HOLD_CANCEL_DISTANCE = 12;
    const HOLD_CLICK_SUPPRESS = 300;
    const INFO_CACHE_TTL = 86400000;
    const INFO_CACHE_PREFIX = 'info:v4:';
    const ACTRESS_CACHE_PREFIX = 'actress:';
    const JDFORREPAM_API = 'https://jdforrepam.com';
    const JDSIGN_SUFFIX = '71cf27bb3c0bcdf207b64abecddc970098c7421ee7203b9cdae54478478a199e7d5a6e1a57691123c1a931c057842fb73ba3b3c83bcd69c17ccf174081e3d8aa';
    const JDFORREPAM_HEADERS = { 'User-Agent': 'Dart/3.5 (dart:io)', Accept: 'application/json' };
    const CORS_PROXIES = [
        'https://api.allorigins.win/raw?url=',
        'https://api.codetabs.com/v1/proxy?quest='
    ];
    const JC_ENDPOINT = 'https://www.javlibrary.com/cn/vl_searchbyid.php?keyword=';
    const JB_ENDPOINT = 'https://www.javbus.com/';
    const JD_SEARCH = 'https://javdb.com/search?q=';
    const IMAGE_EXT_RE = /\.(?:jpe?g|png|webp)(?:$|[?#])/i;
    const NOW_PRINTING_RE = /\/now_printing(?:\/|\.|$)/i;
    const COMMENT_BLOCK_RE = /<div[^>]+class=["'][^"']*(?:comment-content|comment-body|bubble-content)[^"']*["'][^>]*>([\s\S]*?)<\/div>/gi;
    const SAMPLE_BOX_RE = /<a[^>]+class=["'][^"']*sample-box[^"']*["'][^>]+href=["']([^"']+)["']/gi;
    const PHOTO_FRAME_RE = /<div[^>]+class=["'][^"']*photo-frame[^"']*["'][^>]*>\s*<img[^>]+src=["']([^"']+)["']/gi;
    const JL_SCORE_RE = /class=["']score["'][^>]*>\s*\(?([0-9.]+)\)?\s*<\/span>/i;
    const JL_COMMENT_RE = /<table[^>]+class=["']comment["'][^>]*>([\s\S]*?)<\/table>/gi;
    const JD_ACTOR_PATH_RE = /href=["'](\/actors\/[a-zA-Z0-9_-]+)["']/gi;
    const JD_TWITTER_RE = /href=["'](https?:\/\/(?:twitter\.com|x\.com)\/[^"'\s?#]+)["']/i;
    const JD_INSTAGRAM_RE = /href=["'](https?:\/\/(?:www\.)?instagram\.com\/[^"'\s?#]+)["']/i;
    const BLOCKED_ACTOR_PATHS = new Set([
        '/actors/censored',
        '/actors/uncensored',
        '/actors/western',
        '/actors/ranking'
    ]);
    const AD_SELECTORS = [
        'div[class^="root"]',
        'div[class*="fixed"][class*="right-"][class*="bottom-"]',
        'iframe'
    ].join(',');
    const PLAY_ENTRY_SELECTORS = [
        'a.text-nord13.font-medium.flex.items-center',
        'a[href^="/play"]',
        'button[class*="play"][class*="btn"]'
    ];
    const clamp = (value, min, max) => (value < min ? min : value > max ? max : value);
    const pad2 = value => String(value).padStart(2, '0');
    const formatSeconds = seconds => (seconds >= 60 ? `${seconds / 60}分钟` : `${seconds}秒`);
    const formatSpan = seconds => (seconds >= 60 ? `${seconds / 60}m` : `${seconds}s`);
    const isEditableTarget = target =>
        Boolean(target instanceof Element && target.closest('input,textarea,select,[contenteditable="true"]'));
    function throttle(fn, delay) {
        let timer = 0;
        let lastArgs = null;
        return function throttled(...args) {
            lastArgs = args;
            if (timer) return;
            timer = setTimeout(() => {
                timer = 0;
                const current = lastArgs;
                lastArgs = null;
                fn.apply(this, current);
            }, delay);
        };
    }
    function debounce(fn, delay) {
        let timer = 0;
        return function debounced(...args) {
            clearTimeout(timer);
            timer = setTimeout(() => fn.apply(this, args), delay);
        };
    }
    function toHex(value) {
        let out = '';
        for (let i = 0; i < 4; i++) {
            out += ((value >> (i * 8)) & 0xff).toString(16).padStart(2, '0');
        }
        return out;
    }
    function utf8Bytes(text) {
        const out = [];
        for (let i = 0; i < text.length; i++) {
            let code = text.charCodeAt(i);
            if (code >= 0xd800 && code <= 0xdbff && i + 1 < text.length) {
                const next = text.charCodeAt(i + 1);
                if (next >= 0xdc00 && next <= 0xdfff) {
                    code = ((code - 0xd800) << 10) + (next - 0xdc00) + 0x10000;
                    i++;
                }
            }
            if (code < 0x80) {
                out.push(code);
            } else if (code < 0x800) {
                out.push(0xc0 | (code >> 6), 0x80 | (code & 0x3f));
            } else if (code < 0x10000) {
                out.push(0xe0 | (code >> 12), 0x80 | ((code >> 6) & 0x3f), 0x80 | (code & 0x3f));
            } else {
                out.push(
                    0xf0 | (code >> 18),
                    0x80 | ((code >> 12) & 0x3f),
                    0x80 | ((code >> 6) & 0x3f),
                    0x80 | (code & 0x3f)
                );
            }
        }
        return out;
    }
    function md5(s) {
        const add32 = (a, b) => (a + b) & 0xffffffff;
        const cmn = (q, a, b, x, s, t) => {
            a = add32(add32(a, q), add32(x, t));
            return add32((a << s) | (a >>> (32 - s)), b);
        };
        const ff = (a, b, c, d, x, s, t) => cmn((b & c) | (~b & d), a, b, x, s, t);
        const gg = (a, b, c, d, x, s, t) => cmn((b & d) | (c & ~d), a, b, x, s, t);
        const hh = (a, b, c, d, x, s, t) => cmn(b ^ c ^ d, a, b, x, s, t);
        const ii = (a, b, c, d, x, s, t) => cmn(c ^ (b | ~d), a, b, x, s, t);
        const str2blk = (bytes, offset) => {
            const blk = [];
            for (let i = 0; i < 64; i += 4) {
                blk[i >> 2] = bytes[offset + i] + (bytes[offset + i + 1] << 8) +
                    (bytes[offset + i + 2] << 16) + (bytes[offset + i + 3] << 24);
            }
            return blk;
        };
        const cycle = (state, blk) => {
            let [a, b, c, d] = state;
            a = ff(a, b, c, d, blk[0], 7, -680876936);
            d = ff(d, a, b, c, blk[1], 12, -389564586);
            c = ff(c, d, a, b, blk[2], 17, 606105819);
            b = ff(b, c, d, a, blk[3], 22, -1044525330);
            a = ff(a, b, c, d, blk[4], 7, -176418897);
            d = ff(d, a, b, c, blk[5], 12, 1200080426);
            c = ff(c, d, a, b, blk[6], 17, -1473231341);
            b = ff(b, c, d, a, blk[7], 22, -45705983);
            a = ff(a, b, c, d, blk[8], 7, 1770035416);
            d = ff(d, a, b, c, blk[9], 12, -1958414417);
            c = ff(c, d, a, b, blk[10], 17, -42063);
            b = ff(b, c, d, a, blk[11], 22, -1990404162);
            a = ff(a, b, c, d, blk[12], 7, 1804603682);
            d = ff(d, a, b, c, blk[13], 12, -40341101);
            c = ff(c, d, a, b, blk[14], 17, -1502002290);
            b = ff(b, c, d, a, blk[15], 22, 1236535329);
            a = gg(a, b, c, d, blk[1], 5, -165796510);
            d = gg(d, a, b, c, blk[6], 9, -1069501632);
            c = gg(c, d, a, b, blk[11], 14, 643717713);
            b = gg(b, c, d, a, blk[0], 20, -373897302);
            a = gg(a, b, c, d, blk[5], 5, -701558691);
            d = gg(d, a, b, c, blk[10], 9, 38016083);
            c = gg(c, d, a, b, blk[15], 14, -660478335);
            b = gg(b, c, d, a, blk[4], 20, -405537848);
            a = gg(a, b, c, d, blk[9], 5, 568446438);
            d = gg(d, a, b, c, blk[14], 9, -1019803690);
            c = gg(c, d, a, b, blk[3], 14, -187363961);
            b = gg(b, c, d, a, blk[8], 20, 1163531501);
            a = gg(a, b, c, d, blk[13], 5, -1444681467);
            d = gg(d, a, b, c, blk[2], 9, -51403784);
            c = gg(c, d, a, b, blk[7], 14, 1735328473);
            b = gg(b, c, d, a, blk[12], 20, -1926607734);
            a = hh(a, b, c, d, blk[5], 4, -378558);
            d = hh(d, a, b, c, blk[8], 11, -2022574463);
            c = hh(c, d, a, b, blk[11], 16, 1839030562);
            b = hh(b, c, d, a, blk[14], 23, -35309556);
            a = hh(a, b, c, d, blk[1], 4, -1530992060);
            d = hh(d, a, b, c, blk[4], 11, 1272893353);
            c = hh(c, d, a, b, blk[7], 16, -155497632);
            b = hh(b, c, d, a, blk[10], 23, -1094730640);
            a = hh(a, b, c, d, blk[13], 4, 681279174);
            d = hh(d, a, b, c, blk[0], 11, -358537222);
            c = hh(c, d, a, b, blk[3], 16, -722521979);
            b = hh(b, c, d, a, blk[6], 23, 76029189);
            a = hh(a, b, c, d, blk[9], 4, -640364487);
            d = hh(d, a, b, c, blk[12], 11, -421815835);
            c = hh(c, d, a, b, blk[15], 16, 530742520);
            b = hh(b, c, d, a, blk[2], 23, -995338651);
            a = ii(a, b, c, d, blk[0], 6, -198630844);
            d = ii(d, a, b, c, blk[7], 10, 1126891415);
            c = ii(c, d, a, b, blk[14], 15, -1416354905);
            b = ii(b, c, d, a, blk[5], 21, -57434055);
            a = ii(a, b, c, d, blk[12], 6, 1700485571);
            d = ii(d, a, b, c, blk[3], 10, -1894986606);
            c = ii(c, d, a, b, blk[10], 15, -1051523);
            b = ii(b, c, d, a, blk[1], 21, -2054922799);
            a = ii(a, b, c, d, blk[8], 6, 1873313359);
            d = ii(d, a, b, c, blk[15], 10, -30611744);
            c = ii(c, d, a, b, blk[6], 15, -1560198380);
            b = ii(b, c, d, a, blk[13], 21, 1309151649);
            a = ii(a, b, c, d, blk[4], 6, -145523070);
            d = ii(d, a, b, c, blk[11], 10, -1120210379);
            c = ii(c, d, a, b, blk[2], 15, 718787259);
            b = ii(b, c, d, a, blk[9], 21, -343485551);
            state[0] = add32(a, state[0]);
            state[1] = add32(b, state[1]);
            state[2] = add32(c, state[2]);
            state[3] = add32(d, state[3]);
        };
        const bytes = utf8Bytes(s);
        const n = bytes.length;
        const state = [1732584193, -271733879, -1732584194, 271733878];
        let i = 64;
        for (; i <= n; i += 64) cycle(state, str2blk(bytes, i - 64));
        const tail = new Array(16).fill(0);
        const tailLen = n - (i - 64);
        for (i = 0; i < tailLen; i++) tail[i >> 2] |= bytes[n - tailLen + i] << ((i % 4) << 3);
        tail[i >> 2] |= 128 << ((i % 4) << 3);
        if (i > 55) {
            cycle(state, tail);
            tail.fill(0);
        }
        tail[14] = n * 8;
        cycle(state, tail);
        return state.map(toHex).join('');
    }
    function resolveUrl(href, base) {
        if (!href) return '';
        if (href.startsWith('//')) return `https:${href}`;
        if (href.startsWith('/')) return `${base}${href}`;
        return href;
    }
    function readCache(key) {
        try {
            const raw = localStorage.getItem(STORAGE_PREFIX + key);
            if (!raw) return null;
            const parsed = JSON.parse(raw);
            if (!parsed || typeof parsed !== 'object') return null;
            if (parsed.expires && parsed.expires < Date.now()) return null;
            return parsed.data ?? null;
        } catch (_) {
            return null;
        }
    }
    function writeCache(key, data, ttl = INFO_CACHE_TTL) {
        try {
            localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify({ data, expires: Date.now() + ttl }));
        } catch (_) {
        }
    }
    function stripTags(html) {
        return String(html ?? '').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
    }
    function decodeEntities(text) {
        return String(text ?? '')
            .replace(/&quot;/g, '"')
            .replace(/&#0?39;|&apos;/g, "'")
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&amp;/g, '&');
    }
    const store = {
        get(key) {
            try {
                return localStorage.getItem(STORAGE_PREFIX + key);
            } catch (_) {
                return null;
            }
        },
        set(key, value) {
            try {
                localStorage.setItem(STORAGE_PREFIX + key, String(value));
            } catch (_) {
            }
        },
        getNumber(key, fallback, min, max) {
            const value = Number.parseFloat(this.get(key));
            return Number.isFinite(value) ? clamp(value, min, max) : fallback;
        },
        getBool(key, fallback = false) {
            const value = this.get(key);
            return value === null ? fallback : value === 'true';
        },
        getKeyName(key, fallback) {
            const value = this.get(key);
            return value === null ? fallback : value;
        },
        remove(key) {
            try {
                localStorage.removeItem(STORAGE_PREFIX + key);
            } catch (_) {
            }
        }
    };
    const SITE_TAG = IS_JABLE ? 'jable' : 'missav';
    const siteOffsetKey = () => `offset@${SITE_TAG}`;
    const settings = {
        accelerationRate: store.getNumber('accelerationRate', 3, SPEED_MIN, SPEED_MAX),
        skipTime: store.getNumber('skipTime', 5, SKIP_MIN, SKIP_MAX),
        subtitleOffset: store.getNumber(siteOffsetKey(), 0, OFFSET_MIN, OFFSET_MAX),
        subtitleFontSize: store.getNumber('subtitleFontSize', 24, FONT_SIZE_MIN, FONT_SIZE_MAX),
        subtitleBottom: store.getNumber('subtitleBottom', 10, SUBTITLE_BOTTOM_MIN, SUBTITLE_BOTTOM_MAX),
        panelX: store.getNumber('panelX', 20, 0, 99999),
        panelY: store.getNumber('panelY', 100, 0, 99999),
        pickerX: store.getNumber('pickerX', NaN, 0, 99999),
        pickerY: store.getNumber('pickerY', NaN, 0, 99999),
        isMinimized: store.getBool('isMinimized'),
        opacity: store.getNumber('opacity', 0.3, 0, 1),
        blur: store.getNumber('blur', 1, 0, 20),
        hoverOpacity: store.getNumber('hoverOpacity', 0.9, 0, 1),
        hoverBlur: store.getNumber('hoverBlur', 1, 0, 20),
        holdAccelerate: store.getBool('holdAccelerate', true),
        autoInfo: store.getBool('autoInfo', true),
        filterEnabled: store.getBool('filterEnabled', true),
        filterMinDuration: store.getNumber('filterMinDuration', 0, 0, 86400),
        filterHideWatched: store.getBool('filterHideWatched', false),
        filterEnableBlacklist: store.getBool('filterEnableBlacklist', true),
        filterKeywords: store.getKeyName('filterKeywords', ''),
        filterPrefixes: store.getKeyName('filterPrefixes', ''),
        filterDimMode: store.getBool('filterDimMode', false),
        filterTrackWatched: store.getBool('filterTrackWatched', true),
        filterBarVisible: store.getBool('filterBarVisible', true),
        filterPanelOpen: store.getBool('filterPanelOpen', false),
        analyticsTrack: store.getBool('analyticsTrack', true),
        keys: {
            accelerate: store.getKeyName('keyAccelerate', 'z'),
            forward: store.getKeyName('keyForward', 'x'),
            backward: store.getKeyName('keyBackward', 'c')
        }
    };
    function persistSettings() {
        store.set('accelerationRate', settings.accelerationRate);
        store.set('skipTime', settings.skipTime);
        store.set(siteOffsetKey(), settings.subtitleOffset);
        store.set('subtitleFontSize', settings.subtitleFontSize);
        store.set('subtitleBottom', settings.subtitleBottom);
        store.set('keyAccelerate', settings.keys.accelerate);
        store.set('keyForward', settings.keys.forward);
        store.set('keyBackward', settings.keys.backward);
        store.set('opacity', settings.opacity);
        store.set('blur', settings.blur);
        store.set('hoverOpacity', settings.hoverOpacity);
        store.set('hoverBlur', settings.hoverBlur);
        store.set('holdAccelerate', settings.holdAccelerate);
        store.set('autoInfo', settings.autoInfo);
        store.set('filterEnabled', settings.filterEnabled);
        store.set('filterMinDuration', settings.filterMinDuration);
        store.set('filterHideWatched', settings.filterHideWatched);
        store.set('filterEnableBlacklist', settings.filterEnableBlacklist);
        store.set('filterKeywords', settings.filterKeywords);
        store.set('filterPrefixes', settings.filterPrefixes);
        store.set('filterDimMode', settings.filterDimMode);
        store.set('filterTrackWatched', settings.filterTrackWatched);
        store.set('filterBarVisible', settings.filterBarVisible);
        store.set('filterPanelOpen', settings.filterPanelOpen);
        store.set('analyticsTrack', settings.analyticsTrack);
    }
    const state = {
        video: null,
        container: null,
        player: null,
        pollTimer: 0,
        pollTimeout: 0,
        bound: false,
        subtitleEl: null,
        subtitlePicker: null,
        subtitleSource: '',
        cueIndex: null,
        cueCursor: -1,
        activeCueText: '',
        subtitleLoading: false,
        subtitleRAF: 0,
        panel: null,
        panelBody: null,
        quick: null,
        quickHost: null,
        quickWatchTimer: 0,
        playPauseBtn: null,
        loopBtn: null,
        loopMenu: null,
        logEl: null,
        quickHideTimer: 0,
        acceleratePressed: false,
        speedBeforeAccelerate: 1,
        lastRepeatSeek: 0,
        loopActive: false,
        loopStart: 0,
        loopDuration: 5,
        adObserver: null,
        uiLayer: null,
        pickerLayer: null,
        subtitleBanner: null,
        subtitleFileName: '',
        subtitleCueCount: 0,
        hudHost: null,
        hudEl: null,
        holdTimer: 0,
        holdPointerId: -1,
        holdStartX: 0,
        holdStartY: 0,
        holdingSpeed: false,
        suppressClickUntil: 0,
        infoSection: null,
        lightbox: null,
        infoSession: 0,
        pinnedOverlay: null,
        gallery: [],
        galleryIndex: 0,
        infoData: null,
        listMovies: null,
        filterBar: null,
        filterHost: null,
        filterChecks: {},
        filterCheckSync: {},
        filterPanel: null,
        filterDepends: null,
        filterStats: { total: 0, filtered: 0, visible: 0 },
        filterTimer: 0,
        filterObserver: null,
        domGen: 0,
        watchGen: 0,
        analyticsSession: null,
        analyticsTimer: 0,
        analyticsRecords: null,
        analyticsPage: null,
        analyticsRange: 'all',
        reviewsCode: '',
        reviewsPage: 1,
        reviewsHasMore: false,
        reviewsLoadingMore: false
    };
    const ANALYTICS_ENTRY = /^#av-analytics\b/.test(location.hash) || location.search.includes('av-analytics');
    const COCKPIT_GUARD_CSS = 'html.av-cockpit-mode,html.av-cockpit-mode body{margin:0 !important;padding:0 !important;background:#090a0f !important;overflow-x:hidden !important}html.av-cockpit-mode body>*:not(.av-analytics-page){display:none !important}html.av-cockpit-mode .av-analytics-page{position:fixed !important;inset:0 !important;z-index:2147483600 !important;overflow-y:auto !important;background:#090a0f !important}';
    function engageCockpitGuard() {
        try {
            document.documentElement.classList.add('av-cockpit-mode');
            if (document.getElementById('av-cockpit-guard')) return;
            const guard = document.createElement('style');
            guard.id = 'av-cockpit-guard';
            guard.textContent = COCKPIT_GUARD_CSS;
            (document.head || document.documentElement).appendChild(guard);
        } catch (_) {
        }
    }
    function releaseCockpitGuard() {
        try {
            document.documentElement.classList.remove('av-cockpit-mode');
            const guard = document.getElementById('av-cockpit-guard');
            if (guard) guard.remove();
        } catch (_) {
        }
    }
    let cockpitMediaKiller = null;
    function armMediaKiller() {
        if (cockpitMediaKiller || typeof MutationObserver !== 'function') return;
        cockpitMediaKiller = new MutationObserver(records => {
            for (const record of records) {
                for (const node of record.addedNodes) {
                    if (node.nodeType !== 1) continue;
                    if (state.analyticsPage && typeof state.analyticsPage.contains === 'function' && state.analyticsPage.contains(node)) continue;
                    if (node.tagName === 'VIDEO' || node.tagName === 'AUDIO' || (node.querySelector && node.querySelector('video, audio'))) {
                        silenceMedia();
                        return;
                    }
                }
            }
        });
        cockpitMediaKiller.observe(document.documentElement, { childList: true, subtree: true });
    }
    function disarmMediaKiller() {
        if (!cockpitMediaKiller) return;
        cockpitMediaKiller.disconnect();
        cockpitMediaKiller = null;
    }
    if (ANALYTICS_ENTRY) {
        engageCockpitGuard();
        armMediaKiller();
        try {
            sessionStorage.setItem('avSub:cockpit', '1');
        } catch (_) {
        }
    }
    let cockpitSticky = ANALYTICS_ENTRY;
    try {
        cockpitSticky = cockpitSticky || sessionStorage.getItem('avSub:cockpit') === '1';
    } catch (_) {
    }
    if (/^https:\/\/(?:missav|thisav)\.com/.test(location.href)) {
        location.replace(location.href.replace(/^https:\/\/(?:missav|thisav)\.com/, 'https://missav.live'));
        return;
    }
    function patchWindowOpen(target) {
        if (!target) return;
        try {
            target.open = function blockedWindowOpen() {
                return null;
            };
        } catch (_) {
        }
    }
    patchWindowOpen(typeof unsafeWindow !== 'undefined' ? unsafeWindow : window);
    function patchAllIframeWindows() {
        for (const frame of document.querySelectorAll('iframe')) {
            if (isProtectedFrame(frame)) continue;
            try {
                patchWindowOpen(frame.contentWindow);
            } catch (_) {
            }
        }
    }
    const PROTECTED_FRAME = /recaptcha|hcaptcha|turnstile|challenges\.cloudflare|accounts\.google|appleid|facebook\.com|stripe|paypal|oauth/i;
    function isProtectedFrame(element) {
        if (!element || element.tagName !== 'IFRAME') return false;
        return PROTECTED_FRAME.test(element.getAttribute('src') || element.src || '');
    }
    function isProtectedNode(element) {
        if (element.classList?.contains('av-info-section')) return true;
        const container = state.container;
        if (!container) return false;
        return element === container || element.contains(container) || container.contains(element);
    }
    function cleanAds() {
        patchWindowOpen(typeof unsafeWindow !== 'undefined' ? unsafeWindow : window);
        patchAllIframeWindows();
        for (const element of document.querySelectorAll(AD_SELECTORS)) {
            if (isProtectedNode(element)) continue;
            if (element.tagName === 'IFRAME') {
                if (isProtectedFrame(element)) continue;
                element.remove();
            } else if (element.style.display !== 'none') {
                element.style.display = 'none';
            }
        }
    }
    function startAdObserver() {
        if (state.adObserver || !document.body) return;
        state.adObserver = new MutationObserver(throttle(() => {
            cleanAds();
            if (!state.bound) initPlayer();
        }, MUTATION_THROTTLE));
        state.adObserver.observe(document.body, { childList: true, subtree: true });
    }
    const LOG_LIMIT = 80;
    function log(message) {
        const logEl = state.logEl;
        if (!logEl) return;
        while (logEl.childElementCount >= LOG_LIMIT) logEl.firstElementChild.remove();
        const now = new Date();
        const entry = document.createElement('div');
        entry.className = 'log-entry';
        const timeEl = document.createElement('span');
        timeEl.className = 'log-time';
        timeEl.textContent = `[${pad2(now.getHours())}:${pad2(now.getMinutes())}:${pad2(now.getSeconds())}]`;
        const textEl = document.createElement('span');
        textEl.textContent = message;
        entry.append(timeEl, textEl);
        logEl.appendChild(entry);
        logEl.scrollTop = logEl.scrollHeight;
    }
    GM_addStyle(`
        .custom-ui-layer {
            position: fixed;
            inset: 0;
            z-index: 2147483600;
            pointer-events: none;
            display: block;
            margin: 0;
            padding: 0;
            border: 0;
            background: transparent;
            transform: none;
            filter: none;
            animation: none;
            clip: auto;
            clip-path: none;
            opacity: 1;
            isolation: auto;
        }
        .custom-ui-layer.custom-ui-layer-top { z-index: 2147483646; }
        .custom-ui-layer > * { pointer-events: auto; }
        .custom-ui-layer .custom-control-panel { position: fixed; }
        .custom-control-panel,
        .custom-control-panel * { box-sizing: border-box; }
        .custom-control-panel {
            --ui-bg-opacity: .3;
            --ui-blur: 1px;
            --ui-hover-opacity: .9;
            --ui-hover-blur: 1px;
            position: fixed;
            z-index: 99999;
            display: flex;
            flex-direction: column;
            width: ${PANEL_WIDTH}px;
            border: 1px solid rgba(255,255,255,.18);
            border-radius: 12px;
            background: rgba(28,28,34,var(--ui-bg-opacity));
            backdrop-filter: blur(var(--ui-blur)) saturate(200%);
            -webkit-backdrop-filter: blur(var(--ui-blur)) saturate(200%);
            box-shadow: inset 0 1px 0 rgba(255,255,255,.2), 0 12px 34px rgba(0,0,0,.45);
            color: #f8fafc;
            font: 12px/1.4 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Microsoft YaHei",sans-serif;
            -webkit-font-smoothing: antialiased;
            text-shadow: 0 1px 2px rgba(0,0,0,.6);
            transition: background .2s ease, box-shadow .2s ease, width .3s cubic-bezier(.4,0,.2,1);
            overflow: hidden;
        }
        .custom-control-panel:hover,
        .custom-control-panel:focus-within {
            background: rgba(28,28,34,var(--ui-hover-opacity));
            backdrop-filter: blur(var(--ui-hover-blur)) saturate(200%);
            -webkit-backdrop-filter: blur(var(--ui-hover-blur)) saturate(200%);
            box-shadow: inset 0 1px 0 rgba(255,255,255,.25), 0 14px 38px rgba(0,0,0,.55);
        }
        .panel-header { position: relative; z-index: 2; display: flex; justify-content: center; align-items: center; gap: 8px; padding: 6px 12px; background: rgba(0,0,0,.4); cursor: move; color: #f1f5f9; border-bottom: 1px solid rgba(255,255,255,.15); user-select: none; }
        .panel-title { flex: 0 1 auto; min-width: 0; overflow: hidden; white-space: nowrap; font-size: 13px; font-weight: 700; letter-spacing: 1.2px; text-shadow: none; background: linear-gradient(100deg,#7dd3fc 0%,#a78bfa 26%,#f0abfc 50%,#7dd3fc 74%,#a78bfa 100%); background-size: 240% 100%; -webkit-background-clip: text; background-clip: text; color: transparent; -webkit-text-fill-color: transparent; filter: drop-shadow(0 0 6px rgba(129,140,248,.55)); animation: panelTitleFlow 4.2s linear infinite; transition: max-width .3s cubic-bezier(.4,0,.2,1), opacity .24s ease; }
        @keyframes panelTitleFlow { from { background-position: 0% 50%; } to { background-position: 240% 50%; } }
        .custom-control-panel.panel-dragging { transition: none; }
        .custom-control-panel.panel-dragging .panel-header { cursor: grabbing; background: rgba(59,130,246,.35); }
        .panel-gear { display: inline-flex; align-items: center; justify-content: center; width: 26px; height: 26px; padding: 0; border: 1px solid transparent; border-radius: 7px; background: transparent; color: #cbd5e1; cursor: pointer; transition: color .2s ease, background .2s ease, border-color .2s ease, transform .3s cubic-bezier(.4,0,.2,1), box-shadow .25s ease; }
        .panel-gear svg { display: block; width: 17px; height: 17px; }
        .panel-gear:hover { color: #fff; background: rgba(148,163,184,.18); border-color: rgba(148,163,184,.32); box-shadow: 0 0 10px rgba(129,140,248,.45); }
        .panel-gear:focus-visible { outline: 2px solid rgba(56,189,248,.7); outline-offset: 2px; }
        .custom-control-panel.panel-collapsed .panel-gear { transform: rotate(180deg); }
        .custom-control-panel.panel-collapsed .panel-header { gap: 0; }
        .custom-control-panel.panel-collapsed .panel-title { max-width: 0; opacity: 0; }
        .panel-collapse { width: ${PANEL_WIDTH - 2}px; display: grid; grid-template-rows: 1fr; transition: grid-template-rows .3s cubic-bezier(.4,0,.2,1), opacity .24s ease; }
        .panel-collapse-inner { min-height: 0; overflow: hidden; }
        .custom-control-panel.panel-collapsed { width: 52px; }
        .custom-control-panel.panel-collapsed .panel-collapse { grid-template-rows: 0fr; opacity: 0; }
        .panel-body { padding: 10px 12px; max-height: min(46vh, 380px); overflow-y: auto; overscroll-behavior: contain; scrollbar-width: thin; scrollbar-color: rgba(148,163,184,.4) transparent; scrollbar-gutter: stable; }
        .panel-body[hidden] { display: none; }
        .panel-footer { padding: 0 12px 10px; border-top: 1px solid rgba(255,255,255,.12); background: rgba(0,0,0,.28); }
        .panel-footer[hidden] { display: none; }
        .panel-row { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 7px 8px; margin: 0 0 8px; }
        .input-group { display: flex; align-items: center; justify-content: space-between; gap: 4px; min-width: 0; color: #e2e8f0; font-size: 12px; font-weight: 600; white-space: nowrap; letter-spacing: .2px; }
        .custom-control-panel input[type="number"]::-webkit-outer-spin-button,
        .custom-control-panel input[type="number"]::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
        .custom-control-panel input[type="number"] { -moz-appearance: textfield; }
        .custom-control-panel input[type="text"],
        .custom-control-panel input[type="number"] { width: 48px; height: 24px; padding: 0 4px; border: 1px solid rgba(255,255,255,.3); border-radius: 6px; outline: none; background: rgba(255,255,255,.15); color: #fff; font-size: 12px; font-weight: 700; text-align: center; text-shadow: none; transition: border-color .2s; }
        .custom-control-panel input[type="text"] { width: 44px; text-transform: lowercase; }
        .custom-control-panel input:focus { border-color: #60a5fa; background: rgba(255,255,255,.2); }
        .btn-group { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 6px; }
        .btn-group button { width: 100%; min-height: 26px; padding: 4px 5px; border: 1px solid rgba(255,255,255,.25); border-radius: 6px; background: rgba(255,255,255,.12); color: #f8fafc; cursor: pointer; font-family: inherit; font-size: 12px; font-weight: 600; letter-spacing: .2px; text-shadow: 0 1px 2px rgba(0,0,0,.4); transition: background .2s ease, border-color .2s ease; }
        .btn-group button:hover { background: rgba(255,255,255,.25); }
        .btn-group button.btn-primary { background: linear-gradient(135deg,#3b82f6,#2563eb); border-color: rgba(59,130,246,.5); }
        .btn-group button.btn-danger { background: rgba(239,68,68,.25); color: #fecaca; border-color: rgba(239,68,68,.4); }
        .btn-group button.btn-ghost { background: rgba(148,163,184,.18); color: #e2e8f0; border-color: rgba(148,163,184,.32); }
        .btn-group button.btn-ghost:hover { background: rgba(148,163,184,.3); }
        .panel-full-btn { display: block; width: 100%; min-height: 24px; margin-top: 4px; padding: 2px 8px; border: 0; border-radius: 6px; background: rgba(255,255,255,.06); color: #cbd5e1; font-family: inherit; font-size: 12px; font-weight: 600; cursor: pointer; transition: background .2s ease, color .2s ease; }
        .panel-full-btn:hover { background: rgba(255,255,255,.14); color: #fff; }
        .panel-status-log { margin-top: 8px; padding: 8px; border: 1px solid rgba(255,255,255,.15); border-radius: 6px; background: rgba(0,0,0,.3); color: #bae6fd; font-size: 11px; font-weight: 500; text-align: left; letter-spacing: .5px; height: 90px; overflow-y: auto; scrollbar-width: thin; scrollbar-color: rgba(148,163,184,.4) transparent; scrollbar-gutter: stable; display: flex; flex-direction: column; gap: 4px; text-shadow: none; }
        .log-entry { display: flex; align-items: flex-start; word-break: break-all; flex: 0 0 auto; }
        .log-time { color: #94a3b8; margin-right: 6px; font-family: ui-monospace,Consolas,monospace; flex-shrink: 0; }
        .custom-quick-controls { position: absolute; left: 50%; bottom: 48px; transform: translateX(-50%) scale(var(--quick-scale, 1)); transform-origin: center bottom; z-index: 9990; display: flex; flex-wrap: nowrap; align-items: center; gap: 4px; padding: 6px 12px; border: 1px solid rgba(255,255,255,.14); border-radius: 22px; background: rgba(14,17,24,.42); backdrop-filter: blur(6px); -webkit-backdrop-filter: blur(6px); box-shadow: 0 4px 16px rgba(0,0,0,.28); white-space: nowrap; max-width: calc(100% - 16px); opacity: 0; visibility: hidden; pointer-events: none; transition: opacity .22s ease; box-sizing: border-box; }
        .custom-quick-controls.quick-visible,
        .custom-quick-controls:hover { opacity: 1; visibility: visible; pointer-events: auto; }
        .quick-jump-group { display: flex; flex-wrap: nowrap; align-items: center; gap: 2px; min-width: 0; }
        .quick-btn { min-width: 48px; height: 32px; padding: 0 8px; border: 0; border-radius: 8px; background: transparent; color: rgba(255,255,255,.92); cursor: pointer; font-family: inherit; font-size: 13px; font-weight: 600; display: inline-flex; align-items: center; justify-content: center; line-height: 1; white-space: nowrap; flex: 0 0 auto; overflow: visible; text-overflow: clip; }
        .quick-btn:hover { background: rgba(255,255,255,.14); color: #fff; }
        .quick-play-btn { min-width: 78px; margin: 0 4px; background: #476a9f; border-radius: 16px; padding: 0 12px; }
        .quick-play-btn:hover { background: #5779ad; }
        .quick-divider { width: 1px; height: 16px; background: rgba(255,255,255,.14); margin: 0 3px; flex: 0 0 auto; }
        .quick-btn-glyph { font-size: 11px; line-height: 1; opacity: .85; }
        .quick-btn-label { font-variant-numeric: tabular-nums; letter-spacing: .2px; }
        .custom-quick-controls.quick-compact { gap: 2px; padding: 5px 8px; }
        .custom-quick-controls.quick-compact .quick-btn { min-width: 40px; padding: 0 5px; font-size: 12px; }
        .custom-quick-controls.quick-compact .quick-btn-glyph { display: none; }
        .custom-quick-controls.quick-compact .quick-play-btn { min-width: 64px; padding: 0 8px; }
        .custom-quick-controls.quick-compact .quick-loop-btn { min-width: 40px; padding: 0 5px; }
        .custom-subtitle { position: absolute; left: 50%; bottom: 10%; z-index: 10000; max-width: 85%; transform: translateX(-50%); color: #fff; font-size: 24px; font-weight: 700; text-align: center; white-space: pre-line; text-shadow: -1px -1px 0 #000,1px -1px 0 #000,-1px 1px 0 #000,1px 1px 0 #000,2px 2px 4px rgba(0,0,0,.8); pointer-events: none; }
        .slider-row-container { display: flex; flex-direction: column; gap: 8px; margin-top: 12px; padding: 10px 0 14px; border-top: 1px solid rgba(255,255,255,.15); opacity: 1; overflow: visible; transition: opacity .3s ease; }
        .slider-row-container[hidden] { display: none; }
        .slider-group { display: flex; align-items: center; justify-content: space-between; gap: 8px; color: #e2e8f0; font-size: 12px; font-weight: 600; }
        .slider-group label { width: 65px; flex-shrink: 0; white-space: nowrap; }
        .slider-group input[type="range"] { -webkit-appearance: none; appearance: none; flex: 1; width: 100%; height: 14px; margin: 0; padding: 0; border: 0; background: transparent; cursor: pointer; }
        .slider-group input[type="range"]::-webkit-slider-runnable-track { height: 4px; border: 0; border-radius: 999px; background: linear-gradient(90deg, #38bdf8 0 var(--av-range, 0%), rgba(255,255,255,.16) var(--av-range, 0%) 100%); }
        .slider-group input[type="range"]::-webkit-slider-thumb { -webkit-appearance: none; width: 12px; height: 12px; margin-top: -4px; border: 0; border-radius: 50%; background: #38bdf8; box-shadow: 0 0 0 3px rgba(56,189,248,.18), 0 1px 4px rgba(0,0,0,.45); transition: box-shadow .15s ease, transform .15s ease; }
        .slider-group input[type="range"]:hover::-webkit-slider-thumb { box-shadow: 0 0 0 5px rgba(56,189,248,.26), 0 1px 4px rgba(0,0,0,.45); }
        .slider-group input[type="range"]:active::-webkit-slider-thumb { transform: scale(1.12); }
        .slider-group input[type="range"]:focus-visible::-webkit-slider-thumb { box-shadow: 0 0 0 5px rgba(56,189,248,.38); }
        .slider-group input[type="range"]::-moz-range-track { height: 4px; border: 0; border-radius: 999px; background: rgba(255,255,255,.16); }
        .slider-group input[type="range"]::-moz-range-progress { height: 4px; border: 0; border-radius: 999px; background: #38bdf8; }
        .slider-group input[type="range"]::-moz-range-thumb { width: 12px; height: 12px; border: 0; border-radius: 50%; background: #38bdf8; box-shadow: 0 0 0 3px rgba(56,189,248,.18); }
        .slider-group input[type="range"]:hover::-moz-range-thumb { box-shadow: 0 0 0 5px rgba(56,189,248,.26); }
        .slider-value { width: 30px; text-align: right; font-family: ui-monospace,Consolas,monospace; font-size: 11px; flex-shrink: 0; }
        .quick-loop-wrapper { position: relative; display: inline-flex; align-items: center; flex: 0 0 auto; }
        .quick-loop-btn { min-width: 46px; height: 32px; padding: 0 8px; display: inline-flex; flex-direction: row; align-items: center; justify-content: center; gap: 1px; line-height: 1; font-size: 13px; }
        .quick-loop-btn span { display: inline; }
        .quick-loop-btn.active { background: rgba(59,130,246,.45); color: #93c5fd; }
        .loop-menu { position: absolute; bottom: 44px; left: 50%; transform: translateX(-50%); background: rgba(20,22,30,.95); border: 1px solid rgba(255,255,255,.2); border-radius: 8px; padding: 6px; display: none; flex-direction: column; gap: 4px; z-index: 9991; white-space: nowrap; backdrop-filter: blur(6px); box-shadow: 0 8px 24px rgba(0,0,0,.5); }
        .loop-menu.show { display: flex; }
        .loop-menu-btn { background: transparent; border: 0; color: #fff; padding: 6px 12px; text-align: left; border-radius: 4px; cursor: pointer; font-family: inherit; font-size: 12px; font-weight: 600; }
        .loop-menu-btn:hover { background: rgba(255,255,255,.15); color: #60a5fa; }
        .subtitle-picker { position: fixed; left: 15px; top: 40%; z-index: 1; min-width: 320px; max-width: min(560px, 92vw); max-height: min(60vh, 420px); overflow-y: auto; overscroll-behavior: contain; padding: 12px; border-radius: 12px; --ui-bg-opacity: .3; --ui-blur: 1px; --ui-hover-opacity: .9; --ui-hover-blur: 1px; background: rgba(28,28,34,var(--ui-bg-opacity)); backdrop-filter: blur(var(--ui-blur)) saturate(200%); -webkit-backdrop-filter: blur(var(--ui-blur)) saturate(200%); border: 1px solid rgba(255,255,255,.18); box-shadow: inset 0 1px 0 rgba(255,255,255,.2), 0 12px 34px rgba(0,0,0,.45); color: #f8fafc; font: 13px/1.45 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Microsoft YaHei",sans-serif; text-shadow: 0 1px 2px rgba(0,0,0,.6); transition: background .2s ease, box-shadow .2s ease; pointer-events: auto; contain: layout style; }
        .subtitle-picker:hover, .subtitle-picker:focus-within { background: rgba(28,28,34,var(--ui-hover-opacity)); backdrop-filter: blur(var(--ui-hover-blur)) saturate(200%); -webkit-backdrop-filter: blur(var(--ui-hover-blur)) saturate(200%); box-shadow: inset 0 1px 0 rgba(255,255,255,.25), 0 14px 38px rgba(0,0,0,.55); }
        .subtitle-picker.panel-dragging { transition: none; }
        .subtitle-banner { position: fixed; top: 10px; left: 50%; transform: translateX(-50%); z-index: 1; display: flex; align-items: center; gap: 8px; max-width: min(680px, 88vw); padding: 7px 14px; border-radius: 9999px; --ui-bg-opacity: .35; --ui-blur: 1px; --ui-hover-opacity: .9; --ui-hover-blur: 1px; background: rgba(28,28,34,var(--ui-bg-opacity)); backdrop-filter: blur(var(--ui-blur)) saturate(200%); -webkit-backdrop-filter: blur(var(--ui-blur)) saturate(200%); border: 1px solid rgba(255,255,255,.18); box-shadow: inset 0 1px 0 rgba(255,255,255,.2), 0 8px 24px rgba(0,0,0,.45); color: #f8fafc; font: 12px/1.4 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Microsoft YaHei",sans-serif; text-shadow: 0 1px 2px rgba(0,0,0,.6); cursor: pointer; user-select: none; pointer-events: auto; transition: background .2s ease; }
        .subtitle-banner:hover { background: rgba(28,28,34,var(--ui-hover-opacity)); backdrop-filter: blur(var(--ui-hover-blur)) saturate(200%); -webkit-backdrop-filter: blur(var(--ui-hover-blur)) saturate(200%); }
        .subtitle-banner-icon { flex: 0 0 auto; }
        .subtitle-banner-name { flex: 0 1 auto; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-weight: 600; color: #93c5fd; }
        .subtitle-banner-meta { flex: 0 0 auto; color: #94a3b8; font-variant-numeric: tabular-nums; }
        .subtitle-banner.expanded .subtitle-banner-name { white-space: normal; word-break: break-all; }
        .subtitle-picker-header { position: sticky; top: -12px; z-index: 2; display: flex; justify-content: space-between; align-items: center; gap: 10px; margin: -12px -12px 0; padding: 12px 12px 8px; background: rgba(0,0,0,.4); border-bottom: 1px solid rgba(255,255,255,.15); border-radius: 12px 12px 0 0; cursor: move; user-select: none; }
        .subtitle-picker-title { color: #60a5fa; font-weight: 700; }
        .subtitle-picker-close { cursor: pointer; color: #94a3b8; }
        .subtitle-picker-close:hover { color: #fff; }
        .subtitle-picker-row { padding: 8px; margin-top: 5px; border-bottom: 1px solid rgba(255,255,255,.1); cursor: pointer; word-break: break-all; }
        .subtitle-picker-row:hover { background: rgba(96,165,250,.16); }
        .speed-hud-host { position: absolute; inset: 0; display: flex; justify-content: center; align-items: flex-start; padding-top: 24px; pointer-events: none; z-index: 26; }
        .speed-hud { display: inline-flex; align-items: center; justify-content: center; padding: 8px 18px; border-radius: 9999px; background: rgba(10,10,10,.85); border: 1px solid rgba(255,255,255,.16); color: #ededed; box-shadow: 0 4px 20px rgba(0,0,0,.5); pointer-events: none; user-select: none; -webkit-user-select: none; animation: speed-hud-pulse 1.2s ease-in-out infinite alternate; }
        .speed-hud-content { display: flex; align-items: center; gap: 8px; font: 500 14px/1 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Microsoft YaHei",sans-serif; letter-spacing: -.2px; }
        .speed-hud-rate { color: #50e3c2; font-family: ui-monospace,Consolas,monospace; font-size: 14px; font-weight: 600; }
        .speed-hud-arrows { font-size: 12px; letter-spacing: -1px; opacity: .85; }
        @keyframes speed-hud-pulse { from { transform: scale(1); } to { transform: scale(1.03); } }
        .info-rating-badge { display: inline-flex; align-items: center; gap: 4px; margin-right: 8px; padding: 2px 8px; border-radius: 9999px; background: rgba(245,158,11,.16); border: 1px solid rgba(245,158,11,.45); color: #fbbf24; font: 600 12px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Microsoft YaHei",sans-serif; white-space: nowrap; vertical-align: middle; }
        .info-rating-badge small { color: #94a3b8; font-weight: 500; font-size: 10px; }
        .social-badges { display: inline-flex; align-items: center; gap: 4px; margin-left: 6px; }
        .social-badge { display: inline-flex; align-items: center; justify-content: center; width: 20px; height: 20px; border-radius: 50%; background: rgba(255,255,255,.1); color: #e2e8f0; font-size: 11px; text-decoration: none; transition: background .15s ease; }
        .social-badge:hover { background: rgba(96,165,250,.4); }
        .lightbox-layer { position: fixed; inset: 0; z-index: 2147483647; background: rgba(0,0,0,.94); display: flex; flex-direction: column; touch-action: none; font: 13px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Microsoft YaHei",sans-serif; }
        .lightbox-topbar { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 10px 16px; color: #e2e8f0; }
        .lightbox-meta { font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .lightbox-counter { color: #94a3b8; font-family: ui-monospace,Consolas,monospace; }
        .lightbox-hint { color: #64748b; font-size: 11px; }
        .lightbox-close { cursor: pointer; background: rgba(255,255,255,.1); border: 0; color: #fff; width: 32px; height: 32px; border-radius: 50%; font-size: 16px; line-height: 1; }
        .lightbox-close:hover { background: rgba(239,68,68,.5); }
        .lightbox-stage { flex: 1; display: flex; align-items: center; justify-content: center; overflow: hidden; padding: 0 56px 20px; }
        .lightbox-img { max-width: 100%; max-height: 100%; object-fit: contain; border-radius: 6px; user-select: none; -webkit-user-drag: none; }
        .lightbox-nav { position: absolute; top: 50%; transform: translateY(-50%); width: 44px; height: 72px; border: 0; border-radius: 8px; background: rgba(255,255,255,.08); color: #fff; font-size: 20px; cursor: pointer; }
        .lightbox-nav:hover { background: rgba(96,165,250,.35); }
        .lightbox-nav.prev { left: 6px; }
        .lightbox-nav.next { right: 6px; }
        .av-info-section { margin: 12px 0; border-radius: 12px; background: rgba(20,22,30,.72); border: 1px solid rgba(255,255,255,.12); overflow: hidden; box-shadow: 0 4px 16px rgba(0,0,0,.24); color: #e2e8f0; font: 13px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Microsoft YaHei",sans-serif; }
        .av-info-section:hover { border-color: rgba(255,255,255,.2); }
        .av-info-head { display: flex; align-items: center; gap: 12px; padding: 10px 16px; cursor: pointer; user-select: none; background: rgba(255,255,255,.02); transition: background .15s; }
        .av-info-head:hover { background: rgba(255,255,255,.05); }
        .av-info-title { display: flex; align-items: center; gap: 8px; min-width: 0; font-size: 14px; font-weight: 600; color: #f1f5f9; letter-spacing: -.01em; }
        .av-info-title svg { flex: 0 0 16px; width: 16px; height: 16px; fill: none; stroke: #94a3b8; stroke-width: 1.5; stroke-linecap: round; stroke-linejoin: round; }
        .av-info-meta { display: flex; align-items: center; gap: 8px; margin-left: auto; color: #94a3b8; font-size: 12px; white-space: nowrap; }
        .av-info-stats { display: flex; gap: 8px; }
        .av-info-chevron { flex: 0 0 6px; width: 6px; height: 6px; border-right: 1.5px solid #94a3b8; border-bottom: 1.5px solid #94a3b8; transform: rotate(45deg); transition: transform .15s; }
        .av-info-section.open .av-info-chevron { transform: rotate(225deg); }
        .av-info-body { border-top: 1px solid rgba(255,255,255,.12); background: rgba(0,0,0,.22); padding: 14px 16px; }
        .av-info-body[hidden] { display: none; }
        .av-hub-tabs { display: flex; gap: 8px; margin-bottom: 14px; }
        .av-hub-tab { color: #94a3b8; background: rgba(255,255,255,.04); border: 1px solid rgba(255,255,255,.12); border-radius: 6px; padding: 6px 14px; font-size: 12px; font-weight: 500; font-family: inherit; cursor: pointer; transition: all .15s; }
        .av-hub-tab:hover { color: #e2e8f0; border-color: rgba(255,255,255,.25); }
        .av-hub-tab.active { color: #fff; background: rgba(255,255,255,.1); border-color: rgba(255,255,255,.35); }
        .av-stills-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(170px, 1fr)); gap: 10px; max-height: 420px; padding-right: 4px; overflow-y: auto; overscroll-behavior: contain; scrollbar-width: thin; scrollbar-color: rgba(148,163,184,.4) transparent; scrollbar-gutter: stable; -webkit-overflow-scrolling: touch; }
        .av-still-item { position: relative; aspect-ratio: 16 / 10; margin: 0; border-radius: 12px; border: 1px solid rgba(255,255,255,.12); background: rgba(255,255,255,.04); overflow: hidden; cursor: zoom-in; transition: transform .15s, border-color .15s, box-shadow .15s; }
        .av-still-item:hover { border-color: rgba(255,255,255,.35); transform: translateY(-2px); box-shadow: 0 6px 16px rgba(0,0,0,.4); }
        .av-still-open { display: block; width: 100%; height: 100%; margin: 0; padding: 0; border: 0; background: none; cursor: zoom-in; }
        .av-still-item img { display: block; width: 100%; height: 100%; object-fit: cover; transition: transform .2s; }
        .av-still-item:hover img { transform: scale(1.04); }
        .av-hub-empty { margin: 0; padding: 28px 0; text-align: center; color: #64748b; font-size: 12px; }
        .av-hub-loading { display: flex; align-items: center; justify-content: center; gap: 8px; padding: 28px 0; color: #94a3b8; font-size: 12px; }
        .av-spinner { width: 12px; height: 12px; border: 1.5px solid #94a3b8; border-right-color: transparent; border-radius: 50%; animation: av-spin .7s linear infinite; }
        @keyframes av-spin { to { transform: rotate(360deg); } }
        .av-review-list {
            display: flex;
            flex-direction: column;
            gap: 8px;
            max-height: 420px;
            padding-right: 4px;
            overflow-y: auto;
            overscroll-behavior: contain;
            scrollbar-width: thin;
            scrollbar-color: rgba(148,163,184,.4) transparent;
            scrollbar-gutter: stable;
            -webkit-overflow-scrolling: touch;
        }
        .av-review-list > .review-card { flex: 0 0 auto; }
        .review-card { padding: 10px 14px; border-radius: 12px; background: rgba(255,255,255,.04); border: 1px solid rgba(255,255,255,.12); }
        .av-review-head { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; }
        .av-review-user { color: #e2e8f0; font-size: 12px; font-weight: 600; }
        .av-review-score { color: #fbbf24; font-size: 11px; font-weight: 700; }
        .av-review-date { margin-left: auto; color: #64748b; font-size: 11px; }
        .av-review-text { margin: 0; color: #cbd5e1; font-size: 12px; line-height: 1.6; white-space: pre-wrap; word-break: break-word; }
        .av-review-footer { flex: 0 0 auto; display: flex; align-items: center; justify-content: center; padding: 2px 0; }
        .av-hub-more-btn { min-height: 28px; padding: 4px 16px; border: 1px solid rgba(56,189,248,.4); border-radius: 6px; background: rgba(56,189,248,.12); color: #38bdf8; font-family: inherit; font-size: 12px; font-weight: 600; cursor: pointer; }
        .av-hub-more-btn:hover { background: rgba(56,189,248,.22); }
        .av-hub-more-btn:disabled { opacity: .6; cursor: progress; }
        .av-hub-done { color: #64748b; font-size: 11px; }
        .review-text { max-height: 9em; overflow-y: auto; }
        .review-header { display: flex; align-items: baseline; justify-content: space-between; gap: 8px; margin-bottom: 4px; }
        .review-header strong { color: #93c5fd; font-size: 12px; }
        .review-header time { color: #64748b; font-size: 11px; }
        .review-text { color: #cbd5e1; font-size: 12px; word-break: break-word; }
        .av-info-pane[hidden] { display: none; }
        .av-list-grid {
            display: flex;
            flex-direction: column;
            gap: 10px;
            max-height: 480px;
            padding-right: 4px;
            overflow-y: auto;
            overscroll-behavior: contain;
            scrollbar-width: thin;
            scrollbar-color: rgba(148,163,184,.4) transparent;
            scrollbar-gutter: stable;
            -webkit-overflow-scrolling: touch;
        }
        .av-stills-grid::-webkit-scrollbar,
        .av-review-list::-webkit-scrollbar,
        .av-list-grid::-webkit-scrollbar,
        .panel-body::-webkit-scrollbar,
        .panel-status-log::-webkit-scrollbar { width: 8px; height: 8px; }
        .av-stills-grid::-webkit-scrollbar-thumb,
        .av-review-list::-webkit-scrollbar-thumb,
        .av-list-grid::-webkit-scrollbar-thumb,
        .panel-body::-webkit-scrollbar-thumb,
        .panel-status-log::-webkit-scrollbar-thumb { background: rgba(148,163,184,.38); background-clip: padding-box; border: 2px solid transparent; border-radius: 999px; }
        .av-stills-grid::-webkit-scrollbar-thumb:hover,
        .av-review-list::-webkit-scrollbar-thumb:hover,
        .av-list-grid::-webkit-scrollbar-thumb:hover,
        .panel-body::-webkit-scrollbar-thumb:hover,
        .panel-status-log::-webkit-scrollbar-thumb:hover { background: rgba(56,189,248,.62); background-clip: padding-box; border: 2px solid transparent; }
        .av-stills-grid::-webkit-scrollbar-track,
        .av-review-list::-webkit-scrollbar-track,
        .av-list-grid::-webkit-scrollbar-track,
        .panel-body::-webkit-scrollbar-track,
        .panel-status-log::-webkit-scrollbar-track { background: transparent; }
        .av-list-grid > .av-list-card { flex: 0 0 auto; }
        .av-list-card { border: 1px solid rgba(255,255,255,.12); background: rgba(255,255,255,.04); border-radius: 12px; overflow: hidden; }
        .av-list-card.is-expanded { border-color: rgba(255,255,255,.28); background: rgba(255,255,255,.06); }
        .av-list-head { display: flex; align-items: center; gap: 10px; padding: 10px 14px; }
        .av-list-icon { flex: 0 0 16px; width: 16px; height: 16px; }
        .av-list-icon svg { display: block; width: 16px; height: 16px; fill: none; stroke: #94a3b8; stroke-width: 1.5; stroke-linecap: round; stroke-linejoin: round; }
        .av-list-title { flex: 1 1 auto; min-width: 0; font-size: 13px; font-weight: 600; color: #e2e8f0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .av-list-meta { display: flex; align-items: center; gap: 12px; color: #94a3b8; font-size: 12px; white-space: nowrap; }
        .av-list-stat { display: inline-flex; align-items: center; gap: 4px; }
        .av-list-stat svg { display: block; width: 13px; height: 13px; fill: none; stroke: #64748b; stroke-width: 1.6; stroke-linecap: round; stroke-linejoin: round; }
        .av-list-action { flex: 0 0 auto; display: inline-flex; align-items: center; gap: 5px; padding: 4px 10px; border-radius: 6px; border: 1px solid rgba(255,255,255,.16); background: rgba(255,255,255,.06); color: #cbd5e1; font: 500 12px/1.4 inherit; font-family: inherit; cursor: pointer; text-decoration: none; white-space: nowrap; transition: all .15s; }
        .av-list-action:hover { color: #fff; border-color: rgba(255,255,255,.34); background: rgba(255,255,255,.12); }
        .av-list-action.is-open { color: #fff; border-color: rgba(255,255,255,.34); }
        .av-list-action .av-chevron { width: 5px; height: 5px; border-right: 1.5px solid currentColor; border-bottom: 1.5px solid currentColor; transform: rotate(45deg); transition: transform .15s; }
        .av-list-action.is-open .av-chevron { transform: rotate(225deg); }
        .av-list-body { border-top: 1px solid rgba(255,255,255,.1); padding: 12px 14px; }
        .av-list-loading { display: flex; align-items: center; justify-content: center; gap: 8px; padding: 16px 0; color: #94a3b8; font-size: 12px; }
        .av-list-fallback { display: flex; flex-direction: column; gap: 8px; align-items: flex-start; color: #94a3b8; font-size: 12px; }
        .av-list-fallback strong { color: #fca5a5; font-size: 12px; }
        .av-list-fallback p { margin: 0; }
        .av-list-movies { display: grid; grid-template-columns: repeat(auto-fill, minmax(96px, 1fr)); gap: 10px; }
        .av-list-movie { display: block; color: inherit; text-decoration: none; }
        .av-list-movie-cover { aspect-ratio: 16 / 10; border-radius: 8px; border: 1px solid rgba(255,255,255,.12); background: rgba(255,255,255,.05); overflow: hidden; }
        .av-list-movie-cover img { display: block; width: 100%; height: 100%; object-fit: cover; }
        .av-list-movie strong { display: block; margin-top: 4px; font-size: 11px; font-weight: 600; color: #cbd5e1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .av-list-movie:hover strong { color: #93c5fd; }
        .quick-pip-btn { min-width: 32px; font-size: 15px; line-height: 1; }
    `);
    function seek(seconds) {
        const video = state.video;
        if (!video) return;
        const duration = Number.isFinite(video.duration) ? video.duration : Infinity;
        video.currentTime = clamp(video.currentTime + seconds, 0, duration);
    }
    const isPaused = () => !state.video || state.video.paused;
    function updatePlayPauseButton() {
        if (state.playPauseBtn) state.playPauseBtn.textContent = isPaused() ? '▶ 播放' : '⏸ 暂停';
    }
    async function togglePlayPause() {
        const video = state.video;
        if (!video) return;
        try {
            if (video.paused) {
                await video.play();
                log('▶️ 开始播放');
            } else {
                video.pause();
                log('⏸️ 已暂停');
            }
        } catch (_) {
            log('❌ 播放失败（可能需要先点击播放器）');
        } finally {
            updatePlayPauseButton();
        }
    }
    function buildSpeedHud(container) {
        if (state.hudHost?.isConnected) return;
        const host = document.createElement('div');
        host.className = 'speed-hud-host';
        const hud = document.createElement('div');
        hud.className = 'speed-hud';
        hud.setAttribute?.('aria-live', 'polite');
        const content = document.createElement('div');
        content.className = 'speed-hud-content';
        const rate = document.createElement('span');
        rate.className = 'speed-hud-rate';
        rate.textContent = `${settings.accelerationRate}×`;
        const text = document.createElement('span');
        text.className = 'speed-hud-text';
        text.textContent = '加速中';
        const arrows = document.createElement('span');
        arrows.className = 'speed-hud-arrows';
        arrows.textContent = '▶▶';
        content.append(rate, text, arrows);
        hud.appendChild(content);
        hud.style.display = 'none';
        host.appendChild(hud);
        container.appendChild(host);
        state.hudHost = host;
        state.hudEl = hud;
    }
    function showSpeedHud() {
        if (!state.hudEl) return;
        const rateEl = state.hudEl.querySelector('.speed-hud-rate');
        if (rateEl) rateEl.textContent = `${settings.accelerationRate}×`;
        state.hudEl.style.display = 'inline-flex';
    }
    function hideSpeedHud() {
        if (state.hudEl) state.hudEl.style.display = 'none';
    }
    function cancelHold() {
        clearTimeout(state.holdTimer);
        state.holdTimer = 0;
        if (!state.holdingSpeed) return;
        state.holdingSpeed = false;
        hideSpeedHud();
        delete document.documentElement.dataset.avAccelerating;
        const video = state.video;
        if (video?.isConnected) video.playbackRate = state.speedBeforeAccelerate;
        state.suppressClickUntil = performance.now() + HOLD_CLICK_SUPPRESS;
    }
    const HOLD_GUARD = '.custom-quick-controls, .custom-control-panel, .custom-ui-layer, .custom-subtitle, .speed-hud-host, .av-info-section, .lightbox-layer, .plyr__controls, button, input, select, textarea, a, [role="button"]';
    function setupHoldAccelerate(container) {
        if (container.dataset?.avHoldBound === '1') return;
        container.dataset.avHoldBound = '1';
        container.addEventListener('pointerdown', event => {
            if (!settings.holdAccelerate) return;
            if (event.button !== 0) return;
            const video = state.video;
            if (!video || !video.isConnected || video.paused) return;
            if (event.target?.closest?.(HOLD_GUARD)) return;
            cancelHold();
            state.holdPointerId = event.pointerId;
            state.holdStartX = event.clientX;
            state.holdStartY = event.clientY;
            state.holdTimer = setTimeout(() => {
                state.holdTimer = 0;
                if (!state.video || state.video.paused) return;
                state.holdingSpeed = true;
                state.speedBeforeAccelerate = Number.isFinite(state.video.playbackRate) ? state.video.playbackRate : 1;
                document.documentElement.dataset.avAccelerating = '1';
                state.video.playbackRate = settings.accelerationRate;
                showSpeedHud();
            }, HOLD_DELAY);
        });
        container.addEventListener('pointermove', event => {
            if (event.pointerId !== state.holdPointerId) return;
            if (Math.hypot(event.clientX - state.holdStartX, event.clientY - state.holdStartY) > HOLD_CANCEL_DISTANCE) cancelHold();
        });
        container.addEventListener('pointerup', event => {
            if (event.pointerId === state.holdPointerId) cancelHold();
        });
        container.addEventListener('pointercancel', event => {
            if (event.pointerId === state.holdPointerId) cancelHold();
        });
        container.addEventListener('click', event => {
            if (performance.now() < state.suppressClickUntil) {
                event.preventDefault();
                event.stopImmediatePropagation();
            }
        }, true);
    }
    function createButton(text, className = '') {
        const button = document.createElement('button');
        button.type = 'button';
        button.textContent = text;
        if (className) button.className = className;
        return button;
    }
    function pipSupported(video) {
        if (document.pictureInPictureEnabled && typeof video?.requestPictureInPicture === 'function') return 'standard';
        if (typeof video?.webkitSetPresentationMode === 'function') return 'webkit';
        return '';
    }
    async function togglePictureInPicture() {
        const video = state.video;
        if (!video) return;
        const mode = pipSupported(video);
        if (!mode) {
            log('⚠️ 当前浏览器不支持画中画');
            return;
        }
        try {
            if (mode === 'standard') {
                if (document.pictureInPictureElement) await document.exitPictureInPicture();
                else await video.requestPictureInPicture();
            } else {
                const active = video.webkitPresentationMode === 'picture-in-picture';
                video.webkitSetPresentationMode(active ? 'inline' : 'picture-in-picture');
            }
            log('🖼️ 已切换画中画');
        } catch (_) {
            log('❌ 画中画启动失败');
        }
    }
    function createDivider() {
        const divider = document.createElement('span');
        divider.className = 'quick-divider';
        return divider;
    }
    function createInputGroup(labelText, type, value, onInput, options = {}) {
        const group = document.createElement('div');
        group.className = 'input-group';
        const label = document.createElement('label');
        label.textContent = labelText;
        const input = document.createElement('input');
        input.type = type;
        input.value = value;
        input.autocomplete = 'off';
        input.spellcheck = false;
        if (options.min !== undefined) input.min = options.min;
        if (options.max !== undefined) input.max = options.max;
        if (options.step !== undefined) input.step = options.step;
        if (options.placeholder) input.placeholder = options.placeholder;
        input.addEventListener('input', event => onInput(event.target, event));
        if (options.onBlur) input.addEventListener('blur', event => options.onBlur(event.target, event));
        group.append(label, input);
        return group;
    }
    function getUiLayer(zIndex = 2147483600) {
        if (zIndex !== 2147483600) {
            if (state.pickerLayer?.isConnected) return state.pickerLayer;
            const layer = document.createElement('div');
            layer.className = 'custom-ui-layer custom-ui-layer-top';
            layer.setAttribute?.('data-av-helper', 'layer');
            layer.style.zIndex = String(zIndex);
            (document.body || document.documentElement).appendChild(layer);
            state.pickerLayer = layer;
            return layer;
        }
        if (state.uiLayer?.isConnected) return state.uiLayer;
        const layer = document.createElement('div');
        layer.className = 'custom-ui-layer';
        layer.setAttribute?.('data-av-helper', 'layer');
        (document.body || document.documentElement).appendChild(layer);
        state.uiLayer = layer;
        return layer;
    }
    function clampPanelPosition(panel = state.panel) {
        if (!panel) return;
        const width = panel.offsetWidth || PANEL_WIDTH;
        const maxX = Math.max(0, window.innerWidth - width);
        panel.style.left = `${clamp(panel.offsetLeft || settings.panelX, 0, maxX)}px`;
        const height = panel.offsetHeight || 60;
        const maxY = Math.max(0, window.innerHeight - height);
        panel.style.top = `${clamp(panel.offsetTop || settings.panelY, 0, maxY)}px`;
    }
    function makeDraggable(element, handle, keys = { x: 'panelX', y: 'panelY' }, onEnd = null) {
        let originX = 0;
        let originY = 0;
        let startX = 0;
        let startY = 0;
        let moved = false;
        const onMove = event => {
            if (event.buttons === 0) {
                onUp();
                return;
            }
            moved = true;
            const maxX = Math.max(0, window.innerWidth - element.offsetWidth);
            const maxY = Math.max(0, window.innerHeight - element.offsetHeight);
            element.style.left = `${clamp(originX + event.clientX - startX, 0, maxX)}px`;
            element.style.top = `${clamp(originY + event.clientY - startY, 0, maxY)}px`;
        };
        const onUp = () => {
            document.removeEventListener('mousemove', onMove, true);
            document.removeEventListener('mouseup', onUp, true);
            if (moved) {
                settings[keys.x] = element.offsetLeft;
                settings[keys.y] = element.offsetTop;
                store.set(keys.x, element.offsetLeft);
                store.set(keys.y, element.offsetTop);
                if (onEnd) onEnd();
                element.classList.remove('panel-dragging');
            }
            moved = false;
        };
        handle.addEventListener('mousedown', event => {
            if (event.button !== 0) return;
            if (event.target.closest('.panel-gear')) return;
            event.preventDefault();
            element.classList.add('panel-dragging');
            originX = element.offsetLeft;
            originY = element.offsetTop;
            startX = event.clientX;
            startY = event.clientY;
            moved = false;
            document.addEventListener('mousemove', onMove, true);
            document.addEventListener('mouseup', onUp, true);
        });
        handle.addEventListener('touchstart', event => {
            const touch = event.touches[0];
            if (!touch) return;
            if (event.target.closest('.panel-gear')) return;
            element.classList.add('panel-dragging');
            originX = element.offsetLeft;
            originY = element.offsetTop;
            startX = touch.clientX;
            startY = touch.clientY;
            const onTouchMove = moveEvent => {
                const point = moveEvent.touches[0];
                if (!point) return;
                moveEvent.preventDefault();
                const maxX = Math.max(0, window.innerWidth - element.offsetWidth);
                const maxY = Math.max(0, window.innerHeight - element.offsetHeight);
                element.style.left = `${clamp(originX + point.clientX - startX, 0, maxX)}px`;
                element.style.top = `${clamp(originY + point.clientY - startY, 0, maxY)}px`;
            };
            const onTouchEnd = () => {
                document.removeEventListener('touchmove', onTouchMove);
                document.removeEventListener('touchend', onTouchEnd);
                settings[keys.x] = element.offsetLeft;
                settings[keys.y] = element.offsetTop;
                store.set(keys.x, element.offsetLeft);
                store.set(keys.y, element.offsetTop);
                if (onEnd) onEnd();
                element.classList.remove('panel-dragging');
            };
            document.addEventListener('touchmove', onTouchMove, { passive: false });
            document.addEventListener('touchend', onTouchEnd);
        }, { passive: true });
    }
    function syncRangeFill(input) {
        if (!input || input.type !== 'range') return;
        const min = Number(input.min || 0);
        const max = Number(input.max || 100);
        const span = max - min;
        const ratio = span > 0 ? (Number(input.value) - min) / span : 0;
        input.style.setProperty('--av-range', `${(clamp(ratio, 0, 1) * 100).toFixed(2)}%`);
    }
    function syncRangeFills(root) {
        if (!root) return;
        for (const input of root.querySelectorAll('input[type="range"]')) syncRangeFill(input);
    }
    function applyUiStyles() {
        for (const target of [state.panel, state.subtitlePicker, state.subtitleBanner, state.filterBar]) {
            if (!target) continue;
            target.style.setProperty('--ui-bg-opacity', settings.opacity);
            target.style.setProperty('--ui-blur', `${settings.blur}px`);
            target.style.setProperty('--ui-hover-opacity', settings.hoverOpacity);
            target.style.setProperty('--ui-hover-blur', `${settings.hoverBlur}px`);
        }
    }
    function createPanel() {
        if (state.panel || document.querySelector('.custom-control-panel')) return;
        const panel = document.createElement('div');
        panel.className = 'custom-control-panel';
        panel.style.left = `${clamp(settings.panelX, 0, Math.max(0, window.innerWidth - PANEL_WIDTH))}px`;
        panel.style.top = `${clamp(settings.panelY, 0, Math.max(0, window.innerHeight - 60))}px`;
        state.panel = panel;
        const header = document.createElement('div');
        header.className = 'panel-header';
        header.title = '按住可拖动面板';
        const panelTitle = document.createElement('span');
        panelTitle.className = 'panel-title';
        panelTitle.textContent = '综合增强助手';
        const gearBtn = document.createElement('button');
        gearBtn.type = 'button';
        gearBtn.className = 'panel-gear';
        gearBtn.setAttribute('aria-label', '展开或折叠设置面板');
        gearBtn.setAttribute('aria-expanded', settings.isMinimized ? 'false' : 'true');
        gearBtn.title = settings.isMinimized ? '展开设置面板' : '折叠设置面板';
        gearBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3.1"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>';
        header.append(gearBtn, panelTitle);
        const body = document.createElement('div');
        body.className = 'panel-body';
        state.panelBody = body;
        const footer = document.createElement('div');
        footer.className = 'panel-footer';
        state.panelFooter = footer;
        const collapsible = document.createElement('div');
        collapsible.className = 'panel-collapse';
        const collapsibleInner = document.createElement('div');
        collapsibleInner.className = 'panel-collapse-inner';
        collapsible.appendChild(collapsibleInner);
        state.panelCollapse = collapsible;
        if (settings.isMinimized) panel.classList.add('panel-collapsed');
        const layoutPanel = () => {
            const anchor = clamp(settings.panelY, 0, Math.max(0, window.innerHeight - 60));
            const headerHeight = header.offsetHeight || 34;
            const contentHeight = settings.isMinimized ? 0 : collapsibleInner.scrollHeight;
            const maxTop = Math.max(0, window.innerHeight - (headerHeight + contentHeight) - 4);
            panel.style.bottom = 'auto';
            panel.style.top = `${clamp(anchor, 0, maxTop)}px`;
        };
        state.layoutPanel = layoutPanel;
        const togglePanel = collapsed => {
            settings.isMinimized = collapsed;
            panel.classList.toggle('panel-collapsed', collapsed);
            gearBtn.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
            gearBtn.title = collapsed ? '展开设置面板' : '折叠设置面板';
            store.set('isMinimized', collapsed);
            layoutPanel();
        };
        gearBtn.addEventListener('click', () => togglePanel(!settings.isMinimized));
        const keysRow = document.createElement('div');
        keysRow.className = 'panel-row';
        const offsetGroup = createInputGroup('字幕偏移:', 'number', settings.subtitleOffset, input => {
            applySubtitleOffset(clamp(Number.parseFloat(input.value) || 0, OFFSET_MIN, OFFSET_MAX));
        }, {
            min: OFFSET_MIN, max: OFFSET_MAX, step: 0.1,
            onBlur: input => { input.value = settings.subtitleOffset; }
        });
        const offsetInput = offsetGroup.children[1];
        keysRow.append(
            createInputGroup('加速键:', 'text', settings.keys.accelerate, input => {
                settings.keys.accelerate = normalizeKey(input.value, 'z');
            }, { onBlur: input => { input.value = settings.keys.accelerate; } }),
            createInputGroup('快进键:', 'text', settings.keys.forward, input => {
                settings.keys.forward = normalizeKey(input.value, 'x');
            }, { onBlur: input => { input.value = settings.keys.forward; } }),
            createInputGroup('倒退键:', 'text', settings.keys.backward, input => {
                settings.keys.backward = normalizeKey(input.value, 'c');
            }, { onBlur: input => { input.value = settings.keys.backward; } }),
            createInputGroup('加速倍数:', 'number', settings.accelerationRate, input => {
                settings.accelerationRate = clamp(Number.parseFloat(input.value) || 1, SPEED_MIN, SPEED_MAX);
            }, {
                min: SPEED_MIN, max: SPEED_MAX, step: 0.1,
                onBlur: input => { input.value = settings.accelerationRate; }
            }),
            createInputGroup('快进(秒):', 'number', settings.skipTime, input => {
                settings.skipTime = clamp(Number.parseFloat(input.value) || 5, SKIP_MIN, SKIP_MAX);
            }, {
                min: SKIP_MIN, max: SKIP_MAX, step: 1,
                onBlur: input => { input.value = settings.skipTime; }
            }),
            offsetGroup
        );
        const actionRow = document.createElement('div');
        actionRow.className = 'btn-group';
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = '.srt,.vtt,.ass,.ssa,text/plain';
        fileInput.hidden = true;
        panel.appendChild(fileInput);
        const btnLocal = createButton('加载本地');
        const btnWeb = createButton('网页搜字幕');
        const btnAPI = createButton('API搜字幕');
        const btnClear = createButton('清除字幕', 'btn-danger');
        const btnSave = createButton('保存设置', 'btn-primary');
        const btnResetOffset = createButton('重置本站偏移', 'btn-danger');
        btnSave.style.gridColumn = 'span 2';
        btnLocal.addEventListener('click', () => fileInput.click());
        btnWeb.addEventListener('click', searchSubtitleWeb);
        btnAPI.addEventListener('click', searchSubtitleAPI);
        btnClear.addEventListener('click', clearSubtitles);
        btnResetOffset.addEventListener('click', () => {
            const siteName = IS_JABLE ? 'Jable' : 'MissAV';
            applySubtitleOffset(0);
            offsetInput.value = 0;
            store.remove(siteOffsetKey());
            log(`🧹 已重置 ${siteName} 本站偏移为 0`);
        });
        btnSave.addEventListener('click', () => {
            persistSettings();
            log('💾 设置已保存');
        });
        fileInput.addEventListener('change', async event => {
            const file = event.target.files?.[0];
            event.target.value = '';
            if (!file) return;
            try {
                const text = await file.text();
                applySubtitleText(text, `本地字幕：${file.name}`, file.name);
            } catch (_) {
                log('❌ 字幕读取失败');
            }
        });
        const resetPosBtn = createButton('重置面板位置', 'btn-ghost');
        resetPosBtn.addEventListener('click', () => {
            settings.panelX = 20;
            settings.panelY = 88;
            panel.style.left = '20px';
            store.set('panelX', 20);
            store.set('panelY', 88);
            layoutPanel();
            log('面板已复位到左上角');
        });
        actionRow.append(btnLocal, btnWeb, btnAPI, btnClear, btnResetOffset, resetPosBtn, btnSave);
        const sliderRow = document.createElement('div');
        sliderRow.className = 'slider-row-container';
        sliderRow.hidden = true;
        const createSlider = (labelText, key, min, max, step, onApply = applyUiStyles, format = String) => {
            const group = document.createElement('div');
            group.className = 'slider-group';
            const label = document.createElement('label');
            label.textContent = labelText;
            const slider = document.createElement('input');
            slider.type = 'range';
            slider.min = min;
            slider.max = max;
            slider.step = step;
            slider.value = settings[key];
            const valueLabel = document.createElement('span');
            valueLabel.className = 'slider-value';
            valueLabel.textContent = format(settings[key]);
            slider.addEventListener('input', event => {
                settings[key] = Number.parseFloat(event.target.value);
                valueLabel.textContent = format(settings[key]);
                onApply();
            });
            group.append(label, slider, valueLabel);
            return group;
        };
        sliderRow.append(
            createSlider('常规透明', 'opacity', 0, 1, 0.05),
            createSlider('常规磨砂', 'blur', 0, 20, 1),
            createSlider('悬浮透明', 'hoverOpacity', 0, 1, 0.05),
            createSlider('悬浮磨砂', 'hoverBlur', 0, 20, 1),
            createSlider('字幕字号', 'subtitleFontSize', FONT_SIZE_MIN, FONT_SIZE_MAX, 1, applySubtitleStyle, value => `${value}px`),
            createSlider('字幕高度', 'subtitleBottom', SUBTITLE_BOTTOM_MIN, SUBTITLE_BOTTOM_MAX, 1, applySubtitleStyle, value => `${value}%`)
        );
        const toggleSliderBtn = createButton('👁 隐藏/显示透明UI设置', 'btn-primary panel-full-btn');
        toggleSliderBtn.addEventListener('click', () => {
            sliderRow.hidden = !sliderRow.hidden;
        });
        const filterToggleBtn = createButton('🛡 隐藏/显示内容过滤与屏蔽', 'btn-primary panel-full-btn');
        const filterPanel = buildFilterPanel();
        filterToggleBtn.addEventListener('click', () => {
            filterPanel.hidden = !filterPanel.hidden;
            settings.filterPanelOpen = !filterPanel.hidden;
            store.set('filterPanelOpen', settings.filterPanelOpen);
        });
        state.logEl = document.createElement('div');
        state.logEl.className = 'panel-status-log';
        footer.appendChild(state.logEl);
        body.append(keysRow, actionRow, toggleSliderBtn, sliderRow, filterToggleBtn, filterPanel);
        collapsibleInner.append(body, footer);
        panel.append(header, collapsible);
        getUiLayer().appendChild(panel);
        applyUiStyles();
        const persistAnchor = () => {
            settings.panelY = Math.max(0, Math.round(header.getBoundingClientRect().top));
            store.set('panelY', settings.panelY);
            layoutPanel();
        };
        makeDraggable(panel, header, { x: 'panelX', y: 'panelY' }, persistAnchor);
        clampPanelPosition(panel);
        layoutPanel();
        if (typeof ResizeObserver === 'function') {
            state.panelLayoutObserver = new ResizeObserver(() => layoutPanel());
            state.panelLayoutObserver.observe(collapsibleInner);
        }
        window.addEventListener('resize', () => {
            panel.style.left = `${clamp(settings.panelX, 0, Math.max(0, window.innerWidth - PANEL_WIDTH))}px`;
            layoutPanel();
        });
        panel.addEventListener('input', event => {
            const target = event.target;
            if (target && target.type === 'range') syncRangeFill(target);
        });
        syncRangeFills(panel);
        log('▶️ 系统初始化完成');
    }
    const isLoopMenuOpen = () => Boolean(state.loopMenu?.classList.contains('show'));
    function showQuickControls() {
        const quick = state.quick;
        if (!quick) return;
        quick.classList.add('quick-visible');
        clearTimeout(state.quickHideTimer);
        state.quickHideTimer = setTimeout(() => {
            if (quick.matches(':hover') || quick.contains(document.activeElement) || isLoopMenuOpen()) return;
            quick.classList.remove('quick-visible');
        }, QUICK_HIDE_DELAY);
    }
    function hideQuickControls() {
        if (!state.quick || isLoopMenuOpen()) return;
        clearTimeout(state.quickHideTimer);
        state.quick.classList.remove('quick-visible');
    }
    function fitQuickControls() {
        const quick = state.quick;
        if (!quick?.isConnected) return;
        quick.classList.remove('quick-compact');
        const host = quick.offsetParent || quick.parentElement;
        const available = (host?.clientWidth || window.innerWidth) - 16;
        const needed = quick.scrollWidth;
        if (needed > available) quick.classList.add('quick-compact');
        const stillTooWide = quick.scrollWidth;
        quick.style.setProperty('--quick-scale', stillTooWide > available ? (available / stillTooWide).toFixed(3) : '1');
    }
    let quickGlobalBound = false;
    let quickResizeHandler = null;
    let quickFullscreenHandler = null;
    function setupQuickAutoHide() {
        const { container, quick } = state;
        if (!container || container.dataset.quickAutohide === '1') return;
        container.dataset.quickAutohide = '1';
        container.addEventListener('mousemove', showQuickControls, { passive: true });
        container.addEventListener('mouseleave', hideQuickControls);
        container.addEventListener('click', showQuickControls);
        if (!quick) return;
        quick.addEventListener('mouseenter', () => {
            clearTimeout(state.quickHideTimer);
            quick.classList.add('quick-visible');
            fitQuickControls();
        });
        quick.addEventListener('mouseleave', () => {
            if (isLoopMenuOpen()) return;
            state.quickHideTimer = setTimeout(hideQuickControls, QUICK_LEAVE_DELAY);
        });
        if (!quickGlobalBound) {
            quickGlobalBound = true;
            quickResizeHandler = throttle(fitQuickControls, MUTATION_THROTTLE);
            quickFullscreenHandler = () => setTimeout(fitQuickControls, 120);
            window.addEventListener('resize', quickResizeHandler, { passive: true });
            document.addEventListener('fullscreenchange', quickFullscreenHandler);
        }
        setTimeout(fitQuickControls, 0);
    }
    function startLoop(seconds) {
        if (!state.video || !Number.isFinite(seconds) || seconds <= 0) return;
        state.loopStart = state.video.currentTime;
        state.loopDuration = seconds;
        state.loopActive = true;
        state.loopMenu?.classList.remove('show');
        if (state.loopBtn) {
            state.loopBtn.classList.add('active');
            state.loopBtn.replaceChildren(
                Object.assign(document.createElement('span'), { textContent: '循' }),
                Object.assign(document.createElement('span'), { textContent: formatSpan(seconds) })
            );
        }
        log(`🔂 已开启区间循环：从当前起 ${formatSeconds(seconds)}`);
    }
    function stopLoop() {
        state.loopActive = false;
        state.loopMenu?.classList.remove('show');
        if (state.loopBtn) {
            state.loopBtn.classList.remove('active');
            state.loopBtn.replaceChildren(
                Object.assign(document.createElement('span'), { textContent: '循' }),
                Object.assign(document.createElement('span'), { textContent: '环' })
            );
        }
        log('⏹️ 已关闭区间循环');
    }
    function toggleLoopMenu() {
        if (!state.loopMenu) return;
        state.loopMenu.classList.toggle('show');
    }
    function quickControlsAlive() {
        const quick = state.quick;
        if (!quick || !quick.isConnected) return false;
        const host = quick.parentElement;
        return Boolean(host && host.isConnected && document.body.contains(host));
    }
    function watchQuickControls() {
        if (state.quickWatchTimer) return;
        state.quickWatchTimer = setInterval(() => {
            if (!state.bound || isAnalyticsRoute()) return;
            if (quickControlsAlive() && state.quick.parentElement === state.container) return;
            const video = findMainVideo();
            if (!video) return;
            const container = playerContainer(video);
            if (!container) return;
            bindPlayer(video, container, true);
        }, 1200);
    }
    function createQuickControls() {
        const container = state.container;
        if (!container) return;
        if (container.closest(PREVIEW_HOST_SELECTOR)) return;
        if (quickControlsAlive() && state.quick.parentElement === container) return;
        for (const stale of document.querySelectorAll('.custom-quick-controls')) {
            if (stale.parentElement === container) continue;
            stale.remove();
        }
        ensurePositioned(container);
        const quick = document.createElement('div');
        quick.className = 'custom-quick-controls';
        state.quick = quick;
        state.quickHost = container;
        const group = document.createElement('div');
        group.className = 'quick-jump-group';
        group.addEventListener('click', event => event.stopPropagation());
        const appendJumpButton = (seconds, direction) => {
            const delta = direction === 'back' ? -seconds : seconds;
            const label = seconds >= 60 ? `${seconds / 60}m` : `${seconds}s`;
            const button = createButton('', 'quick-btn');
            const glyph = Object.assign(document.createElement('span'), {
                className: 'quick-btn-glyph',
                textContent: direction === 'back' ? '⏪' : '⏩'
            });
            const text = Object.assign(document.createElement('span'), {
                className: 'quick-btn-label',
                textContent: label
            });
            button.append(...(direction === 'back' ? [glyph, text] : [text, glyph]));
            button.title = `${direction === 'back' ? '后退' : '前进'} ${seconds} 秒`;
            button.addEventListener('click', () => {
                seek(delta);
                log(`${delta > 0 ? '⏩' : '⏪'} 跳转 ${Math.abs(delta)} 秒`);
            });
            group.appendChild(button);
        };
        JUMP_PRESETS.back.forEach(seconds => appendJumpButton(seconds, 'back'));
        group.appendChild(createDivider());
        state.playPauseBtn = createButton('▶ 播放', 'quick-btn quick-play-btn');
        state.playPauseBtn.addEventListener('click', togglePlayPause);
        group.appendChild(state.playPauseBtn);
        group.appendChild(createDivider());
        JUMP_PRESETS.forward.forEach(seconds => appendJumpButton(seconds, 'forward'));
        group.appendChild(createDivider());
        state.pipBtn = createButton('⧉', 'quick-btn quick-pip-btn');
        state.pipBtn.title = '画中画 (P)';
        state.pipBtn.addEventListener('click', togglePictureInPicture);
        group.appendChild(state.pipBtn);
        group.appendChild(createDivider());
        const loopWrapper = document.createElement('div');
        loopWrapper.className = 'quick-loop-wrapper';
        state.loopBtn = createButton('', 'quick-btn quick-loop-btn');
        state.loopBtn.replaceChildren(
            Object.assign(document.createElement('span'), { textContent: '循' }),
            Object.assign(document.createElement('span'), { textContent: '环' })
        );
        state.loopBtn.addEventListener('click', () => {
            if (state.loopActive) stopLoop();
            else toggleLoopMenu();
        });
        state.loopMenu = document.createElement('div');
        state.loopMenu.className = 'loop-menu';
        const addMenuOption = (text, onClick) => {
            const option = createButton(text, 'loop-menu-btn');
            option.addEventListener('click', () => onClick());
            state.loopMenu.appendChild(option);
        };
        LOOP_PRESETS.forEach(seconds => addMenuOption(`${formatSeconds(seconds)}循环`, () => startLoop(seconds)));
        addMenuOption('自定义时间…', () => {
            const input = window.prompt('请输入自定义循环时间（秒）:', '15');
            if (input === null) return;
            const seconds = Number.parseFloat(input);
            if (Number.isFinite(seconds) && seconds > 0) startLoop(seconds);
            else log('⚠️ 输入无效');
        });
        addMenuOption('关闭循环', stopLoop);
        loopWrapper.append(state.loopBtn, state.loopMenu);
        group.appendChild(loopWrapper);
        quick.appendChild(group);
        container.appendChild(quick);
        document.addEventListener('click', event => {
            if (!loopWrapper.contains(event.target)) state.loopMenu.classList.remove('show');
        });
        setupQuickAutoHide();
        hideQuickControls();
    }
    function normalizeKey(value, fallback) {
        const key = String(value ?? '').trim().toLowerCase();
        return key ? key.slice(0, 1) : fallback;
    }
    let shortcutsBound = false;
    function setupShortcuts() {
        if (shortcutsBound) return;
        shortcutsBound = true;
        document.addEventListener('keydown', event => {
            if (event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey) return;
            if (isEditableTarget(event.target)) return;
            const video = state.video;
            if (!video) return;
            const { accelerate, forward, backward } = settings.keys;
            const key = event.key.toLowerCase();
            if (event.code === 'Space') {
                event.preventDefault();
                if (!event.repeat) togglePlayPause();
                return;
            }
            if (key === 'p') {
                event.preventDefault();
                if (!event.repeat) togglePictureInPicture();
                return;
            }
            if (key === accelerate) {
                if (state.acceleratePressed || event.repeat) return;
                state.speedBeforeAccelerate = Number.isFinite(video.playbackRate) ? video.playbackRate : 1;
                video.playbackRate = settings.accelerationRate;
                state.acceleratePressed = true;
                log(`⏩ 临时加速 ${settings.accelerationRate}x`);
                return;
            }
            if (key !== forward && key !== backward) return;
            if (event.repeat && event.timeStamp - state.lastRepeatSeek < REPEAT_SEEK_INTERVAL) return;
            state.lastRepeatSeek = event.timeStamp;
            const delta = key === forward ? settings.skipTime : -settings.skipTime;
            seek(delta);
            log(`${delta > 0 ? '⏩ 快进' : '⏪ 倒退'} ${Math.abs(delta)} 秒`);
        });
        document.addEventListener('keyup', event => {
            if (!state.acceleratePressed) return;
            if (event.key.toLowerCase() !== settings.keys.accelerate) return;
            if (state.video) state.video.playbackRate = state.speedBeforeAccelerate;
            state.acceleratePressed = false;
        });
    }
    function parseTimestamp(raw) {
        const parts = String(raw ?? '').trim().replace(',', '.').split(':');
        if (parts.length === 2) {
            const [minutes, seconds] = parts.map(Number.parseFloat);
            return Number.isFinite(minutes) && Number.isFinite(seconds) ? minutes * 60 + seconds : Number.NaN;
        }
        if (parts.length !== 3) return Number.NaN;
        const [hours, minutes, seconds] = parts.map(Number.parseFloat);
        return [hours, minutes, seconds].every(Number.isFinite) ? hours * 3600 + minutes * 60 + seconds : Number.NaN;
    }
    function parseSubtitles(text) {
        if (!text) return { items: [], starts: [] };
        const items = [];
        const normalized = String(text)
            .replace(/^\uFEFF/, '')
            .replace(/\r\n?/g, '\n')
            .replace(/^WEBVTT[^\n]*\n/i, '');
        for (const block of normalized.split(/\n{2,}/)) {
            const lines = block.split('\n').filter(Boolean);
            const timeIndex = lines.findIndex(line => line.includes('-->'));
            if (timeIndex === -1) continue;
            const [startRaw, endRaw] = lines[timeIndex].split('-->');
            if (!startRaw || !endRaw) continue;
            const start = parseTimestamp(startRaw);
            const end = parseTimestamp(endRaw);
            if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) continue;
            const content = lines
                .slice(timeIndex + 1)
                .join('\n')
                .replace(/<[^>]*>/g, '')
                .replace(/\{\\[^}]*\}/g, '')
                .replace(/\\[Nnh]/g, '\n')
                .trim();
            if (content) items.push({ start, end, text: content });
        }
        items.sort((a, b) => a.start - b.start);
        return { items, starts: items.map(item => item.start) };
    }
    function locateCue(time) {
        const cues = state.cueIndex?.items;
        if (!cues?.length) return null;
        const offset = settings.subtitleOffset;
        const effective = time - offset;
        const cached = cues[state.cueCursor];
        if (cached && effective >= cached.start && effective <= cached.end) return cached;
        if (state.cueCursor + 1 < cues.length) {
            const next = cues[state.cueCursor + 1];
            if (effective >= next.start && effective <= next.end) {
                state.cueCursor += 1;
                return next;
            }
        }
        let low = 0;
        let high = cues.length - 1;
        while (low <= high) {
            const mid = (low + high) >> 1;
            const cue = cues[mid];
            if (effective < cue.start) high = mid - 1;
            else if (effective > cue.end) low = mid + 1;
            else {
                state.cueCursor = mid;
                return cue;
            }
        }
        return null;
    }
    function renderSubtitle(force = false) {
        const video = state.video;
        if (!video) return;
        const el = state.subtitleEl;
        if (!el || !state.cueIndex?.items.length) return;
        const cue = locateCue(video.currentTime);
        const text = cue ? cue.text : '';
        if (!force && text === state.activeCueText) return;
        state.activeCueText = text;
        el.textContent = text;
        el.style.display = text ? 'block' : 'none';
    }
    function applySubtitleOffset(offset) {
        settings.subtitleOffset = offset;
        state.cueCursor = -1;
        renderSubtitle(true);
    }
    function applySubtitleStyle() {
        const el = state.subtitleEl;
        if (!el) return;
        el.style.fontSize = `${settings.subtitleFontSize}px`;
        el.style.bottom = `${settings.subtitleBottom}%`;
    }
    function applySubtitleText(text, label = '字幕', fileName = '') {
        const { items, starts } = parseSubtitles(text);
        if (!items.length) {
            log('⚠️ 未解析到有效字幕（请确认是 SRT / VTT 格式）');
            return false;
        }
        state.subtitleSource = text;
        state.cueIndex = { items, starts };
        state.cueCursor = -1;
        state.activeCueText = '';
        state.subtitleFileName = fileName || label;
        state.subtitleCueCount = items.length;
        if (settings.subtitleOffset !== 0) log(`ℹ️ 已应用字幕偏移 ${settings.subtitleOffset}s`);
        closeSubtitlePicker();
        renderSubtitle(true);
        renderSubtitleBanner();
        log(`✅ ${label}加载成功：${items.length} 条${fileName && fileName !== label ? `（${fileName}）` : ''}`);
        return true;
    }
    function renderSubtitleBanner() {
        const host = getUiLayer(2147483600);
        let banner = state.subtitleBanner;
        if (!state.subtitleFileName) {
            banner?.remove();
            state.subtitleBanner = null;
            return;
        }
        if (!banner?.isConnected) {
            banner = document.createElement('div');
            banner.className = 'subtitle-banner';
            banner.addEventListener('click', () => {
                state.subtitleBanner?.classList.toggle('expanded');
            });
            host.appendChild(banner);
            state.subtitleBanner = banner;
        }
        const nameEl = document.createElement('span');
        nameEl.className = 'subtitle-banner-name';
        nameEl.textContent = state.subtitleFileName;
        nameEl.title = state.subtitleFileName;
        const meta = document.createElement('span');
        meta.className = 'subtitle-banner-meta';
        meta.textContent = `${state.subtitleCueCount} 条 · 偏移 ${settings.subtitleOffset >= 0 ? '+' : ''}${settings.subtitleOffset}s`;
        banner.replaceChildren(
            Object.assign(document.createElement('span'), { className: 'subtitle-banner-icon', textContent: '📄' }),
            nameEl,
            meta
        );
        applyUiStyles();
    }
    function clearSubtitles() {
        state.cueIndex = null;
        state.subtitleSource = '';
        state.activeCueText = '';
        state.cueCursor = -1;
        state.subtitleFileName = '';
        state.subtitleCueCount = 0;
        if (state.subtitleEl) {
            state.subtitleEl.textContent = '';
            state.subtitleEl.style.display = 'none';
        }
        renderSubtitleBanner();
        closeSubtitlePicker();
        log('🗑️ 字幕已清除');
    }
    function startSubtitleLoop() {
        cancelAnimationFrame(state.subtitleRAF);
        const tick = () => {
            state.subtitleRAF = requestAnimationFrame(tick);
            const video = state.video;
            if (!video) return;
            if (state.loopActive) {
                const time = video.currentTime;
                if (time >= state.loopStart + state.loopDuration || time < state.loopStart - 0.5) {
                    video.currentTime = state.loopStart;
                }
            }
            if (video.paused) return;
            renderSubtitle(false);
        };
        state.subtitleRAF = requestAnimationFrame(tick);
    }
    function getCurrentVideoID() {
        if (IS_JABLE) return location.pathname.match(/\/videos\/([^/]+)/)?.[1] || null;
        const last = location.pathname.split('/').filter(Boolean).pop();
        if (!last) return null;
        return last.match(/([a-z]+-\d+|[a-z]+\d+-\d+|[a-z]+\d+[a-z]+-\d+)/i)?.[1] || last;
    }
    function searchSubtitleWeb() {
        const id = getCurrentVideoID();
        if (!id) {
            log('⚠️ 无法识别视频ID');
            return;
        }
        log(`🌐 网页搜索: ${id}`);
        GM_openInTab(`https://subtitlecat.com/index.php?search=${encodeURIComponent(id)}`, { active: true });
    }
    function gmSend(url, { headers = null, timeout = 15000, responseType = undefined, anonymous = false } = {}) {
        return new Promise((resolve, reject) => {
            const options = {
                method: 'GET',
                url,
                timeout,
                onload: resolve,
                onerror: () => reject(Object.assign(new Error('网络错误'), { network: true })),
                ontimeout: () => reject(Object.assign(new Error('请求超时'), { network: true })),
                onabort: () => reject(Object.assign(new Error('请求已取消'), { network: true }))
            };
            if (headers) options.headers = headers;
            if (responseType) options.responseType = responseType;
            if (anonymous) options.anonymous = true;
            GM_xmlhttpRequest(options);
        });
    }
    function gmRaw(url, { headers = null, timeout = 15000 } = {}) {
        return gmSend(url, { headers, timeout });
    }
    async function gmRequest(url, { timeout = 15000, binary = false, headers = null } = {}) {
        const response = await gmSend(url, { headers, timeout, responseType: binary ? 'arraybuffer' : undefined });
        if (response.status < 200 || response.status >= 300) throw new Error(`HTTP ${response.status}`);
        if (binary) {
            if (response.response instanceof ArrayBuffer) return response.response;
            if (response.response instanceof Uint8Array) return response.response;
            return response.responseText;
        }
        return response.responseText ?? '';
    }
    const COARSE_POINTER = (() => {
        try {
            return typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches;
        } catch (_) {
            return false;
        }
    })();
    const PAGE_HEADERS = COARSE_POINTER ? null : {
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8'
    };
    async function fetchHtml(url, { headers = null, timeout = 4500, skipProxy = false } = {}) {
        const merged = headers || PAGE_HEADERS;
        try {
            const response = await gmRaw(url, { headers: merged, timeout });
            if (response.status >= 200 && response.status < 300 && response.responseText) return response.responseText;
        } catch (_) {
        }
        if (skipProxy) return '';
        for (const proxy of CORS_PROXIES) {
            try {
                const response = await gmRaw(proxy + encodeURIComponent(url), { timeout: 3500 });
                if (response.status >= 200 && response.status < 300 && response.responseText) return response.responseText;
            } catch (_) {
            }
        }
        return '';
    }
    let jdSigCache = null;
    function jdSignature() {
        const ts = Math.floor(Date.now() / 1000);
        if (jdSigCache && ts - jdSigCache.ts <= 300) return jdSigCache.value;
        const value = `${ts}.lpw6vgqzsp.${md5(ts + JDSIGN_SUFFIX)}`;
        jdSigCache = { ts, value };
        return value;
    }
    function jdApiFetch(url, timeout = 5000) {
        return fetchHtml(url, {
            headers: Object.assign({}, JDFORREPAM_HEADERS, { jdsignature: jdSignature() }),
            timeout,
            skipProxy: true
        });
    }
    const codeNormCache = new Map();
    function normalizeVideoCode(videoId) {
        const raw = String(videoId ?? '');
        const cached = codeNormCache.get(raw);
        if (cached !== undefined) return cached;
        let id = raw.trim();
        if (!id) return '';
        if (/^https?:\/\//i.test(id) || id.includes('/')) {
            try {
                const parts = id.split('?')[0].split('#')[0].split('/').filter(Boolean);
                if (parts.length) id = decodeURIComponent(parts[parts.length - 1] ?? id);
            } catch (_) {
            }
        }
        id = id.replace(/[-_](?:uncensored|leak|chinese|english|subtitle|hd|fhd|4k)$/i, '');
        const fc2 = id.match(/^(fc2(?:-ppv)?-[0-9]+)/i);
        let result = fc2?.[1] ? fc2[1].toUpperCase() : '';
        if (!result) {
            const std = id.match(/^([a-z0-9]+-[a-z0-9]+)/i);
            result = std?.[1] ? std[1].toUpperCase() : id.toUpperCase();
        }
        if (codeNormCache.size >= 800) codeNormCache.clear();
        codeNormCache.set(raw, result);
        return result;
    }
    function getPageVideoCode() {
        try {
            const rows = document.querySelectorAll('.text-secondary, .video-info-row, .info-row, li');
            for (const row of rows) {
                const label = row.querySelector('span:first-child, dt, .label')?.textContent?.trim() || '';
                if (/^(?:Code|番号|番號|品番)\s*[:：]?$/i.test(label)) {
                    const value = row.querySelector('.font-medium, dd, .value, span:last-child')?.textContent?.trim();
                    if (value && /^[a-z0-9]/i.test(value)) return normalizeVideoCode(value);
                }
            }
        } catch (_) {
        }
        const parts = location.pathname.split('/').filter(Boolean);
        const slug = decodeURIComponent(parts[parts.length - 1] ?? '').split('#')[0].trim();
        if (!slug || /^(?:new|popular|actresses|genres|makers|search|videos|en|cn|ja|zh)$/i.test(slug)) return '';
        return normalizeVideoCode(slug);
    }
    async function searchSubtitleAPI() {
        const id = getCurrentVideoID();
        if (!id) {
            log('⚠️ 无法获取ID');
            return;
        }
        log(`🔍 正在API搜索: ${id}`);
        try {
            const text = await gmRequest(
                `https://api-shoulei-ssl.xunlei.com/oracle/subtitle?name=${encodeURIComponent(id)}`,
                { timeout: 10000 }
            );
            const list = JSON.parse(text)?.data ?? [];
            const valid = list
                .filter(item => item?.url && SUPPORTED_SUBTITLE_EXT.test(item.url))
                .map(item => ({ url: item.url, name: item.name || item.url.split('/').pop() || '未命名字幕' }));
            if (!valid.length) {
                log('⚠️ 未找到匹配的字幕文件');
                return;
            }
            log(`✅ 找到 ${valid.length} 个字幕`);
            showSubtitlePicker(valid);
        } catch (error) {
            log(`❌ API错误: ${error.message}`);
        }
    }
    function decodeSubtitleBytes(bytes) {
        if (!bytes.length) return '';
        if (bytes.length >= 3 && bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
            return new TextDecoder('utf-8').decode(bytes.subarray(3));
        }
        if (bytes.length >= 2 && bytes[0] === 0xff && bytes[1] === 0xfe) {
            try {
                return new TextDecoder('utf-16le').decode(bytes.subarray(2));
            } catch (_) {
            }
        }
        if (bytes.length >= 2 && bytes[0] === 0xfe && bytes[1] === 0xff) {
            try {
                return new TextDecoder('utf-16be').decode(bytes.subarray(2));
            } catch (_) {
            }
        }
        try {
            return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
        } catch (_) {
        }
        try {
            return new TextDecoder('gb18030').decode(bytes);
        } catch (_) {
            return new TextDecoder('utf-8').decode(bytes);
        }
    }
    async function extractSubtitleFromZip(buffer) {
        const bytes = new Uint8Array(buffer);
        if (bytes.length < 30 || bytes[0] !== 0x50 || bytes[1] !== 0x4b || bytes[2] !== 0x03 || bytes[3] !== 0x04) {
            return null;
        }
        const view = new DataView(buffer);
        const method = view.getUint16(8, true);
        const compSize = view.getUint32(18, true);
        const nameLen = view.getUint16(26, true);
        const extraLen = view.getUint16(28, true);
        const dataOffset = 30 + nameLen + extraLen;
        if (dataOffset >= bytes.length) return null;
        const name = new TextDecoder('utf-8').decode(bytes.subarray(30, 30 + nameLen));
        if (name.endsWith('/')) return null;
        if (method === 0) {
            const size = compSize || bytes.length - dataOffset;
            return decodeSubtitleBytes(bytes.subarray(dataOffset, dataOffset + size));
        }
        if (method === 8 && typeof DecompressionStream === 'function') {
            try {
                const stream = new DecompressionStream('deflate-raw');
                const writer = stream.writable.getWriter();
                writer.write(bytes.subarray(dataOffset, compSize ? dataOffset + compSize : undefined));
                writer.close();
                const inflated = await new Response(stream.readable).arrayBuffer();
                return decodeSubtitleBytes(new Uint8Array(inflated));
            } catch (_) {
                return null;
            }
        }
        return null;
    }
    async function decodeSubtitleBuffer(payload) {
        if (typeof payload === 'string') return payload.replace(/\0/g, '');
        if (!(payload instanceof ArrayBuffer) && !(payload instanceof Uint8Array)) return String(payload ?? '');
        const bytes = payload instanceof Uint8Array ? payload : new Uint8Array(payload);
        if (bytes.length >= 4 && bytes[0] === 0x50 && bytes[1] === 0x4b && bytes[2] === 0x03 && bytes[3] === 0x04) {
            const inner = await extractSubtitleFromZip(payload instanceof Uint8Array ? payload.buffer : payload);
            if (inner) return inner.replace(/\0/g, '');
        }
        return decodeSubtitleBytes(bytes).replace(/\0/g, '');
    }
    function hostOf(url) {
        try {
            return new URL(url).host;
        } catch (_) {
            return '';
        }
    }
    async function fetchSubtitlePayload(url) {
        try {
            const payload = await gmRequest(url, { timeout: 20000, binary: true });
            if (typeof payload === 'string' ? payload.trim() : payload && payload.byteLength) return payload;
        } catch (_) {
        }
        try {
            const text = await gmRequest(url, { timeout: 20000 });
            if (text?.trim()) return text;
        } catch (_) {
        }
        for (const proxy of CORS_PROXIES) {
            try {
                const text = await gmRequest(proxy + encodeURIComponent(url), { timeout: 12000 });
                if (text?.trim()) return text;
            } catch (_) {
            }
        }
        return null;
    }
    async function loadRemoteSubtitle(url, name = '') {
        if (state.subtitleLoading) {
            log('⏳ 正有字幕在下载中，请稍候');
            return;
        }
        state.subtitleLoading = true;
        log(`⬇️ 正在下载字幕${name ? `：${name}` : ''}…`);
        const host = hostOf(url);
        try {
            const payload = await fetchSubtitlePayload(url);
            if (payload === null) {
                log(`❌ 下载失败: 网络错误${host ? ` (${host})` : ''}，请确认已授予 @connect 权限或改用「加载本地」`);
                return;
            }
            const text = await decodeSubtitleBuffer(payload);
            if (applySubtitleText(text, '字幕', name || url.split('/').pop())) {
                closeSubtitlePicker();
                log(`📍 字幕已缓存到浏览器本地，临时标记 avSub:subtitle；刷新页面后需重新选择「${name || '该字幕'}」`);
            } else {
                log('❌ 字幕内容无法解析，可能不是有效的字幕文件');
            }
        } catch (error) {
            log(`❌ 下载失败: ${error.message}`);
        } finally {
            state.subtitleLoading = false;
        }
    }
    function closeSubtitlePicker() {
        state.subtitlePicker?.remove();
        state.subtitlePicker = null;
    }
    function showSubtitlePicker(items) {
        closeSubtitlePicker();
        const list = document.createElement('div');
        list.className = 'subtitle-picker';
        const header = document.createElement('div');
        header.className = 'subtitle-picker-header';
        const title = document.createElement('span');
        title.className = 'subtitle-picker-title';
        title.textContent = `选择字幕 (${items.length})`;
        const closeBtn = document.createElement('span');
        closeBtn.className = 'subtitle-picker-close';
        closeBtn.textContent = '[关闭]';
        closeBtn.addEventListener('click', closeSubtitlePicker);
        header.append(title, closeBtn);
        list.appendChild(header);
        for (const item of items) {
            const row = document.createElement('div');
            row.className = 'subtitle-picker-row';
            row.textContent = `📄 ${item.name}`;
            row.title = item.name;
            row.addEventListener('click', () => loadRemoteSubtitle(item.url, item.name));
            list.appendChild(row);
        }
        state.subtitlePicker = list;
        for (const type of ['mousedown', 'mouseup', 'click', 'dblclick', 'pointerdown', 'pointerup', 'touchstart', 'touchend', 'wheel']) {
            list.addEventListener(type, event => event.stopPropagation());
        }
        getUiLayer(2147483646).appendChild(list);
        if (!Number.isFinite(settings.pickerX) || !Number.isFinite(settings.pickerY)) {
            const rect = list.getBoundingClientRect?.() || { width: 0, height: 0 };
            list.style.left = '15px';
            list.style.top = `${Math.max(60, window.innerHeight - (rect.height || 280) - 175)}px`;
            list.style.bottom = 'auto';
        }
        applyUiStyles();
        makeDraggable(list, header, { x: 'pickerX', y: 'pickerY' });
        if (Number.isFinite(settings.pickerX) && Number.isFinite(settings.pickerY)) {
            list.style.left = `${settings.pickerX}px`;
            list.style.top = `${settings.pickerY}px`;
            list.style.bottom = 'auto';
        }
        clampPickerPosition(list);
    }
    function clampPickerPosition(picker) {
        if (!picker) return;
        const rect = picker.getBoundingClientRect?.() || { width: 0, height: 0 };
        const maxX = Math.max(0, window.innerWidth - rect.width - 8);
        const maxY = Math.max(0, window.innerHeight - rect.height - 8);
        const x = clamp(Number.parseFloat(picker.style.left) || 0, 0, maxX);
        const y = clamp(Number.parseFloat(picker.style.top) || 0, 0, maxY);
        if (picker.style.top) {
            picker.style.left = `${x}px`;
            picker.style.top = `${y}px`;
            settings.pickerX = x;
            settings.pickerY = y;
            store.set('pickerX', x);
            store.set('pickerY', y);
        }
    }
    function parseJavBusHtml(html) {
        const stills = [];
        const reviews = [];
        if (!html || html.includes('driver-verify') || html.includes('所在地區年齡檢測') || html.includes('404 Page Not Found')) {
            return { stills, reviews };
        }
        for (const match of html.matchAll(SAMPLE_BOX_RE)) {
            const url = resolveUrl(match[1]?.trim(), JB_ENDPOINT.replace(/\/$/, ''));
            if (IMAGE_EXT_RE.test(url) && !stills.includes(url)) stills.push(url);
        }
        if (!stills.length) {
            for (const match of html.matchAll(PHOTO_FRAME_RE)) {
                const url = resolveUrl(match[1]?.trim(), JB_ENDPOINT.replace(/\/$/, ''));
                if (IMAGE_EXT_RE.test(url) && !stills.includes(url)) stills.push(url);
            }
        }
        let count = 0;
        for (const match of html.matchAll(COMMENT_BLOCK_RE)) {
            if (count >= 10) break;
            const content = stripTags(match[1]);
            if (content.length >= 3) {
                reviews.push({ user: 'JAVBus 网友', content });
                count++;
            }
        }
        return { stills, reviews };
    }
    function parseJavLibraryHtml(html) {
        let rating;
        const reviews = [];
        const scoreMatch = html.match(JL_SCORE_RE);
        if (scoreMatch?.[1]) {
            const score = Number.parseFloat(scoreMatch[1]);
            const countMatch = html.match(/\(?([0-9,]+)\s*(?:人評價|人评价|votes|reviews)\)?/i);
            const count = countMatch?.[1] ? Number.parseInt(countMatch[1].replace(/,/g, ''), 10) : undefined;
            if (score > 0) rating = { score, count, source: 'JAVLibrary' };
        }
        let taken = 0;
        for (const block of html.matchAll(JL_COMMENT_RE)) {
            if (taken >= 12) break;
            const text = block[1] ?? '';
            const contentMatch = text.match(/class=["']ttext["'][^>]*>([\s\S]*?)(?:<\/(?:div|td)>|$)/i);
            const userMatch = text.match(/class=["']nickname["'][^>]*>([\s\S]*?)(?:<\/(?:div|td|span|a)>|$)/i);
            const dateMatch = text.match(/class=["']date["'][^>]*>([\s\S]*?)(?:<\/(?:div|td|span)>|$)/i);
            const content = stripTags(contentMatch?.[1]);
            if (content.length >= 4) {
                reviews.push({
                    user: stripTags(userMatch?.[1]) || '影评网友',
                    date: stripTags(dateMatch?.[1]),
                    content
                });
                taken++;
            }
        }
        return { rating, reviews };
    }
    function extractPageReviews() {
        const reviews = [];
        const cards = document.querySelectorAll('#comments .comment, #comment-list > div, .comments-list > div, [data-comment-id], article.comment');
        for (const card of cards) {
            const user = card.querySelector('.username, .user-name, strong, .font-bold')?.textContent?.trim();
            const date = card.querySelector('time, .time, .date, .text-xs')?.textContent?.trim();
            const content = card.querySelector('.content, .comment-content, .comment-body, p')?.textContent?.trim();
            if (!content || content.length < 2 || content.includes('MissAV')) continue;
            reviews.push({ user: user || 'MissAV 影迷', date, content });
        }
        return reviews;
    }
    function dedupeReviews(list) {
        const seen = new Set();
        const out = [];
        for (const review of list) {
            if (!review?.content) continue;
            const key = review.content.trim().slice(0, 80);
            if (seen.has(key)) continue;
            seen.add(key);
            out.push(review);
        }
        return out;
    }
    async function fetchJavDbInfo(code, onPartial) {
        const empty = { rating: undefined, stills: [], reviews: [], lists: [], javDbMovieId: '' };
        const cleanId = code.replace(/[-_]/g, '').toLowerCase();
        const searchUrl = `${JDFORREPAM_API}/api/v2/search?` + new URLSearchParams({
            q: code, page: '1', type: 'movie', limit: '5',
            movie_type: 'all', from_recent: 'false', movie_filter_by: 'all', movie_sort_by: 'relevance'
        });
        let searchBody;
        try {
            searchBody = JSON.parse(await jdApiFetch(searchUrl));
        } catch (_) {
            return empty;
        }
        const movies = Array.isArray(searchBody?.data?.movies) ? searchBody.data.movies : [];
        const movie = movies.find(item => String(item?.number || '').replace(/[-_]/g, '').toLowerCase() === cleanId);
        if (!movie?.id) return empty;
        const movieId = encodeURIComponent(movie.id);
        const detailUrl = `${JDFORREPAM_API}/api/v2/movies/${movieId}`;
        const reviewsUrl = `${JDFORREPAM_API}/api/v1/movies/${movieId}/reviews?` +
            new URLSearchParams({ page: '1', sort_by: 'hotly', limit: '20' });
        const listsUrl = `${JDFORREPAM_API}/api/v1/lists/related?` +
            new URLSearchParams({ movie_id: movie.id, page: '1', limit: '20' });
        const once = url => jdApiFetch(url).catch(() => '').then(raw => raw || jdApiFetch(url).catch(() => ''));
        const [detailRaw, reviewsRaw, listsRaw] = await Promise.all([once(detailUrl), once(reviewsUrl), once(listsUrl)]);
        let rating;
        const stills = [];
        const reviews = [];
        const lists = [];
        try {
            const detail = JSON.parse(detailRaw)?.data?.movie;
            if (detail) {
                const raw = Number(detail.score);
                if (Number.isFinite(raw) && raw > 0 && raw <= 5) {
                    const watched = Number(detail.watched_count);
                    rating = {
                        score: Number((raw * 2).toFixed(1)),
                        count: Number.isFinite(watched) && watched > 0 ? watched : undefined,
                        source: 'JavDB'
                    };
                }
                const push = url => {
                    const abs = resolveUrl(url, JDFORREPAM_API);
                    if (abs && !NOW_PRINTING_RE.test(abs) && !stills.includes(abs)) stills.push(abs);
                };
                for (const img of Array.isArray(detail.preview_images) ? detail.preview_images : []) {
                    push(img?.large_url || img?.thumb_url || (typeof img === 'string' ? img : ''));
                }
                if (!stills.length) {
                    const samples = Array.isArray(detail.sample_images) ? detail.sample_images
                        : (Array.isArray(detail.samples) ? detail.samples : []);
                    for (const item of samples) push(typeof item === 'string' ? item : item?.url || item?.thumbnail);
                }
                if (!stills.length) push(detail.cover_url || detail.thumb_url);
            }
        } catch (_) {
        }
        try {
            const body = JSON.parse(reviewsRaw);
            const list = Array.isArray(body?.data?.reviews) ? body.data.reviews : [];
            for (const item of list.slice(0, 20)) {
                const content = String(item?.content ?? '').trim();
                if (content.length < 2) continue;
                reviews.push({
                    user: String(item?.username ?? '').trim() || '匿名',
                    date: String(item?.created_at ?? '').slice(0, 10),
                    content,
                    score: Number.isFinite(Number(item?.score)) ? Number(item.score) : undefined
                });
            }
        } catch (_) {
        }
        try {
            const body = JSON.parse(listsRaw);
            for (const item of Array.isArray(body?.data?.lists) ? body.data.lists : []) {
                if (!item?.id) continue;
                lists.push({
                    id: String(item.id),
                    name: String(item.name || '未命名影单').trim(),
                    movieCount: Number(item.movies_count || 0),
                    viewsCount: Number(item.views_count || 0) || undefined,
                    collectionsCount: Number(item.collections_count || 0) || undefined,
                    createdAt: item.created_at ? String(item.created_at).slice(0, 10) : undefined,
                    shareUrl: `https://javdb.com/lists/${encodeURIComponent(item.id)}`
                });
            }
        } catch (_) {
        }
        const partial = { rating, stills, reviews, lists, javDbMovieId: String(movie.id) };
        onPartial?.(partial);
        return partial;
    }
    async function fetchJavLibraryInfo(code, onPartial) {
        let html = await fetchHtml(`${JC_ENDPOINT}${encodeURIComponent(code)}`, { timeout: 3000, skipProxy: true });
        if (html && !html.includes('class="score"')) {
            const first = html.match(/href=["']\.\/\?v=([a-z0-9]+)["']/i);
            if (first?.[1]) {
                html = await fetchHtml(`https://www.javlibrary.com/cn/?v=${first[1]}`, { timeout: 3000, skipProxy: true }).catch(() => '');
            }
        }
        if (!html) return { rating: undefined, reviews: [] };
        const parsed = parseJavLibraryHtml(html);
        onPartial?.(parsed);
        return parsed;
    }
    async function fetchJavBusInfo(code, onPartial) {
        const html = await fetchHtml(`${JB_ENDPOINT}${encodeURIComponent(code)}`, {
            headers: { Cookie: 'age=verified; existmag=all; dv=1' },
            timeout: 4000
        });
        const parsed = parseJavBusHtml(html);
        onPartial?.(parsed);
        return parsed;
    }
    async function fetchActressSocial(name) {
        const trimmed = String(name ?? '').trim();
        if (!trimmed || trimmed.length < 2) return null;
        const cacheKey = `${ACTRESS_CACHE_PREFIX}${trimmed}`;
        const cached = readCache(cacheKey);
        if (cached) return cached;
        const cookie = { Cookie: 'over18=1' };
        const searchHtml = await fetchHtml(`${JD_SEARCH}${encodeURIComponent(trimmed)}&f=actor`, { headers: cookie, timeout: 4500 });
        const paths = [...searchHtml.matchAll(JD_ACTOR_PATH_RE)].map(match => match[1] ?? '');
        const actorPath = paths.find(path => !BLOCKED_ACTOR_PATHS.has(path.toLowerCase())) ?? '';
        let twitter;
        let instagram;
        if (actorPath) {
            const actorHtml = await fetchHtml(`https://javdb.com${actorPath}`, { headers: cookie, timeout: 4500 });
            const twitterMatch = actorHtml.match(JD_TWITTER_RE);
            const igMatch = actorHtml.match(JD_INSTAGRAM_RE);
            if (twitterMatch?.[1] && !twitterMatch[1].includes('/share') && !twitterMatch[1].includes('/intent')) {
                twitter = twitterMatch[1];
            }
            if (igMatch?.[1]) instagram = igMatch[1];
        }
        const result = { name: trimmed, twitter, instagram };
        writeCache(cacheKey, result, twitter || instagram ? INFO_CACHE_TTL * 7 : INFO_CACHE_TTL);
        return result;
    }
    async function loadVideoInfo() {
        const code = getPageVideoCode();
        if (!code) {
            closeInfoSection();
            log('⚠️ 无法识别番号，跳过情报加载');
            return null;
        }
        buildInfoSection();
        beginStillSearch(code);
        const session = ++state.infoSession;
        const pageReviews = extractPageReviews();
        state.infoData = { code, rating: undefined, stills: [], reviews: pageReviews, lists: [] };
        const cacheKey = `${INFO_CACHE_PREFIX}${code}`;
        const cached = readCache(cacheKey);
        if (cached) {
            state.infoData = cached;
            if (session === state.infoSession) applyInfoToPage(cached);
            return cached;
        }
        log(`🔎 正在获取情报: ${code}`);
        const merged = [...pageReviews];
        const seenStills = [];
        const seenLists = [];
        const acceptStills = incoming => {
            for (const url of usableStills(incoming ?? [])) {
                if (!seenStills.includes(url)) seenStills.push(url);
            }
        };
        const acceptLists = incoming => {
            for (const item of incoming ?? []) {
                if (item?.id && !seenLists.some(existing => existing.id === item.id)) seenLists.push(item);
            }
        };
        const onPartial = partial => {
            if (session !== state.infoSession) return;
            if (partial.rating) {
                if (!state.infoData.rating || partial.rating.source === 'JAVLibrary') state.infoData.rating = partial.rating;
            }
            if (partial.stills?.length) {
                acceptStills(partial.stills);
                state.infoData.stills = [...seenStills];
            }
            if (partial.reviews?.length) {
                merged.push(...partial.reviews);
                state.infoData.reviews = dedupeReviews(merged);
            }
            if (partial.lists?.length) {
                acceptLists(partial.lists);
                state.infoData.lists = [...seenLists];
            }
            if (partial.javDbMovieId) state.infoData.javDbMovieId = partial.javDbMovieId;
            applyInfoToPage(state.infoData);
        };
        const results = await Promise.allSettled([
            fetchJavBusInfo(code, onPartial),
            fetchJavDbInfo(code, onPartial),
            fetchJavLibraryInfo(code, onPartial)
        ]);
        if (session !== state.infoSession) return null;
        const javLib = results[2].status === 'fulfilled' ? results[2].value : { rating: undefined, reviews: [] };
        const javDb = results[1].status === 'fulfilled' ? results[1].value : { rating: undefined, stills: [], reviews: [], lists: [] };
        const javBus = results[0].status === 'fulfilled' ? results[0].value : { stills: [], reviews: [] };
        for (const source of [javBus, javDb, javLib]) {
            acceptStills(source.stills);
            acceptLists(source.lists);
            merged.push(...(source.reviews ?? []));
        }
        const finalData = {
            code,
            rating: javLib.rating || javDb.rating,
            stills: [...seenStills],
            reviews: dedupeReviews(merged),
            lists: [...seenLists],
            javDbMovieId: javDb.javDbMovieId || ''
        };
        state.infoData = finalData;
        applyInfoToPage(finalData);
        writeCache(cacheKey, finalData);
        if (finalData.rating || finalData.stills.length || finalData.reviews.length || finalData.lists.length) {
            log(`✅ 情报加载完成：${finalData.stills.length} 剧照，${finalData.reviews.length} 短评，${finalData.lists.length} 影单`);
        } else {
            log('⚠️ 情报源均无返回（可能被站点拦截）');
        }
        return finalData;
    }
    function injectRatingBadge(rating) {
        if (!rating?.score) return;
        const existing = document.querySelector('.info-rating-badge');
        const label = `★ ${rating.score.toFixed(1)} <small>${rating.source}</small>`;
        const title = `${rating.source} 评分：${rating.score.toFixed(1)} / 10` +
            (rating.count ? `（${rating.count} 人评价）` : '');
        if (existing) {
            existing.innerHTML = label;
            existing.title = title;
            return;
        }
        const titleEl = infoAnchor();
        if (!titleEl) return;
        const badge = document.createElement('span');
        badge.className = 'info-rating-badge';
        badge.innerHTML = label;
        badge.title = title;
        titleEl.insertBefore(badge, titleEl.firstChild);
    }
    function injectSocialBadges(social, name) {
        if (!social || (!social.twitter && !social.instagram)) return;
        const links = document.querySelectorAll('a[href*="/actresses/"], a[href*="/actress/"]');
        for (const link of links) {
            const text = link.textContent?.trim() || '';
            if (!text) continue;
            if (!(text.toLowerCase() === name.toLowerCase() || text.includes(name))) continue;
            if (link.dataset.avSocialInjected === '1' || link.nextElementSibling?.classList.contains('social-badges')) continue;
            link.dataset.avSocialInjected = '1';
            const container = document.createElement('span');
            container.className = 'social-badges';
            if (social.twitter) {
                const xLink = document.createElement('a');
                xLink.href = social.twitter;
                xLink.target = '_blank';
                xLink.rel = 'noopener noreferrer';
                xLink.className = 'social-badge social-x';
                xLink.title = `Twitter / X: ${name}`;
                xLink.textContent = '𝕏';
                xLink.addEventListener('click', event => event.stopPropagation());
                container.appendChild(xLink);
            }
            if (social.instagram) {
                const igLink = document.createElement('a');
                igLink.href = social.instagram;
                igLink.target = '_blank';
                igLink.rel = 'noopener noreferrer';
                igLink.className = 'social-badge social-ig';
                igLink.title = `Instagram: ${name}`;
                igLink.textContent = '📷';
                igLink.addEventListener('click', event => event.stopPropagation());
                container.appendChild(igLink);
            }
            link.after(container);
        }
    }
    const INFO_ANCHOR_SELECTORS = [
        'h1.text-base', 'h1.text-lg', '.video-title', '.video-detail-title',
        '.video-detail h1', '.detail h1', 'h1', 'h4.h4', 'h4'
    ];
    function infoAnchor() {
        const code = getPageVideoCode();
        const candidates = [];
        const seen = new Set();
        const push = element => {
            if (element && !seen.has(element)) {
                seen.add(element);
                candidates.push(element);
            }
        };
        for (const selector of INFO_ANCHOR_SELECTORS) {
            for (const element of document.querySelectorAll(selector)) push(element);
        }
        const usable = candidates.filter(element => {
            if (element.closest?.('header, nav, .header, .navbar, .site-header, .logo, .top-bar')) return false;
            const text = (element.textContent || '').replace(/\s+/g, ' ').trim();
            return text.length >= 3;
        });
        if (!usable.length) return null;
        if (code) {
            const upper = code.toUpperCase();
            const withCode = usable.find(element => (element.textContent || '').toUpperCase().includes(upper));
            if (withCode) return withCode;
        }
        return usable[0];
    }
    const HUB_TABS = [['stills', '官方剧照'], ['reviews', '社区短评'], ['lists', '精选影单']];
    const HUB_EMPTY = {
        stills: '未获取到官方剧照',
        reviews: '暂无社区短评（该片较新或暂无影迷留言）',
        lists: '暂无收录该影片的精选影单'
    };
    const INFO_BLOCK_SELECTORS = ['.video-detail', '.video-info', '.video-meta', '.detail', 'article', 'main'];
    let stillCode = '';
    const stillFailed = new Set();
    function beginStillSearch(code) {
        if (stillCode === code) return;
        stillCode = code;
        stillFailed.clear();
    }
    function usableStills(urls) {
        return [...new Set(urls)].filter(url => url && !stillFailed.has(url) && !NOW_PRINTING_RE.test(url));
    }
    function reportStillError(url, figure) {
        if (!url) return;
        stillFailed.add(url);
        const info = state.infoData;
        if (info && Array.isArray(info.stills)) info.stills = info.stills.filter(item => item !== url);
        if (figure?.parentElement) figure.remove();
        const refs = state.infoSection;
        if (!refs) return;
        const left = refs.grid.querySelectorAll('.av-still-item').length;
        const tab = refs.tabs.querySelector('[data-tab="stills"]');
        if (tab) tab.textContent = `官方剧照 (${left})`;
        if (!left) {
            const p = document.createElement('p');
            p.className = 'av-hub-empty';
            p.textContent = HUB_EMPTY.stills;
            refs.grid.replaceChildren(p);
        }
    }
    function infoMount(anchor) {
        if (!anchor) return null;
        let node = anchor;
        while (node.parentElement && node.parentElement !== document.body) {
            const parent = node.parentElement;
            if (parent.tagName === 'A' || parent.tagName === 'BUTTON' ||
                /^H[1-6]$/.test(parent.tagName) || parent.tagName === 'P' || parent.tagName === 'SPAN') {
                node = parent;
                continue;
            }
            break;
        }
        let host = node.parentElement;
        if (!host || host === document.body) {
            for (const selector of INFO_BLOCK_SELECTORS) {
                const block = anchor.closest?.(selector);
                if (block?.parentElement && block.parentElement !== document.body) {
                    host = block.parentElement;
                    node = block;
                    break;
                }
            }
        }
        if (!host || host === document.body) return null;
        return { host, node };
    }
    function buildInfoSection() {
        if (!document.querySelector('.av-info-section')) {
            const anchor = infoAnchor();
            const mount = infoMount(anchor);
            if (!mount) return null;
            const root = document.createElement('section');
            root.className = 'av-info-section';
            const head = document.createElement('div');
            head.className = 'av-info-head';
            const title = document.createElement('span');
            title.className = 'av-info-title';
            const icon = document.createElement('span');
            icon.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>';
            const titleText = document.createElement('span');
            titleText.textContent = '官方剧照与社区短评';
            title.append(icon, titleText);
            const meta = document.createElement('span');
            meta.className = 'av-info-meta';
            const stats = document.createElement('span');
            stats.className = 'av-info-stats';
            const chevron = document.createElement('span');
            chevron.className = 'av-info-chevron';
            meta.append(stats, chevron);
            const body = document.createElement('div');
            body.className = 'av-info-body';
            body.hidden = true;
            const tabs = document.createElement('nav');
            tabs.className = 'av-hub-tabs';
            tabs.setAttribute('role', 'tablist');
            tabs.setAttribute('aria-label', '情报分类');
            const panes = {};
            const loading = document.createElement('div');
            loading.className = 'av-hub-loading';
            const spinner = document.createElement('span');
            spinner.className = 'av-spinner';
            const loadingText = document.createElement('span');
            loadingText.textContent = '正在获取情报…';
            loading.append(spinner, loadingText);
            for (const [key, label] of HUB_TABS) {
                const tab = document.createElement('button');
                tab.type = 'button';
                tab.className = 'av-hub-tab';
                tab.dataset.tab = key;
                tab.id = `av-hub-tab-${key}`;
                tab.setAttribute('role', 'tab');
                tab.setAttribute('aria-selected', key === 'stills' ? 'true' : 'false');
                tab.setAttribute('aria-controls', `av-hub-panel-${key}`);
                tab.tabIndex = key === 'stills' ? 0 : -1;
                tab.textContent = label;
                tab.addEventListener('click', () => setInfoTab(key));
                tabs.appendChild(tab);
                const pane = document.createElement('div');
                pane.className = 'av-info-pane';
                pane.dataset.pane = key;
                pane.id = `av-hub-panel-${key}`;
                pane.setAttribute('role', 'tabpanel');
                pane.setAttribute('aria-labelledby', `av-hub-tab-${key}`);
                pane.hidden = key !== 'stills';
                panes[key] = pane;
            }
            const grid = document.createElement('div');
            grid.className = 'av-stills-grid';
            const reviews = document.createElement('div');
            reviews.className = 'av-review-list';
            const lists = document.createElement('div');
            lists.className = 'av-list-grid';
            panes.stills.append(loading, grid);
            panes.reviews.appendChild(reviews);
            panes.lists.appendChild(lists);
            body.append(tabs, panes.stills, panes.reviews, panes.lists);
            head.append(title, meta);
            head.addEventListener('click', () => setInfoExpanded(body.hidden));
            root.append(head, body);
            mount.host.insertBefore(root, mount.node);
            state.infoSection = {
                root, head, body, meta, stats, chevron, tabs, panes,
                grid, reviews, lists, loading, activeTab: 'stills'
            };
            setInfoTab('stills');
        }
        return state.infoSection;
    }
    function setInfoTab(key) {
        const refs = state.infoSection;
        if (!refs) return;
        refs.activeTab = key;
        for (const name of Object.keys(refs.panes)) refs.panes[name].hidden = name !== key;
        for (const tab of refs.tabs.children) {
            const on = tab.dataset?.tab === key;
            tab.classList.toggle('active', on);
            tab.setAttribute('aria-selected', on ? 'true' : 'false');
            tab.tabIndex = on ? 0 : -1;
        }
    }
    function setInfoExpanded(expanded) {
        const refs = state.infoSection;
        if (!refs) return;
        refs.body.hidden = !expanded;
        refs.root.classList.toggle('open', expanded);
    }
    function closeInfoSection() {
        document.querySelector('.av-info-section')?.remove();
        state.infoSection = null;
    }
    function renderInfoSection(data) {
        if (!data) return;
        const stills = usableStills(data.stills ?? []);
        const reviews = data.reviews ?? [];
        const lists = data.lists ?? [];
        if (!data.rating && !stills.length && !reviews.length && !lists.length) {
            closeInfoSection();
            return;
        }
        const refs = buildInfoSection();
        if (!refs) return;
        if (refs.loading.parentElement) refs.loading.remove();
        const counts = { stills: stills.length, reviews: reviews.length, lists: lists.length };
        for (const tab of refs.tabs.children) {
            const key = tab.dataset?.tab;
            const label = HUB_TABS.find(([name]) => name === key)?.[1] ?? '';
            tab.textContent = `${label} (${counts[key] ?? 0})`;
        }
        const statNodes = [];
        if (counts.stills) statNodes.push(`${counts.stills} 剧照`);
        if (counts.reviews) statNodes.push(`${counts.reviews} 讨论`);
        if (counts.lists) statNodes.push(`${counts.lists} 影单`);
        refs.stats.replaceChildren(...statNodes.map(text => {
            const span = document.createElement('span');
            span.className = 'av-info-stat';
            span.textContent = text;
            return span;
        }));
        const empty = text => {
            const p = document.createElement('p');
            p.className = 'av-hub-empty';
            p.textContent = text;
            return p;
        };
        const stillNodes = stills.slice(0, 40).map((url, index) => {
            const figure = document.createElement('figure');
            figure.className = 'av-still-item';
            const open = document.createElement('button');
            open.type = 'button';
            open.className = 'av-still-open';
            open.setAttribute('aria-label', `打开剧照 ${index + 1}`);
            open.addEventListener('click', () => openLightbox(stills, index));
            const img = document.createElement('img');
            img.src = url;
            img.loading = 'lazy';
            img.referrerPolicy = 'no-referrer';
            img.alt = `剧照 ${index + 1}`;
            img.addEventListener('error', () => {
                if (!figure.isConnected) return;
                reportStillError(url, figure);
            });
            open.appendChild(img);
            figure.appendChild(open);
            return figure;
        });
        refs.grid.replaceChildren(...(stillNodes.length ? stillNodes : [empty(HUB_EMPTY.stills)]));
        if (state.reviewsCode !== data.code) {
            state.reviewsCode = data.code;
            state.reviewsPage = 1;
            state.reviewsHasMore = reviews.length >= 20;
            state.reviewsLoadingMore = false;
        }
        const reviewNodes = reviews.slice(0, 120).map(review => {
            const card = document.createElement('article');
            card.className = 'review-card';
            const head = document.createElement('header');
            head.className = 'av-review-head';
            const user = document.createElement('strong');
            user.className = 'av-review-user';
            user.textContent = review.user || '匿名';
            head.appendChild(user);
            if (review.score) {
                const score = document.createElement('span');
                score.className = 'av-review-score';
                score.textContent = `${review.score} 分`;
                head.appendChild(score);
            }
            if (review.date) {
                const time = document.createElement('time');
                time.className = 'av-review-date';
                time.textContent = review.date;
                head.appendChild(time);
            }
            const text = document.createElement('p');
            text.className = 'av-review-text';
            text.textContent = review.content;
            card.append(head, text);
            return card;
        });
        refs.reviews.replaceChildren(...(reviewNodes.length ? reviewNodes : [empty(HUB_EMPTY.reviews)]));
        const footer = document.createElement('div');
        footer.className = 'av-review-footer';
        if (reviewNodes.length && (state.reviewsHasMore || state.reviewsLoadingMore)) {
            const more = createButton(state.reviewsLoadingMore ? '正在加载更多短评…' : '加载更多短评', 'av-hub-more-btn');
            more.disabled = state.reviewsLoadingMore;
            more.addEventListener('click', loadMoreReviews);
            footer.appendChild(more);
        } else if (reviewNodes.length >= 20) {
            const done = document.createElement('span');
            done.className = 'av-hub-done';
            done.textContent = `已加载全部短评 (共 ${reviewNodes.length} 条)`;
            footer.appendChild(done);
        }
        if (footer.childElementCount) refs.reviews.appendChild(footer);
        const listNodes = lists.slice(0, 20).map(item => buildListCard(item));
        refs.lists.replaceChildren(...(listNodes.length ? listNodes : [empty(HUB_EMPTY.lists)]));
    }
    async function loadMoreReviews() {
        const info = state.infoData;
        if (state.reviewsLoadingMore || !state.reviewsHasMore || !info) return;
        const movieId = info.javDbMovieId;
        if (!movieId) {
            state.reviewsHasMore = false;
            renderInfoSection(info);
            return;
        }
        state.reviewsLoadingMore = true;
        renderInfoSection(info);
        const nextPage = (state.reviewsPage || 1) + 1;
        const url = `${JDFORREPAM_API}/api/v1/movies/${encodeURIComponent(movieId)}/reviews?` +
            new URLSearchParams({ page: String(nextPage), sort_by: 'hotly', limit: '20' });
        const raw = await jdApiFetch(url).catch(() => '');
        state.reviewsLoadingMore = false;
        if (state.infoData !== info) return;
        let list = [];
        try {
            const body = JSON.parse(raw);
            list = Array.isArray(body?.data?.reviews) ? body.data.reviews : [];
        } catch (_) {
        }
        const before = info.reviews.length;
        const merged = [...info.reviews];
        for (const item of list) {
            const content = String(item?.content ?? '').trim();
            if (content.length < 2) continue;
            const score = Number(item?.score);
            merged.push({
                user: String(item?.username ?? '').trim() || '匿名',
                date: String(item?.created_at ?? '').slice(0, 10),
                content,
                score: Number.isFinite(score) && score > 0 ? score : undefined
            });
        }
        info.reviews = dedupeReviews(merged);
        state.reviewsPage = nextPage;
        if (list.length < 20 || info.reviews.length === before) state.reviewsHasMore = false;
        renderInfoSection(info);
        log(`💬 已加载更多短评（共 ${info.reviews.length} 条）`);
    }
    function buildListCard(item) {
        const card = document.createElement('article');
        card.className = 'av-list-card';
        const head = document.createElement('div');
        head.className = 'av-list-head';
        const left = document.createElement('div');
        left.style.cssText = 'display:flex;align-items:center;gap:8px;min-width:0;flex:1 1 auto;';
        const icon = document.createElement('span');
        icon.className = 'av-list-icon';
        icon.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="2"></rect><path d="M7 3v18M17 3v18M3 8h4M3 16h4M17 8h4M17 16h4"></path></svg>';
        const title = document.createElement('strong');
        title.className = 'av-list-title';
        title.textContent = item.name;
        title.title = item.name;
        left.append(icon, title);
        const meta = document.createElement('span');
        meta.className = 'av-list-meta';
        const stat = (text, svg) => {
            const span = document.createElement('span');
            span.className = 'av-list-stat';
            if (svg) span.innerHTML = svg;
            span.appendChild(document.createTextNode(text));
            return span;
        };
        meta.appendChild(stat(`${item.movieCount} 部`));
        if (item.collectionsCount) {
            meta.appendChild(stat(formatCount(item.collectionsCount),
                '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>'));
        }
        if (item.viewsCount) {
            meta.appendChild(stat(formatCount(item.viewsCount),
                '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>'));
        }
        const expand = document.createElement('button');
        expand.type = 'button';
        expand.className = 'av-list-action av-list-expand';
        const expandLabel = document.createElement('span');
        expandLabel.textContent = '展开影片';
        const chevron = document.createElement('span');
        chevron.className = 'av-chevron';
        expand.append(expandLabel, chevron);
        const out = document.createElement('a');
        out.className = 'av-list-action av-list-out';
        out.href = item.shareUrl;
        out.target = '_blank';
        out.rel = 'noopener noreferrer';
        out.title = '在 JavDB 官方页查看完整影单';
        out.textContent = '原站 ↗';
        const body = document.createElement('div');
        body.className = 'av-list-body';
        body.hidden = true;
        expand.addEventListener('click', () => toggleListExpand(item, card, expand, expandLabel, body));
        head.append(left, meta, expand, out);
        card.append(head, body);
        return card;
    }
    function toggleListExpand(item, card, button, label, body) {
        const expanded = body.hidden === false;
        if (expanded) {
            body.hidden = true;
            card.classList.remove('is-expanded');
            button.classList.remove('is-open');
            label.textContent = '展开影片';
            return;
        }
        body.hidden = false;
        card.classList.add('is-expanded');
        button.classList.add('is-open');
        label.textContent = '收起';
        loadListMovies(item, body);
    }
    async function loadListMovies(item, body) {
        const cached = state.listMovies?.[item.id];
        if (cached && (cached.loading || cached.movies.length || cached.error)) {
            renderListMovies(item, body, cached);
            return;
        }
        state.listMovies = state.listMovies || {};
        state.listMovies[item.id] = { loading: true, movies: [] };
        renderListMovies(item, body, state.listMovies[item.id]);
        const result = await fetchListMovies(item.id);
        state.listMovies[item.id] = result.success
            ? { loading: false, movies: result.movies }
            : { loading: false, movies: [], error: result.error || 'network' };
        if (body.parentElement) renderListMovies(item, body, state.listMovies[item.id]);
    }
    function renderListMovies(item, body, cache) {
        const spinner = () => {
            const wrap = document.createElement('div');
            wrap.className = 'av-list-loading';
            const dot = document.createElement('span');
            dot.className = 'av-spinner';
            const text = document.createElement('span');
            text.textContent = '正在获取影单影片…';
            wrap.append(dot, text);
            return wrap;
        };
        const fallback = (title, text) => {
            const wrap = document.createElement('div');
            wrap.className = 'av-list-fallback';
            const strong = document.createElement('strong');
            strong.textContent = title;
            const p = document.createElement('p');
            p.textContent = text;
            const link = document.createElement('a');
            link.className = 'av-list-action';
            link.href = item.shareUrl;
            link.target = '_blank';
            link.rel = 'noopener noreferrer';
            link.textContent = `前往 JavDB 原站查看完整影单（共 ${item.movieCount} 部）↗`;
            wrap.append(strong, p, link);
            return wrap;
        };
        if (cache.loading) {
            body.replaceChildren(spinner());
            return;
        }
        if (cache.error === 'cloudflare') {
            body.replaceChildren(fallback('受 JavDB 网页安全防护拦截',
                'JavDB 网页端启用了 Cloudflare 人机验证，暂时无法在站内解析影单影片，请直接前往原站浏览。'));
            return;
        }
        if (cache.error) {
            const wrap = document.createElement('div');
            wrap.className = 'av-list-fallback';
            const p = document.createElement('p');
            p.textContent = '获取影单影片列表超时或失败。';
            const retry = document.createElement('button');
            retry.type = 'button';
            retry.className = 'av-list-action';
            retry.textContent = '重试加载';
            retry.addEventListener('click', () => {
                delete state.listMovies[item.id];
                loadListMovies(item, body);
            });
            const link = document.createElement('a');
            link.className = 'av-list-action';
            link.href = item.shareUrl;
            link.target = '_blank';
            link.rel = 'noopener noreferrer';
            link.textContent = '在 JavDB 查看 ↗';
            wrap.append(p, retry, link);
            body.replaceChildren(wrap);
            return;
        }
        if (!cache.movies.length) {
            const p = document.createElement('p');
            p.className = 'av-hub-empty';
            p.textContent = '该影单暂无收录影片或未解析到结果';
            body.replaceChildren(p);
            return;
        }
        const grid = document.createElement('div');
        grid.className = 'av-list-movies';
        for (const movie of cache.movies.slice(0, 60)) {
            const link = document.createElement('a');
            link.className = 'av-list-movie';
            link.href = `/search/${encodeURIComponent(movie.number)}`;
            link.target = '_blank';
            link.rel = 'noopener noreferrer';
            link.title = `在 MissAV 搜索 ${movie.number}${movie.title ? ' - ' + movie.title : ''}`;
            const cover = document.createElement('div');
            cover.className = 'av-list-movie-cover';
            if (movie.cover) {
                const img = document.createElement('img');
                img.src = movie.cover;
                img.loading = 'lazy';
                img.referrerPolicy = 'no-referrer';
                img.alt = movie.number;
                cover.appendChild(img);
            }
            const label = document.createElement('strong');
            label.textContent = movie.number;
            link.append(cover, label);
            grid.appendChild(link);
        }
        body.replaceChildren(grid);
    }
    async function fetchListMovies(listId) {
        if (!listId) return { success: false, movies: [], error: 'empty' };
        const url = `https://javdb.com/lists/${encodeURIComponent(listId)}`;
        const html = await fetchHtml(url, {
            headers: { Cookie: 'over18=1' },
            timeout: 8000
        }).catch(() => '');
        if (!html) return { success: false, movies: [], error: 'network' };
        if (/Just a moment\.\.\.|cf-browser-verification|challenge-platform/.test(html)) {
            return { success: false, movies: [], error: 'cloudflare' };
        }
        const movies = parseJavDbListHtml(html);
        if (!movies.length) return { success: false, movies: [], error: 'empty' };
        return { success: true, movies };
    }
    function parseJavDbListHtml(html) {
        const movies = [];
        const itemRegex = /<a[^>]*href=["']\/v\/([a-zA-Z0-9]+)["'][^>]*title=["']([^"']*)["'][^>]*>([\s\S]*?)<\/a>/gi;
        let match;
        while ((match = itemRegex.exec(html)) !== null) {
            const id = match[1];
            const fullTitle = match[2];
            const inner = match[3];
            const strongMatch = inner.match(/<strong>([^<]+)<\/strong>/i);
            const number = strongMatch ? strongMatch[1].trim() : '';
            const imgMatch = inner.match(/<img[^>]+(?:data-src|src)=["']([^"']+)["']/i);
            let cover = imgMatch ? imgMatch[1] : undefined;
            if (cover && cover.startsWith('//')) cover = 'https:' + cover;
            const scoreMatch = inner.match(/class=["']value["']>([\d.]+)<\/span>/i);
            const score = scoreMatch ? Number.parseFloat(scoreMatch[1]) : undefined;
            movies.push({
                id,
                number: number || id,
                title: (number ? fullTitle.replace(number, '') : fullTitle).trim() || number || id,
                cover,
                score: Number.isFinite(score) ? score : undefined
            });
        }
        return movies;
    }
    function formatCount(num) {
        if (num === undefined || num === null) return '';
        if (num >= 10000) return (num / 10000).toFixed(1).replace(/\.0$/, '') + 'w';
        if (num >= 1000) return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
        return String(num);
    }
    function applyInfoToPage(data) {
        if (!data) return;
        if (data.rating) injectRatingBadge(data.rating);
        renderInfoSection(data);
    }
    function openLightbox(images, index) {
        closeLightbox();
        state.gallery = images;
        state.galleryIndex = clamp(index, 0, images.length - 1);
        const layer = document.createElement('div');
        layer.className = 'lightbox-layer';
        const topbar = document.createElement('div');
        topbar.className = 'lightbox-topbar';
        const meta = document.createElement('span');
        meta.className = 'lightbox-meta';
        meta.textContent = '剧照画廊';
        const counter = document.createElement('span');
        counter.className = 'lightbox-counter';
        const hint = document.createElement('span');
        hint.className = 'lightbox-hint';
        hint.textContent = '← → 切换 · Esc 关闭';
        const close = createButton('✕', 'lightbox-close');
        close.addEventListener('click', closeLightbox);
        topbar.append(meta, counter, hint, close);
        const stage = document.createElement('div');
        stage.className = 'lightbox-stage';
        const img = document.createElement('img');
        img.className = 'lightbox-img';
        stage.appendChild(img);
        const prev = createButton('‹', 'lightbox-nav prev');
        const next = createButton('›', 'lightbox-nav next');
        prev.addEventListener('click', () => stepLightbox(-1));
        next.addEventListener('click', () => stepLightbox(1));
        layer.append(topbar, stage, prev, next);
        layer.addEventListener('click', event => {
            if (event.target === layer || event.target === stage) closeLightbox();
        });
        document.body.appendChild(layer);
        state.lightbox = { layer, img, counter };
        const keyHandler = event => {
            if (event.key === 'Escape') closeLightbox();
            else if (event.key === 'ArrowLeft') stepLightbox(-1);
            else if (event.key === 'ArrowRight') stepLightbox(1);
        };
        layer._keyHandler = keyHandler;
        document.addEventListener('keydown', keyHandler);
        updateLightbox();
    }
    function stepLightbox(delta) {
        if (!state.gallery.length) return;
        const total = state.gallery.length;
        state.galleryIndex = (state.galleryIndex + delta + total) % total;
        updateLightbox();
    }
    function updateLightbox() {
        if (!state.lightbox) return;
        const total = state.gallery.length;
        state.lightbox.img.src = state.gallery[state.galleryIndex];
        state.lightbox.counter.textContent = `${state.galleryIndex + 1} / ${total}`;
    }
    function closeLightbox() {
        if (state.lightbox) {
            document.removeEventListener('keydown', state.lightbox.layer._keyHandler);
            state.lightbox.layer.remove();
            state.lightbox = null;
        }
    }
    function loadActressSocialFromPage() {
        const links = document.querySelectorAll('a[href*="/actresses/"], a[href*="/actress/"]');
        const names = new Set();
        for (const link of links) {
            const text = link.textContent?.trim() || '';
            if (text && text.length >= 2) names.add(text);
        }
        for (const name of names) {
            fetchActressSocial(name).then(social => injectSocialBadges(social, name)).catch(() => {});
        }
    }
    let videoProbeEl = null;
    let videoProbeAt = 0;
    const VIDEO_PROBE_TTL = 1000;
    function isPreviewVideo(video) {
        if (video.closest(PREVIEW_HOST_SELECTOR)) return true;
        if (video.closest('a')) return true;
        if (video.loop && video.muted && video.autoplay) return true;
        return false;
    }
    function ensurePositioned(container) {
        if (!container || typeof getComputedStyle !== 'function') return;
        try {
            if (getComputedStyle(container).position === 'static') container.style.position = 'relative';
        } catch (_) {
        }
    }
    function playerContainer(video) {
        return (
            video.closest('.plyr__video-wrapper') ||
            video.closest('.plyr') ||
            video.closest(PLAYER_HOST_SELECTOR) ||
            video.parentElement
        );
    }
    function findMainVideo() {
        if (videoProbeEl && videoProbeEl.isConnected && Date.now() - videoProbeAt < VIDEO_PROBE_TTL) return videoProbeEl;
        let best = null;
        let bestScore = 0;
        for (const video of document.querySelectorAll('video')) {
            if (isPreviewVideo(video)) continue;
            const explicit = video.closest(PLAYER_HOST_SELECTOR);
            let width = video.videoWidth || 0;
            let height = video.videoHeight || 0;
            if (!width || !height) {
                const rect = video.getBoundingClientRect();
                width = rect.width;
                height = rect.height;
            }
            if (width < MIN_PLAYER_WIDTH || height < MIN_PLAYER_HEIGHT) continue;
            const score = width * height * (explicit ? 100 : 1);
            if (score > bestScore) {
                bestScore = score;
                best = video;
            }
        }
        videoProbeAt = Date.now();
        videoProbeEl = best;
        return videoProbeEl;
    }
    function stopPlayerPoll() {
        clearInterval(state.pollTimer);
        clearTimeout(state.pollTimeout);
        state.pollTimer = 0;
        state.pollTimeout = 0;
    }
    function initPlayer() {
        if (state.bound || state.pollTimer) return;
        if (!findMainVideo()) createPanel();
        state.pollTimer = setInterval(() => {
            const video = findMainVideo();
            if (!video) return;
            const container = playerContainer(video);
            if (!container) return;
            stopPlayerPoll();
            bindPlayer(video, container);
        }, POLL_INTERVAL);
        state.pollTimeout = setTimeout(stopPlayerPoll, POLL_TIMEOUT);
    }
    function sweepUiOrphans(container) {
        for (const selector of ['.custom-quick-controls', '.custom-subtitle', '.speed-hud-host']) {
            for (const node of document.querySelectorAll(selector)) {
                if (container.contains(node)) continue;
                node.remove();
            }
        }
        if (state.quick && !state.quick.isConnected) state.quick = null;
        if (state.subtitleEl && !state.subtitleEl.isConnected) state.subtitleEl = null;
        if (state.hudHost && !state.hudHost.isConnected) {
            state.hudHost = null;
            state.hudEl = null;
        }
    }
    function bindPlayer(video, container, force = false) {
        if (!force && state.bound && state.video === video && video.isConnected) return;
        if (isPreviewVideo(video)) return;
        if (!container) container = playerContainer(video);
        if (!container || container.closest(PREVIEW_HOST_SELECTOR)) return;
        ensurePositioned(container);
        state.video = video;
        state.container = container;
        state.bound = true;
        state.player = (typeof unsafeWindow !== 'undefined' && unsafeWindow.player) || video.plyr || video;
        sweepUiOrphans(container);
        if (state.subtitleEl && state.subtitleEl.parentElement === container) {
            container.appendChild(state.subtitleEl);
        } else {
            state.subtitleEl = document.createElement('div');
            state.subtitleEl.className = 'custom-subtitle';
            state.subtitleEl.style.display = 'none';
            container.appendChild(state.subtitleEl);
        }
        applySubtitleStyle();
        createPanel();
        createQuickControls();
        watchQuickControls();
        setupShortcuts();
        buildSpeedHud(container);
        setupHoldAccelerate(container);
        syncFilterBar();
        if (video.dataset && video.dataset.avHelperBound !== '1') {
            video.dataset.avHelperBound = '1';
            for (const type of ['play', 'pause', 'ended', 'loadedmetadata', 'ratechange', 'seeked']) {
                video.addEventListener(type, updatePlayPauseButton, { passive: true });
            }
            video.addEventListener('loadedmetadata', () => renderSubtitle(true), { passive: true });
        }
        startSubtitleLoop();
        updatePlayPauseButton();
        if (settings.autoInfo) {
            loadActressSocialFromPage();
            loadVideoInfo();
        }
        log('🎬 播放器已就绪');
        if (settings.analyticsTrack) setTimeout(startAnalyticsTracking, 1200);
    }
    function onPlayPage() {
        if (/\/play\//i.test(location.pathname)) return true;
        return Boolean(findMainVideo());
    }
    function clickPlayEntry() {
        if (onPlayPage()) return false;
        for (const selector of PLAY_ENTRY_SELECTORS) {
            const entry = document.querySelector(selector);
            if (entry instanceof HTMLElement) {
                entry.click();
                return true;
            }
        }
        return false;
    }
    function initPage() {
        if (isAnalyticsRoute()) {
            mountAnalyticsPage();
            return;
        }
        cleanAds();
        createPanel();
        initPlayer();
        clickPlayEntry();
        startAdObserver();
        initContentFilter();
    }
    GM_addStyle(`
        .av-card-hidden { display: none !important; }
        .av-card-dimmed { opacity: .28 !important; filter: grayscale(1) !important; transition: opacity .2s ease; }
        .av-card-dimmed:hover { opacity: .85 !important; filter: grayscale(0) !important; }
        .av-filter-host { display: inline-flex; align-items: center; max-width: 100%; }
        .av-filter-host.av-filter-inline { margin-left: auto; margin-right: 10px; }
        .title-with-more > .av-filter-host, .title-with-avatar > .av-filter-host, .section-title > .av-filter-host, .section-header > .av-filter-host, .list-header > .av-filter-host, .video-list-header > .av-filter-host { margin-left: auto; margin-right: 12px; }
        .title-with-more:has(> .av-filter-host), .title-with-avatar:has(> .av-filter-host), .section-title:has(> .av-filter-host), .section-header:has(> .av-filter-host), .list-header:has(> .av-filter-host), .video-list-header:has(> .av-filter-host) { display: flex !important; flex-wrap: wrap; align-items: center; }
        .av-filter-inline-row > a.right { display: none !important; }
        @media (min-width: 768px) {
            nav.profile-nav { display: flex !important; flex-wrap: wrap; align-items: center; }
            nav.profile-nav > ul { margin-bottom: 0; }
            nav.profile-nav > .right { margin-left: 0 !important; }
        }
        .av-filter-slot { display: inline-flex; flex-wrap: wrap; align-items: center; gap: 6px; }
        .av-filter-injected-header {
            display: flex;
            flex-wrap: wrap;
            align-items: center;
            justify-content: space-between;
            gap: 8px;
            margin-bottom: 16px;
            padding: 10px 0;
            border-bottom: 1px solid rgba(255, 255, 255, .08);
        }
        .av-filter-bar {
            position: static;
            display: inline-flex;
            flex-wrap: wrap;
            align-items: center;
            gap: 6px;
            max-width: 100%;
            box-sizing: border-box;
            padding: 0;
            color: #d8dee9;
            font-size: 12px;
            line-height: 1;
            background: none;
            border: none;
            box-shadow: none;
            pointer-events: auto;
        }
        .av-fb-chip {
            display: inline-flex;
            align-items: center;
            gap: 5px;
            height: 30px;
            padding: 4px 10px;
            border-radius: 6px;
            box-sizing: border-box;
            font-family: inherit;
            font-size: 12px;
            font-weight: 500;
            white-space: nowrap;
            color: #d8dee9;
            background: rgba(255, 255, 255, .08);
            border: 1px solid rgba(255, 255, 255, .14);
            cursor: pointer;
            user-select: none;
            touch-action: manipulation;
            text-decoration: none;
            transition: background-color .15s, border-color .15s, color .15s, transform .1s;
        }
        .av-fb-chip:hover:not(:disabled) { background: rgba(255, 255, 255, .18); border-color: rgba(255, 255, 255, .3); color: #fff; }
        .av-fb-chip:active:not(:disabled) { transform: scale(.96); }
        .av-fb-chip:disabled { opacity: .35; cursor: not-allowed; }
        .av-fb-chip.is-on { background: rgba(56, 189, 248, .3); border-color: rgba(56, 189, 248, .55); color: #fff; }
        .av-fb-chip.is-on .av-svg svg { stroke: #fff; }
        .av-fb-chip.av-fb-cockpit { background: rgba(16, 185, 129, .22); border-color: rgba(16, 185, 129, .45); }
        .av-fb-chip.av-fb-stat { color: #ff7c96; background: rgba(255, 90, 120, .12); border-color: rgba(255, 90, 120, .28); cursor: default; gap: 4px; padding: 0 8px; }
        .av-fb-chip.av-fb-stat:hover { background: rgba(255, 90, 120, .12); border-color: rgba(255, 90, 120, .28); }
        .av-fb-chip.av-fb-stat[hidden] { display: none; }
        .av-fb-chip.av-fb-hide { padding: 4px 7px; opacity: .6; }
        .av-fb-chip .av-svg { flex-shrink: 0; }
        .av-fb-chip .av-svg:not(.av-fb-arrow) svg { width: 14px; height: 14px; stroke-width: 2px; }
        .av-fb-select-wrap { position: relative; padding-right: 17px; }
        .av-fb-select {
            position: absolute;
            inset: 0;
            width: 100%;
            height: 100%;
            opacity: 0;
            appearance: none;
            border: none;
            background: none;
            cursor: pointer;
        }
        .av-fb-select:disabled { cursor: not-allowed; }
        .av-fb-arrow svg { width: 9px; height: 9px; stroke-width: 1.5; }
        .av-fb-count { font-variant-numeric: tabular-nums; font-weight: 700; }
        .av-fb-stat-label { opacity: .85; font-size: 11px; }
        .av-fb-fab { position: absolute; top: 3px; right: 3px; width: 5px; height: 5px; border-radius: 50%; background: #50e3c2; box-shadow: 0 0 5px #50e3c2; }
        .av-fb-fab[hidden] { display: none; }
        .av-filter-bar .av-fb-blacklist { position: relative; }
        .av-filter-panel {
            display: flex;
            flex-direction: column;
            gap: 8px;
            margin-top: 10px;
            padding: 10px 0 4px;
            border-top: 1px solid rgba(255, 255, 255, .15);
        }
        .av-filter-panel[hidden] { display: none; }
        .av-filter-scroll {
            display: flex;
            flex-direction: column;
            gap: 8px;
        }
        .av-filter-scroll > * { flex: 0 0 auto; }
        .av-check-row[hidden], .av-text-row[hidden] { display: none; }
        .av-filter-strip {
            display: flex;
            flex-direction: column;
            gap: 8px;
        }
        .av-check-row {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 12px;
            min-height: 30px;
            padding: 0;
            border: 0;
            background: none;
            color: #cbd5e1;
            font-size: 12px;
            cursor: pointer;
        }
        .av-check-row > span { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
        .av-check-row .av-help { color: #64748b; font-size: 11px; line-height: 1.45; }
        .av-check-row input {
            appearance: none;
            -webkit-appearance: none;
            flex: 0 0 32px;
            width: 32px;
            height: 20px;
            margin: 0;
            padding: 2px;
            border: 0;
            border-radius: 9999px;
            background: rgba(255,255,255,.18);
            cursor: pointer;
            transition: background-color .15s ease-out;
        }
        .av-check-row input::before { content: ''; display: block; width: 16px; height: 16px; border-radius: 50%; background: #fff; box-shadow: 0 1px 1px rgba(0,0,0,.06); transition: transform .15s ease-out; }
        .av-check-row input:checked { background: #38bdf8; }
        .av-check-row input:checked::before { transform: translate(12px); }
        .av-check-row.is-on { color: #e2e8f0; }
        .av-filter-text-slide {
            display: flex;
            flex-direction: column;
            gap: 10px;
        }
        .av-text-row { display: flex; flex-direction: column; gap: 3px; font-size: 12px; }
        .av-text-row label { opacity: .82; }
        .av-text-row .av-help { color: #64748b; font-size: 11px; line-height: 1.45; }
        .av-text-row textarea {
            box-sizing: border-box;
            width: 100%;
            background: rgba(13,13,22,.9);
            color: inherit;
            border: 1px solid rgba(255,255,255,.15);
            border-radius: 8px;
            outline: none;
            padding: 6px 8px;
            font-size: 12px;
            line-height: 1.45;
            font-family: inherit;
            resize: vertical;
        }
        .av-text-row textarea:focus { border-color: rgba(56,189,248,.6); }
        .av-text-row input[type="range"] { -webkit-appearance: none; appearance: none; width: 100%; height: 14px; margin: 0; padding: 0; border: 0; background: transparent; cursor: pointer; }
        .av-text-row input[type="range"]::-webkit-slider-runnable-track { height: 4px; border: 0; border-radius: 999px; background: linear-gradient(90deg, #38bdf8 0 var(--av-range, 0%), rgba(255,255,255,.16) var(--av-range, 0%) 100%); }
        .av-text-row input[type="range"]::-webkit-slider-thumb { -webkit-appearance: none; width: 12px; height: 12px; margin-top: -4px; border: 0; border-radius: 50%; background: #38bdf8; box-shadow: 0 0 0 3px rgba(56,189,248,.18), 0 1px 4px rgba(0,0,0,.45); transition: box-shadow .15s ease, transform .15s ease; }
        .av-text-row input[type="range"]:hover::-webkit-slider-thumb { box-shadow: 0 0 0 5px rgba(56,189,248,.26), 0 1px 4px rgba(0,0,0,.45); }
        .av-text-row input[type="range"]:active::-webkit-slider-thumb { transform: scale(1.12); }
        .av-text-row input[type="range"]:focus-visible::-webkit-slider-thumb { box-shadow: 0 0 0 5px rgba(56,189,248,.38); }
        .av-text-row input[type="range"]::-moz-range-track { height: 4px; border: 0; border-radius: 999px; background: rgba(255,255,255,.16); }
        .av-text-row input[type="range"]::-moz-range-progress { height: 4px; border: 0; border-radius: 999px; background: #38bdf8; }
        .av-text-row input[type="range"]::-moz-range-thumb { width: 12px; height: 12px; border: 0; border-radius: 50%; background: #38bdf8; box-shadow: 0 0 0 3px rgba(56,189,248,.18); }
        .av-text-row input[type="range"]:hover::-moz-range-thumb { box-shadow: 0 0 0 5px rgba(56,189,248,.26); }
        .av-filter-actions { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 2px; }
        .av-filter-actions button { flex: 1 1 auto; }
        .av-filter-actions .av-open-cockpit {
            flex: 1 1 auto;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            min-height: 26px;
            padding: 4px 10px;
            border: 1px solid rgba(59,130,246,.5);
            border-radius: 6px;
            background: linear-gradient(135deg,#3b82f6,#2563eb);
            color: #f8fafc;
            font-family: inherit;
            font-size: 12px;
            font-weight: 600;
            text-decoration: none;
            cursor: pointer;
        }
        .av-filter-actions .av-open-cockpit:hover { filter: brightness(1.12); }
        .av-svg { display: inline-flex; align-items: center; justify-content: center; }
        .av-svg svg { width: 16px; height: 16px; }
        .av-cockpit {
            box-sizing: border-box;
            width: 100%;
            min-height: 100vh;
            padding: 24px 32px 48px;
            background-color: #090a0f;
            background-image: radial-gradient(circle at 100% 0, rgba(16, 185, 129, .05), transparent 40%), radial-gradient(circle at 0 100%, rgba(56, 189, 248, .05), transparent 40%);
        }
        .av-cockpit * { box-sizing: border-box; }
        .av-cockpit-header { position: sticky; top: 0; z-index: 3; display: flex; align-items: center; gap: 18px; flex-wrap: wrap; margin: -24px -32px 22px; padding: 20px 32px 18px; background: rgba(9, 10, 15, .94); backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px); border-bottom: 1px solid rgba(148, 163, 184, .16); }
        .av-brand { display: flex; align-items: center; gap: 10px; }
        .av-brand-logo svg { width: 26px; height: 26px; color: #38bdf8; }
        .av-brand-text { display: flex; align-items: center; gap: 8px; }
        .av-brand-text h1 { margin: 0; font-size: 18px; font-weight: 700; letter-spacing: .4px; }
        .av-brand-badge { font-size: 10px; letter-spacing: 1px; padding: 2px 7px; border-radius: 999px; background: rgba(56, 189, 248, .16); color: #7dd3fc; border: 1px solid rgba(56, 189, 248, .35); }
        .av-range-tabs { display: flex; gap: 4px; padding: 3px; border-radius: 999px; background: rgba(148, 163, 184, .1); }
        .av-range-tab { border: 0; background: transparent; color: #94a3b8; font-size: 12px; padding: 6px 14px; border-radius: 999px; cursor: pointer; }
        .av-range-tab.active { background: rgba(56, 189, 248, .2); color: #e0f2fe; }
        .av-range-tab:hover { color: #e0f2fe; }
        .av-range-tab:focus-visible { outline: 2px solid rgba(56, 189, 248, .7); outline-offset: 2px; }
        .av-cockpit-actions { display: flex; gap: 8px; margin-left: auto; flex-wrap: wrap; }
        .av-btn { display: inline-flex; align-items: center; gap: 6px; border: 1px solid rgba(148, 163, 184, .25); background: rgba(148, 163, 184, .1); color: #e2e8f0; border-radius: 8px; padding: 7px 13px; font-size: 12px; font-family: inherit; cursor: pointer; transition: background .2s ease, border-color .2s ease, color .2s ease; }
        .av-btn .av-svg svg { width: 15px; height: 15px; }
        .av-btn:hover { background: rgba(148, 163, 184, .2); border-color: rgba(148, 163, 184, .4); color: #fff; }
        .av-btn:disabled { opacity: .6; cursor: progress; }
        .av-btn-danger { border-color: rgba(248, 113, 113, .4); background: rgba(248, 113, 113, .14); color: #fca5a5; }
        .av-btn-danger:hover { background: rgba(248, 113, 113, .24); border-color: rgba(248, 113, 113, .6); color: #fee2e2; }
        .av-btn-close { border-color: rgba(56, 189, 248, .4); background: rgba(56, 189, 248, .16); color: #7dd3fc; }
        .av-btn-close:hover { background: rgba(56, 189, 248, .28); border-color: rgba(56, 189, 248, .62); color: #e0f2fe; }
        .av-btn:focus-visible { outline: 2px solid rgba(56, 189, 248, .7); outline-offset: 2px; }
        .av-kpi-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 14px; margin-bottom: 18px; }
        .av-kpi { padding: 16px 18px; border-radius: 14px; background: rgba(148, 163, 184, .07); border: 1px solid rgba(148, 163, 184, .14); }
        .av-kpi-header { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
        .av-kpi-label { font-size: 12px; color: #94a3b8; }
        .av-kpi-icon, .av-kpi-header .av-svg { padding: 6px; border-radius: 9px; background: rgba(56, 189, 248, .14); color: #38bdf8; }
        .av-kpi-header .av-svg.is-emerald { background: rgba(16, 185, 129, .14); color: #34d399; }
        .av-kpi-header .av-svg.is-violet { background: rgba(167, 139, 250, .14); color: #a78bfa; }
        .av-kpi-header .av-svg.is-pink { background: rgba(244, 114, 182, .14); color: #f472b6; }
        .av-kpi-value { font-size: 30px; font-weight: 700; margin: 10px 0 6px; letter-spacing: -.5px; }
        .av-kpi-value small { font-size: 13px; font-weight: 500; color: #94a3b8; margin-left: 5px; }
        .av-kpi-footer { font-size: 11px; color: #64748b; }
        .av-cockpit-card { padding: 18px; border-radius: 14px; background: rgba(148, 163, 184, .06); border: 1px solid rgba(148, 163, 184, .13); margin-bottom: 18px; }
        .av-card-head { margin-bottom: 14px; }
        .av-card-title { display: flex; align-items: center; gap: 8px; font-size: 14px; font-weight: 600; }
        .av-card-title .av-svg { color: #38bdf8; }
        .av-card-subtitle { font-size: 11px; color: #64748b; margin-top: 3px; }
        .av-rank-crown { font-size: 14px; }
        .av-heatmap-wrap { display: flex; gap: 6px; }
        .av-heatmap-weekdays { display: grid; grid-template-rows: repeat(7, 12px); gap: 3px; font-size: 9px; color: #64748b; }
        .av-heatmap-weekdays span { line-height: 12px; }
        .av-heatmap-boxes { display: grid; grid-auto-flow: column; grid-template-rows: repeat(7, 12px); gap: 3px; overflow-x: auto; padding-bottom: 4px; }
        .av-heatmap-box { width: 12px; height: 12px; border-radius: 3px; background: rgba(148, 163, 184, .12); }
        .av-heatmap-box.level-0 { background: rgba(148, 163, 184, .12); }
        .av-heatmap-box.level-1 { background: rgba(16, 185, 129, .3); }
        .av-heatmap-box.level-2 { background: rgba(16, 185, 129, .5); }
        .av-heatmap-box.level-3 { background: rgba(16, 185, 129, .72); }
        .av-heatmap-box.level-4 { background: rgba(16, 185, 129, .95); }
        .av-heatmap-box.is-future { opacity: .25; }
        .av-heatmap-legend { display: flex; align-items: center; gap: 4px; margin-top: 10px; font-size: 10px; color: #64748b; }
        .av-duo-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(340px, 1fr)); gap: 18px; }
        .av-bar-chart { display: flex; align-items: flex-end; gap: 3px; height: 150px; }
        .av-bar-col { flex: 1 1 0; display: flex; flex-direction: column; align-items: center; height: 100%; cursor: help; }
        .av-bar-track { flex: 1 1 auto; width: 100%; display: flex; align-items: flex-end; }
        .av-bar-fill { width: 100%; border-radius: 3px 3px 0 0; background: linear-gradient(180deg, #38bdf8, rgba(56, 189, 248, .35)); transition: filter .15s ease; }
        .av-bar-col:hover .av-bar-fill { filter: brightness(1.3); }
        .av-bar-fill.is-peak { background: linear-gradient(180deg, #34d399, rgba(16, 185, 129, .35)); }
        .av-bar-label { font-size: 9px; color: #64748b; margin-top: 4px; height: 11px; }
        .av-habit-list { display: flex; flex-direction: column; gap: 12px; }
        .av-habit-label { display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 5px; color: #cbd5e1; }
        .av-progress-bar { height: 6px; border-radius: 999px; background: rgba(148, 163, 184, .14); overflow: hidden; }
        .av-progress-bar > div { height: 100%; border-radius: 999px; background: linear-gradient(90deg, #38bdf8, #818cf8); }
        .av-progress-bar.is-habit > div { background: linear-gradient(90deg, #34d399, #38bdf8); }
        .av-progress-bar.is-actress > div { background: linear-gradient(90deg, #a78bfa, #38bdf8); }
        .av-progress-bar.is-genre > div { background: linear-gradient(90deg, #f472b6, #a78bfa); }
        .av-rank-row { display: flex; align-items: flex-start; gap: 10px; padding: 7px 0; }
        .av-rank-badge { width: 20px; height: 20px; flex: 0 0 20px; border-radius: 6px; display: flex; align-items: center; justify-content: center; font-size: 11px; background: rgba(148, 163, 184, .16); color: #cbd5e1; }
        .av-rank-badge.is-gold { background: rgba(250, 204, 21, .22); color: #fde047; }
        .av-rank-badge.is-silver { background: rgba(203, 213, 225, .2); color: #e2e8f0; }
        .av-rank-badge.is-bronze { background: rgba(251, 146, 60, .2); color: #fdba74; }
        .av-rank-body { flex: 1 1 auto; min-width: 0; }
        .av-rank-head { display: flex; justify-content: space-between; gap: 10px; font-size: 12px; margin-bottom: 5px; }
        .av-actress-link { color: #e2e8f0; text-decoration: none; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .av-actress-link:hover { color: #7dd3fc; text-decoration: underline; }
        .av-rank-meta { color: #64748b; flex: 0 0 auto; }
        .av-genre-row { display: flex; align-items: center; gap: 10px; padding: 4px 0; font-size: 12px; }
        .av-genre-name { flex: 0 0 120px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: #cbd5e1; }
        .av-genre-row .av-progress-bar { flex: 1 1 auto; }
        .av-genre-count { flex: 0 0 auto; color: #64748b; }
        .av-maker-chips { display: flex; flex-wrap: wrap; gap: 8px; }
        .av-maker-chip { padding: 6px 12px; border-radius: 999px; font-size: 12px; background: rgba(56, 189, 248, .12); border: 1px solid rgba(56, 189, 248, .28); color: #bae6fd; }
        .av-empty { text-align: center; padding: 80px 20px; }
        .av-empty-icon { display: inline-flex; padding: 14px; border-radius: 50%; background: rgba(148, 163, 184, .12); color: #94a3b8; }
        .av-empty-icon svg { width: 30px; height: 30px; }
        .av-empty h2 { font-size: 18px; margin: 16px 0 8px; }
        .av-empty p { font-size: 12px; color: #64748b; max-width: 460px; margin: 0 auto; line-height: 1.7; }
        .av-mini-empty { font-size: 12px; color: #64748b; padding: 10px 0; }
    `);
    const WATCHED_KEY = 'watchedList';
    const MAX_WATCHED = 5000;
    const ANALYTICS_KEY = 'analyticsRecords_v1';
    const MAX_RECORDS = 3000;
    const MAX_RECORDS_SLACK = 200;
    const ANALYTICS_SAVE_INTERVAL = 25000;
    const CARD_SELECTOR = '.video-img-box, .thumbnail, .video-item, .list-item, .video-list-item, article.video-card, .grid > div, .row > div[class*="col-"], .video-list > div';
    const CARD_INNER_SELECTOR = '.thumbnail, .video-img-box, .video-item, .list-item, .video-list-item, article.video-card';
    const CARD_CHROME_SELECTOR = 'header, nav, footer, .site-header, .app-nav, .site-footer, .pagination, .breadcrumb, .custom-ui-layer, .av-analytics-page';
    const DURATION_OPTIONS = [[0, '全部时长'], [300, '≥ 5 分钟'], [600, '≥ 10 分钟'], [1200, '≥ 20 分钟'], [1800, '≥ 30 分钟'], [3600, '≥ 60 分钟']];
    let watchedCache = null;
    function watchedSet() {
        if (watchedCache) return watchedCache;
        let list = [];
        try {
            list = JSON.parse(store.get(WATCHED_KEY) || '[]');
        } catch (error) {
            list = [];
        }
        watchedCache = new Set(Array.isArray(list) ? list.map(item => String(item).toUpperCase()) : []);
        return watchedCache;
    }
    function isWatched(code) {
        if (!code) return false;
        return watchedSet().has(normalizeVideoCode(code).toUpperCase());
    }
    function markWatched(code) {
        const key = normalizeVideoCode(code).toUpperCase();
        if (!key) return;
        const set = watchedSet();
        if (set.has(key)) return;
        set.add(key);
        const values = [...set];
        while (values.length > MAX_WATCHED) values.shift();
        watchedCache = new Set(values);
        store.set(WATCHED_KEY, JSON.stringify(values));
        state.watchGen += 1;
    }
    function clearWatched() {
        watchedCache = new Set();
        store.set(WATCHED_KEY, '[]');
        state.watchGen += 1;
    }
    function parseDurationSeconds(text) {
        const clean = String(text || '').replace(/[^\d:]/g, '').trim();
        if (!clean) return 0;
        const parts = clean.split(':').map(Number);
        if (parts.some(Number.isNaN)) return 0;
        if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
        if (parts.length === 2) return parts[0] * 60 + parts[1];
        return 0;
    }
    function formatDuration(seconds) {
        const total = Math.max(0, Math.round(Number(seconds) || 0));
        const hours = Math.floor(total / 3600);
        const minutes = Math.floor((total % 3600) / 60);
        if (hours > 0) return `${hours} 小时 ${minutes} 分`;
        if (minutes > 0) return `${minutes} 分 ${total % 60} 秒`;
        return `${total} 秒`;
    }
    function cardCodeFromHref(href) {
        if (!href) return '';
        try {
            const url = new URL(href, location.href);
            if (url.origin !== location.origin) return '';
            const segments = url.pathname.split('/').filter(Boolean);
            if (!segments.length) return '';
            if (IS_JABLE) {
                const at = segments.indexOf('videos');
                if (at < 0 || !segments[at + 1]) return '';
                return normalizeVideoCode(decodeURIComponent(segments[at + 1]));
            }
            if (segments[0] === 'videos' && segments[1]) return normalizeVideoCode(decodeURIComponent(segments[1]));
            if (/^(en|cn|ja|zh|dm\d*)$/i.test(segments[0])) segments.shift();
            const last = segments[segments.length - 1];
            if (!last) return '';
            const code = normalizeVideoCode(decodeURIComponent(last));
            if (/^fc2/i.test(code)) return code;
            if (/^[a-z0-9]+-[a-z0-9]+/i.test(code)) return code;
            return '';
        } catch (error) {
            return '';
        }
    }
    const cardParseCache = new WeakMap();
    function parseCard(card) {
        if (!(card instanceof HTMLElement)) return null;
        const firstHref = card.querySelector('a[href]')?.getAttribute('href') || '';
        const signature = `${card.childElementCount}:${card.textContent.length}:${firstHref}`;
        const cached = cardParseCache.get(card);
        if (cached && cached.signature === signature) {
            if (!cached.code) return null;
            return { el: card, code: cached.code, title: cached.title, duration: cached.duration, isWatched: isWatched(cached.code) };
        }
        if (card.querySelectorAll(CARD_INNER_SELECTOR).length > 2) {
            cardParseCache.set(card, { signature, code: '', title: '', duration: 0 });
            return null;
        }
        let code = '';
        for (const anchor of card.querySelectorAll('a[href]')) {
            code = cardCodeFromHref(anchor.getAttribute('href'));
            if (code) break;
        }
        if (!code) code = normalizeVideoCode(card.dataset ? card.dataset.code || '' : '');
        let title = '';
        const titleEl = card.querySelector('a.mv-full-title, .my-2.text-sm a, .video-title, .title, h3, h4, a[title]');
        if (titleEl) title = (titleEl.getAttribute('title') || titleEl.textContent || '').trim();
        if (!title) {
            const img = card.querySelector('img[alt]');
            if (img) title = (img.getAttribute('alt') || '').trim();
        }
        if (!code && title) {
            const matched = title.match(/^([A-Za-z0-9]+-[A-Za-z0-9_-]+)/);
            if (matched) code = normalizeVideoCode(matched[1]);
        }
        if (!code) {
            cardParseCache.set(card, { signature, code: '', title: '', duration: 0 });
            return null;
        }
        let duration = 0;
        const durationEl = card.querySelector('span.absolute.bottom-1.right-1, .duration, .time, .video-duration');
        if (durationEl) duration = parseDurationSeconds(durationEl.textContent);
        if (!duration) {
            for (const span of card.querySelectorAll('span')) {
                const text = (span.textContent || '').trim();
                if (/^\d{1,2}:\d{2}(?::\d{2})?$/.test(text)) {
                    duration = parseDurationSeconds(text);
                    break;
                }
            }
        }
        cardParseCache.set(card, { signature, code, title, duration });
        return { el: card, code, title, duration, isWatched: isWatched(code) };
    }
    const shellCache = new WeakMap();
    function cardShell(card) {
        if (!card.closest) return card;
        const cached = shellCache.get(card);
        if (cached && cached.gen === state.domGen) return cached.shell;
        let shell = card;
        const found = card.closest('.col-6, .col-sm-4, .col-lg-3, .col-lg-4, [class*="col-"]');
        if (found && found !== card) {
            shell = found;
            for (const other of found.querySelectorAll(CARD_SELECTOR)) {
                if (other === card || other.contains(card) || card.contains(other)) continue;
                shell = card;
                break;
            }
        }
        shellCache.set(card, { gen: state.domGen, shell });
        return shell;
    }
    const cardListCache = { gen: -1, watchGen: -1, list: [] };
    function collectCards() {
        if (cardListCache.gen === state.domGen && cardListCache.watchGen === state.watchGen) return cardListCache.list;
        const byCode = new Map();
        for (const card of document.querySelectorAll(CARD_SELECTOR)) {
            if (card.closest(CARD_CHROME_SELECTOR)) continue;
            const meta = parseCard(card);
            if (!meta) continue;
            const existing = byCode.get(meta.code);
            if (existing && existing.el.contains(meta.el)) continue;
            if (existing && meta.el.contains(existing.el)) {
                byCode.set(meta.code, meta);
                continue;
            }
            if (existing) continue;
            byCode.set(meta.code, meta);
        }
        const list = [...byCode.values()];
        cardListCache.gen = state.domGen;
        cardListCache.watchGen = state.watchGen;
        cardListCache.list = list;
        return list;
    }
    const blacklistCache = { keywords: null, keywordList: [], prefixes: null, prefixList: [] };
    function blacklistLists() {
        const rawKeywords = String(settings.filterKeywords || '');
        if (blacklistCache.keywords !== rawKeywords) {
            blacklistCache.keywords = rawKeywords;
            blacklistCache.keywordList = rawKeywords.split(/[,，\n]/).map(item => item.trim().toLowerCase()).filter(Boolean);
        }
        const rawPrefixes = String(settings.filterPrefixes || '');
        if (blacklistCache.prefixes !== rawPrefixes) {
            blacklistCache.prefixes = rawPrefixes;
            blacklistCache.prefixList = rawPrefixes.split(/[,，\n]/).map(item => item.trim().toUpperCase()).filter(Boolean);
        }
        return blacklistCache;
    }
    function matchesBlacklist(meta) {
        const { keywordList, prefixList } = blacklistLists();
        if (keywordList.length && meta.title) {
            const title = meta.title.toLowerCase();
            for (const keyword of keywordList) {
                if (title.includes(keyword)) return true;
            }
        }
        if (prefixList.length) {
            const code = meta.code.toUpperCase();
            for (const prefix of prefixList) {
                if (code.startsWith(prefix) || code.includes(prefix)) return true;
            }
        }
        return false;
    }
    function evaluateCard(meta) {
        if (!settings.filterEnabled) return false;
        if (settings.filterMinDuration > 0 && meta.duration > 0 && meta.duration < settings.filterMinDuration) return true;
        if (settings.filterHideWatched && meta.isWatched) return true;
        if (settings.filterEnableBlacklist && matchesBlacklist(meta)) return true;
        return false;
    }
    function applyFilters() {
        const cards = collectCards();
        const dim = Boolean(settings.filterDimMode);
        let filtered = 0;
        for (const meta of cards) {
            const el = cardShell(meta.el);
            const hit = evaluateCard(meta);
            const wantHidden = hit && !dim;
            const wantDimmed = hit && dim;
            if (hit) filtered++;
            if (el.classList.contains('av-card-hidden') !== wantHidden) el.classList.toggle('av-card-hidden', wantHidden);
            if (el.classList.contains('av-card-dimmed') !== wantDimmed) el.classList.toggle('av-card-dimmed', wantDimmed);
        }
        state.filterStats = { total: cards.length, filtered, visible: cards.length - filtered };
        syncFilterBar();
        updateFilterBarStats();
        return state.filterStats;
    }
    function refreshFilters() {
        if (state.filterTimer) return;
        state.filterTimer = setTimeout(() => {
            state.filterTimer = 0;
            applyFilters();
        }, 40);
    }
    function filterBarParts() {
        const bar = state.filterBar;
        if (!bar) return null;
        const cached = state.filterBarParts;
        if (cached && cached.bar === bar) return cached;
        const parts = {
            bar,
            count: bar.querySelector('.av-fb-count'),
            stat: bar.querySelector('.av-fb-stat'),
            toggle: bar.querySelector('.av-fb-toggle'),
            watched: bar.querySelector('.av-fb-watched'),
            blacklist: bar.querySelector('.av-fb-blacklist'),
            fab: bar.querySelector('.av-fb-fab'),
            select: bar.querySelector('.av-fb-select'),
            selectLabel: bar.querySelector('.av-fb-select-label'),
            selectWrap: bar.querySelector('.av-fb-select-wrap')
        };
        state.filterBarParts = parts;
        return parts;
    }
    function updateFilterBarStats() {
        const parts = filterBarParts();
        if (!parts) return;
        const value = String(state.filterStats.filtered);
        if (parts.count && parts.count.textContent !== value) parts.count.textContent = value;
        if (parts.stat) {
            const hidden = !(settings.filterEnabled && state.filterStats.filtered > 0);
            if (parts.stat.hidden !== hidden) parts.stat.hidden = hidden;
        }
        const toggle = parts.toggle;
        if (toggle) {
            const label = settings.filterEnabled ? '过滤: 开' : '过滤: 关';
            const last = toggle.lastChild;
            if (last && last.nodeType === 3 && last.nodeValue !== label) last.nodeValue = label;
            toggle.classList.toggle('is-on', settings.filterEnabled);
            toggle.title = settings.filterEnabled ? '过滤已开启，点击可快速暂停过滤' : '过滤已暂停，点击开启';
            toggle.disabled = state.filterStats.total === 0;
        }
        const watched = parts.watched;
        if (watched) {
            watched.classList.toggle('is-on', settings.filterEnabled && settings.filterHideWatched);
            watched.disabled = !settings.filterEnabled;
        }
        const blacklist = parts.blacklist;
        if (blacklist) {
            blacklist.classList.toggle('is-on', settings.filterEnabled && settings.filterEnableBlacklist);
            blacklist.disabled = !settings.filterEnabled;
            if (parts.fab) {
                const hidden = !(settings.filterKeywords.trim() || settings.filterPrefixes.trim());
                if (parts.fab.hidden !== hidden) parts.fab.hidden = hidden;
            }
        }
        const select = parts.select;
        if (select) {
            if (String(select.value) !== String(settings.filterMinDuration)) select.value = String(settings.filterMinDuration);
            select.disabled = !settings.filterEnabled;
            const label = parts.selectLabel;
            if (label) {
                const current = DURATION_OPTIONS.find(item => Number(item[0]) === Number(settings.filterMinDuration));
                const text = current ? current[1] : '全部时长';
                if (label.textContent !== text) label.textContent = text;
            }
            if (parts.selectWrap) parts.selectWrap.classList.toggle('is-on', settings.filterEnabled && settings.filterMinDuration > 0);
        }
    }
    const FILTER_HEADER_SELECTOR = '.title-with-more, .title-with-avatar, .content-header, .flex.items-center.justify-between, .flex.justify-between, .d-flex.justify-content-between, .section-header, .section-title, .page-header, .list-header, .video-list-header';
    const FILTER_ROW_SKIP = 'header, footer, .site-header, .app-nav, .site-footer, .custom-ui-layer, .av-analytics-page';
    const SECTION_TITLE_SELECTOR = '.title-with-more, .title-with-avatar, .content-header, .section-title, .section-header, .list-header, .video-list-header, .page-header';
    function filterInlineRow() {
        for (const row of document.querySelectorAll('nav.profile-nav, .profile-nav')) {
            if (row.closest && row.closest(FILTER_ROW_SKIP)) continue;
            return row;
        }
        return null;
    }
    function clearInlineRow() {
        for (const row of document.querySelectorAll('.av-filter-inline-row')) row.classList.remove('av-filter-inline-row');
    }
    function sectionHeaders() {
        const found = [];
        for (const header of document.querySelectorAll(FILTER_HEADER_SELECTOR)) {
            if (header.closest && header.closest(FILTER_ROW_SKIP)) continue;
            let nested = false;
            for (const outer of found) {
                if (outer.contains(header)) {
                    nested = true;
                    break;
                }
            }
            if (nested) continue;
            const scope = header.parentElement;
            if (!scope || !scope.querySelector || !scope.querySelector(CARD_SELECTOR)) continue;
            found.push(header);
        }
        return found;
    }
    const HOST_ANCHOR_SELECTOR = 'a, button';
    function takeFilterHost() {
        let host = state.filterHost;
        if (host && !host.isConnected) host = state.filterHost = null;
        if (host) return host;
        const existing = document.querySelector('.av-filter-host');
        if (existing && existing.querySelector('.av-filter-bar')) return existing;
        const fresh = document.createElement('div');
        fresh.className = 'av-filter-host';
        if (existing && existing.parentElement) {
            existing.parentElement.insertBefore(fresh, existing.nextSibling);
        } else if (existing) {
            const anchor = existing.querySelector(HOST_ANCHOR_SELECTOR);
            if (anchor && anchor.parentElement) anchor.parentElement.insertBefore(fresh, anchor.nextSibling);
        }
        return fresh;
    }
    const firstCardCache = { gen: -1, card: null };
    function firstUsableCard() {
        if (firstCardCache.gen === state.domGen) return firstCardCache.card;
        let found = null;
        let seen = 0;
        for (const card of document.querySelectorAll(CARD_SELECTOR)) {
            seen++;
            if (seen > 400) break;
            if (card.closest(CARD_CHROME_SELECTOR)) continue;
            if (card.closest && card.closest('.owl-carousel, .owl-stage, .jable-carousel, .owl-stage-outer')) continue;
            found = card;
            break;
        }
        firstCardCache.gen = state.domGen;
        firstCardCache.card = found;
        return found;
    }
    function prepareFilterHost() {
        if (state.video && state.video.isConnected) return null;
        if (findMainVideo()) return null;
        const firstCard = firstUsableCard();
        if (!firstCard) return null;
        const tabRow = filterInlineRow();
        if (tabRow) {
            const inline = takeFilterHost();
            inline.classList.add('av-filter-inline');
            tabRow.classList.add('av-filter-inline-row');
            const rightAnchor = tabRow.querySelector('a.right, .right');
            if (rightAnchor && rightAnchor.parentElement === tabRow) tabRow.insertBefore(inline, rightAnchor);
            else tabRow.appendChild(inline);
            state.filterHost = inline;
            return inline;
        }
        const sections = sectionHeaders();
        if (sections.length > 1) {
            const target = sections[0];
            let slot = target.tagName === 'SECTION' ? null : target;
            if (!slot) {
                for (const child of target.children) {
                    if (child.tagName === 'DIV' && !child.classList.contains('av-filter-host')) {
                        slot = child;
                        break;
                    }
                }
            }
            if (!slot) slot = target;
            const host = takeFilterHost();
            host.classList.remove('av-filter-inline');
            clearInlineRow();
            if (host.parentElement !== slot) {
                const moreAnchor = slot === target && slot.matches && slot.matches(SECTION_TITLE_SELECTOR) ? slot.querySelector('.more, .title-more, .view-more') : null;
                if (moreAnchor && moreAnchor.parentElement === slot) slot.insertBefore(host, moreAnchor);
                else slot.appendChild(host);
            }
            state.filterHost = host;
            return host;
        }
        let grid = null;
        for (const selector of ['.grid', '.video-list', '[id^="list_videos_"]', '.row.gutter-20', '.row']) {
            const found = firstCard.closest ? firstCard.closest(selector) : null;
            if (found) {
                grid = found;
                break;
            }
        }
        if (!grid) grid = firstCard.parentElement;
        if (!grid) return null;
        let sectionHeader = null;
        let prev = grid.previousElementSibling;
        while (prev) {
            if (prev.matches && prev.matches(FILTER_HEADER_SELECTOR)) {
                sectionHeader = prev;
                break;
            }
            const child = prev.querySelector ? prev.querySelector(FILTER_HEADER_SELECTOR) : null;
            if (child) {
                sectionHeader = child;
                break;
            }
            prev = prev.previousElementSibling;
        }
        if (!sectionHeader) {
            const parent = grid.parentElement;
            const parentPrev = parent ? parent.previousElementSibling : null;
            if (parentPrev) {
                if (parentPrev.matches && parentPrev.matches(FILTER_HEADER_SELECTOR)) sectionHeader = parentPrev;
                else sectionHeader = parentPrev.querySelector ? parentPrev.querySelector(FILTER_HEADER_SELECTOR) : null;
            }
            if (!sectionHeader && parent && parent.querySelector) sectionHeader = parent.querySelector(FILTER_HEADER_SELECTOR);
        }
        const host = takeFilterHost();
        if (sectionHeader) {
            let slot = null;
            for (const child of sectionHeader.children) {
                if (child.classList && child.classList.contains('av-filter-host')) continue;
                if (child.classList && (child.classList.contains('flex-1') || child.classList.contains('av-filter-injected-header'))) continue;
                if (child.tagName === 'DIV') {
                    slot = child;
                    break;
                }
            }
            if (!slot) {
                slot = document.createElement('div');
                slot.className = 'av-filter-slot';
                sectionHeader.appendChild(slot);
            }
            host.classList.remove('av-filter-inline');
            clearInlineRow();
            if (host.parentElement !== slot) slot.appendChild(host);
        } else {
            const holder = grid.parentElement || document.body;
            let fallback = holder.querySelector ? holder.querySelector('.av-filter-injected-header') : null;
            if (!fallback) {
                fallback = document.createElement('div');
                fallback.className = 'av-filter-injected-header';
                if (holder === document.body) holder.insertBefore(fallback, holder.firstChild);
                else holder.insertBefore(fallback, grid);
            }
            host.classList.remove('av-filter-inline');
            clearInlineRow();
            if (host.parentElement !== fallback) fallback.appendChild(host);
        }
        state.filterHost = host;
        return host;
    }
    function fbFab() {
        const wrap = document.createElement('span');
        wrap.className = 'av-fb-fab';
        return wrap;
    }
    function makeFilterBar() {
        if (state.filterBar && state.filterBar.isConnected) return state.filterBar;
        const host = prepareFilterHost();
        if (!host) return null;
        state.filterBar = null;
        const bar = document.createElement('div');
        bar.className = 'av-filter-bar';
        bar.setAttribute('role', 'toolbar');
        bar.setAttribute('aria-label', '视频内容筛选');
        const toggle = createButton('', 'av-fb-chip av-fb-toggle');
        toggle.append(iconSvg('<path d="M13 2 4 14h7l-2 8 11-12h-7l2-8z"/>'), document.createTextNode('过滤: 开'));
        toggle.title = '过滤已开启，点击可快速暂停过滤';
        toggle.addEventListener('click', () => {
            settings.filterEnabled = !settings.filterEnabled;
            store.set('filterEnabled', settings.filterEnabled);
            syncFilterPanel();
            updateFilterBarStats();
            refreshFilters();
        });
        const selectWrap = document.createElement('div');
        selectWrap.className = 'av-fb-chip av-fb-select-wrap';
        const selectIcon = iconSvg('<circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 2.5M10 2h4M12 2v3"/>');
        const selectLabel = document.createElement('span');
        selectLabel.className = 'av-fb-select-label';
        const select = document.createElement('select');
        select.className = 'av-fb-select';
        select.setAttribute('aria-label', '按时长过滤');
        for (const [value, label] of DURATION_OPTIONS) {
            const option = document.createElement('option');
            option.value = String(value);
            option.textContent = label;
            select.appendChild(option);
        }
        select.value = String(settings.filterMinDuration);
        select.addEventListener('change', () => {
            settings.filterMinDuration = Number(select.value) || 0;
            store.set('filterMinDuration', settings.filterMinDuration);
            updateFilterBarStats();
            refreshFilters();
        });
        selectWrap.append(selectIcon, selectLabel, select, iconSvg('<path d="m1 1 3 3 3-3"/>', '0 0 8 5'));
        selectWrap.lastChild.classList.add('av-fb-arrow');
        const watched = createButton('', 'av-fb-chip av-fb-watched');
        watched.append(iconSvg('<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/>'), document.createTextNode('隐藏已看'));
        watched.addEventListener('click', () => {
            settings.filterHideWatched = !settings.filterHideWatched;
            store.set('filterHideWatched', settings.filterHideWatched);
            syncFilterPanel();
            updateFilterBarStats();
            refreshFilters();
        });
        const blacklist = createButton('', 'av-fb-chip av-fb-blacklist');
        blacklist.append(iconSvg('<circle cx="12" cy="12" r="9"/><path d="M5.6 5.6l12.8 12.8"/>'), document.createTextNode('黑名单'));
        blacklist.appendChild(fbFab());
        blacklist.title = '已配置黑名单规则';
        blacklist.addEventListener('click', () => {
            settings.filterEnableBlacklist = !settings.filterEnableBlacklist;
            store.set('filterEnableBlacklist', settings.filterEnableBlacklist);
            syncFilterPanel();
            updateFilterBarStats();
            refreshFilters();
        });
        const stats = document.createElement('span');
        stats.className = 'av-fb-chip av-fb-stat';
        const statsNum = document.createElement('span');
        statsNum.className = 'av-fb-count';
        const statsLabel = document.createElement('span');
        statsLabel.className = 'av-fb-stat-label';
        statsLabel.textContent = '已过滤';
        stats.title = '当前已过滤视频数';
        stats.append(statsNum, statsLabel);
        const cockpit = document.createElement('a');
        cockpit.className = 'av-fb-chip av-fb-cockpit';
        cockpit.href = analyticsUrl();
        cockpit.target = '_blank';
        cockpit.rel = 'noopener noreferrer';
        cockpit.title = '在新标签页打开观影行为数据大屏';
        cockpit.setAttribute('aria-label', '数据大屏');
        cockpit.append(iconSvg('<path d="M3 3v18h18"/><path d="M7 16l4-4 4 4 5-6"/>'), document.createTextNode('数据大屏'));
        const hide = createButton('✕', 'av-fb-chip av-fb-hide');
        hide.title = '隐藏过滤条';
        hide.addEventListener('click', () => {
            settings.filterBarVisible = false;
            store.set('filterBarVisible', false);
            syncFilterBar();
            syncFilterPanel();
            log('🛡 过滤条已隐藏，可在面板「内容过滤与屏蔽」中重新显示');
        });
        bar.append(toggle, selectWrap, watched, blacklist, stats, cockpit, hide);
        host.appendChild(bar);
        state.filterBar = bar;
        updateFilterBarStats();
        return bar;
    }
    function syncFilterBar() {
        if (settings.filterBarVisible && state.filterBar && state.filterBar.isConnected && state.filterBarGen === state.domGen) return;
        const host = state.filterHost && state.filterHost.isConnected ? state.filterHost : document.querySelector('.av-filter-host');
        if (!settings.filterBarVisible || (state.video && state.video.isConnected) || findMainVideo() || !firstUsableCard()) {
            state.filterBar?.remove();
            state.filterBar = null;
            if (host && host.classList && host.classList.contains('av-filter-host')) host.remove();
            state.filterHost = null;
            clearInlineRow();
            return;
        }
        const bar = makeFilterBar();
        if (!bar) return;
        state.filterBarGen = state.domGen;
        updateFilterBarStats();
        syncFilterPanel();
    }
    const FILTER_SETTING_KEYS = ['filterDimMode', 'filterHideWatched', 'filterEnableBlacklist'];
    function createCheckRow(labelText, key, onChange, helpText) {
        const row = document.createElement('label');
        row.className = 'av-check-row';
        const input = document.createElement('input');
        input.type = 'checkbox';
        input.role = 'switch';
        input.checked = !!settings[key];
        state.filterChecks[key] = input;
        const span = document.createElement('span');
        const text = document.createElement('span');
        text.textContent = labelText;
        span.appendChild(text);
        if (helpText) {
            const help = document.createElement('small');
            help.className = 'av-help';
            help.textContent = helpText;
            span.appendChild(help);
        }
        const sync = () => {
            const on = input.checked;
            if (row.classList.contains('is-on') !== on) row.classList.toggle('is-on', on);
        };
        state.filterCheckSync[key] = sync;
        sync();
        input.addEventListener('change', () => {
            settings[key] = input.checked;
            store.set(key, input.checked);
            sync();
            if (onChange) onChange(input.checked);
        });
        row.addEventListener('change', () => syncFilterPanel(key));
        row.append(span, input);
        return row;
    }
    function syncFilterPanel(changedKey) {
        if (changedKey && FILTER_SETTING_KEYS.includes(changedKey)) refreshFilters();
        for (const key of Object.keys(state.filterChecks)) {
            const box = state.filterChecks[key];
            const want = !!settings[key];
            if (box.checked !== want) box.checked = want;
            const sync = state.filterCheckSync[key];
            if (sync) sync();
        }
        if (state.filterPanel) {
            const hasBlacklist = Boolean(settings.filterKeywords.trim() || settings.filterPrefixes.trim());
            if (state.filterPanel.classList.contains('av-has-blacklist') !== hasBlacklist) state.filterPanel.classList.toggle('av-has-blacklist', hasBlacklist);
        }
        if (state.filterDepends) {
            const hide = !settings.filterEnabled;
            for (const row of state.filterDepends) {
                if (row.hidden !== hide) row.hidden = hide;
            }
        }
    }
    function createTextRow(labelText, key, placeholder, helpText, rows) {
        const row = document.createElement('div');
        row.className = 'av-text-row';
        const label = document.createElement('label');
        label.textContent = labelText;
        const input = document.createElement('textarea');
        input.rows = rows || 3;
        input.spellcheck = false;
        input.placeholder = placeholder;
        input.value = settings[key] || '';
        input.addEventListener('change', () => {
            settings[key] = input.value;
            store.set(key, input.value);
            updateFilterBarStats();
            syncFilterPanel();
            refreshFilters();
        });
        row.append(label, input);
        if (helpText) {
            const help = document.createElement('small');
            help.className = 'av-help';
            help.textContent = helpText;
            row.appendChild(help);
        }
        return row;
    }
    function buildFilterPanel() {
        const wrap = document.createElement('div');
        wrap.className = 'av-filter-panel';
        wrap.hidden = !settings.filterPanelOpen;
        state.filterPanel = wrap;
        const strip = document.createElement('div');
        strip.className = 'av-filter-strip';
        const rowEnabled = createCheckRow('总开关', 'filterEnabled', () => {
            syncFilterBar();
            refreshFilters();
            syncFilterPanel();
        }, '关闭后所有过滤与屏蔽立即失效');
        const rowDim = createCheckRow('弱化显示模式', 'filterDimMode', undefined, '半透明+灰度，替代彻底隐藏');
        const rowHideWatched = createCheckRow('隐藏已看过的视频', 'filterHideWatched', undefined);
        const rowTrack = createCheckRow('自动记录已看视频', 'filterTrackWatched', undefined, '点击打开或播放时自动加入已看库');
        const rowBlacklist = createCheckRow('启用黑名单屏蔽', 'filterEnableBlacklist', undefined);
        strip.append(
            rowEnabled,
            rowDim,
            rowHideWatched,
            rowTrack,
            rowBlacklist,
            createCheckRow('显示过滤条', 'filterBarVisible', syncFilterBar, '在列表页标题栏内显示快捷过滤条'),
            createCheckRow('行为统计', 'analyticsTrack', enabled => {
                if (enabled) startAnalyticsTracking();
                else stopAnalyticsTracking();
            }, '记录播放时长，供数据大屏统计')
        );
        const textSlide = document.createElement('div');
        textSlide.className = 'av-filter-text-slide';
        const textKeywords = createTextRow('标题关键词黑名单', 'filterKeywords', '例如：VR, 熟女, 动画, 3D（逗号或换行分隔）', '标题中包含任意关键词的视频将被过滤', 2);
        const textPrefixes = createTextRow('番号前缀黑名单', 'filterPrefixes', '例如：FC2, SIRO, LUXU（逗号或换行分隔）', '以这些前缀开头的番号将被过滤', 2);
        textSlide.append(textKeywords, textPrefixes);
        const durationRow = document.createElement('div');
        durationRow.className = 'av-text-row';
        const durationLabel = document.createElement('label');
        durationLabel.textContent = `最短时长过滤：${settings.filterMinDuration ? `${Math.round(settings.filterMinDuration / 60)} 分钟` : '关闭'}`;
        const durationInput = document.createElement('input');
        durationInput.type = 'range';
        durationInput.min = '0';
        durationInput.max = '3600';
        durationInput.step = '60';
        durationInput.value = String(settings.filterMinDuration);
        durationInput.addEventListener('input', () => {
            settings.filterMinDuration = Number(durationInput.value) || 0;
            durationLabel.textContent = `最短时长过滤：${settings.filterMinDuration ? `${Math.round(settings.filterMinDuration / 60)} 分钟` : '关闭'}`;
            store.set('filterMinDuration', settings.filterMinDuration);
            updateFilterBarStats();
            refreshFilters();
        });
        durationRow.append(durationLabel, durationInput);
        const actions = document.createElement('div');
        actions.className = 'av-filter-actions';
        const openCockpit = document.createElement('a');
        openCockpit.className = 'av-open-cockpit';
        openCockpit.href = analyticsUrl();
        openCockpit.target = '_blank';
        openCockpit.rel = 'noopener noreferrer';
        openCockpit.textContent = '📊 数据大屏';
        openCockpit.title = '在新标签页打开观影行为数据大屏';
        openCockpit.addEventListener('click', () => {
            openCockpit.href = analyticsUrl();
        });
        const clearLib = createButton('🗑 清空已看库', 'btn-danger');
        clearLib.addEventListener('click', () => {
            clearWatched();
            log('🗑 已看库已清空');
            refreshFilters();
        });
        const rescan = createButton('🔄 立即重新过滤', 'btn-ghost');
        rescan.addEventListener('click', () => {
            applyFilters();
            log(`🛡 过滤完成：共 ${state.filterStats.total} 个条目，屏蔽 ${state.filterStats.filtered} 个`);
        });
        actions.append(openCockpit, clearLib, rescan);
        state.filterDepends = [rowDim, rowHideWatched, rowTrack, rowBlacklist, textKeywords, textPrefixes, durationRow];
        const scroll = document.createElement('div');
        scroll.className = 'av-filter-scroll';
        scroll.append(strip, textSlide, durationRow);
        wrap.append(scroll, actions);
        syncFilterPanel();
        return wrap;
    }
    const CARD_NOISE_TAGS = new Set(['IMG', 'SOURCE', 'PICTURE', 'SCRIPT', 'STYLE', 'LINK', 'IFRAME', 'INS', 'BR', 'HR']);
    function mutationIsNoise(mutation) {
        if (mutation.type !== 'childList') return false;
        for (const list of [mutation.addedNodes, mutation.removedNodes]) {
            for (const node of list) {
                if (node.nodeType !== 1) return false;
                if (!CARD_NOISE_TAGS.has(node.tagName)) return false;
            }
        }
        return true;
    }
    function initContentFilter() {
        if (state.filterObserver) return;
        syncFilterBar();
        if (settings.analyticsTrack) startAnalyticsTracking();
        if (settings.filterTrackWatched) {
            document.addEventListener('click', event => {
                if (!settings.filterTrackWatched) return;
                const anchor = event.target && event.target.closest ? event.target.closest('a[href]') : null;
                if (!anchor || anchor.closest('.custom-ui-layer')) return;
                const code = cardCodeFromHref(anchor.getAttribute('href'));
                if (code) markWatched(code);
            }, true);
        }
        refreshFilters();
        const observer = new MutationObserver(mutations => {
            for (const mutation of mutations) {
                const node = mutation.target;
                if (mutationIsNoise(mutation)) continue;
                if (node && node.closest && node.closest('.custom-ui-layer, .av-filter-bar, .av-filter-host, .custom-control-panel, .custom-quick-controls')) continue;
                state.domGen += 1;
                refreshFilters();
                return;
            }
        });
        observer.observe(document.body, { childList: true, subtree: true });
        state.filterObserver = observer;
    }
    function analyticsRecords() {
        if (state.analyticsRecords) return state.analyticsRecords;
        let list = [];
        try {
            list = JSON.parse(store.get(ANALYTICS_KEY) || '[]');
        } catch (error) {
            list = [];
        }
        state.analyticsRecords = Array.isArray(list) ? list : [];
        return state.analyticsRecords;
    }
    function saveAnalyticsRecords() {
        const list = analyticsRecords();
        if (list.length > MAX_RECORDS + MAX_RECORDS_SLACK) {
            list.sort((a, b) => (b.watchedAt || 0) - (a.watchedAt || 0));
            list.length = MAX_RECORDS;
        }
        state.analyticsSavedAt = Date.now();
        state.analyticsSavePending = false;
        store.set(ANALYTICS_KEY, JSON.stringify(list));
    }
    function persistAnalyticsRecords(force) {
        if (!state.analyticsRecords && !state.analyticsSavePending) return;
        if (!force && state.analyticsSavedAt && Date.now() - state.analyticsSavedAt < ANALYTICS_SAVE_INTERVAL) {
            state.analyticsSavePending = true;
            return;
        }
        saveAnalyticsRecords();
    }
    const META_SKIP_SELECTOR = 'nav, header, footer, .app-nav, .navbar, .site-header, .site-nav, .dropdown-menu, .pagination, .breadcrumb, .modal, .custom-ui-layer, .custom-control-panel, .av-analytics-page';
    const META_ACTRESS_SELECTOR = 'a[href*="/actresses/"], a[href*="/actress/"], a[href*="/models/"], a[href*="/model/"], a[href*="/actors/"], a[href*="/stars/"], .models [data-original-title], .placeholder[data-original-title]';
    const META_GENRE_SELECTOR = 'a[href*="/genres/"], a[href*="/genre/"], a[href*="/tags/"], a[href*="/categories/"], a[href*="/category/"], a[href*="/themes/"]';
    const META_MAKER_SELECTOR = 'a[href*="/makers/"], a[href*="/maker/"], a[href*="/labels/"], a[href*="/label/"], a[href*="/studios/"], a[href*="/studio/"]';
    const META_BLOCKED_SLUGS = new Set(['actresses', 'actress', 'models', 'model', 'actors', 'stars', 'makers', 'maker', 'labels', 'label', 'genres', 'genre', 'tags', 'categories', 'ranking', 'saved', 'collection', 'list', 'search', 'videos']);
    function metaRoot() {
        for (const selector of ['.video-info', '.video-detail']) {
            for (const element of document.querySelectorAll(selector)) {
                if (element.closest(META_SKIP_SELECTOR)) continue;
                return element;
            }
        }
        return null;
    }
    function metaSkipped(anchor, root) {
        const scope = root === undefined ? metaRoot() : root;
        if (scope && scope.contains(anchor)) return false;
        return !!anchor.closest(META_SKIP_SELECTOR);
    }
    function metaAnchors(selector, limit) {
        const root = metaRoot();
        const collect = list => {
            const found = [];
            for (const anchor of list) {
                if (metaSkipped(anchor, root)) continue;
                found.push(anchor);
                if (found.length >= limit) break;
            }
            return found;
        };
        if (root) {
            const scoped = collect(root.querySelectorAll(selector));
            if (scoped.length) return scoped;
        }
        return collect(document.querySelectorAll(selector));
    }
    function metaAttr(element, name) {
        if (!element || typeof element.getAttribute !== 'function') return '';
        return (element.getAttribute(name) || '').replace(/\s+/g, ' ').trim();
    }
    function metaUsableText(value) {
        return value.length >= 2 && value.length <= 40 ? value : '';
    }
    function metaText(anchor) {
        const text = metaUsableText((anchor.textContent || '').replace(/\s+/g, ' ').trim());
        if (text) return text;
        for (const name of ['title', 'data-original-title']) {
            const own = metaUsableText(metaAttr(anchor, name));
            if (own) return own;
        }
        for (const name of ['data-original-title', 'title']) {
            for (const node of anchor.querySelectorAll('[' + name + ']')) {
                const value = metaUsableText(metaAttr(node, name));
                if (value) return value;
            }
        }
        const image = anchor.querySelector('img[alt]');
        const alt = image ? metaUsableText(metaAttr(image, 'alt')) : '';
        if (alt) return alt;
        return '';
    }
    function metaHeading() {
        const selectors = ['.video-info .info-header h4', '.video-info h4', '.video-detail .info-header h4', '.video-title', 'h1.text-base', 'h1.text-lg', '.video-detail h1', 'h1', 'h4'];
        for (const selector of selectors) {
            for (const element of document.querySelectorAll(selector)) {
                if (metaSkipped(element)) continue;
                const text = (element.textContent || '').replace(/\s+/g, ' ').trim();
                if (text.length >= 2 && text.length <= 200) return text;
            }
        }
        return '';
    }
    let pageMetaCache = { code: '', gen: -1, meta: null };
    function extractPageMetadata() {
        const code = getPageVideoCode();
        if (pageMetaCache.meta && pageMetaCache.gen === state.domGen && pageMetaCache.code === code) return pageMetaCache.meta;
        const meta = { code, title: '', duration: 0, actresses: [], genres: [], maker: '' };
        meta.title = metaHeading();
        const rows = document.querySelectorAll('.text-secondary, .video-info-row, .info-row, li');
        for (const row of rows) {
            if (metaSkipped(row)) continue;
            const first = row.querySelector('span:first-child');
            const label = first ? (first.textContent || '').trim() : '';
            if (!meta.title && /^(?:Title|標題|标题|タイトル|作品名)\s*[:：]?$/i.test(label)) {
                const value = row.querySelector('.font-medium');
                if (value) meta.title = (value.textContent || '').replace(/\s+/g, ' ').trim();
            }
            if (!meta.maker && /^(?:Maker|メーカー|メーカ|片商|廠商|厂商|制作|製作|スタジオ|Studio|Label|Company)\s*[:：]?$/i.test(label)) {
                const value = row.querySelector('.font-medium, a');
                if (value) meta.maker = (value.textContent || '').replace(/\s+/g, ' ').trim();
            }
        }
        const genres = new Set();
        for (const anchor of metaAnchors(META_GENRE_SELECTOR, 40)) {
            const text = metaText(anchor);
            if (text && !text.includes('http') && !/^(?:ranking|saved|collection|list|search)$/i.test(text)) genres.add(text);
        }
        meta.genres = [...genres];
        const actresses = new Set();
        for (const anchor of metaAnchors(META_ACTRESS_SELECTOR, 30)) {
            const text = metaText(anchor);
            const slug = ((anchor.getAttribute('href') || '').split('/').filter(Boolean).pop() || '').toLowerCase();
            if (text && !META_BLOCKED_SLUGS.has(slug)) actresses.add(text);
        }
        meta.actresses = [...actresses];
        if (!meta.maker) {
            const makerAnchor = metaAnchors(META_MAKER_SELECTOR, 1)[0];
            if (makerAnchor) meta.maker = metaText(makerAnchor);
        }
        const video = state.video;
        if (video && isFinite(video.duration)) meta.duration = Math.round(video.duration);
        if (meta.title || meta.actresses.length || meta.genres.length || meta.maker) {
            pageMetaCache = { code, gen: state.domGen, meta };
        }
        return meta;
    }
    function backfillAnalyticsMetadata(fresh) {
        if (!fresh || !fresh.code) return;
        if (!fresh.actresses.length && !fresh.genres.length && !fresh.maker && !fresh.title) return;
        const list = analyticsRecords();
        let changed = false;
        for (const record of list) {
            if (record.code !== fresh.code) continue;
            if (!(record.actresses || []).length && fresh.actresses.length) {
                record.actresses = fresh.actresses;
                changed = true;
            }
            if (!(record.genres || []).length && fresh.genres.length) {
                record.genres = fresh.genres;
                changed = true;
            }
            if (!record.maker && fresh.maker) {
                record.maker = fresh.maker;
                changed = true;
            }
            if ((!record.title || record.title === record.code) && fresh.title) {
                record.title = fresh.title;
                changed = true;
            }
        }
        if (changed) persistAnalyticsRecords();
    }
    function startAnalyticsTracking() {
        const video = state.video;
        if (!video) return;
        const code = getPageVideoCode();
        if (!code) return;
        if (state.analyticsSession && state.analyticsSession.code === code) return;
        commitAnalyticsSession(true);
        const meta = extractPageMetadata();
        backfillAnalyticsMetadata(meta);
        state.analyticsSession = {
            code,
            title: meta.title || code,
            duration: meta.duration,
            actresses: meta.actresses,
            genres: meta.genres,
            maker: meta.maker,
            watchedSeconds: 0,
            maxProgress: 0,
            watchCount: 1,
            lastTick: Date.now(),
            lastMediaTime: Number(video.currentTime) || 0,
            dirty: false,
            committed: false,
            metaTries: 0
        };
        clearInterval(state.analyticsTimer);
        state.analyticsTimer = setInterval(() => {
            const session = state.analyticsSession;
            if (!session || !state.video) return;
            const now = Date.now();
            const wallDelta = Math.max(0, (now - session.lastTick) / 1000);
            session.lastTick = now;
            const mediaTime = Number(state.video.currentTime) || 0;
            const mediaDelta = mediaTime - session.lastMediaTime;
            session.lastMediaTime = mediaTime;
            if (document.hidden || wallDelta > 120) return;
            if (!state.video.paused && !state.video.seeking && mediaDelta > 0) {
                const jumped = mediaDelta > wallDelta * 8 + 2;
                session.watchedSeconds += jumped ? wallDelta : mediaDelta;
                session.dirty = true;
                let total = Number(state.video.duration);
                let origin = 0;
                if (!Number.isFinite(total) || total <= 0) {
                    const seekable = state.video.seekable;
                    if (seekable && seekable.length) {
                        origin = Number(seekable.start(0)) || 0;
                        total = (Number(seekable.end(seekable.length - 1)) || 0) - origin;
                    }
                }
                if (Number.isFinite(total) && total > 0) {
                    session.duration = Math.round(total);
                    session.maxProgress = Math.max(session.maxProgress, Math.min(1, (mediaTime - origin) / total));
                }
            }
            if (!session.metaTries || ((!session.actresses.length || !session.genres.length) && session.metaTries < 3)) {
                session.metaTries++;
                const fresh = extractPageMetadata();
                if (fresh.title && (!session.title || session.title === session.code)) session.title = fresh.title;
                if (!session.actresses.length && fresh.actresses.length) session.actresses = fresh.actresses;
                if (!session.genres.length && fresh.genres.length) session.genres = fresh.genres;
                if (!session.maker && fresh.maker) session.maker = fresh.maker;
                backfillAnalyticsMetadata(fresh);
            }
            if (session.dirty && session.watchedSeconds >= 30) commitAnalyticsSession();
        }, 2000);
        video.addEventListener('pause', () => commitAnalyticsSession(true), { passive: true });
        video.addEventListener('ended', () => commitAnalyticsSession(true), { passive: true });
    }
    function resyncAnalyticsClock() {
        if (document.hidden) {
            flushAnalyticsRecords();
            return;
        }
        const session = state.analyticsSession;
        if (!session || !state.video) return;
        session.lastTick = Date.now();
        session.lastMediaTime = Number(state.video.currentTime) || 0;
    }
    function flushAnalyticsRecords() {
        commitAnalyticsSession(true);
        if (state.analyticsSavePending) persistAnalyticsRecords(true);
    }
    document.addEventListener('visibilitychange', resyncAnalyticsClock, { passive: true });
    window.addEventListener('pagehide', flushAnalyticsRecords, { passive: true });
    function commitAnalyticsSession(force) {
        const session = state.analyticsSession;
        if (!session || !session.dirty) return;
        const list = analyticsRecords();
        const key = session.code.toUpperCase();
        const now = Date.now();
        const existing = list.find(item => String(item.code).toUpperCase() === key);
        if (existing) {
            existing.watchedSeconds = (existing.watchedSeconds || 0) + session.watchedSeconds;
            existing.watchedAt = now;
            existing.maxProgress = Math.max(existing.maxProgress || 0, session.maxProgress);
            if (!session.committed) existing.watchCount = (existing.watchCount || 1) + 1;
            session.committed = true;
            if (session.duration) existing.duration = session.duration;
            if (session.title && session.title !== session.code) existing.title = session.title;
            if (session.actresses.length) existing.actresses = session.actresses;
            if (session.genres.length) existing.genres = session.genres;
            if (session.maker) existing.maker = session.maker;
        } else {
            list.unshift({
                code: session.code,
                title: session.title,
                duration: session.duration,
                watchedSeconds: session.watchedSeconds,
                watchedAt: now,
                firstWatchedAt: now,
                actresses: session.actresses,
                genres: session.genres,
                maker: session.maker,
                maxProgress: session.maxProgress,
                watchCount: 1
            });
        }
        session.watchedSeconds = 0;
        session.dirty = false;
        persistAnalyticsRecords(force === true);
    }
    function stopAnalyticsTracking() {
        clearInterval(state.analyticsTimer);
        state.analyticsTimer = 0;
        commitAnalyticsSession(true);
        state.analyticsSession = null;
    }
    function aggregateAnalytics(range) {
        const records = analyticsRecords();
        const now = Date.now();
        const floor = range === '7d' ? now - 604800000 : range === '30d' ? now - 2592000000 : 0;
        const result = {
            totalCount: 0,
            totalWatchedSeconds: 0,
            completedCount: 0,
            activeDays: new Set(),
            allActiveDays: new Set(),
            hourlyCount: new Array(24).fill(0),
            hourlySeconds: new Array(24).fill(0),
            actressMap: new Map(),
            genreMap: new Map(),
            makerMap: new Map(),
            bucketUnder5: 0,
            bucket5to15: 0,
            bucket15to30: 0,
            bucketOver30: 0,
            dayMap: new Map(),
            daySecondsMap: new Map()
        };
        for (const record of records) {
            const seconds = record.watchedSeconds || 0;
            const date = new Date(record.watchedAt || now);
            const dayKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
            result.allActiveDays.add(dayKey);
            result.dayMap.set(dayKey, (result.dayMap.get(dayKey) || 0) + 1);
            result.daySecondsMap.set(dayKey, (result.daySecondsMap.get(dayKey) || 0) + seconds);
            if (floor && (record.watchedAt || 0) < floor) continue;
            result.totalCount++;
            result.totalWatchedSeconds += seconds;
            if ((record.maxProgress || 0) >= 0.75) result.completedCount++;
            result.activeDays.add(dayKey);
            const hour = date.getHours();
            result.hourlyCount[hour]++;
            result.hourlySeconds[hour] += seconds;
            for (const name of record.actresses || []) {
                const entry = result.actressMap.get(name) || { count: 0, seconds: 0 };
                entry.count++;
                entry.seconds += seconds;
                result.actressMap.set(name, entry);
            }
            for (const genre of record.genres || []) {
                result.genreMap.set(genre, (result.genreMap.get(genre) || 0) + 1);
            }
            if (record.maker) result.makerMap.set(record.maker, (result.makerMap.get(record.maker) || 0) + 1);
            const minutes = seconds / 60;
            if (minutes < 5) result.bucketUnder5++;
            else if (minutes < 15) result.bucket5to15++;
            else if (minutes < 30) result.bucket15to30++;
            else result.bucketOver30++;
        }
        const count = Math.max(1, result.totalCount);
        const avgWatchedMinutes = Math.round((result.totalWatchedSeconds / 60 / count) * 10) / 10;
        const completionRate = Math.round((result.completedCount / count) * 1000) / 10;
        const maxHourly = Math.max(1, ...result.hourlyCount);
        const hourlyDistribution = result.hourlyCount.map((value, hour) => ({
            hour,
            count: value,
            seconds: result.hourlySeconds[hour],
            percentage: Math.round((value / maxHourly) * 100)
        }));
        const dayMs = 86400000;
        const pastDays = 364 + new Date(now).getDay();
        const dailyHeatmap = [];
        for (let offset = pastDays; offset >= 0; offset--) {
            const date = new Date(now - offset * dayMs);
            const dayKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
            const dayCount = result.dayMap.get(dayKey) || 0;
            const daySeconds = result.daySecondsMap.get(dayKey) || 0;
            let level = 0;
            if (dayCount > 0) {
                if (daySeconds >= 3600 || dayCount >= 4) level = 4;
                else if (daySeconds >= 2400 || dayCount >= 3) level = 3;
                else if (daySeconds >= 1200 || dayCount >= 2) level = 2;
                else level = 1;
            }
            dailyHeatmap.push({ date: dayKey, count: dayCount, seconds: daySeconds, level });
        }
        for (let offset = 1; offset <= 6 - new Date(now).getDay(); offset++) {
            const date = new Date(now + offset * dayMs);
            dailyHeatmap.push({
                date: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`,
                count: 0,
                seconds: 0,
                level: -1,
                isFuture: true
            });
        }
        const maxActressCount = Math.max(1, ...[...result.actressMap.values()].map(item => item.count));
        const topActresses = [...result.actressMap.entries()]
            .map(([name, entry]) => ({ name, count: entry.count, seconds: entry.seconds, percentage: Math.round((entry.count / maxActressCount) * 100) }))
            .sort((a, b) => b.count - a.count || b.seconds - a.seconds)
            .slice(0, 10);
        const maxGenreCount = Math.max(1, ...[...result.genreMap.values()]);
        const topGenres = [...result.genreMap.entries()]
            .map(([name, value]) => ({ name, count: value, percentage: Math.round((value / maxGenreCount) * 100) }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 15);
        const maxMakerCount = Math.max(1, ...[...result.makerMap.values()]);
        const topMakers = [...result.makerMap.entries()]
            .map(([name, value]) => ({ name, count: value, percentage: Math.round((value / maxMakerCount) * 100) }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 8);
        const habitBuckets = [
            { label: '< 5 分钟 (速览)', count: result.bucketUnder5 },
            { label: '5 - 15 分钟 (节选)', count: result.bucket5to15 },
            { label: '15 - 30 分钟 (精选)', count: result.bucket15to30 },
            { label: '> 30 分钟 (沉浸)', count: result.bucketOver30 }
        ].map(bucket => ({ ...bucket, percentage: Math.round((bucket.count / count) * 100) }));
        return {
            totalCount: result.totalCount,
            totalWatchedSeconds: result.totalWatchedSeconds,
            avgWatchedMinutes,
            completionRate,
            activeDaysCount: result.allActiveDays.size,
            rangeActiveDaysCount: result.activeDays.size,
            hourlyDistribution,
            dailyHeatmap,
            topActresses,
            topGenres,
            topMakers,
            habitBuckets
        };
    }
    function iconSvg(paths, viewBox = '0 0 24 24') {
        const span = document.createElement('span');
        span.className = 'av-svg';
        span.innerHTML = `<svg viewBox="${viewBox}" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${paths}</svg>`;
        return span;
    }
    function buildKpi(label, value, unit, footer, iconPaths, tone) {
        const card = document.createElement('div');
        card.className = 'av-kpi';
        const head = document.createElement('div');
        head.className = 'av-kpi-header';
        const labelEl = document.createElement('span');
        labelEl.className = 'av-kpi-label';
        labelEl.textContent = label;
        const icon = iconSvg(iconPaths);
        icon.classList.add(`is-${tone}`);
        head.append(labelEl, icon);
        const valueEl = document.createElement('div');
        valueEl.className = 'av-kpi-value';
        valueEl.textContent = String(value);
        if (unit) {
            const unitEl = document.createElement('small');
            unitEl.textContent = unit;
            valueEl.appendChild(unitEl);
        }
        const footerEl = document.createElement('div');
        footerEl.className = 'av-kpi-footer';
        footerEl.textContent = footer;
        card.append(head, valueEl, footerEl);
        return card;
    }
    function buildCardTitle(iconPaths, text, subtitle, crown) {
        const wrap = document.createElement('div');
        wrap.className = 'av-card-head';
        const title = document.createElement('div');
        title.className = 'av-card-title';
        if (crown) {
            const crownEl = document.createElement('span');
            crownEl.className = 'av-rank-crown';
            crownEl.textContent = '👑';
            title.appendChild(crownEl);
        }
        title.append(iconSvg(iconPaths), (() => {
            const span = document.createElement('span');
            span.textContent = text;
            return span;
        })());
        wrap.appendChild(title);
        if (subtitle) {
            const sub = document.createElement('div');
            sub.className = 'av-card-subtitle';
            sub.textContent = subtitle;
            wrap.appendChild(sub);
        }
        return wrap;
    }
    function buildAnalyticsBody(data, range) {
        const main = document.createElement('main');
        main.className = 'av-cockpit-main';
        if (!data.totalCount) {
            const empty = document.createElement('div');
            empty.className = 'av-empty';
            const icon = document.createElement('div');
            icon.className = 'av-empty-icon';
            icon.append(iconSvg('<circle cx="12" cy="12" r="10"/><path d="M12 8v4"/><path d="M12 16h.01"/>'));
            const heading = document.createElement('h2');
            heading.textContent = '暂无行为数据';
            const text = document.createElement('p');
            text.textContent = '正常观看视频时，脚本会在后台自动记录有效播放时长、番号、女优及题材标签，并实时在此大屏生成数据图表。';
            empty.append(icon, heading, text);
            main.appendChild(empty);
            return main;
        }
        const kpiGrid = document.createElement('div');
        kpiGrid.className = 'av-kpi-grid';
        kpiGrid.append(
            buildKpi('累计观影部数', data.totalCount, '部', '独立番号记录库', '<rect x="2" y="6" width="14" height="12" rx="2"/><path d="m16 10 6-3v10l-6-3z"/>', 'cyan'),
            buildKpi('真实有效时长', formatDuration(data.totalWatchedSeconds), '', '心跳累计，排除挂机与暂停', '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>', 'emerald'),
            buildKpi('平均单片投入', data.avgWatchedMinutes, '分钟', '单部作品平均停留', '<path d="M12 2v20"/><path d="M17 6H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>', 'violet'),
            buildKpi('深度完播率', data.completionRate, '%', '播放进度达 75% 以上', '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="m9 15 2 2 4-4"/>', 'pink')
        );
        main.appendChild(kpiGrid);
        const heat = document.createElement('section');
        heat.className = 'av-cockpit-card';
        const heatSubtitle = range === 'all'
            ? `近一年累计活跃 ${data.activeDaysCount} 天`
            : `近一年累计活跃 ${data.activeDaysCount} 天 · 本范围 ${data.rangeActiveDaysCount} 天`;
        heat.appendChild(buildCardTitle('<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>', '观影节律热力图 (近 365 天)', heatSubtitle));
        const weekdays = document.createElement('div');
        weekdays.className = 'av-heatmap-weekdays';
        for (const name of ['日', '一', '二', '三', '四', '五', '六']) {
            const span = document.createElement('span');
            span.textContent = name;
            weekdays.appendChild(span);
        }
        const heatWrap = document.createElement('div');
        heatWrap.className = 'av-heatmap-wrap';
        heatWrap.appendChild(weekdays);
        const boxes = document.createElement('div');
        boxes.className = 'av-heatmap-boxes';
        for (const day of data.dailyHeatmap) {
            const box = document.createElement('div');
            box.className = `av-heatmap-box level-${day.level}${day.isFuture ? ' is-future' : ''}`;
            box.title = `${day.date}：观看 ${day.count} 部 · ${formatDuration(day.seconds)}`;
            boxes.appendChild(box);
        }
        heatWrap.appendChild(boxes);
        heat.appendChild(heatWrap);
        const legend = document.createElement('div');
        legend.className = 'av-heatmap-legend';
        const less = document.createElement('span');
        less.textContent = '少';
        legend.appendChild(less);
        for (let level = 0; level <= 4; level++) {
            const box = document.createElement('div');
            box.className = `av-heatmap-box level-${level}`;
            legend.appendChild(box);
        }
        const more = document.createElement('span');
        more.textContent = '多';
        legend.appendChild(more);
        heat.appendChild(legend);
        main.appendChild(heat);
        const duo = document.createElement('div');
        duo.className = 'av-duo-grid';
        const hourly = document.createElement('section');
        hourly.className = 'av-cockpit-card';
        hourly.appendChild(buildCardTitle('<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>', '24 小时活跃时段分布', '作息节律洞察'));
        const bars = document.createElement('div');
        bars.className = 'av-bar-chart';
        for (const item of data.hourlyDistribution) {
            const col = document.createElement('div');
            col.className = 'av-bar-col';
            col.title = `${item.hour}:00 - ${item.hour}:59：观看 ${item.count} 次 · ${formatDuration(item.seconds)}`;
            const track = document.createElement('div');
            track.className = 'av-bar-track';
            const fill = document.createElement('div');
            fill.className = `av-bar-fill${item.percentage >= 70 ? ' is-peak' : ''}`;
            fill.style.height = `${Math.max(4, item.percentage)}%`;
            track.appendChild(fill);
            const label = document.createElement('span');
            label.className = 'av-bar-label';
            label.textContent = item.hour % 3 === 0 ? `${item.hour}h` : '';
            col.append(track, label);
            bars.appendChild(col);
        }
        hourly.appendChild(bars);
        const habit = document.createElement('section');
        habit.className = 'av-cockpit-card';
        habit.appendChild(buildCardTitle('<circle cx="12" cy="12" r="9"/><path d="M12 6v6l4 2"/>', '单片投入时长分布模型', '观赏模式画像'));
        const habitList = document.createElement('div');
        habitList.className = 'av-habit-list';
        for (const bucket of data.habitBuckets) {
            const row = document.createElement('div');
            row.className = 'av-habit-row';
            const labelRow = document.createElement('div');
            labelRow.className = 'av-habit-label';
            const name = document.createElement('span');
            name.textContent = bucket.label;
            const value = document.createElement('span');
            value.textContent = `${bucket.count} 部 (${bucket.percentage}%)`;
            labelRow.append(name, value);
            const bar = document.createElement('div');
            bar.className = 'av-progress-bar is-habit';
            const fill = document.createElement('div');
            fill.style.width = `${Math.min(100, bucket.percentage)}%`;
            bar.appendChild(fill);
            row.append(labelRow, bar);
            habitList.appendChild(row);
        }
        habit.appendChild(habitList);
        duo.append(hourly, habit);
        main.appendChild(duo);
        const rankGrid = document.createElement('div');
        rankGrid.className = 'av-duo-grid';
        const actressCard = document.createElement('section');
        actressCard.className = 'av-cockpit-card';
        actressCard.appendChild(buildCardTitle('<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>', '偏好女优 TOP 10', '频次与时长加权，条长为相对榜首', true));
        if (!data.topActresses.length) {
            const empty = document.createElement('div');
            empty.className = 'av-mini-empty';
            empty.textContent = '暂无女优信息（将在观看带演员标签的影片时更新）';
            actressCard.appendChild(empty);
        } else {
            data.topActresses.forEach((item, index) => {
                const row = document.createElement('div');
                row.className = 'av-rank-row';
                const badge = document.createElement('span');
                badge.className = `av-rank-badge ${index === 0 ? 'is-gold' : index === 1 ? 'is-silver' : index === 2 ? 'is-bronze' : ''}`;
                badge.textContent = String(index + 1);
                const body = document.createElement('div');
                body.className = 'av-rank-body';
                const head = document.createElement('div');
                head.className = 'av-rank-head';
                const link = document.createElement('a');
                link.className = 'av-actress-link';
                link.href = IS_JABLE ? `https://jable.tv/search/${encodeURIComponent(item.name)}/` : `https://missav.ai/search/${encodeURIComponent(item.name)}`;
                link.target = '_blank';
                link.rel = 'noopener noreferrer';
                link.textContent = item.name;
                const meta = document.createElement('span');
                meta.className = 'av-rank-meta';
                meta.textContent = `${item.count} 次 · ${formatDuration(item.seconds)}`;
                head.append(link, meta);
                const bar = document.createElement('div');
                bar.className = 'av-progress-bar is-actress';
                const fill = document.createElement('div');
                fill.style.width = `${Math.min(100, item.percentage)}%`;
                bar.appendChild(fill);
                body.append(head, bar);
                row.append(badge, body);
                actressCard.appendChild(row);
            });
        }
        const genreCard = document.createElement('section');
        genreCard.className = 'av-cockpit-card';
        genreCard.appendChild(buildCardTitle('<path d="M20.6 13.4 12 22l-9-9V3h10z"/><path d="M7.5 7.5h.01"/>', '偏好题材 TOP 15', '出现频次，条长为相对榜首'));
        if (!data.topGenres.length) {
            const empty = document.createElement('div');
            empty.className = 'av-mini-empty';
            empty.textContent = '暂无题材信息';
            genreCard.appendChild(empty);
        } else {
            data.topGenres.forEach((item, index) => {
                const row = document.createElement('div');
                row.className = 'av-genre-row';
                const name = document.createElement('span');
                name.className = 'av-genre-name';
                name.textContent = `${index + 1}. ${item.name}`;
                const bar = document.createElement('div');
                bar.className = 'av-progress-bar is-genre';
                const fill = document.createElement('div');
                fill.style.width = `${Math.min(100, item.percentage)}%`;
                bar.appendChild(fill);
                const count = document.createElement('span');
                count.className = 'av-genre-count';
                count.textContent = `${item.count} 部`;
                row.append(name, bar, count);
                genreCard.appendChild(row);
            });
        }
        rankGrid.append(actressCard, genreCard);
        main.appendChild(rankGrid);
        const makerCard = document.createElement('section');
        makerCard.className = 'av-cockpit-card';
        makerCard.appendChild(buildCardTitle('<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 3v18"/>', '偏爱片商 TOP 8', '厂牌出品偏好'));
        if (!data.topMakers.length) {
            const empty = document.createElement('div');
            empty.className = 'av-mini-empty';
            empty.textContent = IS_JABLE ? 'Jable 未提供片商信息' : '暂无片商信息';
            makerCard.appendChild(empty);
        } else {
            const chips = document.createElement('div');
            chips.className = 'av-maker-chips';
            for (const item of data.topMakers) {
                const chip = document.createElement('span');
                chip.className = 'av-maker-chip';
                chip.textContent = `${item.name} · ${item.count} 部`;
                chips.appendChild(chip);
            }
            makerCard.appendChild(chips);
        }
        main.appendChild(makerCard);
        main.dataset.range = range;
        return main;
    }
    function renderAnalytics() {
        const page = state.analyticsPage;
        if (!page) return;
        state.analyticsSignature = store.get(ANALYTICS_KEY) || '[]';
        const range = state.analyticsRange;
        const data = aggregateAnalytics(range);
        const main = page.querySelector('.av-cockpit-main');
        if (main) main.replaceWith(buildAnalyticsBody(data, range));
        for (const tab of page.querySelectorAll('.av-range-tab')) {
            const active = tab.dataset.range === range;
            tab.classList.toggle('active', active);
            tab.setAttribute('aria-selected', active ? 'true' : 'false');
            tab.tabIndex = active ? 0 : -1;
        }
    }
    function exportAnalyticsJson() {
        const payload = {
            app: 'AV Helper Analytics',
            version: '1.0',
            exportedAt: new Date().toISOString(),
            recordsCount: analyticsRecords().length,
            records: analyticsRecords()
        };
        const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `av-helper-analytics-${new Date().toISOString().slice(0, 10)}.json`;
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        link.remove();
        setTimeout(() => URL.revokeObjectURL(url), 2000);
    }
    function clearAnalyticsData() {
        state.analyticsRecords = [];
        store.set(ANALYTICS_KEY, '[]');
    }
    function refreshCockpit() {
        if (!state.analyticsPage) return;
        state.analyticsRecords = null;
        analyticsRecords();
        renderAnalytics();
    }
    function syncCockpit() {
        if (!state.analyticsPage || document.hidden) return;
        if ((store.get(ANALYTICS_KEY) || '[]') === state.analyticsSignature) return;
        state.analyticsRecords = null;
        renderAnalytics();
    }
    function handleClearAnalytics() {
        if (!confirm('确定要清空全部观影统计与行为数据吗？此操作无法撤销。')) return;
        clearAnalyticsData();
        refreshCockpit();
        log('🗑 数据大屏记录已清空');
    }
    function closeCockpit() {
        analyticsRequested = false;
        cockpitSticky = false;
        try {
            sessionStorage.removeItem('avSub:cockpit');
        } catch (_) {
        }
        if (analyticsObserver) {
            analyticsObserver.disconnect();
            analyticsObserver = null;
        }
        disarmMediaKiller();
        releaseCockpitGuard();
        window.close();
        setTimeout(() => {
            if (window.closed || !state.analyticsPage) return;
            location.replace(analyticsUrl().replace('#av-analytics', ''));
        }, 160);
    }
    function buildCockpitAction(iconPaths, label, className, title, onClick) {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = className;
        button.title = title;
        button.appendChild(iconSvg(iconPaths));
        if (label) {
            const text = document.createElement('span');
            text.textContent = label;
            button.appendChild(text);
        }
        button.addEventListener('click', onClick);
        return button;
    }
    let cockpitFocusHooked = false;
    function hookCockpitFocus() {
        if (cockpitFocusHooked) return;
        cockpitFocusHooked = true;
        window.addEventListener('visibilitychange', () => {
            ensureCockpit();
            syncCockpit();
        });
        window.addEventListener('focus', () => {
            ensureCockpit();
            syncCockpit();
        });
        window.addEventListener('keydown', event => {
            if (event.key === 'Escape' && state.analyticsPage) closeCockpit();
        });
    }
    function analyticsUrl() {
        try {
            const url = new URL(location.href);
            url.hash = '#av-analytics';
            return url.href;
        } catch (error) {
            return '#av-analytics';
        }
    }
    const ANALYTICS_TITLE = '观影行为数据 — 增强助手';
    let analyticsGuard = 0;
    let analyticsObserver = null;
    let analyticsRequested = false;
    let analyticsSweeping = false;
    function evictForeignNodes() {
        if (analyticsSweeping) return;
        analyticsSweeping = true;
        try {
            if (!document.documentElement.classList.contains('av-cockpit-mode')) engageCockpitGuard();
            if (state.analyticsPage && !state.analyticsPage.isConnected && document.body) {
                document.body.appendChild(state.analyticsPage);
            }
            if (!state.analyticsPage) return;
            for (const node of Array.from(document.body.children)) {
                if (node === state.analyticsPage) continue;
                if (node.style && typeof node.style.setProperty === 'function') node.style.setProperty('display', 'none', 'important');
                else if (node.style) node.style.display = 'none';
                node.setAttribute('aria-hidden', 'true');
            }
        } finally {
            analyticsSweeping = false;
        }
    }
    function watchAnalyticsBody() {
        if (analyticsObserver) return;
        analyticsObserver = new MutationObserver(evictForeignNodes);
        analyticsObserver.observe(document.documentElement, { childList: true });
        if (document.body) analyticsObserver.observe(document.body, { childList: true });
    }
    let cockpitPinGuard = '';
    function ensureCockpit() {
        if (!analyticsRequested && !cockpitSticky) return;
        engageCockpitGuard();
        armMediaKiller();
        silenceMedia();
        if (document.title !== ANALYTICS_TITLE) document.title = ANALYTICS_TITLE;
        if (!/^#av-analytics\b/.test(location.hash) && location.href !== cockpitPinGuard) {
            cockpitPinGuard = location.href;
            try {
                if (typeof history.replaceState === 'function') history.replaceState(null, '', analyticsUrl());
            } catch (_) {
            }
        }
        const live = document.querySelector('.av-analytics-page');
        if (live && live === state.analyticsPage && live.isConnected) return;
        if (!document.body) return;
        state.analyticsPage = null;
        buildAnalyticsPage();
    }
    function silenceMedia() {
        for (const media of document.querySelectorAll('video, audio')) {
            try {
                if (media.paused && media.muted) continue;
                media.pause();
                media.muted = true;
            } catch (_) {
            }
        }
    }
    function buildAnalyticsPage() {
        silenceMedia();
        document.body.replaceChildren();
        document.body.style.margin = '0';
        document.body.style.padding = '0';
        document.body.style.background = '#090a0f';
        document.documentElement.style.background = '#090a0f';
        document.documentElement.style.colorScheme = 'dark';
        const page = document.createElement('div');
        page.className = 'av-analytics-page';
        const cockpit = document.createElement('div');
        cockpit.className = 'av-cockpit';
        const header = document.createElement('header');
        header.className = 'av-cockpit-header';
        const brand = document.createElement('div');
        brand.className = 'av-brand';
        const logo = iconSvg('<path d="M3 17l5-6 4 4 5-8 4 6"/>');
        logo.classList.add('av-brand-logo');
        const brandText = document.createElement('div');
        brandText.className = 'av-brand-text';
        const heading = document.createElement('h1');
        heading.textContent = '观影行为数据';
        const badge = document.createElement('span');
        badge.className = 'av-brand-badge';
        badge.textContent = '数据专业版';
        brandText.append(heading, badge);
        brand.append(logo, brandText);
        const tabs = document.createElement('div');
        tabs.className = 'av-range-tabs';
        tabs.setAttribute('role', 'tablist');
        tabs.setAttribute('aria-label', '统计时间范围');
        for (const [value, label] of [['all', '全部历史'], ['30d', '近 30 天'], ['7d', '近 7 天']]) {
            const tab = document.createElement('button');
            tab.type = 'button';
            tab.className = 'av-range-tab';
            tab.dataset.range = value;
            tab.setAttribute('role', 'tab');
            tab.setAttribute('aria-selected', value === state.analyticsRange ? 'true' : 'false');
            tab.tabIndex = value === state.analyticsRange ? 0 : -1;
            tab.textContent = label;
            tab.addEventListener('click', () => {
                if (state.analyticsRange !== value) window.scrollTo(0, 0);
                state.analyticsRange = value;
                renderAnalytics();
            });
            tabs.appendChild(tab);
        }
        tabs.addEventListener('keydown', event => {
            const step = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0;
            if (!step) return;
            event.preventDefault();
            const list = Array.from(tabs.querySelectorAll('.av-range-tab'));
            const index = list.indexOf(document.activeElement);
            const next = list[(index + step + list.length) % list.length];
            if (!next) return;
            next.focus();
            next.click();
        });
        const actions = document.createElement('div');
        actions.className = 'av-cockpit-actions';
        const refresh = buildCockpitAction('<path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8M3 3v5h5M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16M21 21v-5h-5"/>', '刷新', 'av-btn av-btn-secondary', '刷新统计数据', refreshCockpit);
        const exportBtn = buildCockpitAction('<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>', '导出 JSON', 'av-btn av-btn-secondary', '导出 JSON 格式数据备份', exportAnalyticsJson);
        const clearBtn = buildCockpitAction('<path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>', '清空', 'av-btn av-btn-danger', '清空全部行为记录', handleClearAnalytics);
        const close = buildCockpitAction('<path d="M18 6 6 18M6 6l12 12"/>', '', 'av-btn av-btn-close', '关闭大屏', closeCockpit);
        actions.append(refresh, exportBtn, clearBtn, close);
        header.append(brand, tabs, actions);
        const main = document.createElement('main');
        main.className = 'av-cockpit-main';
        cockpit.append(header, main);
        page.appendChild(cockpit);
        document.body.appendChild(page);
        state.analyticsPage = page;
        watchAnalyticsBody();
        hookCockpitFocus();
        applyUiStyles();
        renderAnalytics();
    }
    function mountAnalyticsPage() {
        analyticsRequested = true;
        engageCockpitGuard();
        armMediaKiller();
        document.title = ANALYTICS_TITLE;
        try {
            sessionStorage.setItem('avSub:cockpit', '1');
        } catch (_) {
        }
        if (!/^#av-analytics\b/.test(location.hash)) {
            try {
                if (typeof history.replaceState === 'function') history.replaceState(null, '', analyticsUrl());
            } catch (_) {
            }
        }
        const boot = () => {
            if (!document.body) {
                if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
                else setTimeout(boot, 60);
                return;
            }
            if (document.querySelector('.av-analytics-page')) return;
            buildAnalyticsPage();
        };
        if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
        else boot();
        if (!analyticsGuard) {
            analyticsGuard = setInterval(() => {
                if (!analyticsRequested) {
                    clearInterval(analyticsGuard);
                    analyticsGuard = 0;
                    return;
                }
                ensureCockpit();
            }, 500);
        }
    }
    const isAnalyticsRoute = () => cockpitSticky || analyticsRequested || /^#av-analytics\b/.test(location.hash) || location.search.includes('av-analytics');
    function installSpaWatch() {
        let lastUrl = location.href;
        const handleRouteChange = () => {
            if (location.href === lastUrl) return;
            lastUrl = location.href;
            if (isAnalyticsRoute()) {
                mountAnalyticsPage();
                return;
            }
            log('🔀 页面已切换，重新初始化播放器');
            closeSubtitlePicker();
            closeInfoSection();
            closeLightbox();
            cancelHold();
            state.infoSession++;
            state.infoData = null;
            state.listMovies = null;
            state.domGen += 1;
            videoProbeEl = null;
            videoProbeAt = 0;
            stopAnalyticsTracking();
            refreshFilters();
            document.querySelector('.info-rating-badge')?.remove();
            state.player = null;
            state.video = null;
            state.videoCode = '';
            state.bound = false;
            stopPlayerPoll();
            setTimeout(() => {
                initPlayer();
                clickPlayEntry();
                syncFilterBar();
            }, 600);
        };
        const onRouteChange = debounce(handleRouteChange, 400);
        const analyticsKick = () => {
            if (!isAnalyticsRoute()) return;
            ensureCockpit();
        };
        window.addEventListener('popstate', onRouteChange, { passive: true });
        window.addEventListener('hashchange', onRouteChange, { passive: true });
        window.addEventListener('hashchange', analyticsKick, { passive: true });
        window.addEventListener('popstate', analyticsKick, { passive: true });
        let watchPending = false;
        const watchHostChurn = () => {
            if (watchPending) return;
            watchPending = true;
            setTimeout(() => {
                watchPending = false;
                if (!isAnalyticsRoute()) return;
                ensureCockpit();
            }, 250);
        };
        const hostObserver = new MutationObserver(() => {
            if (isAnalyticsRoute()) watchHostChurn();
        });
        hostObserver.observe(document.documentElement, { childList: true });
        if (document.body) hostObserver.observe(document.body, { childList: true });
        for (const method of ['pushState', 'replaceState']) {
            const original = history[method];
            if (typeof original !== 'function') continue;
            history[method] = function (...args) {
                const next = typeof args[2] === 'string' ? args[2] : '';
                if (next.includes('av-analytics')) {
                    cockpitSticky = true;
                    analyticsRequested = true;
                }
                const result = original.apply(this, args);
                if (analyticsRequested) analyticsKick();
                else onRouteChange();
                return result;
            };
        }
    }
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initPage, { once: true });
    } else {
        initPage();
    }
    if (!isAnalyticsRoute()) installSpaWatch();
    document.addEventListener('click', event => {
        const target = event.target;
        if (!target || typeof target.closest !== 'function') return;
        const link = target.closest('.av-fb-cockpit, .av-open-cockpit');
        if (!link) return;
        link.href = analyticsUrl();
        event.stopImmediatePropagation();
    }, true);
    for (const type of ['auxclick', 'pointerdown', 'mousedown']) {
        document.addEventListener(type, event => {
            const target = event.target;
            if (!target || typeof target.closest !== 'function') return;
            const link = target.closest('.av-fb-cockpit, .av-open-cockpit');
            if (!link) return;
            link.href = analyticsUrl();
            event.stopImmediatePropagation();
        }, true);
    }
    document.addEventListener('keydown', event => {
        if (event.key === 'Escape' && state.infoSection) setInfoExpanded(false);
    });
    window.addEventListener('beforeunload', () => {
        state.adObserver?.disconnect();
        state.filterObserver?.disconnect();
        state.panelLayoutObserver?.disconnect();
        analyticsObserver?.disconnect();
        stopAnalyticsTracking();
        stopPlayerPoll();
        clearInterval(state.quickWatchTimer);
        cancelAnimationFrame(state.subtitleRAF);
        clearTimeout(state.holdTimer);
    }, { once: true });
    } catch (error) {
        console.error('[av-helper] 初始化失败:', error && error.message ? error.message : error);
    }
})();
