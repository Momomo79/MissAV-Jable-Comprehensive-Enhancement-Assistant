// ==UserScript==
// @name         MissAV & Jable 综合增强助手
// @namespace    http://tampermonkey.net/
// @version      9.2
// @description  PC端专用、广告清理、SRT字幕加载/偏移/字号高度、偏移按站点记忆、长按画面倍速与HUD、原生画中画、剧照画廊、评分徽章、短评聚合、女优社交直达、临时加速、快进倒退、区间循环、可拖拽可隐藏UI、实时日志
// @author       Momomo
// @match        *://missav.ws/*
// @match        *://missav.live/*
// @match        *://missav.ai/*
// @match        *://missav.com/*
// @match        *://missav123.com/*
// @match        *://thisav.com/*
// @match        *://missav.fans/*
// @match        *://missav.media/*
// @match        *://jable.tv/videos/*
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
    const INFO_CACHE_PREFIX = 'info:v2:';
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
        listMovies: null
    };
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
            try {
                patchWindowOpen(frame.contentWindow);
            } catch (_) {
            }
        }
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
            width: ${PANEL_WIDTH}px;
            border: 1px solid rgba(255,255,255,.18);
            border-radius: 12px;
            background: rgba(28,28,34,var(--ui-bg-opacity));
            backdrop-filter: blur(var(--ui-blur)) saturate(200%);
            -webkit-backdrop-filter: blur(var(--ui-blur)) saturate(200%);
            box-shadow: inset 0 1px 0 rgba(255,255,255,.2), 0 12px 34px rgba(0,0,0,.45);
            color: #f8fafc;
            font: 13px/1.45 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Microsoft YaHei",sans-serif;
            -webkit-font-smoothing: antialiased;
            text-shadow: 0 1px 2px rgba(0,0,0,.6);
            transition: background .2s ease, box-shadow .2s ease;
            overflow: hidden;
        }
        .custom-control-panel:hover,
        .custom-control-panel:focus-within {
            background: rgba(28,28,34,var(--ui-hover-opacity));
            backdrop-filter: blur(var(--ui-hover-blur)) saturate(200%);
            -webkit-backdrop-filter: blur(var(--ui-hover-blur)) saturate(200%);
            box-shadow: inset 0 1px 0 rgba(255,255,255,.25), 0 14px 38px rgba(0,0,0,.55);
        }
        .panel-header { position: sticky; top: 0; z-index: 2; display: flex; justify-content: space-between; align-items: center; gap: 8px; padding: 8px 14px; background: rgba(0,0,0,.4); cursor: move; font-size: 14px; font-weight: 700; color: #f1f5f9; border-bottom: 1px solid rgba(255,255,255,.15); user-select: none; letter-spacing: .5px; }
        .custom-control-panel.panel-dragging { transition: none; }
        .custom-control-panel.panel-dragging .panel-header { cursor: grabbing; background: rgba(59,130,246,.35); }
        .panel-header:hover { color: #fff; }
        .panel-header-btn { cursor: pointer; padding: 0 4px; font-size: 14px; text-shadow: none; }
        .panel-header-btn:hover { color: #60a5fa; }
        .panel-body { padding: 12px 14px; }
        .panel-body[hidden] { display: none; }
        .panel-row { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 9px 10px; margin: 0 0 10px; }
        .input-group { display: flex; align-items: center; justify-content: space-between; gap: 6px; min-width: 0; color: #e2e8f0; font-size: 13px; font-weight: 600; white-space: nowrap; letter-spacing: .3px; }
        .custom-control-panel input[type="number"]::-webkit-outer-spin-button,
        .custom-control-panel input[type="number"]::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
        .custom-control-panel input[type="number"] { -moz-appearance: textfield; }
        .custom-control-panel input[type="text"],
        .custom-control-panel input[type="number"] { width: 54px; height: 26px; padding: 0 4px; border: 1px solid rgba(255,255,255,.3); border-radius: 6px; outline: none; background: rgba(255,255,255,.15); color: #fff; font-size: 13px; font-weight: 700; text-align: center; text-shadow: none; transition: border-color .2s; }
        .custom-control-panel input[type="text"] { width: 44px; text-transform: lowercase; }
        .custom-control-panel input:focus { border-color: #60a5fa; background: rgba(255,255,255,.2); }
        .btn-group { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }
        .btn-group button { width: 100%; min-height: 30px; padding: 5px; border: 1px solid rgba(255,255,255,.25); border-radius: 6px; background: rgba(255,255,255,.12); color: #f8fafc; cursor: pointer; font-family: inherit; font-size: 13px; font-weight: 600; letter-spacing: .5px; text-shadow: 0 1px 2px rgba(0,0,0,.4); transition: background .2s ease, border-color .2s ease; }
        .btn-group button:hover { background: rgba(255,255,255,.25); }
        .btn-group button.btn-primary { background: linear-gradient(135deg,#3b82f6,#2563eb); border-color: rgba(59,130,246,.5); }
        .btn-group button.btn-danger { background: rgba(239,68,68,.25); color: #fecaca; border-color: rgba(239,68,68,.4); }
        .btn-group button.btn-ghost { background: rgba(148,163,184,.18); color: #e2e8f0; border-color: rgba(148,163,184,.32); }
        .btn-group button.btn-ghost:hover { background: rgba(148,163,184,.3); }
        .panel-full-btn { width: 100%; margin-top: 12px; }
        .panel-status-log { margin-top: 12px; padding: 8px; border: 1px solid rgba(255,255,255,.15); border-radius: 6px; background: rgba(0,0,0,.3); color: #bae6fd; font-size: 11px; font-weight: 500; text-align: left; letter-spacing: .5px; height: 90px; overflow-y: auto; display: flex; flex-direction: column; gap: 4px; text-shadow: none; }
        .panel-status-log::-webkit-scrollbar { width: 4px; }
        .panel-status-log::-webkit-scrollbar-thumb { background: rgba(255,255,255,.3); border-radius: 2px; }
        .log-entry { display: flex; align-items: flex-start; word-break: break-all; }
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
        .slider-group input[type="range"] { flex: 1; margin: 0; cursor: pointer; accent-color: #3b82f6; height: 4px; border-radius: 2px; }
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
        .av-stills-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(170px, 1fr)); gap: 10px; }
        .av-still-item { aspect-ratio: 16 / 10; margin: 0; border-radius: 12px; border: 1px solid rgba(255,255,255,.12); background: rgba(255,255,255,.04); overflow: hidden; cursor: zoom-in; transition: transform .15s, border-color .15s, box-shadow .15s; }
        .av-still-item:hover { border-color: rgba(255,255,255,.35); transform: translateY(-2px); box-shadow: 0 6px 16px rgba(0,0,0,.4); }
        .av-still-item img { display: block; width: 100%; height: 100%; object-fit: cover; }
        .av-hub-empty { margin: 0; padding: 28px 0; text-align: center; color: #64748b; font-size: 12px; }
        .av-hub-loading { display: flex; align-items: center; justify-content: center; gap: 8px; padding: 28px 0; color: #94a3b8; font-size: 12px; }
        .av-spinner { width: 12px; height: 12px; border: 1.5px solid #94a3b8; border-right-color: transparent; border-radius: 50%; animation: av-spin .7s linear infinite; }
        @keyframes av-spin { to { transform: rotate(360deg); } }
        .av-review-list { display: flex; flex-direction: column; gap: 10px; }
        .review-card { padding: 10px 14px; border-radius: 12px; background: rgba(255,255,255,.04); border: 1px solid rgba(255,255,255,.12); }
        .review-header { display: flex; align-items: baseline; justify-content: space-between; gap: 8px; margin-bottom: 4px; }
        .review-header strong { color: #93c5fd; font-size: 12px; }
        .review-header time { color: #64748b; font-size: 11px; }
        .review-text { color: #cbd5e1; font-size: 12px; word-break: break-word; }
        .av-info-pane[hidden] { display: none; }
        .av-list-grid { display: flex; flex-direction: column; gap: 10px; }
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
        const height = panel.offsetHeight || 60;
        const maxX = Math.max(0, window.innerWidth - width);
        const maxY = Math.max(0, window.innerHeight - height);
        const top = clamp(panel.offsetTop || settings.panelY, 0, maxY);
        panel.style.left = `${clamp(panel.offsetLeft || settings.panelX, 0, maxX)}px`;
        panel.style.top = `${top}px`;
    }
    function makeDraggable(element, handle, keys = { x: 'panelX', y: 'panelY' }) {
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
                element.classList.remove('panel-dragging');
            }
            moved = false;
        };
        handle.addEventListener('mousedown', event => {
            if (event.button !== 0) return;
            if (event.target.closest('.panel-header-btn')) return;
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
            if (event.target.closest('.panel-header-btn')) return;
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
                store.set('panelX', element.offsetLeft);
                store.set('panelY', element.offsetTop);
                element.classList.remove('panel-dragging');
            };
            document.addEventListener('touchmove', onTouchMove, { passive: false });
            document.addEventListener('touchend', onTouchEnd);
        }, { passive: true });
    }
    function applyUiStyles() {
        for (const target of [state.panel, state.subtitlePicker, state.subtitleBanner]) {
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
        const title = document.createElement('span');
        title.textContent = '⚙️ 增强助手 (拖拽移动)';
        const minimizeBtn = document.createElement('span');
        minimizeBtn.className = 'panel-header-btn';
        minimizeBtn.textContent = settings.isMinimized ? '➕' : '➖';
        minimizeBtn.title = '折叠 / 展开';
        header.append(title, minimizeBtn);
        const body = document.createElement('div');
        body.className = 'panel-body';
        body.hidden = settings.isMinimized;
        state.panelBody = body;
        minimizeBtn.addEventListener('click', () => {
            settings.isMinimized = !settings.isMinimized;
            body.hidden = settings.isMinimized;
            minimizeBtn.textContent = settings.isMinimized ? '➕' : '➖';
            store.set('isMinimized', settings.isMinimized);
        });
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
            const targetY = 88;
            settings.panelX = 20;
            settings.panelY = targetY;
            panel.style.left = '20px';
            panel.style.top = `${targetY}px`;
            store.set('panelX', 20);
            store.set('panelY', targetY);
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
        state.logEl = document.createElement('div');
        state.logEl.className = 'panel-status-log';
        body.append(keysRow, actionRow, toggleSliderBtn, sliderRow, state.logEl);
        panel.append(header, body);
        getUiLayer().appendChild(panel);
        applyUiStyles();
        makeDraggable(panel, header);
        clampPanelPosition(panel);
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
        window.addEventListener('resize', throttle(fitQuickControls, MUTATION_THROTTLE), { passive: true });
        document.addEventListener('fullscreenchange', () => setTimeout(fitQuickControls, 120));
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
    function createQuickControls() {
        const container = state.container;
        if (!container || container.querySelector('.custom-quick-controls')) return;
        const quick = document.createElement('div');
        quick.className = 'custom-quick-controls';
        state.quick = quick;
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
    function setupShortcuts() {
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
            if (key === accelerate) {
                if (state.acceleratePressed || event.repeat) return;
                state.speedBeforeAccelerate = Number.isFinite(video.playbackRate) ? video.playbackRate : 1;
                video.playbackRate = settings.accelerationRate;
                state.acceleratePressed = true;
                log(`⏩ 临时加速 ${settings.accelerationRate}x`);
                return;
            }
            if (key === 'p') {
                event.preventDefault();
                if (!event.repeat) togglePictureInPicture();
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
    function gmRequest(url, { timeout = 15000, binary = false } = {}) {
        return new Promise((resolve, reject) => {
            GM_xmlhttpRequest({
                method: 'GET',
                url,
                timeout,
                responseType: binary ? 'arraybuffer' : undefined,
                onload: response => {
                    if (response.status < 200 || response.status >= 300) {
                        reject(new Error(`HTTP ${response.status}`));
                        return;
                    }
                    resolve(binary ? response.response ?? response.responseText : response.responseText);
                },
                onerror: () => reject(new Error('网络错误')),
                ontimeout: () => reject(new Error('请求超时')),
                onabort: () => reject(new Error('请求已取消'))
            });
        });
    }
    function gmRaw(url, { headers = null, timeout = 15000 } = {}) {
        return new Promise((resolve, reject) => {
            GM_xmlhttpRequest({
                method: 'GET',
                url,
                timeout,
                headers: headers || undefined,
                onload: response => resolve(response),
                onerror: () => reject(new Error('网络错误')),
                ontimeout: () => reject(new Error('请求超时')),
                onabort: () => reject(new Error('请求已取消'))
            });
        });
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
    function normalizeVideoCode(videoId) {
        let id = String(videoId ?? '').trim();
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
        if (fc2?.[1]) return fc2[1].toUpperCase();
        const std = id.match(/^([a-z0-9]+-[a-z0-9]+)/i);
        if (std?.[1]) return std[1].toUpperCase();
        return id.toUpperCase();
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
    function decodeSubtitleBuffer(payload) {
        if (typeof payload === 'string') return payload;
        if (!(payload instanceof ArrayBuffer)) return String(payload ?? '');
        const bytes = new Uint8Array(payload);
        if (!bytes.length) return '';
        if (bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
            return new TextDecoder('utf-8').decode(bytes.subarray(3));
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
            const text = decodeSubtitleBuffer(payload);
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
        const empty = { rating: undefined, stills: [], reviews: [], lists: [] };
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
                    if (abs && !stills.includes(abs)) stills.push(abs);
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
        const partial = { rating, stills, reviews, lists };
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
            for (const url of incoming ?? []) {
                if (url && !NOW_PRINTING_RE.test(url) && !seenStills.includes(url)) seenStills.push(url);
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
            lists: [...seenLists]
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
                tab.textContent = label;
                tab.addEventListener('click', () => setInfoTab(key));
                tabs.appendChild(tab);
                const pane = document.createElement('div');
                pane.className = 'av-info-pane';
                pane.dataset.pane = key;
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
        for (const tab of refs.tabs.children) tab.classList.toggle('active', tab.dataset?.tab === key);
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
        const stills = data.stills ?? [];
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
            const img = document.createElement('img');
            img.src = url;
            img.loading = 'lazy';
            img.referrerPolicy = 'no-referrer';
            img.alt = `剧照 ${index + 1}`;
            figure.appendChild(img);
            figure.addEventListener('click', () => openLightbox(stills, index));
            return figure;
        });
        refs.grid.replaceChildren(...(stillNodes.length ? stillNodes : [empty(HUB_EMPTY.stills)]));
        const reviewNodes = reviews.slice(0, 30).map(review => {
            const card = document.createElement('article');
            card.className = 'review-card';
            const head = document.createElement('div');
            head.className = 'review-header';
            const user = document.createElement('strong');
            user.textContent = review.user || '匿名';
            head.appendChild(user);
            if (review.date) {
                const time = document.createElement('time');
                time.textContent = review.date;
                head.appendChild(time);
            }
            const text = document.createElement('p');
            text.className = 'review-text';
            text.textContent = review.content;
            card.append(head, text);
            return card;
        });
        refs.reviews.replaceChildren(...(reviewNodes.length ? reviewNodes : [empty(HUB_EMPTY.reviews)]));
        const listNodes = lists.slice(0, 20).map(item => buildListCard(item));
        refs.lists.replaceChildren(...(listNodes.length ? listNodes : [empty(HUB_EMPTY.lists)]));
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
    function findMainVideo() {
        const candidates = [];
        for (const video of document.querySelectorAll('video')) {
            if (video.closest('.custom-quick-controls, .custom-control-panel')) continue;
            const rect = video.getBoundingClientRect();
            if (rect.width < MIN_PLAYER_WIDTH || rect.height < MIN_PLAYER_HEIGHT) continue;
            candidates.push({ video, area: rect.width * rect.height });
        }
        candidates.sort((a, b) => b.area - a.area);
        return candidates[0]?.video ?? null;
    }
    function stopPlayerPoll() {
        clearInterval(state.pollTimer);
        clearTimeout(state.pollTimeout);
        state.pollTimer = 0;
        state.pollTimeout = 0;
    }
    function initPlayer() {
        if (state.bound || state.pollTimer) return;
        state.pollTimer = setInterval(() => {
            const video = findMainVideo();
            if (!video) return;
            const container =
                video.closest('.plyr__video-wrapper') || video.closest('.plyr') || video.parentElement;
            if (!container) return;
            stopPlayerPoll();
            bindPlayer(video, container);
        }, POLL_INTERVAL);
        state.pollTimeout = setTimeout(stopPlayerPoll, POLL_TIMEOUT);
    }
    function bindPlayer(video, container) {
        if (state.bound && state.video === video) return;
        state.video = video;
        state.container = container;
        state.bound = true;
        state.player = (typeof unsafeWindow !== 'undefined' && unsafeWindow.player) || video.plyr || video;
        state.subtitleEl = document.createElement('div');
        state.subtitleEl.className = 'custom-subtitle';
        state.subtitleEl.style.display = 'none';
        container.appendChild(state.subtitleEl);
        applySubtitleStyle();
        createPanel();
        createQuickControls();
        setupShortcuts();
        buildSpeedHud(container);
        setupHoldAccelerate(container);
        for (const type of ['play', 'pause', 'ended', 'loadedmetadata', 'ratechange', 'seeked']) {
            video.addEventListener(type, updatePlayPauseButton, { passive: true });
        }
        video.addEventListener('loadedmetadata', () => renderSubtitle(true), { passive: true });
        startSubtitleLoop();
        updatePlayPauseButton();
        if (settings.autoInfo) {
            loadActressSocialFromPage();
            loadVideoInfo();
        }
        log('🎬 播放器已就绪');
    }
    function clickPlayEntry() {
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
        cleanAds();
        initPlayer();
        clickPlayEntry();
        startAdObserver();
    }
    function installSpaWatch() {
        let lastUrl = location.href;
        const handleRouteChange = () => {
            if (location.href === lastUrl) return;
            lastUrl = location.href;
            log('🔀 页面已切换，重新初始化播放器');
            closeSubtitlePicker();
            closeInfoSection();
            closeLightbox();
            cancelHold();
            state.infoSession++;
            state.infoData = null;
            state.listMovies = null;
            document.querySelector('.info-rating-badge')?.remove();
            state.player = null;
            state.video = null;
            stopPlayerPoll();
            setTimeout(() => {
                initPlayer();
                clickPlayEntry();
            }, 600);
        };
        const onRouteChange = debounce(handleRouteChange, 400);
        window.addEventListener('popstate', onRouteChange, { passive: true });
        window.addEventListener('hashchange', onRouteChange, { passive: true });
        for (const method of ['pushState', 'replaceState']) {
            const original = history[method];
            if (typeof original !== 'function') continue;
            history[method] = function (...args) {
                const result = original.apply(this, args);
                onRouteChange();
                return result;
            };
        }
    }
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initPage, { once: true });
    } else {
        initPage();
    }
    installSpaWatch();
    document.addEventListener('keydown', event => {
        if (event.key === 'Escape' && state.infoSection) setInfoExpanded(false);
    });
    window.addEventListener('beforeunload', () => {
        state.adObserver?.disconnect();
        stopPlayerPoll();
        cancelAnimationFrame(state.subtitleRAF);
        clearTimeout(state.holdTimer);
    }, { once: true });
    } catch (error) {
        console.error('[av-helper] 初始化失败:', error && error.message ? error.message : error);
    }
})();
