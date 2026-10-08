// ==UserScript==
// @name         MissAV & Jable 综合增强助手
// @namespace    http://tampermonkey.net/
// @version      12.7
// @description  PC端专用、广告清理、字幕加载/偏移/字号高度、站点记忆、倍速与HUD、原生画中画、剧照画廊、评分徽章、短评聚合、女优社交直达、观影行为数据大屏、断点续播、内容过滤与屏蔽、切屏检测屏蔽、站内自动登录、收藏批量备份、临时加速、快进倒退、区间循环、可拖拽可隐藏UI、实时日志
// @author       Momomo
// @icon         https://picui.ogmua.cn/s1/2026/09/27/6ab8f61cabe08.ico
// @icon64       https://picui.ogmua.cn/s1/2026/09/27/6ab8f61cabe08.ico
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
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_deleteValue
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
// @connect      jable.tv
// @connect      www.jable.tv
// @connect      missav.ai
// @connect      missav.ws
// @connect      missav.live
// @connect      missav.com
// @connect      missav123.com
// @connect      missav.fans
// @connect      missav.media
// @connect      thisav.com
// @connect      *
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
    const SUBTITLE_IDLE_DELAY = 500;
    const QUICK_HIDE_DELAY = 2000;
    const QUICK_LEAVE_DELAY = 0;
    const MIN_PLAYER_WIDTH = 480;
    const MIN_PLAYER_HEIGHT = 260;
    const QUICK_BOTTOM_OFFSET = 90;
    const QUICK_PORTAL_ID = 'av-helper-quick-portal';
    const PLAYER_HOST_SELECTOR = '.plyr__video-wrapper, .plyr, .video-js, .vjs-tech, #player, .player-wrapper, .player-container, .artplayer, .dplayer, .jwplayer';
    const PREVIEW_HOST_SELECTOR = '.video-img-box, .thumbnail, .video-item, .list-item, .video-list-item, article.video-card, .jable-carousel, .owl-carousel, .owl-stage, .owl-stage-outer, .owl-item, .horizontal-img-box, .av-info-section, .av-analytics-page, .custom-ui-layer, .custom-control-panel, .custom-quick-controls, .av-stills-grid, .av-review-list, .av-list-grid';
    const REPEAT_SEEK_INTERVAL = 120;
    const PANEL_WIDTH = 310;
    const PASSIVE_CAPTURE = { passive: true, capture: true };
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
        'div[class*="fixed"][class*="right-"][class*="bottom-"]',
        'iframe[id^="aswift_"]',
        'iframe[name^="aswift_"]',
        'iframe[src*="doubleclick"]',
        'iframe[src*="googlesyndication"]',
        'iframe[src*="adservice"]',
        'div[id^="google_ads"]',
        'ins.adsbygoogle',
        'div[id^="ad-"]',
        'div[id^="ads-"]',
        'div[class*="ad-container"]',
        'div[class*="ad-wrapper"]',
        'div[class*="ad_banner"]',
        'div[class*="ad-placement"]'
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


    async function mapPool(list, size, worker) {
        const items = Array.from(list || []);
        const out = new Array(items.length);
        const limit = Math.max(1, Math.min(Number(size) || 1, items.length || 1));
        let cursor = 0;
        const runner = async () => {
            for (;;) {
                const index = cursor;
                cursor += 1;
                if (index >= items.length) return;
                try {
                    out[index] = await worker(items[index], index);
                } catch (_) {
                    out[index] = null;
                }
            }
        };
        await Promise.all(Array.from({ length: limit }, runner));
        return out;
    }


    const META_LABEL_TITLE = /^(?:Title|標題|标题|タイトル|作品名)\s*[:：]?$/i;
    const META_LABEL_CODE = /^(?:Code|品番|番号|番號)\s*[:：]?$/i;
    const META_LABEL_ACTRESS = /^(?:Actress|Actors?|Cast|主演|演員|演员|女優|女优|モデル)\s*[:：]?$/i;
    const META_LABEL_GENRE = /^(?:Genre|Tag|Tags|類別|类别|類型|类型|主題|主题|標籤|标签|ジャンル)\s*[:：]?$/i;
    const META_LABEL_MAKER = /^(?:Maker|Studio|Label|Company|メーカー|メーカ|スタジオ|片商|廠商|厂商|制作|製作|發行商|发行商)\s*[:：]?$/i;
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


        const blockBuf = new Array(16);
        const str2blk = (bytes, offset) => {
            for (let i = 0; i < 64; i += 4) {
                blockBuf[i >> 2] = bytes[offset + i] + (bytes[offset + i + 1] << 8) +
                    (bytes[offset + i + 2] << 16) + (bytes[offset + i + 3] << 24);
            }
            return blockBuf;
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
    const CREDENTIAL_PREFIX = 'avCred:';
    function credentialXor(text) {
        const salt = `av-${SITE_TAG}-${location.hostname}`;
        let out = '';
        for (let index = 0; index < text.length; index += 1) out += String.fromCharCode(text.charCodeAt(index) ^ salt.charCodeAt(index % salt.length));
        return out;
    }

    function credentialEncode(value) {
        try {
            const bytes = new TextEncoder().encode(String(value));
            let binary = '';
            for (const byte of bytes) binary += String.fromCharCode(byte);
            return btoa(credentialXor(binary));
        } catch (_) {
            return '';
        }
    }
    function credentialDecode(raw) {
        try {
            const binary = credentialXor(atob(String(raw)));
            const bytes = new Uint8Array(binary.length);
            for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
            return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
        } catch (_) {
            return '';
        }
    }
    const loginVault = {
        key(name) {
            return `${CREDENTIAL_PREFIX}${name}@${SITE_TAG}`;
        },
        legacyKey(name) {
            return `${name}@${SITE_TAG}`;
        },
        gmReady() {
            return typeof GM_getValue === 'function' && typeof GM_setValue === 'function' && typeof GM_deleteValue === 'function';
        },
        read(name) {
            if (this.gmReady()) {
                try {
                    const value = GM_getValue(this.key(name), '');
                    if (value !== undefined && value !== null && value !== '') return String(value);
                } catch (_) {
                }
            }
            const encoded = store.get(this.key(name));
            if (encoded) return credentialDecode(encoded);
            const legacy = store.get(this.legacyKey(name));
            return legacy === null || legacy === undefined ? '' : String(legacy);
        },
        write(name, value) {
            const text = value === null || value === undefined ? '' : String(value);
            store.remove(this.key(name));
            store.remove(this.legacyKey(name));
            if (!text) {
                if (this.gmReady()) {
                    try {
                        GM_deleteValue(this.key(name));
                    } catch (_) {
                    }
                }
                return;
            }
            if (this.gmReady()) {
                try {
                    GM_setValue(this.key(name), text);
                    return;
                } catch (_) {
                }
            }
            store.set(this.key(name), credentialEncode(text));
        },
        remove(name) {
            store.remove(this.key(name));
            store.remove(this.legacyKey(name));
            if (typeof GM_deleteValue === 'function') {
                try {
                    GM_deleteValue(this.key(name));
                } catch (_) {
                }
            }
        },
        migrate() {
            if (!this.gmReady()) return;
            for (const name of ['loginUser', 'loginPass']) {
                const legacy = store.get(this.legacyKey(name));
                if (!legacy) continue;
                if (!this.read(name)) this.write(name, legacy);
                store.remove(this.legacyKey(name));
            }
        }
    };
    loginVault.migrate();
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
        loginUser: loginVault.read('loginUser'),
        loginPass: loginVault.read('loginPass'),
        autoLogin: store.getBool('autoLogin', true),
        loginPanelOpen: store.getBool('loginPanelOpen', false),
        backupFields: store.getKeyName('backupFields', 'name,code'),
        backupLimit: store.getNumber('backupLimit', 50, 1, 2000),
        backupSource: store.getKeyName('backupSource', ''),
        backupX: store.getNumber('backupX', NaN, 0, 99999),
        backupY: store.getNumber('backupY', NaN, 0, 99999),
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
        loginVault.write('loginUser', settings.loginUser || '');
        loginVault.write('loginPass', settings.loginPass || '');
        store.set('autoLogin', settings.autoLogin);
        store.set('loginPanelOpen', settings.loginPanelOpen);
        store.set('backupFields', settings.backupFields);
        store.set('backupLimit', settings.backupLimit);
        store.set('backupSource', settings.backupSource);
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
        favoriteBackup: null,
        subtitleSource: '',
        cueIndex: null,
        cueCursor: -1,
        activeCueText: '',
        subtitleLoading: false,
        subtitleRAF: 0,
        subtitleIdleTimer: 0,
        panel: null,
        loginStatusEl: null,
        loginBusy: false,
        quick: null,
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
        hudHost: null,
        hudEl: null,
        resumeHost: null,
        resumeToast: null,
        resumeToastTimer: 0,
        resumeTimer: 0,
        resumeVideo: null,
        resumeDoneCode: '',
        resumeLastSaved: 0,
        resumeGuard: null,
        resumeUserSeekAt: 0,
        holdTimer: 0,
        holdPointerId: -1,
        holdStartX: 0,
        holdStartY: 0,
        holdingSpeed: false,
        suppressClickUntil: 0,
        infoSection: null,
        lightbox: null,
        infoSession: 0,
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
        analyticsQuery: '',
        analyticsHourlyMetric: 'count',
        analyticsHourmapMetric: 'count',
        analyticsActressMetric: 'count',
        analyticsMakerMetric: 'count',
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
    const COCKPIT_FLAG_KEY = 'avSub:cockpit';
    function cockpitFlagGet() {
        try {
            return sessionStorage.getItem(COCKPIT_FLAG_KEY) === '1';
        } catch (_) {
            return false;
        }
    }
    function cockpitFlagSet() {
        try {
            sessionStorage.setItem(COCKPIT_FLAG_KEY, '1');
        } catch (_) {
        }
    }
    function cockpitFlagClear() {
        try {
            sessionStorage.removeItem(COCKPIT_FLAG_KEY);
        } catch (_) {
        }
    }
    if (ANALYTICS_ENTRY) {
        engageCockpitGuard();
        armMediaKiller();
        cockpitFlagSet();
    }
    let cockpitSticky = ANALYTICS_ENTRY || cockpitFlagGet();
    if (/^https:\/\/(?:missav|thisav)\.com/.test(location.href)) {
        location.replace(location.href.replace(/^https:\/\/(?:missav|thisav)\.com/, 'https://missav.live'));
        return;
    }
    const PROTECTED_FRAME = /recaptcha|hcaptcha|turnstile|challenges\.cloudflare|accounts\.google|appleid|facebook\.com|stripe|paypal|oauth/i;
    function isProtectedFrame(element) {
        if (!element || element.tagName !== 'IFRAME') return false;
        return PROTECTED_FRAME.test(element.getAttribute('src') || element.src || '');
    }
    const VISIBILITY_PATCHED = Symbol.for('av-helper.visibilityPatched');
    const ORIG_DOC_DESCRIPTORS = {};
    const protectInstance = {};
    let guardSweepAt = 0;
    const readDescriptors = win => {
        for (const key of ['hidden', 'webkitHidden', 'visibilityState', 'webkitVisibilityState']) {
            if (ORIG_DOC_DESCRIPTORS[key]) continue;
            let holder = win.document;
            while (holder) {
                const desc = Object.getOwnPropertyDescriptor(holder, key);
                if (desc && (typeof desc.get === 'function' || 'value' in desc)) {
                    ORIG_DOC_DESCRIPTORS[key] = desc;
                    break;
                }
                holder = Object.getPrototypeOf(holder);
            }
        }
    };
    const originalHidden = () => {
        const desc = ORIG_DOC_DESCRIPTORS.hidden;
        try {
            if (desc) return typeof desc.get === 'function' ? Boolean(desc.get.call(document)) : Boolean(desc.value);
        } catch (_) {
        }
        try {
            const fallback = Object.getOwnPropertyDescriptor(Document.prototype, 'hidden');
            if (fallback && typeof fallback.get === 'function') return Boolean(fallback.get.call(document));
        } catch (_) {
        }
        return false;
    };
    const visibilityState = () => (originalHidden() ? 'hidden' : 'visible');
    const isPageHidden = () => originalHidden();
    const applyVisibilitySpoof = (win, on) => {
        const target = win?.document;
        if (!target || target[VISIBILITY_PATCHED] === on) return false;
        try {
            if (on) readDescriptors(win);
            protectInstance.hidden = on ? Object.getOwnPropertyDescriptor(target, 'hidden') : null;
            protectInstance.visibilityState = on ? Object.getOwnPropertyDescriptor(target, 'visibilityState') : null;
            Object.defineProperty(target, 'hidden', {
                configurable: true,
                enumerable: true,
                get() {
                    return on ? false : originalHidden();
                }
            });
            Object.defineProperty(target, 'visibilityState', {
                configurable: true,
                enumerable: true,
                get() {
                    return on ? 'visible' : visibilityState();
                }
            });
            Object.defineProperty(target, VISIBILITY_PATCHED, { value: on, configurable: true });
            return true;
        } catch (_) {
            return false;
        }
    };
    const patchFocusApi = (win, on) => {
        const target = win?.document;
        if (!target || typeof target.hasFocus !== 'function') return false;
        if (on) {
            if (!protectInstance.hasFocus) protectInstance.hasFocus = target.hasFocus;
            if (target.hasFocus[VISIBILITY_PATCHED] === true) return false;
            const stub = function hasFocus() {
                return true;
            };
            Object.defineProperty(stub, VISIBILITY_PATCHED, { value: true, configurable: true });
            try {
                target.hasFocus = stub;
            } catch (_) {
                Object.defineProperty(target, 'hasFocus', { value: stub, configurable: true, writable: true });
            }
            return true;
        }
        if (protectInstance.hasFocus) {
            try {
                target.hasFocus = protectInstance.hasFocus;
            } catch (_) {
            }
            protectInstance.hasFocus = null;
            return true;
        }
        return false;
    };
    const patchEventHandlers = (win, on) => {
        const target = win?.document;
        if (!target) return false;
        let changed = false;
        for (const key of ['onvisibilitychange']) {
            const current = target[key];
            if (on) {
                if (current && current[VISIBILITY_PATCHED] !== true) {
                    protectInstance[key] = current;
                    const stub = function visibilityHandler() {
                        return undefined;
                    };
                    Object.defineProperty(stub, VISIBILITY_PATCHED, { value: true, configurable: true });
                    try {
                        target[key] = stub;
                        changed = true;
                    } catch (_) {
                    }
                }
            } else if (current && current[VISIBILITY_PATCHED] === true) {
                try {
                    target[key] = protectInstance[key] || null;
                    changed = true;
                } catch (_) {
                    try {
                        target[key] = null;
                        changed = true;
                    } catch (_) {
                    }
                }
                protectInstance[key] = null;
            }
        }
        return changed;
    };
    const blockVisibilityEvents = event => {
        const type = event.type;
        if (!event.isTrusted) return;
        if (type === 'blur' || type === 'focusout') {
            const target = event.target;
            const tag = target === document ? '' : String(target?.tagName || '');
            if (tag && tag !== 'BODY' && tag !== 'HTML') return;
        }
        if (event.cancelable) event.preventDefault();
        event.stopImmediatePropagation();
    };
    const ensureVisibilityGuard = force => {
        const now = Date.now();
        if (!force && now - guardSweepAt < 1500) return false;
        guardSweepAt = now;
        const win = typeof unsafeWindow !== 'undefined' && unsafeWindow ? unsafeWindow : window;
        applyVisibilitySpoof(win, true);
        patchFocusApi(win, true);
        patchEventHandlers(win, true);
        return true;
    };
    for (const type of ['visibilitychange', 'webkitvisibilitychange', 'pagehide', 'freeze', 'resume', 'blur', 'focusout']) {
        window.addEventListener(type, blockVisibilityEvents, { capture: true, passive: false });
        document.addEventListener(type, blockVisibilityEvents, { capture: true, passive: false });
    }
    ensureVisibilityGuard(true);
    window.addEventListener('load', () => {
        ensureVisibilityGuard(true);
        document.dispatchEvent(new Event('visibilitychange'));
    }, { once: true });
    window.setInterval(() => {
        try {
            ensureVisibilityGuard(false);
        } catch (_) {
        }
    }, 3000);
    const WINDOW_OPEN_PATCHED = Symbol.for('av-helper.windowOpenPatched');
    function isCrossSiteWindow(target) {

        try {
            return String(target.location?.href || '') !== location.href;
        } catch (_) {
            return true;
        }
    }
    function patchWindowOpen(target, allowSameSite = false) {
        if (!target || target[WINDOW_OPEN_PATCHED]) return;
        const original = target.open;
        try {
            target.open = function guardedWindowOpen(url, name, features) {
                const href = String(url ?? '');
                if (!href || /^(?:javascript:|about:blank)/i.test(href)) return null;
                let resolved = null;
                try {
                    resolved = new URL(href, location.href);
                } catch (_) {
                    return null;
                }

                const sameHost = resolved.hostname === location.hostname && resolved.protocol === location.protocol;
                const looksPopup = /\bpopup\b|width=|\bwidth\s*[:=]|height=/i.test(String(features || ''));
                if (sameHost && !looksPopup) {
                    return typeof original === 'function' ? original.call(this, url, name, features) : null;
                }
                if (allowSameSite && !isCrossSiteWindow(target)) {
                    return typeof original === 'function' ? original.call(this, url, name, features) : null;
                }
                return null;
            };
            Object.defineProperty(target, WINDOW_OPEN_PATCHED, { value: true, configurable: true });
        } catch (_) {
        }
    }
    patchWindowOpen(typeof unsafeWindow !== 'undefined' ? unsafeWindow : window);
    const patchedFrames = new WeakSet();
    let iframePatchAt = 0;
    function patchAllIframeWindows(force = false) {
        const now = Date.now();
        if (!force && now - iframePatchAt < 2000) return;
        iframePatchAt = now;

        for (const frame of document.querySelectorAll('iframe')) {
            if (patchedFrames.has(frame)) continue;
            patchedFrames.add(frame);
            if (isProtectedFrame(frame)) continue;
            try {
                patchWindowOpen(frame.contentWindow, true);
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
                if (isProtectedFrame(element)) continue;
                element.remove();
            } else if (element.style.display !== 'none') {
                element.style.display = 'none';
            }
        }
    }
    function sweepAdNodes(root) {
        if (!root || root.nodeType !== 1) return;
        for (const element of root.querySelectorAll(AD_SELECTORS)) {
            if (isProtectedNode(element)) continue;
            if (element.tagName === 'IFRAME') {
                if (isProtectedFrame(element)) continue;
                element.remove();
            } else if (element.style.display !== 'none') {
                element.style.display = 'none';
            }
        }
        if (isProtectedNode(root)) return;
        if (root.tagName === 'IFRAME') {
            if (!isProtectedFrame(root)) root.remove();
            return;
        }
        if (root.matches && root.matches(AD_SELECTORS) && root.style.display !== 'none') root.style.display = 'none';
    }
    function startAdObserver() {
        if (state.adObserver || !document.body) return;
        const pending = [];
        let frames = false;
        const sweep = throttle(() => {
            if (!pending.length) return;
            const batch = new Set(pending.splice(0, pending.length));
            const nodes = [];
            for (const node of batch) {
                let ancestor = node.parentElement;
                let nested = false;
                while (ancestor) {
                    if (batch.has(ancestor)) {
                        nested = true;
                        break;
                    }
                    ancestor = ancestor.parentElement;
                }
                if (!nested) nodes.push(node);
            }
            const patchFrames = frames;
            frames = false;
            patchWindowOpen(typeof unsafeWindow !== 'undefined' ? unsafeWindow : window);
            if (patchFrames) patchAllIframeWindows(true);
            for (const node of nodes) sweepAdNodes(node);
            if (!state.bound) initPlayer();
        }, MUTATION_THROTTLE);
        state.adObserver = new MutationObserver(records => {
            for (const record of records) {
                for (const node of record.addedNodes) {
                    if (node.nodeType !== 1) continue;
                    pending.push(node);
                    if (!frames && (node.tagName === 'IFRAME' || (node.querySelector && node.querySelector('iframe')))) frames = true;
                }
            }
            if (pending.length) sweep();
        });
        trackObserver(state.adObserver, document.body, { childList: true, subtree: true });
    }
    const LOG_LIMIT = 80;
    const pageLifecycle = [];
    const trackInterval = (id, dispose = () => clearInterval(id)) => {
        pageLifecycle.push(dispose);
        return id;
    };
    const trackFrame = (id, dispose = () => cancelAnimationFrame(id)) => {
        pageLifecycle.push(dispose);
        return id;
    };
    const trackObserver = (observer, target, options) => {
        if (!observer || !target) return observer;
        observer.observe(target, options);
        pageLifecycle.push(() => {
            try {
                observer.disconnect();
            } catch (_) {
            }
        });
        return observer;
    };
    const disposePageLifecycle = () => {
        while (pageLifecycle.length) {
            const dispose = pageLifecycle.pop();
            try {
                dispose();
            } catch (_) {
            }
        }
    };
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
        .btn-group .av-open-cockpit { display: inline-flex; align-items: center; justify-content: center; gap: 4px; box-sizing: border-box; width: 100%; min-height: 26px; padding: 4px 5px; border: 1px solid rgba(59,130,246,.5); border-radius: 6px; background: linear-gradient(135deg,#3b82f6,#2563eb); color: #f8fafc; font-family: inherit; font-size: 12px; font-weight: 600; line-height: 1; letter-spacing: .2px; text-decoration: none; text-shadow: 0 1px 2px rgba(0,0,0,.4); cursor: pointer; transition: filter .2s ease; }
        .btn-group .av-open-cockpit:hover { filter: brightness(1.12); }
        .panel-full-btn { display: block; width: 100%; min-height: 24px; margin-top: 4px; padding: 2px 8px; border: 0; border-radius: 6px; background: rgba(255,255,255,.06); color: #cbd5e1; font-family: inherit; font-size: 12px; font-weight: 600; cursor: pointer; transition: background .2s ease, color .2s ease; }
        .panel-full-btn:hover { background: rgba(255,255,255,.14); color: #fff; }
        .av-collapse { overflow: hidden; max-height: 2000px; opacity: 1; transform: translateY(0); visibility: visible; pointer-events: auto; transition: max-height .3s cubic-bezier(.4,0,.2,1), opacity .22s ease, transform .3s cubic-bezier(.4,0,.2,1), margin-top .3s ease, padding-top .3s ease, padding-bottom .3s ease, border-top-width .3s ease, visibility .3s; }
        .av-collapse.av-collapsed { max-height: 0 !important; margin-top: 0 !important; padding-top: 0 !important; padding-bottom: 0 !important; border-top-width: 0 !important; opacity: 0 !important; transform: translateY(-6px) !important; visibility: hidden !important; pointer-events: none !important; }
        .panel-status-log { margin-top: 8px; padding: 8px; border: 1px solid rgba(255,255,255,.15); border-radius: 6px; background: rgba(0,0,0,.3); color: #bae6fd; font-size: 11px; font-weight: 500; text-align: left; letter-spacing: .5px; height: 90px; overflow-y: auto; scrollbar-width: thin; scrollbar-color: rgba(148,163,184,.4) transparent; scrollbar-gutter: stable; display: flex; flex-direction: column; gap: 4px; text-shadow: none; }
        .log-entry { display: flex; align-items: flex-start; word-break: break-all; flex: 0 0 auto; }
        .log-time { color: #94a3b8; margin-right: 6px; font-family: ui-monospace,Consolas,monospace; flex-shrink: 0; }
        .custom-quick-controls { position: fixed !important; left: 50% !important; right: auto !important; top: auto !important; bottom: ${QUICK_BOTTOM_OFFSET}px !important; transform: translateX(-50%) scale(var(--quick-scale, 1)) !important; transform-origin: center center; z-index: 2147483647 !important; isolation: isolate; display: flex; flex-wrap: nowrap; align-items: center; justify-content: center; gap: 4px; width: max-content !important; height: auto !important; min-height: 0 !important; margin: 0 !important; padding: 6px 12px; border: 1px solid rgba(255,255,255,.14); border-radius: 22px; background: rgba(14,17,24,.42); backdrop-filter: blur(6px); -webkit-backdrop-filter: blur(6px); box-shadow: 0 4px 16px rgba(0,0,0,.28); white-space: nowrap; max-width: calc(100% - 16px) !important; opacity: 0; visibility: hidden; pointer-events: none; transition: none !important; box-sizing: border-box !important; user-select: none; }
        #av-helper-quick-portal { position: fixed !important; inset: 0 !important; width: 0 !important; height: 0 !important; margin: 0 !important; padding: 0 !important; border: 0 !important; background: none !important; overflow: visible !important; pointer-events: none !important; z-index: 2147483647 !important; }
        .custom-quick-controls.quick-visible { opacity: 1 !important; visibility: visible !important; pointer-events: auto !important; }
        .custom-quick-controls .quick-btn { position: relative; z-index: 1; pointer-events: auto !important; }
        .custom-quick-controls .quick-btn * { pointer-events: auto !important; }
        .quick-jump-group { display: flex; flex-wrap: nowrap; align-items: center; gap: 2px; min-width: 0; }
        .quick-btn { min-width: 48px; height: 32px; padding: 0 8px; border: 0; border-radius: 8px; background: transparent; color: rgba(255,255,255,.92); cursor: pointer; font-family: inherit; font-size: 13px; font-weight: 600; display: inline-flex; align-items: center; justify-content: center; line-height: 1; white-space: nowrap; flex: 0 0 auto; overflow: visible; text-overflow: clip; pointer-events: auto !important; }
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
        .slider-row-container { display: flex; flex-direction: column; gap: 8px; margin-top: 12px; padding: 10px 0 14px; border-top: 1px solid rgba(255,255,255,.15); }
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
        .loop-menu { position: absolute; bottom: 44px; left: 50%; transform: translateX(-50%); background: rgba(20,22,30,.95); border: 1px solid rgba(255,255,255,.2); border-radius: 8px; padding: 6px; display: none; flex-direction: column; gap: 4px; z-index: 2147480000; white-space: nowrap; backdrop-filter: blur(6px); box-shadow: 0 8px 24px rgba(0,0,0,.5); pointer-events: auto; }
        .loop-menu.show { display: flex; }
        .loop-menu-btn { background: transparent; border: 0; color: #fff; padding: 6px 12px; text-align: left; border-radius: 4px; cursor: pointer; font-family: inherit; font-size: 12px; font-weight: 600; }
        .loop-menu-btn:hover { background: rgba(255,255,255,.15); color: #60a5fa; }
        .subtitle-picker { position: fixed; left: 15px; top: 40%; z-index: 1; min-width: 320px; max-width: min(560px, 92vw); max-height: min(60vh, 420px); overflow-y: auto; overscroll-behavior: contain; padding: 12px; border-radius: 12px; --ui-bg-opacity: .3; --ui-blur: 1px; --ui-hover-opacity: .9; --ui-hover-blur: 1px; background: rgba(28,28,34,var(--ui-bg-opacity)); backdrop-filter: blur(var(--ui-blur)) saturate(200%); -webkit-backdrop-filter: blur(var(--ui-blur)) saturate(200%); border: 1px solid rgba(255,255,255,.18); box-shadow: inset 0 1px 0 rgba(255,255,255,.2), 0 12px 34px rgba(0,0,0,.45); color: #f8fafc; font: 13px/1.45 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Microsoft YaHei",sans-serif; text-shadow: 0 1px 2px rgba(0,0,0,.6); transition: background .2s ease, box-shadow .2s ease; pointer-events: auto; contain: layout style; }
        .subtitle-picker:hover, .subtitle-picker:focus-within { background: rgba(28,28,34,var(--ui-hover-opacity)); backdrop-filter: blur(var(--ui-hover-blur)) saturate(200%); -webkit-backdrop-filter: blur(var(--ui-hover-blur)) saturate(200%); box-shadow: inset 0 1px 0 rgba(255,255,255,.25), 0 14px 38px rgba(0,0,0,.55); }
        .subtitle-picker.panel-dragging { transition: none; }
        .subtitle-picker-header { position: sticky; top: -12px; z-index: 2; display: flex; justify-content: space-between; align-items: center; gap: 10px; margin: -12px -12px 0; padding: 12px 12px 8px; background: rgba(0,0,0,.4); border-bottom: 1px solid rgba(255,255,255,.15); border-radius: 12px 12px 0 0; cursor: move; user-select: none; }
        .subtitle-picker-title { color: #60a5fa; font-weight: 700; }
        .subtitle-picker-close { cursor: pointer; color: #94a3b8; }
        .subtitle-picker-close:hover { color: #fff; }
        .subtitle-picker-row { padding: 8px; margin-top: 5px; border-bottom: 1px solid rgba(255,255,255,.1); cursor: pointer; word-break: break-all; }
        .subtitle-picker-row:hover { background: rgba(96,165,250,.16); }
        .av-backup-window { position: fixed; left: 15px; top: 12%; z-index: 1; box-sizing: border-box; width: min(560px, 94vw); max-height: min(78vh, 640px); overflow-y: auto; overscroll-behavior: contain; padding: 12px; border-radius: 12px; --ui-bg-opacity: .34; --ui-blur: 1px; --ui-hover-opacity: .94; --ui-hover-blur: 1px; background: rgba(28,28,34,var(--ui-bg-opacity)); backdrop-filter: blur(var(--ui-blur)) saturate(200%); -webkit-backdrop-filter: blur(var(--ui-blur)) saturate(200%); border: 1px solid rgba(255,255,255,.18); box-shadow: inset 0 1px 0 rgba(255,255,255,.2), 0 12px 34px rgba(0,0,0,.45); color: #f8fafc; font: 13px/1.45 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Microsoft YaHei",sans-serif; text-shadow: 0 1px 2px rgba(0,0,0,.6); transition: background .2s ease, box-shadow .2s ease; pointer-events: auto; contain: layout style; }
        .av-backup-window:hover, .av-backup-window:focus-within { background: rgba(28,28,34,var(--ui-hover-opacity)); backdrop-filter: blur(var(--ui-hover-blur)) saturate(200%); -webkit-backdrop-filter: blur(var(--ui-hover-blur)) saturate(200%); box-shadow: inset 0 1px 0 rgba(255,255,255,.25), 0 14px 38px rgba(0,0,0,.55); }
        .av-backup-window.panel-dragging { transition: none; }
        .av-backup-header { position: sticky; top: -12px; z-index: 2; display: flex; justify-content: space-between; align-items: center; gap: 10px; margin: -12px -12px 0; padding: 12px 12px 8px; background: rgba(0,0,0,.4); border-bottom: 1px solid rgba(255,255,255,.15); border-radius: 12px 12px 0 0; cursor: move; user-select: none; }
        .av-backup-title { color: #60a5fa; font-weight: 700; }
        .av-backup-close { cursor: pointer; color: #94a3b8; }
        .av-backup-close:hover { color: #fff; }
        .av-backup-fields { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 6px; margin: 8px 0 6px; }
        .av-backup-field { display: flex; align-items: center; gap: 6px; padding: 6px 8px; border: 1px solid rgba(255,255,255,.18); border-radius: 8px; background: rgba(255,255,255,.06); cursor: pointer; font-size: 12px; font-weight: 600; white-space: nowrap; }
        .av-backup-field input { margin: 0; cursor: pointer; }
        .av-backup-field.is-on { border-color: rgba(96,165,250,.6); background: rgba(59,130,246,.2); }
        .av-backup-line { display: flex; align-items: center; gap: 8px; margin: 6px 0; font-size: 12px; }
        .av-backup-line > span { flex: 0 0 auto; color: #cbd5e1; font-weight: 600; }
        .av-backup-line input { flex: 1; min-width: 0; padding: 5px 8px; border-radius: 6px; border: 1px solid rgba(255,255,255,.2); background: rgba(0,0,0,.35); color: #f8fafc; font: inherit; }
        .av-backup-line input[type="number"] { flex: 0 0 78px; }
        .av-backup-actions { display: flex; gap: 6px; margin-top: 8px; }
        .av-backup-btn { flex: 1; padding: 7px 10px; border-radius: 8px; border: 1px solid rgba(255,255,255,.22); background: rgba(255,255,255,.1); color: #f8fafc; font: 600 12px/1.2 inherit; cursor: pointer; }
        .av-backup-btn:hover:not(:disabled) { background: rgba(255,255,255,.18); }
        .av-backup-btn.primary { border-color: rgba(59,130,246,.55); background: linear-gradient(135deg,#3b82f6,#2563eb); }
        .av-backup-btn:disabled { opacity: .5; cursor: not-allowed; }
        .av-backup-progress { margin-top: 9px; height: 6px; border-radius: 999px; background: rgba(255,255,255,.12); overflow: hidden; }
        .av-backup-progress > i { display: block; height: 100%; width: 0; background: linear-gradient(90deg,#3b82f6,#22d3ee); transition: width .2s ease; }
        .av-backup-log { margin-top: 8px; max-height: 150px; overflow-y: auto; overscroll-behavior: contain; padding: 8px; border-radius: 8px; background: rgba(0,0,0,.35); border: 1px solid rgba(255,255,255,.12); color: #cbd5e1; font: 11px/1.5 ui-monospace,Consolas,monospace; white-space: pre-wrap; word-break: break-all; }
        .av-backup-hint { color: #94a3b8; font-size: 11px; line-height: 1.5; margin-top: 4px; }
        .speed-hud-host { position: absolute; inset: 0; display: flex; justify-content: center; align-items: flex-start; padding-top: 24px; pointer-events: none; z-index: 26; }
        .speed-hud { display: inline-flex; align-items: center; justify-content: center; padding: 8px 18px; border-radius: 9999px; background: rgba(10,10,10,.85); border: 1px solid rgba(255,255,255,.16); color: #ededed; box-shadow: 0 4px 20px rgba(0,0,0,.5); pointer-events: none; user-select: none; -webkit-user-select: none; animation: speed-hud-pulse 1.2s ease-in-out infinite alternate; }
        .speed-hud-content { display: flex; align-items: center; gap: 8px; font: 500 14px/1 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Microsoft YaHei",sans-serif; letter-spacing: -.2px; }
        .speed-hud-rate { color: #50e3c2; font-family: ui-monospace,Consolas,monospace; font-size: 14px; font-weight: 600; }
        .speed-hud-arrows { font-size: 12px; letter-spacing: -1px; opacity: .85; }
        @keyframes speed-hud-pulse { from { transform: scale(1); } to { transform: scale(1.03); } }
        .av-resume-toast { display: inline-flex; align-items: center; gap: 12px; padding: 10px 14px 10px 18px; border-radius: 9999px; background: rgba(10,10,10,.88); border: 1px solid rgba(255,255,255,.16); color: #ededed; box-shadow: 0 6px 24px rgba(0,0,0,.5); pointer-events: auto; user-select: none; -webkit-user-select: none; font: 500 13px/1 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Microsoft YaHei",sans-serif; }
        .av-resume-toast-text { white-space: nowrap; }
        .av-resume-toast-pos { color: #50e3c2; font-family: ui-monospace,Consolas,monospace; font-weight: 600; }
        .av-resume-toast-btn { appearance: none; border: 0; border-radius: 9999px; padding: 6px 14px; background: #3b82f6; color: #fff; font: 600 12px/1 inherit; cursor: pointer; }
        .av-resume-toast-btn:hover { background: #2563eb; }
        .av-resume-toast-close { appearance: none; border: 0; background: transparent; color: #9ca3af; font-size: 16px; line-height: 1; padding: 0 2px; cursor: pointer; }
        .av-resume-toast-close:hover { color: #e5e7eb; }
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
        .av-jable-meta { margin: 12px auto; max-width: 100%; padding: 12px 14px; border-radius: 12px; background: rgba(20,22,30,.72); border: 1px solid rgba(255,255,255,.12); box-shadow: 0 4px 16px rgba(0,0,0,.24); color: #e2e8f0; font: 13px/1.6 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Microsoft YaHei",sans-serif; text-align: left; }
        .av-jable-meta:hover { border-color: rgba(255,255,255,.2); }
        .av-jable-meta-head { display: flex; align-items: center; gap: 8px; margin-bottom: 10px; }
        .av-jable-meta-title { font-size: 13px; font-weight: 600; color: #f1f5f9; }
        .av-jable-meta-src { margin-left: auto; padding: 1px 8px; border-radius: 9999px; background: rgba(96,165,250,.14); border: 1px solid rgba(96,165,250,.4); color: #93c5fd; font-size: 11px; line-height: 1.6; white-space: nowrap; text-decoration: none; }
        a.av-jable-meta-src:hover { color: #bfdbfe; border-color: rgba(96,165,250,.7); }
        .av-jable-meta-grid { display: grid; gap: 8px; }
        .av-jable-meta-item { display: grid; grid-template-columns: 62px 1fr; gap: 10px; align-items: start; }
        .av-jable-meta-label { color: #94a3b8; font-size: 12px; line-height: 1.7; white-space: nowrap; }
        .av-jable-meta-values { display: flex; flex-wrap: wrap; gap: 6px; min-width: 0; color: #e2e8f0; font-size: 13px; line-height: 1.7; word-break: break-word; }
        .av-jable-model { display: inline-flex; align-items: center; padding: 1px 9px; border-radius: 9999px; background: rgba(255,255,255,.06); border: 1px solid rgba(255,255,255,.14); color: #e2e8f0; font-size: 12px; line-height: 1.6; text-decoration: none; }
        a.av-jable-model:hover { background: rgba(96,165,250,.18); border-color: rgba(96,165,250,.5); color: #fff; }
        .av-jable-meta-pending { color: #64748b; }
        @media (max-width: 640px) { .av-jable-meta { padding: 10px 12px; } .av-jable-meta-item { grid-template-columns: 54px 1fr; gap: 8px; } }
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
        }, { passive: true });
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
        let saveTimer = 0;


        const flushPosition = () => {
            clearTimeout(saveTimer);
            saveTimer = 0;
            settings[keys.x] = element.offsetLeft;
            settings[keys.y] = element.offsetTop;
            store.set(keys.x, element.offsetLeft);
            store.set(keys.y, element.offsetTop);
        };
        const scheduleSave = () => {
            clearTimeout(saveTimer);
            saveTimer = setTimeout(flushPosition, 180);
        };
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
            scheduleSave();
        };
        const onUp = () => {
            document.removeEventListener('mousemove', onMove, true);
            document.removeEventListener('mouseup', onUp, true);
            if (moved) {
                flushPosition();
                if (onEnd) onEnd();
                element.classList.remove('panel-dragging');
            } else {
                clearTimeout(saveTimer);
                saveTimer = 0;
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
                scheduleSave();
            };
            const onTouchEnd = () => {
                document.removeEventListener('touchmove', onTouchMove);
                document.removeEventListener('touchend', onTouchEnd);
                flushPosition();
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
        for (const target of [state.panel, state.subtitlePicker, state.filterBar]) {
            if (!target) continue;
            target.style.setProperty('--ui-bg-opacity', settings.opacity);
            target.style.setProperty('--ui-blur', `${settings.blur}px`);
            target.style.setProperty('--ui-hover-opacity', settings.hoverOpacity);
            target.style.setProperty('--ui-hover-blur', `${settings.hoverBlur}px`);
        }
    }
    function setCollapsed(node, collapsed) {
        if (!node) return;
        if (node.hasAttribute && node.hasAttribute('hidden')) node.removeAttribute('hidden');
        node.classList.toggle('av-collapsed', Boolean(collapsed));
        node.setAttribute('aria-hidden', collapsed ? 'true' : 'false');
    }
    function buildPanelHeader(panelTitleText) {
        const header = document.createElement('div');
        header.className = 'panel-header';
        header.title = '按住可拖动面板';
        const panelTitle = document.createElement('span');
        panelTitle.className = 'panel-title';
        panelTitle.textContent = panelTitleText;
        const gearBtn = document.createElement('button');
        gearBtn.type = 'button';
        gearBtn.className = 'panel-gear';
        gearBtn.setAttribute('aria-label', '展开或折叠设置面板');
        gearBtn.setAttribute('aria-expanded', settings.isMinimized ? 'false' : 'true');
        gearBtn.title = settings.isMinimized ? '展开设置面板' : '折叠设置面板';
        gearBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3.1"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>';
        header.append(gearBtn, panelTitle);
        return { header, gearBtn };
    }
    function buildPanelKeysRow() {
        const keysRow = document.createElement('div');
        keysRow.className = 'panel-row';
        const offsetGroup = createInputGroup('字幕偏移:', 'number', settings.subtitleOffset, input => {
            applySubtitleOffset(clamp(Number.parseFloat(input.value) || 0, OFFSET_MIN, OFFSET_MAX));
        }, {
            min: OFFSET_MIN, max: OFFSET_MAX, step: 0.1,
            onBlur: input => { input.value = settings.subtitleOffset; }
        });
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
        return { keysRow, offsetInput: offsetGroup.children[1] };
    }
    function buildPanelActionRow(panel, offsetInput, layoutPanel) {
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
        const btnClear = createButton('清除字幕');
        const btnSave = createButton('保存设置', 'btn-primary');
        const btnResetOffset = createButton('重置本站偏移');
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
        const openCockpit = document.createElement('a');
        openCockpit.className = 'av-open-cockpit';
        openCockpit.href = analyticsUrl();
        openCockpit.target = '_blank';
        openCockpit.rel = 'noopener noreferrer';
        openCockpit.title = '在新标签页打开观影行为数据大屏';
        openCockpit.setAttribute('aria-label', '数据大屏');
        openCockpit.append(document.createTextNode('📊 数据大屏'));
        openCockpit.addEventListener('click', () => {
            openCockpit.href = analyticsUrl();
        });
        const btnClearLib = createButton('🗑 清空已看库');
        btnClearLib.title = '只清空当前站点的已看标记，不影响另一个站点';
        btnClearLib.addEventListener('click', () => {
            clearWatched();
            log('本站已看库已清空');
            refreshFilters();
        });
        const btnBackup = createButton('收藏批量备份');
        btnBackup.style.gridColumn = 'span 2';
        btnBackup.title = '把收藏的名称、缩略图、番号、女优、类型、发行商批量打包下载到本地';
        btnBackup.addEventListener('click', openFavoriteBackup);
        actionRow.append(btnLocal, btnWeb, btnAPI, btnClear, btnResetOffset, resetPosBtn, openCockpit, btnClearLib, btnSave, btnBackup);
        return actionRow;
    }
    function buildPanelSliderRow() {
        const sliderRow = document.createElement('div');
        sliderRow.className = 'slider-row-container av-collapse';
        setCollapsed(sliderRow, true);
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
        return sliderRow;
    }
    function buildPanelCollapseToggles(sliderRow) {
        const loginToggleBtn = createButton('👤 隐藏/显示自动登录', 'btn-primary panel-full-btn');
        const loginPanel = buildLoginPanel();
        loginToggleBtn.addEventListener('click', () => {
            const collapsed = !loginPanel.classList.contains('av-collapsed');
            setCollapsed(loginPanel, collapsed);
            settings.loginPanelOpen = !collapsed;
            store.set('loginPanelOpen', settings.loginPanelOpen);
        });
        const toggleSliderBtn = createButton('隐藏/显示透明UI设置', 'btn-primary panel-full-btn');
        toggleSliderBtn.addEventListener('click', () => {
            setCollapsed(sliderRow, !sliderRow.classList.contains('av-collapsed'));
        });
        const filterToggleBtn = createButton('🛡 隐藏/显示内容过滤与屏蔽', 'btn-primary panel-full-btn');
        const filterPanel = buildFilterPanel();
        filterToggleBtn.addEventListener('click', () => {
            const collapsed = !filterPanel.classList.contains('av-collapsed');
            setCollapsed(filterPanel, collapsed);
            settings.filterPanelOpen = !collapsed;
            store.set('filterPanelOpen', settings.filterPanelOpen);
        });
        return { loginToggleBtn, loginPanel, toggleSliderBtn, filterToggleBtn, filterPanel };
    }
    function createPanel() {
        if (state.panel || document.querySelector('.custom-control-panel')) return;
        const panel = document.createElement('div');
        panel.className = 'custom-control-panel';
        panel.style.left = `${clamp(settings.panelX, 0, Math.max(0, window.innerWidth - PANEL_WIDTH))}px`;
        panel.style.top = `${clamp(settings.panelY, 0, Math.max(0, window.innerHeight - 60))}px`;
        state.panel = panel;
        const { header, gearBtn } = buildPanelHeader('综合增强助手');
        const body = document.createElement('div');
        body.className = 'panel-body';
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
        const { keysRow, offsetInput } = buildPanelKeysRow();
        const actionRow = buildPanelActionRow(panel, offsetInput, layoutPanel);
        const sliderRow = buildPanelSliderRow();
        const { loginToggleBtn, loginPanel, toggleSliderBtn, filterToggleBtn, filterPanel } = buildPanelCollapseToggles(sliderRow);
        state.logEl = document.createElement('div');
        state.logEl.className = 'panel-status-log';
        footer.appendChild(state.logEl);
        body.append(keysRow, actionRow, loginToggleBtn, loginPanel, toggleSliderBtn, sliderRow, filterToggleBtn, filterPanel);
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
            let layoutFrame = 0;
            state.panelLayoutObserver = new ResizeObserver(() => {
                if (layoutFrame) return;
                layoutFrame = trackFrame(requestAnimationFrame(() => {
                    layoutFrame = 0;
                    layoutPanel();
                }));
            });
            state.panelLayoutObserver.observe(collapsibleInner);
            pageLifecycle.push(() => state.panelLayoutObserver?.disconnect());
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
        autoLogin();
    }
    const isLoopMenuOpen = () => Boolean(state.loopMenu?.classList.contains('show'));
    let quickMetricsVideo = null;
    let quickMetricsAt = 0;
    let quickMetricsValue = false;
    let quickPointerX = Number.NaN;
    let quickPointerY = Number.NaN;
    let quickBarHover = false;
    let quickClickHold = false;
    let quickClickAt = 0;
    const QUICK_HOVER_MARGIN = 4;
    function quickMetricsReady(video) {
        const now = Date.now();
        if (video !== quickMetricsVideo || now - quickMetricsAt > 400) {
            quickMetricsVideo = video;
            quickMetricsAt = now;
            quickMetricsValue = playerMetricsOk(video);
        }
        return quickMetricsValue;
    }
    function quickShouldStayOpen() {
        const quick = state.quick;
        if (!quick || !quick.isConnected) return false;
        if (quickPointerOnBar()) return true;
        return Boolean(quick.contains(document.activeElement) || isLoopMenuOpen());
    }
    function applyQuickControlsHide() {
        const quick = state.quick;
        if (!quick || !quick.isConnected) return;
        if (quickShouldStayOpen()) return;
        quickClickHold = false;
        quick.classList.remove('quick-visible');
        paintQuickVisibility(false);
    }
    function armQuickControlsHide(delay = QUICK_LEAVE_DELAY) {
        clearTimeout(state.quickHideTimer);
        state.quickHideTimer = null;
        if (delay <= 0) {
            applyQuickControlsHide();
            return;
        }
        state.quickHideTimer = setTimeout(() => {
            state.quickHideTimer = null;
            applyQuickControlsHide();
        }, delay);
    }
    function cancelQuickControlsHide() {
        clearTimeout(state.quickHideTimer);
        state.quickHideTimer = null;
    }
    function quickBoxAtPoint(node, x, y, margin = 0) {
        if (!node?.isConnected || !Number.isFinite(x) || !Number.isFinite(y)) return false;
        const box = node.getBoundingClientRect?.();
        if (!box || box.width <= 0 || box.height <= 0) return false;
        return x >= box.left - margin && x <= box.right + margin && y >= box.top - margin && y <= box.bottom + margin;
    }
    function quickPointerOnBar() {
        const quick = state.quick;
        if (!quick?.isConnected) return false;
        const menu = state.loopMenu;
        if (menu?.isConnected && menu.classList.contains('show') && quickBoxAtPoint(menu, quickPointerX, quickPointerY, QUICK_HOVER_MARGIN)) return true;
        return quickBoxAtPoint(quick, quickPointerX, quickPointerY, QUICK_HOVER_MARGIN);
    }
    function quickPointerOnBarEvent(event) {
        const quick = state.quick;
        if (!quick?.isConnected) return false;
        const target = event?.target;
        if (target && (quick.contains?.(target) || menuContains(target))) return true;
        if (Number.isFinite(event?.clientX) && Number.isFinite(event?.clientY)) {
            quickPointerX = event.clientX;
            quickPointerY = event.clientY;
        }
        return quickPointerOnBar();
    }
    function quickHideDecision() {
        const quick = state.quick;
        if (!quick?.isConnected) return 'none';
        if (quickPointerOnBar()) return 'cancel';
        if (isLoopMenuOpen()) return 'none';
        // Pausing no longer pins the bar: it leaves with the pointer and it still idles out
        // after QUICK_HIDE_DELAY when the pointer stays in the player without touching it.
        // The pointer has already left the bar here. A bar the user clicked must hide as
        // soon as the pointer moves off it, even though the clicked button keeps focus.
        if (quickClickHold && Date.now() - quickClickAt < 15000) return 'now';
        if (!quickPointerInsidePlayer()) return 'now';
        if (quickBarHover) return 'cancel';
        if (quick.contains(document.activeElement)) return 'none';
        if (!quick.classList.contains('quick-visible')) return 'none';
        return QUICK_HIDE_DELAY;
    }
    function reconcileQuickControls() {
        const decision = quickHideDecision();
        if (decision === 'none') return decision;
        if (decision === 'cancel') {
            cancelQuickControlsHide();
            return decision;
        }
        armQuickControlsHide(decision === 'now' ? QUICK_LEAVE_DELAY : decision);
        return decision;
    }
    function paintQuickVisibility(visible) {
        const quick = state.quick;
        if (!quick?.style?.setProperty) return;
        quick.style.setProperty('opacity', visible ? '1' : '0', 'important');
        quick.style.setProperty('visibility', visible ? 'visible' : 'hidden', 'important');
        quick.style.setProperty('pointer-events', visible ? 'auto' : 'none', 'important');
        quick.style.setProperty('transition', 'none', 'important');
    }
    function trackQuickPointer(event) {
        quickPointerX = event.clientX;
        quickPointerY = event.clientY;
        if (quickPointerOnBarEvent(event)) {
            quickBarHover = true;
            cancelQuickControlsHide();
            return;
        }
        quickBarHover = false;
        // Clicking a quick-bar button leaves DOM focus on it. Keyboard focus keeps the bar
        // open, but a pointer that moved off the bar must release it so the bar can hide.
        releaseQuickFocus();
        reconcileQuickControls();
    }
    function menuContains(target) {
        const menu = state.loopMenu;
        return Boolean(menu?.isConnected && menu.classList.contains('show') && target && menu.contains(target));
    }
    function quickBarButtonAtPoint(x, y) {
        const quick = state.quick;
        if (!quick?.isConnected || !quick.classList.contains('quick-visible')) return null;
        const menu = state.loopMenu;
        if (menu?.classList.contains('show')) {
            const menuHit = quickButtonIn(menu, x, y);
            if (menuHit) return menuHit;
        }
        return quickButtonIn(quick, x, y);
    }
    function quickButtonIn(root, x, y) {
        if (!root?.isConnected) return null;
        for (const button of root.querySelectorAll('.quick-btn, .loop-menu-btn')) {
            const rect = button.getBoundingClientRect();
            if (rect.width <= 0 || rect.height <= 0) continue;
            if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) return button;
        }
        return null;
    }
    function forwardQuickBarHit(event) {
        const quick = state.quick;
        if (!quick?.isConnected) return;
        if (event.target === quick || quick.contains(event.target) || menuContains(event.target)) return;
        if (event.target.closest && event.target.closest('.av-analytics-page')) return;
        const button = quickBarButtonAtPoint(event.clientX, event.clientY);
        if (!button) return;
        event.preventDefault();
        event.stopPropagation();
        if (event.type !== 'click') return;
        log(`🔧 快捷条命中修正：控件层遮挡，已转发给「${button.title || button.textContent.trim()}」`);
        button.click();
    }
    function quickPointerInsidePlayer() {
        const host = state.container?.isConnected ? state.container : state.video;
        const box = host?.getBoundingClientRect?.();
        if (!box) return false;
        return (
            quickPointerX >= box.left &&
            quickPointerX <= box.right &&
            quickPointerY >= box.top &&
            quickPointerY <= box.bottom
        );
    }
    function releaseQuickFocus(active = document.activeElement) {
        const quick = state.quick;
        if (!active || active === document.body) return;
        if (quick?.contains(active)) active.blur();
        else if (menuContains(active)) active.blur();
    }
    function showQuickControls() {
        const video = state.video;
        if (!video || !quickMetricsReady(video)) return;        if (state.quick && state.quick.isConnected && !quickControlsAlive()) {
            const container = playerContainer(video);
            if (container) bindPlayer(video, container, true);
        }
        const quick = state.quick;
        if (!quick || !quick.isConnected) return;
        quick.classList.add('quick-visible');
        paintQuickVisibility(true);
        reconcileQuickControls();
    }
    function hideQuickControls() {
        const quick = state.quick;
        if (!quick || isLoopMenuOpen()) return;
        clearTimeout(state.quickHideTimer);
        quick.classList.remove('quick-visible');
        paintQuickVisibility(false);
    }
    function quickFullscreenRoot() {
        const root = document.fullscreenElement || document.webkitFullscreenElement;
        return root && root !== document.documentElement ? root : null;
    }
    function quickAnchorPlayer() {
        const root = quickFullscreenRoot();
        if (root) return root;
        const video = state.video;
        if (video && video.isConnected) {
            const box = video.getBoundingClientRect?.();
            if (box && box.width > 0 && box.height > 0) return video;
        }
        const container = state.container;
        return container?.isConnected ? container : null;
    }
    let quickPortalNode = null;
    let quickPortalBase = null;
    const quickPortalScrollBound = new WeakSet();
    function quickPortal() {
        const base = quickFullscreenRoot() || document.documentElement || document.body;
        if (!base) return null;
        if (quickPortalNode?.isConnected && quickPortalBase === base) return quickPortalNode;
        if (!quickPortalNode?.isConnected) {
            const node = document.createElement('div');
            node.id = QUICK_PORTAL_ID;
            node.classList.add('quick-portal');
            quickPortalNode = node;
        }
        quickPortalBase = base;
        base.appendChild(quickPortalNode);
        if (!quickPortalScrollBound.has(base)) {
            quickPortalScrollBound.add(base);
            base.addEventListener('scroll', quickPortalSync, PASSIVE_CAPTURE);
        }
        return quickPortalNode;
    }
    function quickPortalSync() {
        try {
            fitQuickControls();
        } catch (_) {}
    }
    function attachQuickElement(node, host) {
        if (!node || !host) return false;
        if (node.parentNode !== host) host.appendChild(node);
        return true;
    }
    function pinQuickElement(node, host, x, y, transform) {
        if (!attachQuickElement(node, host)) return;
        node.style.setProperty('position', 'fixed', 'important');
        node.style.setProperty('left', `${Math.round(x)}px`, 'important');
        node.style.setProperty('top', `${Math.round(y)}px`, 'important');
        node.style.setProperty('bottom', 'auto', 'important');
        node.style.setProperty('right', 'auto', 'important');
        node.style.setProperty('margin', '0', 'important');
        node.style.setProperty('transform', transform, 'important');
    }
    function freeQuickControls() {
        const quick = state.quick;
        const portal = quickPortal();
        if (!quick?.isConnected || !portal) return;
        attachQuickElement(quick, portal);
        if (state.loopMenu?.isConnected) attachQuickElement(state.loopMenu, portal);
        quickPortalSync();
    }
    function quickBarCenterY(box) {
        return box.bottom - QUICK_BOTTOM_OFFSET;
    }
    function fitQuickControls() {
        const quick = state.quick;
        const portal = quickPortal();
        if (!quick?.isConnected || !portal) return;
        attachQuickElement(quick, portal);
        if (state.loopMenu?.isConnected) attachQuickElement(state.loopMenu, portal);
        const player = quickAnchorPlayer();
        if (!player) return;
        const box = player.getBoundingClientRect?.();
        if (!box || box.width <= 0 || box.height <= 0) return;
        pinQuickElement(
            quick,
            portal,
            box.left + box.width / 2,
            quickBarCenterY(box),
            'translate(-50%, -50%) scale(var(--quick-scale, 1))'
        );
        quick.style.setProperty('width', 'max-content', 'important');
        quick.style.setProperty('height', 'auto', 'important');
        quick.style.setProperty('min-height', '0', 'important');
        quick.style.setProperty('max-width', `${Math.max(120, Math.round(box.width) - 16)}px`, 'important');
        quick.style.setProperty('box-sizing', 'border-box', 'important');
        quick.style.setProperty('z-index', '2147483647', 'important');
        const quickVisible = quick.classList.contains('quick-visible');
        quick.style.setProperty('transition', 'none', 'important');
        quick.style.setProperty('opacity', quickVisible ? '1' : '0', 'important');
        quick.style.setProperty('pointer-events', quickVisible ? 'auto' : 'none', 'important');
        quick.style.setProperty('visibility', quickVisible ? 'visible' : 'hidden', 'important');
        quick.classList.remove('quick-compact');
        const available = Math.max(120, box.width - 16);
        const needed = quick.scrollWidth;
        let scale = '1';
        if (needed > available) {
            quick.classList.add('quick-compact');
            const stillTooWide = quick.scrollWidth;
            scale = stillTooWide > available && available > 120 ? (available / stillTooWide).toFixed(3) : '1';
        }
        state.quickScale = scale;
        quick.style.setProperty('--quick-scale', scale);
        fitLoopMenu();
    }
    function fitLoopMenu() {
        const menu = state.loopMenu;
        const quick = state.quick;
        const portal = quickPortal();
        if (!menu?.isConnected || !quick?.isConnected || !portal) return;
        attachQuickElement(menu, portal);
        const quickBox = quick.getBoundingClientRect();
        if (quickBox.width <= 0 || quickBox.height <= 0) return;
        const button = state.loopBtn;
        const buttonBox = button?.isConnected ? button.getBoundingClientRect() : null;
        const center = buttonBox && buttonBox.width > 0
            ? buttonBox.left + buttonBox.width / 2
            : quickBox.left + quickBox.width / 2;
        const scale = Number.parseFloat(state.quickScale) || 1;
        pinQuickElement(
            menu,
            portal,
            center,
            quickBox.top - 10 * scale,
            'translate(-50%, -100%)'
        );
        menu.style.setProperty('z-index', '2147483647', 'important');
        menu.style.setProperty('pointer-events', 'auto', 'important');
    }
    function quickControlsAlive() {
        const quick = state.quick;
        if (!quick || !quick.isConnected) return false;
        const video = state.video;
        if (!video || !video.isConnected) return true;
        return document.contains(video);
    }
    let quickGlobalBound = false;
    let quickResizeHandler = null;
    let quickFullscreenHandler = null;
    let quickScrollFrame = 0;
    function bindQuickHost(container) {
        bindQuickPointer();
        bindQuickPlayback(state.video);
        if (!container || !container.dataset || container.dataset.quickAutohide === '1') return;
        container.dataset.quickAutohide = '1';
        container.addEventListener('mousemove', showQuickControls, { passive: true });
        container.addEventListener('mouseleave', () => {
            quickBarHover = false;
            reconcileQuickControls();
        });
        container.addEventListener('click', showQuickControls);
    }
    const quickPlaybackBound = new WeakSet();
    function bindQuickPlayback(video) {
        if (!video?.addEventListener || quickPlaybackBound.has(video)) return;
        quickPlaybackBound.add(video);
        const sync = () => {
            reconcileQuickControls();
        };
        video.addEventListener('play', sync);
        video.addEventListener('playing', sync);
        video.addEventListener('pause', sync);
        video.addEventListener('ended', sync);
    }
    let quickPointerBound = false;
    function bindQuickPointer() {
        if (quickPointerBound) return;
        quickPointerBound = true;
        document.addEventListener('mousemove', trackQuickPointer, { passive: true });
        document.addEventListener('mousedown', forwardQuickBarHit, true);
        document.addEventListener('pointerdown', forwardQuickBarHit, true);
        document.addEventListener('click', forwardQuickBarHit, true);
        // When the pointer leaves the page without firing mouseleave on the player
        // (first entry, tab switch, pointer over the bar), the cached coordinates and
        // the hover flag must not keep the bar visible forever.
        const forgetQuickPointer = () => {
            quickPointerX = Number.NaN;
            quickPointerY = Number.NaN;
            quickBarHover = false;
            reconcileQuickControls();
        };
        for (const host of [document, window]) {
            host.addEventListener('pointerleave', forgetQuickPointer, { passive: true });
            host.addEventListener('mouseleave', forgetQuickPointer, { passive: true });
        }
    }
    function setupQuickAutoHide() {
        const { container, quick, video } = state;
        bindQuickHost(container);
        bindQuickPlayback(video);
        if (!quick) return;
        if (quick.dataset.quickHitProbe !== '1') {
            quick.dataset.quickHitProbe = '1';
            quick.addEventListener('click', event => {
                if (event.target.closest?.('.quick-btn')) return;
                const hit = document.elementFromPoint?.(event.clientX, event.clientY);
                log(`快捷条点击未命中按钮：目标=${event.target.tagName} 命中=${hit?.tagName || 'null'}${hit?.className ? '.' + String(hit.className).trim().split(/\s+/).join('.') : ''} 坐标=(${Math.round(event.clientX)},${Math.round(event.clientY)})`);
            }, true);
        }
        quick.addEventListener('mouseenter', () => {
            quickBarHover = true;
            cancelQuickControlsHide();
            quick.classList.add('quick-visible');
            paintQuickVisibility(true);
            fitQuickControls();
        });
        const bindQuickLeave = () => {
            quick.addEventListener('mouseleave', () => {
                quickBarHover = false;
                releaseQuickFocus();
                reconcileQuickControls();
            });
            state.loopMenu?.addEventListener('mouseleave', () => {
                quickBarHover = false;
                releaseQuickFocus();
                reconcileQuickControls();
            });
        };
        bindQuickLeave();
        if (!quickGlobalBound) {
            quickGlobalBound = true;
            const onQuickPress = event => {
                quickClickHold = quickPointerOnBarEvent(event);
                if (quickClickHold) quickClickAt = Date.now();
            };
            const clearQuickHold = event => {
                const target = event?.target;
                if (target === document || target === window || target === document.documentElement) quickClickHold = false;
            };
            for (const host of [document, window]) {
                host.addEventListener('mousedown', onQuickPress, true);
                host.addEventListener('pointerdown', onQuickPress, true);
                host.addEventListener('mouseup', clearQuickHold, true);
                host.addEventListener('pointerup', clearQuickHold, true);
                host.addEventListener('blur', clearQuickHold, true);
                host.addEventListener('pointerleave', clearQuickHold, { passive: true });
                host.addEventListener('mouseleave', clearQuickHold, { passive: true });
            }
            quickResizeHandler = throttle(fitQuickControls, MUTATION_THROTTLE);
            quickFullscreenHandler = () => setTimeout(fitQuickControls, 120);
            // A capture listener on the window sees scrolls from every ancestor container (scroll
            // does not bubble). One refit per frame keeps the bar anchored to the moving player.
            const queueQuickFit = () => {
                if (quickScrollFrame) return;
                quickScrollFrame = requestAnimationFrame(() => {
                    quickScrollFrame = 0;
                    fitQuickControls();
                });
            };
            window.addEventListener('resize', quickResizeHandler, { passive: true });
            window.addEventListener('scroll', queueQuickFit, PASSIVE_CAPTURE);
            document.addEventListener('fullscreenchange', quickFullscreenHandler);
            document.addEventListener('webkitfullscreenchange', quickFullscreenHandler);
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
        if (state.loopMenu.classList.contains('show')) fitLoopMenu();
    }
    function watchQuickControls() {
        if (state.quickWatchTimer) return;
        state.quickWatchTimer = trackInterval(setInterval(() => {


            if (isPageHidden()) return;
            if (!state.bound || isAnalyticsRoute()) return;
            if (state.video?.isConnected && quickControlsAlive()) return;
            const video = findMainVideo();
            if (!video) return;
            if (video !== state.video || !quickControlsAlive()) {
                const container = playerContainer(video);
                if (!container) return;
                bindPlayer(video, container, true);
            }
        }, 1200));
    }
    function createQuickControls() {
        const container = state.container;
        if (!container) return;
        if (container.closest(PREVIEW_HOST_SELECTOR)) return;
        if (quickControlsAlive()) {
            bindQuickHost(container);
            fitQuickControls();
            return;
        }
        for (const stale of document.querySelectorAll('.custom-quick-controls')) stale.remove();
        for (const stale of document.querySelectorAll('.loop-menu')) stale.remove();
        ensurePositioned(container);
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
        loopWrapper.append(state.loopBtn);
        group.appendChild(loopWrapper);
        quick.appendChild(group);
        container.appendChild(quick);
        container.appendChild(state.loopMenu);
        freeQuickControls();
        document.addEventListener('click', event => {
            if (!loopWrapper.contains(event.target)) state.loopMenu.classList.remove('show');
        });
        setupQuickAutoHide();
        hideQuickControls();
        fitQuickControls();
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
        if (settings.subtitleOffset !== 0) log(`ℹ️ 已应用字幕偏移 ${settings.subtitleOffset}s`);
        closeSubtitlePicker();
        renderSubtitle(true);

        const snapshotName = fileName || label;
        if (saveSubtitleSnapshot(text, snapshotName)) state.subtitleSnapshotRestored = subtitleSnapshotKey();
        log(`✅ ${label}加载成功：${items.length} 条${fileName && fileName !== label ? `（${fileName}）` : ''}`);
        return true;
    }


    const SUBTITLE_SNAPSHOT_MAX = 400000;
    function subtitleSnapshotKey() {
        const id = getCurrentVideoID();
        return id ? `subtitle:${String(id).toLowerCase()}` : null;
    }
    function saveSubtitleSnapshot(text, name) {
        const key = subtitleSnapshotKey();
        if (!key || !text || text.length > SUBTITLE_SNAPSHOT_MAX) return false;
        try {
            store.set(key, JSON.stringify({ name: String(name || ''), text, at: Date.now() }));
            return true;
        } catch (_) {
            return false;
        }
    }
    function restoreSubtitleSnapshot() {
        const key = subtitleSnapshotKey();
        if (!key) return false;

        if (state.subtitleSnapshotRestored === key) return false;
        state.subtitleSnapshotRestored = key;
        let snapshot = null;
        try {
            const raw = store.get(key);
            if (!raw) return false;
            snapshot = JSON.parse(raw);
        } catch (_) {
            return false;
        }
        if (!snapshot || typeof snapshot.text !== 'string' || !snapshot.text) return false;
        if (snapshot.text.length > SUBTITLE_SNAPSHOT_MAX) return false;
        const ok = applySubtitleText(snapshot.text, '恢复的字幕', snapshot.name || '已缓存的字幕');
        if (ok) log('📍 已自动恢复上次加载的字幕（可在面板中清除）');
        return ok;
    }
    function clearSubtitleSnapshot() {
        const key = subtitleSnapshotKey();
        if (!key) return;
        try {
            store.remove(key);
        } catch (_) {
        }
    }
    function clearSubtitles() {
        state.cueIndex = null;
        state.subtitleSource = '';
        state.activeCueText = '';
        state.cueCursor = -1;
        if (state.subtitleEl) {
            state.subtitleEl.textContent = '';
            state.subtitleEl.style.display = 'none';
        }
        closeSubtitlePicker();
        clearSubtitleSnapshot();
        log('字幕已清除（同时移除本地缓存快照）');
    }
    function startSubtitleLoop() {
        cancelAnimationFrame(state.subtitleRAF);
        clearTimeout(state.subtitleIdleTimer);
        state.subtitleRAF = 0;
        state.subtitleIdleTimer = 0;
        const tick = () => {
            const video = state.video;
            if (!video || (!state.loopActive && !state.cueIndex?.items.length)) {
                state.subtitleRAF = 0;
                state.subtitleIdleTimer = setTimeout(tick, SUBTITLE_IDLE_DELAY);
                return;
            }
            state.subtitleRAF = trackFrame(requestAnimationFrame(tick));
            if (isPageHidden()) return;
            if (state.loopActive) {
                const time = video.currentTime;
                if (time >= state.loopStart + state.loopDuration || time < state.loopStart - 0.5) {
                    video.currentTime = state.loopStart;
                }
            }
            if (video.paused) return;
            renderSubtitle(false);
        };
        state.subtitleRAF = trackFrame(requestAnimationFrame(tick));
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
    function gmSend(url, { headers = null, timeout = 15000, responseType = undefined, anonymous = false, method = 'GET', data = null } = {}) {
        return new Promise((resolve, reject) => {
            const options = {
                method,
                url,
                timeout,
                onload: resolve,
                onerror: () => reject(Object.assign(new Error('网络错误'), { network: true })),
                ontimeout: () => reject(Object.assign(new Error('请求超时'), { network: true })),
                onabort: () => reject(Object.assign(new Error('请求已取消'), { network: true }))
            };
            if (headers) options.headers = headers;
            if (data !== null) options.data = data;
            if (responseType) options.responseType = responseType;
            if (anonymous) options.anonymous = true;
            GM_xmlhttpRequest(options);
        });
    }
    function gmRaw(url, { headers = null, timeout = 15000 } = {}) {
        return gmSend(url, { headers, timeout });
    }
    async function gmRequest(url, { timeout = 15000, binary = false, headers = null, method = 'GET', data = null } = {}) {
        const response = await gmSend(url, { headers, timeout, method, data, responseType: binary ? 'arraybuffer' : undefined });
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
    const JDFORREPAM_MOVIE_SEARCH = {
        page: '1',
        type: 'movie',
        limit: '5',
        movie_type: 'all',
        from_recent: 'false',
        movie_filter_by: 'all',
        movie_sort_by: 'relevance'
    };
    function javDbCodeKey(code) {
        return String(code || '').replace(/[-_]/g, '').toLowerCase();
    }
    function javDbSearchUrl(code) {
        return `${JDFORREPAM_API}/api/v2/search?` + new URLSearchParams(Object.assign({ q: String(code || '') }, JDFORREPAM_MOVIE_SEARCH));
    }
    function javDbMovieDetailUrl(id) {
        return `${JDFORREPAM_API}/api/v2/movies/${encodeURIComponent(String(id))}`;
    }
    async function searchJavDbMovie(code) {
        const key = javDbCodeKey(code);
        if (!key) return null;
        const body = JSON.parse(await jdApiFetch(javDbSearchUrl(code)));
        const movies = Array.isArray(body?.data?.movies) ? body.data.movies : [];
        return movies.find(item => javDbCodeKey(item?.number) === key) || null;
    }
    async function fetchJavDbDetail(id) {
        if (!id) return null;
        try {
            return JSON.parse(await jdApiFetch(javDbMovieDetailUrl(id)))?.data?.movie ?? null;
        } catch (_) {
            return null;
        }
    }
    function parseHtmlDocument(html) {
        if (!html) return null;
        try {
            return new DOMParser().parseFromString(html, 'text/html') || null;
        } catch (_) {
            return null;
        }
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
                if (META_LABEL_CODE.test(label)) {
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
                log('📍 已写入本地快照，刷新本页或重进该视频会自动恢复；点「清除字幕」可移除');
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
    const BACKUP_FIELDS = [
        { key: 'name', label: '名称' },
        { key: 'thumb', label: '缩略图' },
        { key: 'code', label: '番号' },
        { key: 'actress', label: '女优' },
        { key: 'genre', label: '类型' },
        { key: 'maker', label: '发行商' }
    ];
    const BACKUP_CARD_SELECTOR = 'div[class*="aspect-w-16"], .video-img-box, .thumbnail, article.video-card, .grid > div, .video-list > div, .col-6, .col-sm-4, .col-lg-3';
    const BACKUP_JUNK_PATH_RE = /\/(?:recent|latest|new|new-release|contact|contact-us|about|about-us|help|faq|dmca|terms|privacy|policy|login|signin|signup|register|search|my|account|profile|premium|vip|favorit|collection|playlist|bookmark)(?:\/|$)/i;
    const BACKUP_JUNK_NAME_RE = /^(?:最近更新|最新更新|聯絡我們|联系我们|關於我們|关于我们|首頁|首页|主頁|主页|登入|登录|註冊|注册|收藏|我的收藏|我的最愛|帳號|账号|服務條款|服务条款|隱私政策|隐私政策|DMCA|説明|帮助|幫助|回報|回报|意見|意见)$/i;
    const BACKUP_IMAGE_ATTRS = ['data-src', 'data-original', 'data-lazy', 'data-lazy-src', 'data-webp', 'data-cover', 'data-thumb', 'src'];
    const BACKUP_LINK_JUNK_RE = /(?:排行|排名|排行榜|人氣|人气|新作|最新|全部|更多|一覧|一覽|名单|名單|検索|检索|分類|分类一览|カテゴリ一覧|ログイン|登録|無料|免費|免费|下载|下載|APP|アプリ)/i;
    const BACKUP_MONTH_YEAR_RE = /(?:\b(?:JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC|JANUARY|FEBRUARY|MARCH|APRIL|JUNE|JULY|AUGUST|SEPTEMBER|OCTOBER|NOVEMBER|DECEMBER)\b[\s.,/-]*\d{2,4}\b|\b20\d{2}\b|\d{1,2}月\d{0,2}日?轮?)/i;
    const BACKUP_DATE_TEXT_RE = /^(?:\d{4}[-/.年]\d{1,2}(?:[-/.月]\d{1,2}日?)?|\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4}|\d{1,2}\s*(?:分钟|分鐘|小时|小時|天|日|週|周|个月|個月|月|年)前|\d{1,2}:\d{2}(?::\d{2})?|\d{4}年\d{1,2}月(?:\d{1,2}日)?)(?:\s*\d{1,2}:\d{2}(?::\d{2})?)?$/;
    const BACKUP_ENTITY_SLUG_JUNK = new Set(['ranking', 'ranks', 'rank', 'popular', 'new', 'new-release', 'all', 'list', 'index', 'best', 'top', 'featured', 'recommend', 'category', 'categories', 'tag', 'tags', 'genre', 'genres', 'uncensored', 'censored', 'western', 'amateur', 'search', 'month', 'year', 'page']);
    const JABLE_FAVORITES_PATH = '/my/favourites/videos/';
    function backupSleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    function backupLog(text) {
        const ui = state.favoriteBackup;
        if (!ui?.logEl) return;
        const line = document.createElement('div');
        line.textContent = text;
        ui.logEl.appendChild(line);
        ui.logEl.scrollTop = ui.logEl.scrollHeight;
        while (ui.logEl.childElementCount > 200) ui.logEl.firstElementChild?.remove();
    }
    function setBackupProgress(ui, ratio) {
        if (!ui?.bar) return;
        ui.bar.style.width = `${Math.round(clamp(Number(ratio) || 0, 0, 1) * 100)}%`;
    }
    function setBackupBusy(ui, busy) {
        if (!ui) return;
        if (ui.startBtn) ui.startBtn.disabled = busy;
        if (ui.stopBtn) ui.stopBtn.disabled = !busy;
    }
    function sanitizeBackupName(text, fallback = '未命名') {
        const clean = String(text ?? '').replace(/[\\/:*?"<>|\r\n\t]+/g, '_').replace(/\s+/g, ' ').trim();
        return clean.slice(0, 80) || fallback;
    }
    function backupAbsUrl(raw) {
        if (!raw) return '';
        try {
            return new URL(String(raw), location.origin).href;
        } catch (_) {
            return '';
        }
    }
    function backupImageUrl(node) {
        if (!node) return '';
        let raw = '';
        for (const name of BACKUP_IMAGE_ATTRS) {
            const value = node.getAttribute?.(name);
            if (value) {
                raw = value;
                break;
            }
        }
        if (!raw) {
            const set = String(node.getAttribute?.('srcset') || node.getAttribute?.('data-srcset') || '').split(',')[0] || '';
            raw = set.trim().split(/\s+/)[0] || '';
        }
        const url = backupAbsUrl(raw);
        if (!url || /^(?:data|blob|about|javascript):/i.test(url)) return '';
        if (/(?:now_printing|blank\.|placeholder|loading\.|spacer\.|pixel\.|1x1\.)/i.test(url)) return '';
        return url;
    }
    function backupImageFormat(bytes) {
        if (!bytes || bytes.length < 12) return '';
        if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'jpg';
        if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return 'png';
        if (bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46) return 'gif';
        if (bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 && bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50) return 'webp';
        return '';
    }
    async function fetchBackupImage(url, pageHref) {
        if (!url) return null;
        let referer = '';
        try {
            referer = new URL(pageHref || url, location.origin).origin;
        } catch (_) {
            referer = '';
        }
        const accept = 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8';
        const attempts = [];
        if (referer) attempts.push({ Referer: `${referer}/`, Accept: accept });
        attempts.push({ Accept: accept });
        attempts.push(null);
        for (const headers of attempts) {
            try {
                const buffer = await gmRequest(url, { timeout: 20000, binary: true, headers });
                const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
                const ext = backupImageFormat(bytes);
                if (ext) return { bytes, ext };
            } catch (_) {
            }
        }
        return null;
    }
    const JAVDB_BACKUP_CACHE = new Map();
    function backupJavDbList(source, keys) {
        const out = [];
        for (const key of keys) {
            const list = source?.[key];
            if (!Array.isArray(list)) continue;
            for (const item of list) {
                const text = String(typeof item === 'string' ? item : item?.name ?? item?.title ?? '').replace(/\s+/g, ' ').trim();
                if (text && text.length <= 40 && !out.includes(text)) out.push(text);
            }
        }
        return out;
    }
    function backupJavDbInfo(movie, detail) {
        const source = detail || movie || {};
        const text = value => String(value ?? '').replace(/\s+/g, ' ').trim();
        const unique = list => list.filter((item, index) => list.indexOf(item) === index);
        const info = {
            title: text(source.title || movie?.title),
            actress: unique(backupJavDbList(detail, ['actors', 'actress', 'actresses']).concat(backupJavDbList(movie, ['actors', 'actress']))),
            genre: unique(backupJavDbList(detail, ['tags', 'genres', 'categories']).concat(backupJavDbList(movie, ['tags', 'genres']))),
            maker: text(source.maker_name || source.maker || source.label_name || source.studio_name || movie?.maker_name),
            cover: backupAbsUrl(source.cover_url || source.thumb_url || source.cover || source.image_url || movie?.cover_url || movie?.thumb_url),
            url: movie?.id ? `https://javdb.com/v/${encodeURIComponent(String(movie.id))}` : ''
        };
        const filled = info.title || info.actress.length || info.genre.length || info.maker || info.cover;
        return filled ? info : null;
    }
    async function fetchJavDbBackupInfo(code) {
        const clean = normalizeVideoCode(code);
        if (!clean || !/\d/.test(clean)) return null;
        if (JAVDB_BACKUP_CACHE.has(clean)) return JAVDB_BACKUP_CACHE.get(clean);
        const task = (async () => {
            let movie = null;
            try {
                movie = await searchJavDbMovie(clean);
            } catch (_) {
                movie = null;
            }
            if (!movie?.id) return null;
            const detail = await fetchJavDbDetail(movie.id);
            return backupJavDbInfo(movie, detail);
        })().catch(() => null);
        JAVDB_BACKUP_CACHE.set(clean, task);
        return task;
    }
    function backupCleanTitle(raw, code) {
        let text = String(raw ?? '').replace(/\s+/g, ' ').trim();
        if (!text) return '';
        text = text.replace(/\s*[-|｜–—]+\s*(?:Jable\.?TV|Jable|MissAV|线上看|線上看|在线看|免費.*|免费.*)\s*$/i, '').trim();
        text = text.replace(/(?:^|\s)(?:\d{4}[-/.]\d{1,2}[-/.]\d{1,2}|\d{4}年\d{1,2}月\d{1,2}日)(?=\s|$)/g, ' ').replace(/\s+/g, ' ').trim();
        if (code) {
            const upper = text.toUpperCase();
            const head = String(code).toUpperCase();
            if (upper.startsWith(head)) text = text.slice(String(code).length).replace(/^[\s\-_|:：]+/, '').trim();
        }
        if (BACKUP_DATE_TEXT_RE.test(text)) return '';
        return text;
    }
    function backupValidEntity(text) {
        const value = String(text ?? '').replace(/\s+/g, ' ').trim();
        if (!value || value.length > 40) return '';
        if (BACKUP_LINK_JUNK_RE.test(value) || BACKUP_MONTH_YEAR_RE.test(value)) return '';
        return value;
    }
    function backupEntitySlug(href) {
        let path = '';
        try {
            path = new URL(String(href || ''), location.origin).pathname;
        } catch (_) {
            return '';
        }
        const match = /^\/(?:[a-z]{2}(?:-[a-z]{2})?\/)?(?:actresses?|actors?|models?|stars?|genres?|categories|category|tags?|makers?|companies|company|studios?|labels?)\/(.+?)\/?$/i.exec(path);
        if (!match) return '';
        let slug = match[1];
        try {
            slug = decodeURIComponent(slug);
        } catch (_) {
        }
        const head = slug.toLowerCase();
        if (!slug || BACKUP_ENTITY_SLUG_JUNK.has(head)) return '';
        return /^\d+$/.test(slug) ? '' : slug;
    }
    function backupCodeFrom(href, name) {
        const nameMatch = String(name || '').match(/(?:^|[\s【\[(（])((?:fc2(?:-ppv)?|[a-z]{2,10})-\d{2,})/i);
        if (nameMatch) {
            const fromName = normalizeVideoCode(nameMatch[1]);
            if (fromName && /\d/.test(fromName)) return fromName;
        }
        const parts = String(href || '').split('?')[0].split('#')[0].split('/').filter(Boolean);
        let slug = parts.length ? parts[parts.length - 1] : '';
        try {
            slug = decodeURIComponent(slug);
        } catch (_) {
        }
        const slugMatch = slug.match(/((?:fc2(?:-ppv)?|[a-z]{2,10})-\d{2,})/i);
        const fromSlug = normalizeVideoCode(slugMatch?.[1] || slug);
        return /\d/.test(fromSlug) ? fromSlug : '';
    }
    function parseFavoriteCards(html) {
        const doc = parseHtmlDocument(html);
        if (!doc) return [];
        const nodes = doc.querySelectorAll(BACKUP_CARD_SELECTOR);
        const out = [];
        const seen = new Set();
        for (const node of nodes) {
            const link = node.querySelector('a[href][alt]') || node.querySelector('a[href*="/videos/"], a[href*="/video/"]') || node.querySelector('a[href]');
            const img = node.querySelector('img[data-src], img[data-original], img[data-lazy], img[data-lazy-src], img[data-webp], img[src]');
            const href = backupAbsUrl(link?.getAttribute('href') || '');
            if (!href || !/\/[^/]*$/.test(href)) continue;
            if (/\/(?:actresses?|actors?|genres?|tags?|makers?|labels?|studios?|users?|search|login|signup|register)(?:\/|$)/i.test(href)) continue;
            let path = '';
            try {
                path = new URL(href).pathname;
            } catch (_) {
                path = href;
            }
            if (BACKUP_JUNK_PATH_RE.test(path)) continue;
            const rawName = (img?.getAttribute('alt') || link?.getAttribute('alt') || link?.getAttribute('title') || link?.textContent || '').replace(/\s+/g, ' ').trim();
            if (!rawName || BACKUP_JUNK_NAME_RE.test(rawName)) continue;
            const code = backupCodeFrom(href, rawName);
            const name = backupCleanTitle(rawName, code) || backupCleanTitle(rawName, '');
            if (!name) continue;
            const thumb = backupImageUrl(img);
            if (!code && !thumb) continue;
            if (seen.has(href)) continue;
            seen.add(href);
            out.push({ name, href, code, thumb });
        }
        return out;
    }
    function isJableFavorites(source) {
        if (!IS_JABLE) return false;
        const raw = String(source || '').trim();
        if (!raw) return false;
        try {
            if (/favourites?/i.test(new URL(raw, location.origin).pathname)) return true;
        } catch (_) {
        }
        return /favourites?/i.test(raw);
    }
    function parseJableFavoriteCards(html) {
        const doc = parseHtmlDocument(html);
        if (!doc) return [];
        const out = [];
        const seen = new Set();
        const push = node => {
            if (!node) return;
            const link = node.querySelector?.('a[href*="/videos/"]') || node.querySelector?.('a[href*="/video/"]') || (node.matches?.('a[href]') ? node : null);
            const href = backupAbsUrl(link?.getAttribute?.('href') || '');
            if (!href || !/\/videos?\//i.test(href) || seen.has(href)) return;
            const img = node.querySelector?.('img[data-src], img[data-original], img[data-lazy], img[data-lazy-src], img[data-webp], img[src]') || link?.querySelector?.('img');
            const heading = node.querySelector?.('h6, h5, h4, h3, .title, .video-title, p.title, .detail h6');
            const code = backupCodeFrom(href, link?.getAttribute?.('title') || img?.getAttribute?.('alt') || '');
            const candidates = [heading?.textContent, link?.getAttribute?.('title'), img?.getAttribute?.('alt'), link?.textContent];
            let name = '';
            for (const candidate of candidates) {
                const cleaned = backupCleanTitle(candidate, code);
                if (cleaned && !BACKUP_JUNK_NAME_RE.test(cleaned)) {
                    if (cleaned.length >= 2) {
                        name = cleaned;
                        break;
                    }
                    if (!name) name = cleaned;
                }
            }
            if (!name) {
                for (const candidate of candidates) {
                    const cleaned = backupCleanTitle(candidate, '');
                    if (cleaned && !BACKUP_JUNK_NAME_RE.test(cleaned)) {
                        name = cleaned;
                        break;
                    }
                }
            }
            const thumb = backupImageUrl(img);
            if (!code && !thumb) return;
            seen.add(href);
            out.push({ name: name || code, href, code, thumb });
        };
        for (const card of doc.querySelectorAll(BACKUP_CARD_SELECTOR)) push(card);
        if (!out.length) {
            for (const link of doc.querySelectorAll('a[href*="/videos/"], a[href*="/video/"]')) push(link.closest?.(BACKUP_CARD_SELECTOR) || link.parentElement || link);
        }
        return out;
    }
    function backupSplitNames(text) {
        const out = [];
        for (const part of String(text ?? '').split(/[,、/|]+/)) {
            const name = part.replace(/\s+/g, ' ').trim();
            if (name && name.length <= 40 && !out.includes(name)) out.push(name);
        }
        return out;
    }
    function parseBackupDetail(html) {
        const out = { title: '', code: '', actress: [], genre: [], maker: '', cover: '' };
        const doc = parseHtmlDocument(html);
        if (!doc) return out;
        const rows = doc.querySelectorAll('.text-secondary, .video-info-row, .info-row, li, div.space-y-2 > div');
        for (const row of rows) {
            const labelSelf = row.matches?.('.text-secondary, .label, dt') ? row : null;
            const labelEl = labelSelf || row.querySelector('span:first-child, dt, .label, .text-secondary');
            const label = (labelEl?.textContent || '').replace(/\s+/g, ' ').trim();
            if (!label) continue;
            const links = Array.from(row.querySelectorAll('a'));
            const valueEl = labelSelf ? labelSelf.nextElementSibling : (row.querySelector('.font-medium, dd, .value') || links[0] || row.querySelector('span:last-child'));
            const value = (valueEl?.textContent || '').replace(/\s+/g, ' ').trim();
            if (!value) continue;
            const linkText = () => {
                const texts = links.map(anchor => (anchor.textContent || '').replace(/\s+/g, ' ').trim()).filter(Boolean);
                return texts.length ? texts : [value];
            };
            if (!out.title && META_LABEL_TITLE.test(label)) out.title = value;
            else if (META_LABEL_CODE.test(label)) out.code = normalizeVideoCode(value);
            else if (META_LABEL_ACTRESS.test(label)) {
                for (const name of linkText()) {
                    for (const part of backupSplitNames(name)) {
                        const valid = backupValidEntity(part);
                        if (valid && !out.actress.includes(valid)) out.actress.push(valid);
                    }
                }
            } else if (META_LABEL_GENRE.test(label)) {
                for (const name of linkText()) {
                    for (const part of backupSplitNames(name)) {
                        const valid = backupValidEntity(part);
                        if (valid && !out.genre.includes(valid)) out.genre.push(valid);
                    }
                }
            } else if (META_LABEL_MAKER.test(label)) out.maker = backupValidEntity(value);
        }
        if (!out.actress.length) {
            for (const anchor of doc.querySelectorAll('a[href*="/actresses/"], a[href*="/actress/"], a[href*="/actors/"], a[href*="/actor/"], a[href*="/models/"], a[href*="/model/"], a[href*="/stars/"], a[href*="/star/"]')) {
                const href = anchor.getAttribute('href') || '';
                const slug = backupEntitySlug(href);
                if (!slug) continue;
                const text = backupValidEntity(anchor.textContent);
                const name = text && !/(?:…|\.\.\.)$/.test(text) ? text : slug;
                const valid = backupValidEntity(name);
                if (valid && !out.actress.includes(valid)) out.actress.push(valid);
            }
        }
        if (!out.genre.length) {
            for (const anchor of doc.querySelectorAll('a[href*="/genres/"], a[href*="/genre/"], a[href*="/categories/"], a[href*="/category/"], a[href*="/themes/"], a[href*="/theme/"], a[href*="/tags/"], a[href*="/tag/"]')) {
                const href = anchor.getAttribute('href') || '';
                if (!backupEntitySlug(href)) continue;
                const valid = backupValidEntity(anchor.textContent);
                if (valid && !out.genre.includes(valid)) out.genre.push(valid);
            }
        }
        if (!out.maker) {
            const anchor = Array.from(doc.querySelectorAll('a[href*="/makers/"], a[href*="/maker/"], a[href*="/companies/"], a[href*="/company/"], a[href*="/studios/"], a[href*="/studio/"], a[href*="/labels/"], a[href*="/label/"]')).find(node => backupEntitySlug(node.getAttribute('href')));
            out.maker = backupValidEntity(anchor?.textContent);
        }
        if (!out.title) out.title = (doc.querySelector('meta[property="og:title"]')?.getAttribute('content') || '').replace(/\s+/g, ' ').trim();
        out.cover = backupAbsUrl(doc.querySelector('meta[property="og:image"]')?.getAttribute('content') || '');
        return out;
    }
    function favoritePageUrl(base, page) {
        const clean = String(base || '').split('#')[0].replace(/([?&])page=\d+&?/i, '$1').replace(/[?&]$/, '');
        return `${clean}${clean.includes('?') ? '&' : '?'}page=${page}`;
    }
    function backupLinksFromJson(text) {
        const found = [];
        let payload = null;
        try {
            payload = JSON.parse(text);
        } catch (_) {
            return found;
        }
        const html = typeof payload === 'string' ? '' : (payload?.data?.html || payload?.html || payload?.content || payload?.data?.content || '');
        if (typeof html === 'string' && /<(?:div|a|article|li)\b/i.test(html)) found.push({ html });
        const seen = new Set();
        const walk = (node, depth) => {
            if (!node || depth > 6) return;
            if (Array.isArray(node)) {
                for (const child of node) walk(child, depth + 1);
                return;
            }
            if (typeof node !== 'object') return;
            const raw = node.url || node.href || node.link || node.permalink || node.video_url || '';
            const href = typeof raw === 'string' ? raw : '';
            if (/\/videos?\//i.test(href) && !seen.has(href)) {
                seen.add(href);
                found.push({
                    href,
                    name: String(node.title || node.name || node.video_title || node.post_title || ''),
                    thumb: String(node.thumb || node.thumbnail || node.image || node.cover || node.poster || node.screenshot || '')
                });
            }
            for (const key of Object.keys(node)) {
                const value = node[key];
                if (value && typeof value === 'object') walk(value, depth + 1);
            }
        };
        walk(payload, 0);
        if (!found.length) {
            for (const match of String(text).matchAll(/["'](\/videos?\/[^"'\\\s]+)["']/g)) {
                if (seen.has(match[1])) continue;
                seen.add(match[1]);
                found.push({ href: match[1], name: '', thumb: '' });
            }
        }
        return found;
    }
    function favoriteCardsFromPayload(text, jableList) {
        const raw = typeof text === 'string' ? text.trim() : '';
        if (!raw) return [];
        if (raw.startsWith('{') || raw.startsWith('[')) {
            const out = [];
            const seen = new Set();
            for (const part of backupLinksFromJson(raw)) {
                const cards = part.html ? (jableList ? parseJableFavoriteCards(part.html) : parseFavoriteCards(part.html)) : [part];
                for (const card of cards) {
                    const href = backupAbsUrl(card.href || '');
                    if (!href || seen.has(href)) continue;
                    seen.add(href);
                    out.push({ name: card.name || '', href, code: backupCodeFrom(href, card.name || ''), thumb: card.thumb || '' });
                }
            }
            return out;
        }
        return jableList ? parseJableFavoriteCards(raw) : parseFavoriteCards(raw);
    }
    function favoriteMaxPage(html) {
        const doc = parseHtmlDocument(html);
        if (!doc) return 0;
        let max = 0;
        for (const anchor of doc.querySelectorAll('a[href*="page="], a[href*="/page/"]')) {
            const href = anchor.getAttribute('href') || '';
            const match = /[?&]page=(\d+)/i.exec(href) || /\/page\/(\d+)\/?/i.exec(href);
            if (match) max = Math.max(max, Number.parseInt(match[1], 10) || 0);
        }
        if (!max) {
            for (const anchor of doc.querySelectorAll('.pagination .page-link, .pagination a[href*="#"], .page-item a, .pager a')) {
                const text = (anchor.textContent || '').replace(/\s+/g, '');
                const match = /^(\d{1,3})$/.exec(text);
                if (!match) continue;
                max = Math.max(max, Number.parseInt(match[1], 10) || 0);
            }
        }
        return max;
    }
    function favoritePagerLink(doc, page) {
        if (!doc?.querySelectorAll) return null;
        const links = Array.from(doc.querySelectorAll('ul.pagination a[href], .pagination a[href], .page-item a[href], nav.pagination a[href], a.page-link[href]'));
        if (!links.length) return null;
        const label = link => `${link.getAttribute('aria-label') || ''} ${link.getAttribute('title') || ''} ${(link.textContent || '').replace(/\s+/g, '')}`.trim();
        const rel = link => String(link.getAttribute('rel') || '');
        const number = Number(page);
        const byText = links.find(link => (link.textContent || '').replace(/\s+/g, '').replace(/^0+(?=\d)/, '') === String(number));
        if (byText) return byText;
        const byHref = links.find(link => {
            const href = link.getAttribute('href') || '';
            const match = /[?&](?:page|paged|page_num|p)=(\d+)/i.exec(href) || /\/page\/(\d+)\/?/i.exec(href);
            return Boolean(match) && Number.parseInt(match[1], 10) === number;
        });
        if (byHref) return byHref;
        if (number === 1) return links.find(link => /(?:^|\s)first(?:\s|$)/i.test(rel(link)) || /(?:首頁|首页|第一頁|第一页|first)/i.test(label(link))) || null;
        return links.find(link => /(?:^|\s)next(?:\s|$)/i.test(rel(link)) || /(?:next|下一頁|下一页|次頁|次页|次へ)/i.test(label(link))) || null;
    }
    function favoriteLiveScope() {
        const marked = document.querySelector('#list_videos_my_favourite_videos, .list_videos_my_favourite_videos');
        if (marked) return marked;
        const pager = document.querySelector('ul.pagination, .pagination');
        const link = document.querySelector('a[href*="/videos/"]');
        if (pager && link) {
            let node = link.parentElement;
            while (node && node !== document.body) {
                if (node.contains?.(pager)) return node;
                node = node.parentElement;
            }
        }
        return document.querySelector('div.row.gutter-20') || null;
    }
    async function favoriteLivePagerCards(limit, ui, seen) {
        if (!document?.body || !/favourites?/i.test(location.pathname)) return [];
        if (!favoriteLiveScope()) return [];
        const out = [];
        const known = new Set(seen || []);
        const scopeCards = scope => {
            try {
                return Array.from(scope.querySelectorAll('a[href*="/videos/"]'));
            } catch (_) {
                return [];
            }
        };
        const read = () => {
            const scope = favoriteLiveScope();
            if (!scope) return [];
            try {
                return parseJableFavoriteCards(scope.outerHTML);
            } catch (_) {
                return [];
            }
        };
        const signature = () => {
            const scope = favoriteLiveScope();
            if (!scope) return '';
            const links = scopeCards(scope).slice(0, 12).map(link => link.getAttribute('href') || '');
            if (links.length) return links.join('|');
            return (scope.textContent || '').replace(/\s+/g, '').slice(0, 60);
        };
        const collect = cards => {
            let added = 0;
            for (const card of cards) {
                if (out.length >= limit) break;
                if (known.has(card.href)) continue;
                known.add(card.href);
                out.push(card);
                added++;
            }
            return added;
        };
        const waitChange = async (before, tries) => {
            for (let index = 0; index < tries; index++) {
                await backupSleep(250);
                if (ui.cancelled) return false;
                const now = signature();
                if (now && now !== before) return true;
            }
            return false;
        };
        collect(read());
        const baseCount = known.size - out.length;
        const startScope = favoriteLiveScope();
        backupLog(`🪟 页内翻页起点：容器链接 ${scopeCards(startScope).length} 条，已知 ${known.size} 条，本次新增 ${out.length} 条`);
        let page = 1;
        while (!ui.cancelled && out.length < limit) {
            const target = favoritePagerLink(document, page + 1);
            if (!target) {
                backupLog('🪟 页内已没有可点的下一页，停止抓取');
                break;
            }
            const href = target.getAttribute('href') || '';
            if (href && !/^#/.test(href) && !/^javascript:/i.test(href)) {
                backupLog('🪟 页内翻页需要真实跳转，改走隐藏框架');
                break;
            }
            const before = signature();
            try {
                target.click();
            } catch (_) {
                break;
            }
            if (!(await waitChange(before, 48))) {
                const scope = favoriteLiveScope();
                backupLog(`🪟 页内翻页第 ${page + 1} 页没有读到新条目（当前容器链接 ${scopeCards(scope).length} 条）`);
                break;
            }
            page++;
            const added = collect(read());
            backupLog(`🪟 页内翻页第 ${page} 页：新增 ${added} 条，累计新增 ${out.length} 条`);
            setBackupProgress(ui, Math.min(0.4, ((baseCount + out.length) / limit) * 0.4));
            if (!added) {
                backupLog('🪟 页内翻页没有再新增条目，停止抓取');
                break;
            }
            await backupSleep(240);
        }
        if (page > 1 && !ui.cancelled) {
            const home = favoritePagerLink(document, 1);
            if (home) {
                const before = signature();
                try {
                    home.click();
                    await waitChange(before, 24);
                } catch (_) {
                    backupLog('🪟 页内抓取完成，但切回第 1 页失败');
                }
                backupLog('🪟 已切回收藏第 1 页');
            }
        }
        return out;
    }
    function favoriteSourceGuess() {
        const here = location.href.split('#')[0];
        if (IS_JABLE && /favourites?/i.test(here)) return here.split('?')[0];
        if (/favorite|favourite|collection|playlist|bookmark|mark|收藏|片单|片單/i.test(here)) return here.split('?')[0];
        if (IS_JABLE) return `${location.origin}${JABLE_FAVORITES_PATH}`;
        const seg = location.pathname.split('/').filter(Boolean)[0] || '';
        const lang = /^(?:en|zh|cn|ja|ko|tw)$/i.test(seg) ? `/${seg}` : '';
        return `${location.origin}${lang}/favorites`;
    }
    async function resolveFavoriteSource(explicit, ui) {
        const typed = String(explicit || '').trim();
        if (typed) return typed;
        if (/favorite|favourite|collection|playlist|bookmark|mark|收藏|片单|片單/i.test(location.href)) return location.href.split('#')[0];
        if (IS_JABLE) {
            const candidates = [`${location.origin}${JABLE_FAVORITES_PATH}`, `${location.origin}/my/favourites/`, `${location.origin}/favorites`];
            for (const url of candidates) {
                if (ui?.cancelled) return '';
                backupLog(`🔍 探测收藏页：${url}`);
                try {
                    const html = await gmRequest(url, { timeout: 15000 });
                    if (parseJableFavoriteCards(html).length) return url;
                } catch (_) {
                }
                await backupSleep(160);
            }
            backupLog('⚠️ 未自动识别收藏页，请在“收藏页”输入框粘贴地址');
            return `${location.origin}${JABLE_FAVORITES_PATH}`;
        }
        const seg = location.pathname.split('/').filter(Boolean)[0] || '';
        const lang = /^(?:en|zh|cn|ja|ko|tw)$/i.test(seg) ? `/${seg}` : '';
        const candidates = [
            `${location.origin}${lang}/favorites`,
            `${location.origin}/favorites`,
            `${location.origin}${lang}/my/favorites`,
            `${location.origin}/my/collections`,
            `${location.origin}${lang}/collections`
        ];
        for (const url of candidates) {
            if (ui?.cancelled) return '';
            backupLog(`🔍 探测收藏页：${url}`);
            try {
                const html = await gmRequest(url, { timeout: 15000 });
                if (parseFavoriteCards(html).length) return url;
            } catch (_) {
            }
            await backupSleep(160);
        }
        backupLog('⚠️ 未自动识别收藏页，请在“收藏页”输入框粘贴地址');
        return candidates[1];
    }
    async function collectFavoriteItems({ base, limit, ui }) {
        const out = [];
        const seen = new Set();
        const jableList = isJableFavorites(base);
        const perPage = 24;
        const maxPages = Math.min(120, Math.max(2, Math.ceil(limit / perPage) + 2));
        const adopt = cards => {
            let added = 0;
            for (const card of cards) {
                if (out.length >= limit) break;
                if (seen.has(card.href)) continue;
                seen.add(card.href);
                out.push(card);
                added++;
            }
            return added;
        };
        const finish = () => {
            if (out.length >= limit) backupLog(`⚠️ 已到数量上限 ${limit}，要备份全部请把上限调大`);
            return out;
        };
        if (jableList) {
            backupLog('🪟 Jable 使用页面内翻页：请保持在收藏第 1 页');
            const added = adopt(await favoriteLivePagerCards(limit, ui, seen));
            if (added) backupLog(`🪟 Jable 页内翻页完成，共 ${out.length} 条`);
            else backupLog('⚠️ 当前页面没有找到收藏列表，请先回到收藏第 1 页再开始备份');
            return finish();
        }
        let declaredPages = 0;
        let lastSnippet = '';
        for (let page = 1; page <= maxPages; page++) {
            if (ui.cancelled) break;
            const url = favoritePageUrl(base, page);
            backupLog(`📥 第 ${page} 页：${url}`);
            let payload = '';
            try {
                payload = await gmRequest(url, { timeout: 20000 });
            } catch (error) {
                backupLog(`⚠️ 第 ${page} 页读取失败：${error?.message || error}`);
                break;
            }
            const text = typeof payload === 'string' ? payload : '';
            lastSnippet = text.replace(/\s+/g, ' ').slice(0, 120);
            if (!declaredPages) {
                declaredPages = favoriteMaxPage(text);
                if (declaredPages > 1) backupLog(`🧭 收藏页共 ${declaredPages} 页（每页约 ${perPage} 条）`);
            }
            const added = adopt(favoriteCardsFromPayload(text, jableList));
            if (!added) {
                if (page === 1) backupLog('⚠️ 该地址没有解析到收藏卡片，请确认已登录并在收藏页地址栏粘贴正确地址');
                else {
                    backupLog(`🏁 第 ${page} 页没有新条目，分页结束，共 ${out.length} 条`);
                    if (lastSnippet) backupLog(`🧪 末次响应片段：${lastSnippet}`);
                }
                break;
            }
            backupLog(`📄 第 ${page} 页新增 ${added} 条，累计 ${out.length} 条`);
            setBackupProgress(ui, Math.min(0.4, (out.length / limit) * 0.4));
            if (out.length >= limit) break;
            await backupSleep(240);
        }
        if (declaredPages && out.length < limit && out.length < declaredPages * perPage) backupLog(`⚠️ 站点声明 ${declaredPages} 页，本次只收到 ${out.length} 条，后续页可能被登录态或反爬拦截`);
        return finish();
    }
    async function fillFavoriteDetails(items, fields, ui) {
        const wantName = fields.has('name');
        const wantThumb = fields.has('thumb');
        const wantActress = fields.has('actress');
        const wantGenre = fields.has('genre');
        const wantMaker = fields.has('maker');
        const wantMeta = wantActress || wantGenre || wantMaker;
        if (!wantName && !wantThumb && !wantMeta) return;
        let done = 0;

        await mapPool(items, 3, async item => {
            if (ui.cancelled) return null;
            const nameMissing = () => !item.name || item.name === item.code || BACKUP_DATE_TEXT_RE.test(item.name);
            const clearMeta = () => {
                if (wantActress) item.actress = [];
                if (wantGenre) item.genre = [];
                if (wantMaker) item.maker = '';
            };
            let siteDone = false;
            const readSite = async () => {
                if (siteDone) return;
                siteDone = true;
                try {
                    const html = await gmRequest(item.href, { timeout: 20000 });
                    const detail = parseBackupDetail(html);
                    if (detail) {
                        if (detail.code) item.code = detail.code;
                        if (wantName && nameMissing()) {
                            const detailName = backupCleanTitle(detail.title, item.code);
                            if (detailName) item.name = detailName;
                        }
                        if (wantThumb && !item.thumb && detail.cover) item.thumb = detail.cover;
                    }
                } catch (_) {
                    backupLog(`⚠️ 站点详情读取失败：${item.code || item.name}`);
                }
            };
            const readJavDb = async () => {
                if (!item.code) return false;
                const info = await fetchJavDbBackupInfo(item.code);
                if (!info) {
                    clearMeta();
                    backupLog(`⚠️ JavDB 未找到：${item.code}`);
                    return false;
                }
                if (wantName && nameMissing()) {
                    const infoName = backupCleanTitle(info.title, item.code);
                    if (infoName) item.name = infoName;
                }
                if (wantThumb && !item.thumb && info.cover) item.thumb = info.cover;
                if (wantActress) item.actress = info.actress;
                if (wantGenre) item.genre = info.genre;
                if (wantMaker) item.maker = info.maker;
                return true;
            };
            if (item.code) {
                await readJavDb();
            } else if (wantMeta) {
                await readSite();
                if (!item.code) item.code = backupCodeFrom(item.href, item.name);
                if (item.code) await readJavDb();
                else {
                    clearMeta();
                    backupLog(`⚠️ 缺少番号，无法到 JavDB 查询：${item.name || item.href}`);
                }
            }
            if (!siteDone && ((wantName && nameMissing()) || (wantThumb && !item.thumb))) await readSite();
            done++;
            setBackupProgress(ui, 0.4 + 0.3 * (done / items.length));
            if (done % 5 === 0 || done === items.length) backupLog(`🧾 详情 ${done}/${items.length}`);
            return item;
        });
    }
    function backupCsvCell(value) {
        const text = String(value ?? '');
        return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
    }
    function backupRows(items, fields, thumbNames) {
        return items.map(item => {
            const row = { 链接: item.href };
            if (fields.has('name')) row.名称 = item.name || '';
            if (fields.has('code')) row.番号 = item.code || '';
            if (fields.has('actress')) row.女优 = (item.actress || []).join('、');
            if (fields.has('genre')) row.类型 = (item.genre || []).join('、');
            if (fields.has('maker')) row.发行商 = item.maker || '';
            if (fields.has('thumb')) row.缩略图 = thumbNames.get(item) || '';
            return row;
        });
    }
    function backupFileStem(item, index) {
        const base = sanitizeBackupName(item.code || item.name, `video-${index}`);
        return `${String(index).padStart(3, '0')}_${base}`;
    }
    async function buildBackupEntries(items, fields, ui) {
        const imageEntries = [];
        const thumbNames = new Map();
        if (fields.has('thumb')) {
            let done = 0;

            const results = await mapPool(items, 4, async (item, index) => {
                if (ui.cancelled) return null;
                let image = item.thumb ? await fetchBackupImage(item.thumb, item.href) : null;
                if (!image && item.code) {
                    const info = await fetchJavDbBackupInfo(item.code);
                    if (info?.cover) {
                        if (!item.thumb) item.thumb = info.cover;
                        image = await fetchBackupImage(info.cover, 'https://javdb.com/');
                    }
                }
                done++;
                setBackupProgress(ui, 0.7 + 0.3 * (done / items.length));
                if (done % 5 === 0 || done === items.length) backupLog(`🖼 缩略图 ${done}/${items.length}`);
                if (!image) {
                    backupLog(`⚠️ 缩略图下载失败：${item.code || item.name}`);
                    return null;
                }

                return { item, path: `img/${backupFileStem(item, index + 1)}.${image.ext}`, data: image.bytes };
            });
            for (const entry of results) {
                if (!entry) continue;
                imageEntries.push({ name: entry.path, data: entry.data });
                thumbNames.set(entry.item, entry.path);
            }
        }
        const rows = backupRows(items, fields, thumbNames);
        const entries = [];
        if (rows.length) {
            const headers = Object.keys(rows[0]);
            const csv = [headers.join(','), ...rows.map(row => headers.map(key => backupCsvCell(row[key])).join(','))].join('\r\n');
            entries.push({ name: 'info.csv', data: `\uFEFF${csv}\r\n` });
            entries.push({
                name: 'info.json',
                data: JSON.stringify({ exportedAt: new Date().toISOString(), count: rows.length, items: rows }, null, 2)
            });
        }
        for (const entry of imageEntries) entries.push(entry);
        return entries;
    }
    let zipCrcTable = null;
    function backupCrc32(bytes) {
        if (!zipCrcTable) {
            zipCrcTable = new Uint32Array(256);
            for (let i = 0; i < 256; i++) {
                let value = i;
                for (let bit = 0; bit < 8; bit++) value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
                zipCrcTable[i] = value >>> 0;
            }
        }
        let crc = -1;
        for (let i = 0; i < bytes.length; i++) crc = (crc >>> 8) ^ zipCrcTable[(crc ^ bytes[i]) & 0xff];
        return (crc ^ -1) >>> 0;
    }
    function buildBackupZip(entries) {
        const encoder = new TextEncoder();
        const locals = [];
        const central = [];
        let offset = 0;
        for (const entry of entries) {
            const nameBytes = encoder.encode(entry.name);
            const data = entry.data instanceof Uint8Array ? entry.data : encoder.encode(String(entry.data ?? ''));
            const crc = backupCrc32(data);
            const local = new Uint8Array(30 + nameBytes.length);
            const lv = new DataView(local.buffer);
            lv.setUint32(0, 0x04034b50, true);
            lv.setUint16(4, 20, true);
            lv.setUint16(6, 0x0800, true);
            lv.setUint16(8, 0, true);
            lv.setUint32(14, crc, true);
            lv.setUint32(18, data.length, true);
            lv.setUint32(22, data.length, true);
            lv.setUint16(26, nameBytes.length, true);
            local.set(nameBytes, 30);
            locals.push(local, data);
            const cd = new Uint8Array(46 + nameBytes.length);
            const cv = new DataView(cd.buffer);
            cv.setUint32(0, 0x02014b50, true);
            cv.setUint16(4, 20, true);
            cv.setUint16(6, 20, true);
            cv.setUint16(8, 0x0800, true);
            cv.setUint32(16, crc, true);
            cv.setUint32(20, data.length, true);
            cv.setUint32(24, data.length, true);
            cv.setUint16(28, nameBytes.length, true);
            cv.setUint32(42, offset, true);
            cd.set(nameBytes, 46);
            central.push(cd);
            offset += local.length + data.length;
        }
        let centralSize = 0;
        for (const record of central) centralSize += record.length;
        const end = new Uint8Array(22);
        const ev = new DataView(end.buffer);
        ev.setUint32(0, 0x06054b50, true);
        ev.setUint16(8, central.length, true);
        ev.setUint16(10, central.length, true);
        ev.setUint32(12, centralSize, true);
        ev.setUint32(16, offset, true);
        const parts = [...locals, ...central, end];
        let total = 0;
        for (const part of parts) total += part.length;
        const out = new Uint8Array(total);
        let pos = 0;
        for (const part of parts) {
            out.set(part, pos);
            pos += part.length;
        }
        return out;
    }
    function triggerBlobDownload(blob, filename) {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        link.remove();
        setTimeout(() => URL.revokeObjectURL(url), 4000);
    }
    function backupStamp() {
        const now = new Date();
        const pad = value => String(value).padStart(2, '0');
        return `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}`;
    }
    function formatBytes(size) {
        const bytes = Number(size) || 0;
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
    }
    function backupSelectedFields() {
        const ui = state.favoriteBackup;
        const out = new Set();
        if (!ui?.inputs) return out;
        for (const field of BACKUP_FIELDS) if (ui.inputs[field.key]?.checked) out.add(field.key);
        return out;
    }
    function syncBackupFields() {
        const ui = state.favoriteBackup;
        if (!ui?.inputs) return;
        for (const field of BACKUP_FIELDS) {
            const input = ui.inputs[field.key];
            input?.closest('.av-backup-field')?.classList.toggle('is-on', !!input.checked);
        }
    }
    function clampBackupPosition(win) {
        if (!win) return;
        const rect = win.getBoundingClientRect?.() || { width: 0, height: 0 };
        const maxX = Math.max(0, window.innerWidth - rect.width - 8);
        const maxY = Math.max(0, window.innerHeight - Math.min(rect.height, window.innerHeight) - 8);
        const x = clamp(Number.parseFloat(win.style.left) || 0, 0, maxX);
        const y = clamp(Number.parseFloat(win.style.top) || 0, 0, maxY);
        win.style.left = `${x}px`;
        win.style.top = `${y}px`;
        settings.backupX = x;
        settings.backupY = y;
        store.set('backupX', x);
        store.set('backupY', y);
    }
    function stopFavoriteBackup() {
        const ui = state.favoriteBackup;
        if (!ui?.running) return;
        ui.cancelled = true;
        backupLog('⏹ 已请求停止，将在当前步骤后中断');
    }
    async function startFavoriteBackup() {
        const ui = state.favoriteBackup;
        if (!ui || ui.running) return;
        const fields = backupSelectedFields();
        if (!fields.size) {
            backupLog('⚠️ 请至少勾选一项要备份的内容');
            return;
        }
        const limit = Math.round(clamp(Number.parseInt(ui.limitInput.value, 10) || 50, 1, 2000));
        ui.limitInput.value = String(limit);
        settings.backupFields = [...fields].join(',');
        settings.backupLimit = limit;
        settings.backupSource = ui.sourceInput.value.trim();
        persistSettings();
        ui.running = true;
        ui.cancelled = false;
        setBackupBusy(ui, true);
        setBackupProgress(ui, 0);
        backupLog(`🚀 开始备份（${[...fields].join('、')}，上限 ${limit} 条）`);
        try {
            const source = await resolveFavoriteSource(settings.backupSource, ui);
            if (!source) {
                backupLog('⏹ 已停止');
                return;
            }
            ui.sourceInput.value = source;
            const items = await collectFavoriteItems({ base: source, limit, ui });
            if (ui.cancelled) {
                backupLog('⏹ 已停止');
                return;
            }
            if (!items.length) {
                backupLog('⚠️ 没有可备份的收藏，请确认已登录并在收藏页地址栏粘贴正确地址');
                return;
            }
            backupLog(`✅ 收藏列表完成：${items.length} 条`);
            await fillFavoriteDetails(items, fields, ui);
            if (ui.cancelled) {
                backupLog('⏹ 已停止');
                return;
            }
            const entries = await buildBackupEntries(items, fields, ui);
            if (ui.cancelled) {
                backupLog('⏹ 已停止');
                return;
            }
            const zip = buildBackupZip(entries);
            const filename = `收藏备份_${backupStamp()}.zip`;
            triggerBlobDownload(new Blob([zip], { type: 'application/zip' }), filename);
            setBackupProgress(ui, 1);
            backupLog(`💾 已导出 ${filename}（${entries.length} 个文件，${formatBytes(zip.length)}）`);
            log(`💾 收藏备份完成：${items.length} 条`);
        } catch (error) {
            backupLog(`❌ 备份失败：${error?.message || error}`);
        } finally {
            ui.running = false;
            setBackupBusy(ui, false);
        }
    }
    function closeFavoriteBackup() {
        const ui = state.favoriteBackup;
        if (!ui) return;
        ui.cancelled = true;
        ui.win?.remove();
        state.favoriteBackup = null;
    }
    function openFavoriteBackup() {
        const existing = state.favoriteBackup?.win;
        if (existing?.isConnected) {
            const hidden = existing.style.display === 'none';
            existing.style.display = hidden ? 'block' : 'none';
            if (hidden) clampBackupPosition(existing);
            return;
        }
        const win = document.createElement('div');
        win.className = 'av-backup-window';
        const header = document.createElement('div');
        header.className = 'av-backup-header';
        const title = document.createElement('span');
        title.className = 'av-backup-title';
        title.textContent = '收藏批量备份';
        const closeBtn = document.createElement('span');
        closeBtn.className = 'av-backup-close';
        closeBtn.textContent = '[关闭]';
        closeBtn.addEventListener('click', closeFavoriteBackup);
        header.append(title, closeBtn);
        const fieldsWrap = document.createElement('div');
        fieldsWrap.className = 'av-backup-fields';
        const saved = new Set(String(settings.backupFields || '').split(',').map(item => item.trim()).filter(Boolean));
        const inputs = {};
        for (const field of BACKUP_FIELDS) {
            const label = document.createElement('label');
            label.className = 'av-backup-field';
            const input = document.createElement('input');
            input.type = 'checkbox';
            input.checked = saved.has(field.key);
            input.addEventListener('change', () => {
                syncBackupFields();
                settings.backupFields = [...backupSelectedFields()].join(',');
                store.set('backupFields', settings.backupFields);
            });
            const text = document.createElement('span');
            text.textContent = field.label;
            label.append(input, text);
            label.addEventListener('mousedown', event => event.stopPropagation());
            fieldsWrap.appendChild(label);
            inputs[field.key] = input;
        }
        const sourceLine = document.createElement('div');
        sourceLine.className = 'av-backup-line';
        const sourceLabel = document.createElement('span');
        sourceLabel.textContent = '收藏页';
        const sourceInput = document.createElement('input');
        sourceInput.type = 'text';
        sourceInput.placeholder = '留空自动识别，或粘贴收藏/片单地址';
        sourceInput.value = settings.backupSource || (IS_JABLE ? `${location.origin}${JABLE_FAVORITES_PATH}` : '');
        sourceLine.append(sourceLabel, sourceInput);
        const limitLine = document.createElement('div');
        limitLine.className = 'av-backup-line';
        const limitLabel = document.createElement('span');
        limitLabel.textContent = '数量上限';
        const limitInput = document.createElement('input');
        limitInput.type = 'number';
        limitInput.min = '1';
        limitInput.max = '2000';
        limitInput.step = '1';
        limitInput.value = String(settings.backupLimit || 50);
        limitLine.append(limitLabel, limitInput);
        const actions = document.createElement('div');
        actions.className = 'av-backup-actions';
        const startBtn = document.createElement('button');
        startBtn.type = 'button';
        startBtn.className = 'av-backup-btn primary';
        startBtn.textContent = '开始备份';
        startBtn.addEventListener('click', startFavoriteBackup);
        const stopBtn = document.createElement('button');
        stopBtn.type = 'button';
        stopBtn.className = 'av-backup-btn';
        stopBtn.textContent = '停止';
        stopBtn.disabled = true;
        stopBtn.addEventListener('click', stopFavoriteBackup);
        actions.append(startBtn, stopBtn);
        const progress = document.createElement('div');
        progress.className = 'av-backup-progress';
        const bar = document.createElement('i');
        progress.appendChild(bar);
        const logEl = document.createElement('div');
        logEl.className = 'av-backup-log';
        const hint = document.createElement('div');
        hint.className = 'av-backup-hint';
        hint.textContent = '番号、名称、缩略图取自收藏列表，女优、类型、发行商一律到 JavDB 搜索下载；列表缺名称或缩略图时才到 JavDB 找。Jable 请停留在收藏第 1 页再开始抓取，输出 info.csv、info.json 与缩略图。';
        win.append(header, fieldsWrap, sourceLine, limitLine, actions, progress, logEl, hint);
        for (const type of ['mousedown', 'mouseup', 'click', 'dblclick', 'pointerdown', 'pointerup', 'touchstart', 'touchend', 'wheel']) {
            win.addEventListener(type, event => event.stopPropagation());
        }
        getUiLayer(2147483646).appendChild(win);
        state.favoriteBackup = { win, inputs, sourceInput, limitInput, startBtn, stopBtn, bar, logEl, running: false, cancelled: false };
        syncBackupFields();
        if (Number.isFinite(settings.backupX) && Number.isFinite(settings.backupY)) {
            win.style.left = `${settings.backupX}px`;
            win.style.top = `${settings.backupY}px`;
        } else {
            win.style.left = '15px';
            win.style.top = Math.round(Math.max(16, window.innerHeight * 0.12)) + 'px';
        }
        applyUiStyles();
        makeDraggable(win, header, { x: 'backupX', y: 'backupY' }, () => clampBackupPosition(win));
        clampBackupPosition(win);
        backupLog(`📌 当前收藏页猜测：${favoriteSourceGuess()}`);
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
        const empty = { rating: undefined, stills: [], reviews: [], lists: [], credits: null, javDbMovieId: '' };
        let movie = null;
        try {
            movie = await searchJavDbMovie(code);
        } catch (_) {
            return empty;
        }
        if (!movie?.id) return empty;
        const movieId = encodeURIComponent(movie.id);
        const detailUrl = javDbMovieDetailUrl(movie.id);
        const reviewsUrl = `${JDFORREPAM_API}/api/v1/movies/${movieId}/reviews?` +
            new URLSearchParams({ page: '1', sort_by: 'hotly', limit: '20' });
        const listsUrl = `${JDFORREPAM_API}/api/v1/lists/related?` +
            new URLSearchParams({ movie_id: movie.id, page: '1', limit: '20' });
        const once = url => jdApiFetch(url).catch(() => '').then(raw => raw || jdApiFetch(url).catch(() => ''));
        const [detailRaw, reviewsRaw, listsRaw] = await Promise.all([once(detailUrl), once(reviewsUrl), once(listsUrl)]);
        let rating;
        let credits = null;
        const stills = [];
        const reviews = [];
        const lists = [];
        try {
            const detail = JSON.parse(detailRaw)?.data?.movie;
            if (detail) {
                credits = javDbCreditsFrom(movie, detail);
                rememberJavDbCredits(code, credits);
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
        const partial = { rating, stills, reviews, lists, credits, javDbMovieId: String(movie.id) };
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
            if (partial.credits) state.infoData.credits = partial.credits;
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
            credits: javDb.credits || state.infoData.credits || null,
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
    const JAVDB_CREDITS_DONE = new Map();
    const JAVDB_CREDITS_TASKS = new Map();
    const JABLE_CARD_DELAY = 1200;
    let jableCardCode = '';
    function javDbCreditsFrom(movie, detail) {
        const source = detail || movie || {};
        const clean = value => String(value ?? '').replace(/\s+/g, ' ').trim();
        const actors = (Array.isArray(detail?.actors) ? detail.actors : []).map(actor => clean(actor?.name)).filter(Boolean);
        const credits = {
            code: clean(source.number || movie?.number),
            releaseDate: clean(source.release_date),
            maker: clean(source.maker_name),
            director: clean(source.director_name),
            series: clean(source.series_name),
            actors,
            url: movie?.id ? `https://javdb.com/v/${encodeURIComponent(String(movie.id))}` : ''
        };
        const filled = credits.releaseDate || credits.maker || credits.director || credits.series || actors.length;
        return filled ? credits : null;
    }
    function rememberJavDbCredits(code, credits) {
        const target = String(code || '').trim().toUpperCase();
        if (!target || !credits || JAVDB_CREDITS_DONE.has(target)) return;
        JAVDB_CREDITS_DONE.set(target, credits);
    }
    async function fetchJavDbCredits(code) {
        const movie = await searchJavDbMovie(code);
        if (!movie?.id) return null;
        const detail = await fetchJavDbDetail(movie.id);
        return javDbCreditsFrom(movie, detail);
    }
    function javDbCreditsFor(code) {
        const target = String(code || '').trim().toUpperCase();
        if (!target) return Promise.resolve(null);
        if (JAVDB_CREDITS_DONE.has(target)) return Promise.resolve(JAVDB_CREDITS_DONE.get(target));
        const pending = JAVDB_CREDITS_TASKS.get(target);
        if (pending) return pending;
        const task = fetchJavDbCredits(target).catch(() => null).then(credits => {
            JAVDB_CREDITS_TASKS.delete(target);
            JAVDB_CREDITS_DONE.set(target, credits || null);
            return credits || null;
        });
        JAVDB_CREDITS_TASKS.set(target, task);
        return task;
    }
    function jableInfoCredits(code) {
        const info = state.infoData;
        if (!info || !info.credits) return null;
        return String(info.code || '').trim().toUpperCase() === code ? info.credits : null;
    }
    function jableActressLinks() {
        const found = [];
        const seen = new Set();
        const anchors = typeof metaAnchors === 'function' ? metaAnchors(META_ACTRESS_SELECTOR, 40) : [];
        for (const anchor of anchors) {
            const name = typeof metaText === 'function' ? metaText(anchor) : '';
            if (!name || seen.has(name)) continue;
            seen.add(name);
            found.push({ name, href: typeof anchor.href === 'string' ? anchor.href : '' });
        }
        return found;
    }
    function jableCardHost() {
        const tags = document.querySelector('.video-info h5.tags') || document.querySelector('h5.tags.h6-md') || document.querySelector('h5.tags');
        if (tags?.parentElement) return { parent: tags.parentElement, before: tags };
        const actionRow = document.querySelector('.video-info .text-center .my-3') || document.querySelector('.video-info .my-3');
        if (actionRow?.parentElement) return { parent: actionRow.parentElement, before: actionRow.nextSibling };
        const box = document.querySelector('.video-info .text-center') || document.querySelector('section.video-info');
        return box ? { parent: box, before: null } : null;
    }
    function jablePendingNode() {
        const node = document.createElement('span');
        node.className = 'av-jable-meta-pending';
        node.textContent = '读取中…';
        return node;
    }
    function jableCreditsNodes(credits, key) {
        if (!credits) return [jablePendingNode()];
        const value = String(credits[key] || '').trim();
        const node = document.createElement('span');
        if (value) {
            node.className = 'av-jable-meta-text';
            node.textContent = value;
        } else {
            node.className = 'av-jable-meta-pending';
            node.textContent = '—';
        }
        return [node];
    }
    function jableActressNodes(credits) {
        const nodes = [];
        const seen = new Set();
        for (const item of jableActressLinks()) {
            if (!item.name || seen.has(item.name)) continue;
            seen.add(item.name);
            const node = document.createElement(item.href ? 'a' : 'span');
            node.className = 'av-jable-model';
            node.textContent = item.name;
            if (item.href) {
                node.href = item.href;
                node.target = '_blank';
                node.rel = 'noopener noreferrer';
                node.title = `${item.name} 的作品`;
            }
            nodes.push(node);
        }
        if (!nodes.length) {
            for (const name of credits?.actors ?? []) {
                if (!name || seen.has(name)) continue;
                seen.add(name);
                const node = document.createElement('span');
                node.className = 'av-jable-model';
                node.textContent = name;
                nodes.push(node);
            }
        }
        return nodes.length ? nodes : [jablePendingNode()];
    }
    function jableMetaItem(label, nodes) {
        const item = document.createElement('div');
        item.className = 'av-jable-meta-item';
        const name = document.createElement('span');
        name.className = 'av-jable-meta-label';
        name.textContent = label;
        const values = document.createElement('div');
        values.className = 'av-jable-meta-values';
        values.append(...nodes);
        item.append(name, values);
        return item;
    }
    function renderJableCreditsCard(code, credits) {
        const target = String(code || '').trim().toUpperCase();
        if (!target) return null;
        const host = jableCardHost();
        if (!host) return null;
        let card = document.querySelector('.av-jable-meta');
        if (card && String(card.dataset?.code || '') !== target) {
            card.remove();
            card = null;
        }
        if (!card) {
            card = document.createElement('div');
            card.className = 'av-jable-meta';
            if (card.dataset) card.dataset.code = target;
        }
        if (card.parentElement !== host.parent) host.parent.insertBefore(card, host.before || null);
        const head = document.createElement('div');
        head.className = 'av-jable-meta-head';
        const caption = document.createElement('span');
        caption.className = 'av-jable-meta-title';
        caption.textContent = '作品资料';
        const source = document.createElement(credits?.url ? 'a' : 'span');
        source.className = 'av-jable-meta-src';
        source.textContent = 'JavDB';
        if (credits?.url) {
            source.href = credits.url;
            source.target = '_blank';
            source.rel = 'noopener noreferrer';
            source.title = '在 JavDB 查看该作品';
        }
        head.append(caption, source);
        const grid = document.createElement('div');
        grid.className = 'av-jable-meta-grid';
        grid.append(
            jableMetaItem('女优', jableActressNodes(credits)),
            jableMetaItem('发行时间', jableCreditsNodes(credits, 'releaseDate')),
            jableMetaItem('片商', jableCreditsNodes(credits, 'maker')),
            jableMetaItem('导演', jableCreditsNodes(credits, 'director')),
            jableMetaItem('系列', jableCreditsNodes(credits, 'series'))
        );
        card.replaceChildren(head, grid);
        return card;
    }
    function startJableCreditsCard(code) {
        if (!IS_JABLE) return null;
        const target = String(code || getPageVideoCode() || '').trim().toUpperCase();
        if (!target) return null;
        const known = JAVDB_CREDITS_DONE.has(target) ? JAVDB_CREDITS_DONE.get(target) : jableInfoCredits(target);
        renderJableCreditsCard(target, known || null);
        if (known || jableCardCode === target) return null;
        jableCardCode = target;
        return setTimeout(() => {
            if (jableCardCode !== target) return;
            javDbCreditsFor(target).then(credits => {
                if (jableCardCode !== target) return;
                if (String(getPageVideoCode() || '').trim().toUpperCase() !== target) return;
                renderJableCreditsCard(target, credits);
            });
        }, JABLE_CARD_DELAY);
    }
    function applyInfoToPage(data) {
        if (!data) return;
        if (data.rating) injectRatingBadge(data.rating);
        renderInfoSection(data);
        startJableCreditsCard(data.code);
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
        if (video.classList && video.classList.contains('preview')) return true;
        if (typeof video.id === 'string' && video.id.startsWith('preview-')) return true;
        if (video.hasAttribute && video.hasAttribute('data-src')) return true;
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
    function playerMetricsOk(video) {
        if (!video || !video.isConnected) return false;
        if (isPreviewVideo(video)) return false;
        let width = video.videoWidth || 0;
        let height = video.videoHeight || 0;
        if (!width || !height) {
            const rect = video.getBoundingClientRect();
            width = rect.width;
            height = rect.height;
        }
        return width >= MIN_PLAYER_WIDTH && height >= MIN_PLAYER_HEIGHT;
    }
    function findMainVideo() {
        if (videoProbeEl && videoProbeEl.isConnected && Date.now() - videoProbeAt < VIDEO_PROBE_TTL) return videoProbeEl;
        const explicit = document.querySelector('.plyr__video-wrapper video, .plyr video, .video-js video, .artplayer video, .dplayer video, #player video');
        if (playerMetricsOk(explicit)) {
            videoProbeAt = Date.now();
            videoProbeEl = explicit;
            return videoProbeEl;
        }
        let best = null;
        let bestScore = 0;
        for (const video of document.querySelectorAll('video')) {
            if (isPreviewVideo(video)) continue;
            const host = video.closest(PLAYER_HOST_SELECTOR);
            let width = video.videoWidth || 0;
            let height = video.videoHeight || 0;
            if (!width || !height) {
                const rect = video.getBoundingClientRect();
                width = rect.width;
                height = rect.height;
            }
            if (width < MIN_PLAYER_WIDTH || height < MIN_PLAYER_HEIGHT) continue;
            const score = width * height * (host ? 100 : 1);
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
        state.pollTimer = trackInterval(setInterval(() => {
            const video = findMainVideo();
            if (!video) return;
            const container = playerContainer(video);
            if (!container) return;
            stopPlayerPoll();
            bindPlayer(video, container);
        }, POLL_INTERVAL));
        state.pollTimeout = setTimeout(stopPlayerPoll, POLL_TIMEOUT);
    }
    function sweepUiOrphans(container) {
        for (const selector of ['.custom-subtitle', '.speed-hud-host', '.custom-quick-controls']) {
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

        try {
            restoreSubtitleSnapshot();
        } catch (_) {
        }
        setupHoldAccelerate(container);
        setupResumePlayback(video, container);
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
        startJableCreditsCard();
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
            flex: 1 1 100%;
            flex-wrap: wrap;
            align-items: center;
            justify-content: space-between;
            width: 100%;
            box-sizing: border-box;
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
        .av-login-panel {
            display: flex;
            flex-direction: column;
            gap: 8px;
            margin-top: 10px;
            padding: 10px 0 4px;
            border-top: 1px solid rgba(255, 255, 255, .15);
        }
        .av-login-field { display: flex; flex-direction: column; gap: 4px; }
        .av-login-field > span { color: #94a3b8; font-size: 11px; font-weight: 600; }
        .custom-control-panel .av-login-panel input[type="text"],
        .custom-control-panel .av-login-panel input[type="password"] { width: 100%; height: 28px; padding: 0 8px; border: 1px solid rgba(255,255,255,.3); border-radius: 6px; outline: none; background: rgba(255,255,255,.15); color: #fff; font-family: inherit; font-size: 12px; font-weight: 600; text-align: left; text-transform: none; letter-spacing: 0; text-shadow: none; }
        .custom-control-panel .av-login-panel input[type="text"]:focus,
        .custom-control-panel .av-login-panel input[type="password"]:focus { border-color: #60a5fa; background: rgba(255,255,255,.2); }
        .av-login-status { font-size: 11px; font-weight: 600; color: #94a3b8; }
        .av-login-status.is-ok { color: #4ade80; }
        .av-login-status.is-fail { color: #f87171; }
        .av-login-status.is-warn { color: #fbbf24; }
        .av-login-status.is-busy { color: #38bdf8; }
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
            color: #e2e8f0;
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
        .av-stat-toggle { position: relative; display: inline-flex; align-items: center; gap: 4px; padding: 3px; border-radius: 999px; background: rgba(148, 163, 184, .1); }
        .av-stat-toggle-pill { position: absolute; top: 3px; left: 0; height: calc(100% - 6px); border-radius: 999px; background: rgba(56, 189, 248, .18); box-shadow: inset 0 0 0 1px rgba(56, 189, 248, .22); transition: transform .22s cubic-bezier(.4, 0, .2, 1), width .22s cubic-bezier(.4, 0, .2, 1); pointer-events: none; }
        .av-stat-toggle button { position: relative; z-index: 1; appearance: none; border: 0; background: transparent; color: #94a3b8; font-size: 11px; line-height: 1; padding: 5px 12px; border-radius: 999px; cursor: pointer; transition: color .18s ease; }
        .av-stat-toggle button:hover:not(.is-on) { color: #cbd5e1; }
        .av-stat-toggle button.is-on { color: #e2e8f0; }
        .av-stat-toggle button:focus-visible { outline: 1px solid rgba(56, 189, 248, .6); outline-offset: 1px; }
        .av-stat-toggle-row { display: flex; justify-content: flex-end; margin: -6px 0 10px; }
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
        .av-hourmap { overflow-x: auto; padding-bottom: 4px; }
        .av-hourmap-grid { display: grid; grid-template-columns: 20px repeat(24, minmax(14px, 1fr)); gap: 3px; min-width: 560px; align-items: center; }
        .av-hourmap-head { font-size: 9px; color: #64748b; text-align: center; height: 12px; }
        .av-hourmap-day { font-size: 10px; color: #64748b; text-align: right; padding-right: 4px; }
        .av-hourmap-cell { height: 15px; border-radius: 3px; background: rgba(56, 189, 248, .08); cursor: help; }
        .av-hourmap-cell.level-1 { background: rgba(56, 189, 248, .28); }
        .av-hourmap-cell.level-2 { background: rgba(56, 189, 248, .46); }
        .av-hourmap-cell.level-3 { background: rgba(56, 189, 248, .68); }
        .av-hourmap-cell.level-4 { background: rgba(56, 189, 248, .92); }
        .av-habit-list { display: flex; flex-direction: column; gap: 12px; }
        .av-habit-label { display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 5px; color: #cbd5e1; }
        .av-progress-bar { height: 6px; border-radius: 999px; background: rgba(148, 163, 184, .14); overflow: hidden; }
        .av-progress-bar > div { height: 100%; border-radius: 999px; background: linear-gradient(90deg, #38bdf8, #818cf8); }
        .av-progress-bar.is-habit > div { background: linear-gradient(90deg, #34d399, #38bdf8); }
        .av-progress-bar.is-actress > div { background: linear-gradient(90deg, #a78bfa, #38bdf8); }
        .av-progress-bar.is-genre > div { background: linear-gradient(90deg, #f472b6, #a78bfa); }
        .av-progress-bar.is-maker > div { background: linear-gradient(90deg, #34d399, #22d3ee); }
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
        .av-empty { text-align: center; padding: 80px 20px; }
        .av-empty-icon { display: inline-flex; padding: 14px; border-radius: 50%; background: rgba(148, 163, 184, .12); color: #94a3b8; }
        .av-empty-icon svg { width: 30px; height: 30px; }
        .av-empty h2 { font-size: 18px; margin: 16px 0 8px; }
        .av-empty p { font-size: 12px; color: #64748b; max-width: 460px; margin: 0 auto; line-height: 1.7; }
        .av-mini-empty { font-size: 12px; color: #64748b; padding: 10px 0; }
        .av-persona-card { padding: 20px 22px; border-radius: 14px; margin-bottom: 18px; background-image: linear-gradient(135deg, rgba(56, 189, 248, .1), rgba(167, 139, 250, .07)); background-color: rgba(148, 163, 184, .06); border: 1px solid rgba(56, 189, 248, .24); }
        .av-persona-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; padding-bottom: 14px; margin-bottom: 16px; border-bottom: 1px solid rgba(148, 163, 184, .16); }
        .av-persona-title-group { display: flex; flex-direction: column; gap: 4px; min-width: 0; }
        .av-persona-kicker { font-size: 11px; font-weight: 600; letter-spacing: .06em; text-transform: uppercase; color: #7dd3fc; }
        .av-persona-archetype { margin: 0; font-size: 22px; font-weight: 700; line-height: 1.25; color: #f1f5f9; }
        .av-persona-scope { display: inline-flex; align-items: center; padding: 3px 9px; border-radius: 999px; font-size: 11px; white-space: nowrap; color: #94a3b8; background: rgba(148, 163, 184, .12); border: 1px solid rgba(148, 163, 184, .2); }
        .av-persona-body { display: grid; grid-template-columns: minmax(0, 1.2fr) minmax(0, 1fr); align-items: start; gap: 20px; }
        .av-persona-narrative-col { display: flex; flex-direction: column; gap: 14px; min-width: 0; }
        .av-persona-narrative { margin: 0; font-size: 13px; line-height: 1.75; color: #cbd5e1; }
        .av-persona-tags-wrap { display: flex; flex-direction: column; gap: 6px; }
        .av-persona-tags-label { font-size: 11px; font-weight: 600; letter-spacing: .04em; text-transform: uppercase; color: #64748b; }
        .av-persona-tags { display: flex; flex-wrap: wrap; gap: 6px; }
        .av-persona-tag { display: inline-flex; align-items: center; padding: 3px 9px; border-radius: 999px; font-size: 11px; font-weight: 500; color: #7dd3fc; background: rgba(56, 189, 248, .1); border: 1px solid rgba(56, 189, 248, .28); }
        .av-persona-traits { display: flex; flex-direction: column; gap: 8px; }
        .av-trait-card { display: flex; flex-direction: column; gap: 3px; padding: 10px 14px; border-radius: 10px; background: rgba(148, 163, 184, .08); border: 1px solid rgba(148, 163, 184, .14); }
        .av-trait-label { font-size: 11px; font-weight: 600; color: #64748b; }
        .av-trait-val { font-size: 13px; font-weight: 600; line-height: 1.3; color: #f1f5f9; }
        .av-trait-sub { font-size: 11px; line-height: 1.4; color: #94a3b8; }
        .av-records-head { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px; margin-bottom: 14px; }
        .av-records-title-group { display: flex; flex-direction: column; gap: 3px; }
        .av-records-title { display: flex; align-items: center; gap: 8px; margin: 0; font-size: 14px; font-weight: 600; color: #e2e8f0; }
        .av-records-title .av-svg { color: #38bdf8; }
        .av-records-subtitle { margin: 0; font-size: 11px; color: #64748b; }
        .av-records-controls { display: flex; align-items: center; flex-wrap: wrap; gap: 12px; }
        .av-search-box { position: relative; display: inline-flex; align-items: center; height: 32px; }
        .av-search-input { box-sizing: border-box; width: 240px; height: 32px; padding: 0 28px 0 10px; border-radius: 8px; font-family: inherit; font-size: 12px; color: #e2e8f0; background: rgba(15, 23, 42, .75); border: 1px solid rgba(148, 163, 184, .28); outline: none; }
        .av-search-input::placeholder { color: #64748b; }
        .av-search-input:focus { border-color: rgba(56, 189, 248, .7); box-shadow: 0 0 0 1px rgba(56, 189, 248, .5); }
        .av-search-input::-webkit-search-cancel-button { display: none; }
        .av-search-clear { position: absolute; top: 50%; right: 6px; transform: translateY(-50%); display: inline-flex; align-items: center; justify-content: center; width: 20px; height: 20px; padding: 0; border: 0; border-radius: 50%; background: transparent; color: #94a3b8; cursor: pointer; }
        .av-search-clear:hover { background: rgba(148, 163, 184, .18); color: #e2e8f0; }
        .av-search-clear svg { width: 12px; height: 12px; }
        .av-records-count { font-size: 12px; color: #94a3b8; }
        .av-records-list { display: flex; flex-direction: column; }
        .av-record-row { display: grid; grid-template-columns: 92px minmax(0, 1fr) 168px 92px 72px; align-items: center; gap: 12px; padding: 10px 8px; border-top: 1px solid rgba(148, 163, 184, .1); font-size: 12px; }
        .av-record-row:first-child { border-top: 0; }
        .av-record-row:hover { background: rgba(148, 163, 184, .05); }
        .av-record-code { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-weight: 600; color: #7dd3fc; text-decoration: none; }
        .av-record-code:hover { text-decoration: underline; }
        .av-record-main { display: flex; flex-direction: column; gap: 4px; min-width: 0; }
        .av-record-title { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: #e2e8f0; }
        .av-record-tags { display: flex; flex-wrap: wrap; gap: 5px; }
        .av-record-tag { padding: 1px 7px; border-radius: 999px; font-size: 10px; color: #94a3b8; background: rgba(148, 163, 184, .12); border: 1px solid rgba(148, 163, 184, .16); }
        .av-record-tag.is-state { display: inline-flex; align-items: center; white-space: nowrap; font-weight: 600; }
        .av-record-tag.is-complete { color: #7dd3fc; background: rgba(56, 189, 248, .14); border-color: rgba(56, 189, 248, .32); }
        .av-record-tag.is-resume { color: #6ee7b7; background: rgba(16, 185, 129, .16); border-color: rgba(16, 185, 129, .32); }
        .av-record-progress { display: flex; flex-direction: column; gap: 5px; min-width: 0; }
        .av-record-progress-head { display: flex; align-items: center; justify-content: space-between; gap: 8px; font-size: 11px; color: #94a3b8; font-variant-numeric: tabular-nums; white-space: nowrap; }
        .av-record-progress-left { display: inline-flex; align-items: center; gap: 6px; flex: 0 0 auto; }
        .av-record-progress-pct { font-weight: 600; color: #cbd5e1; }
        .av-record-time { margin-left: auto; flex: 0 0 auto; color: #94a3b8; }
        .av-record-date { font-size: 11px; color: #64748b; white-space: nowrap; }
        .av-record-actions { display: flex; justify-content: flex-end; gap: 6px; }
        .av-icon-btn { display: inline-flex; align-items: center; justify-content: center; width: 28px; height: 28px; padding: 0; border-radius: 8px; border: 1px solid rgba(148, 163, 184, .22); background: rgba(148, 163, 184, .1); color: #cbd5e1; cursor: pointer; text-decoration: none; }
        .av-icon-btn svg { width: 14px; height: 14px; }
        .av-icon-btn:hover { background: rgba(148, 163, 184, .2); color: #fff; }
        .av-icon-btn.is-danger { border-color: rgba(248, 113, 113, .32); background: rgba(248, 113, 113, .12); color: #fca5a5; }
        .av-icon-btn.is-danger:hover { background: rgba(248, 113, 113, .24); color: #fee2e2; }
        .av-records-empty { padding: 34px 16px; text-align: center; font-size: 12px; color: #64748b; }
        .av-records-more { display: flex; justify-content: center; padding-top: 14px; }
        @media (max-width: 720px) {
            .av-persona-card { padding: 16px; }
            .av-persona-head { flex-direction: column; align-items: flex-start; gap: 8px; }
            .av-persona-archetype { font-size: 18px; }
            .av-persona-body { grid-template-columns: 1fr; gap: 16px; }
            .av-records-controls { width: 100%; }
            .av-search-box { width: 100%; }
            .av-search-input { width: 100%; }
            .av-record-row { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; }
            .av-record-code { order: 1; }
            .av-record-main { order: 2; flex: 1 1 100%; }
            .av-record-date { order: 3; margin-left: auto; }
            .av-record-actions { order: 4; flex: 0 0 auto; }
            .av-record-progress { order: 5; flex: 1 1 100%; }
        }
    `);
    const WATCHED_KEY_BASE = 'watchedList';
    const WATCHED_KEY = `${WATCHED_KEY_BASE}@${SITE_TAG}`;
    const MAX_WATCHED = 5000;
    const ANALYTICS_KEY_BASE = 'analyticsRecords_v1';
    const ANALYTICS_KEY = `${ANALYTICS_KEY_BASE}@${SITE_TAG}`;
    const ANALYTICS_SPLIT_KEY = 'analyticsSplit_v1';
    const RESUME_KEY_BASE = 'resumePlayback_v1';
    const RESUME_KEY = `${RESUME_KEY_BASE}@${SITE_TAG}`;
    const SITE_SPLIT_KEY = 'siteSplit_v1';
    const MAX_RESUME = 1000;
    const RESUME_SAVE_INTERVAL = 5000;
    const RESUME_MIN_SECONDS = 30;
    const RESUME_TAIL_RATIO = 0.95;
    const RESUME_EXPIRE_MS = 120 * 86400000;
    const RESUME_GUARD_MS = 180000;
    const RESUME_GUARD_TOLERANCE = 3;
    const RESUME_GUARD_RELEASE = 20;
    const RESUME_GUARD_TRIES = 6;
    const RESUME_TOAST_MS = 10000;
    const resumeSeekBound = new WeakSet();
    const MAX_RECORDS = 3000;
    const MAX_RECORDS_SLACK = 200;
    const ANALYTICS_SAVE_INTERVAL = 25000;
    const HISTORY_MIGRATION_KEY = 'historyMigration_v2';
    const HISTORY_SCHEMA_VERSION = 2;
    const CARD_SELECTOR = '.video-img-box, .thumbnail, .video-item, .list-item, .video-list-item, article.video-card, .grid > div, .row > div[class*="col-"], .video-list > div';
    const CARD_INNER_SELECTOR = '.thumbnail, .video-img-box, .video-item, .list-item, .video-list-item, article.video-card';
    const CARD_CHROME_SELECTOR = 'header, nav, footer, .site-header, .app-nav, .site-footer, .pagination, .breadcrumb, .custom-ui-layer, .av-analytics-page';
    const DURATION_OPTIONS = [[0, '全部时长'], [300, '≥ 5 分钟'], [600, '≥ 10 分钟'], [1200, '≥ 20 分钟'], [1800, '≥ 30 分钟'], [3600, '≥ 60 分钟']];
    let watchedCache = null;
    let historyStorageReady = false;
    function historyHasGmStorage() {
        try {
            return typeof GM_getValue === 'function' && typeof GM_setValue === 'function';
        } catch (_) {
            return false;
        }
    }
    function historyGmGet(key) {
        if (!historyHasGmStorage()) return null;
        try {
            const value = GM_getValue(STORAGE_PREFIX + key, null);
            return value === void 0 || value === null ? null : (typeof value === 'string' ? value : String(value));
        } catch (_) {
            return null;
        }
    }
    function historyGmSet(key, value) {
        if (!historyHasGmStorage()) return;
        try {
            GM_setValue(STORAGE_PREFIX + key, String(value));
        } catch (_) {
        }
    }
    function historyLocalGet(key) {
        try {
            return localStorage.getItem(STORAGE_PREFIX + key);
        } catch (_) {
            return null;
        }
    }
    function historyLocalSet(key, value) {
        try {
            localStorage.setItem(STORAGE_PREFIX + key, String(value));
        } catch (_) {
        }
    }
    function historyParseJson(raw, fallback) {
        if (raw === null || raw === void 0 || raw === '') return fallback;
        if (typeof raw === 'object') return raw;
        try {
            return JSON.parse(String(raw));
        } catch (_) {
            return fallback;
        }
    }
    function historyNumber(value) {
        const number = Number(value);
        return Number.isFinite(number) ? Math.max(0, number) : 0;
    }
    function historyText(value) {
        return typeof value === 'string' ? value.trim() : '';
    }
    function historyStringList(value) {
        if (!Array.isArray(value)) return [];
        const seen = new Set();
        const result = [];
        for (const item of value) {
            const text = historyText(item);
            if (!text || seen.has(text)) continue;
            seen.add(text);
            result.push(text);
        }
        return result;
    }
    function historyWatchedList(raw) {
        const list = historyParseJson(raw, []);
        if (!Array.isArray(list)) return [];
        const result = [];
        const seen = new Set();
        for (const item of list) {
            const code = normalizeVideoCode(item);
            if (!code || seen.has(code)) continue;
            seen.add(code);
            result.push(code);
        }
        return result.slice(-MAX_WATCHED);
    }
    function historyNormalizeRecord(item) {
        if (!item || typeof item !== 'object') return null;
        const code = normalizeVideoCode(item.code);
        if (!code) return null;
        const watchedAt = historyNumber(item.watchedAt);
        const firstWatchedAt = historyNumber(item.firstWatchedAt) || watchedAt;
        return {
            code,
            title: historyText(item.title) || code,
            url: historyText(item.url),
            duration: historyNumber(item.duration),
            watchedSeconds: historyNumber(item.watchedSeconds),
            watchedAt,
            firstWatchedAt,
            actresses: historyStringList(item.actresses),
            genres: historyStringList(item.genres),
            maker: historyText(item.maker),
            maxProgress: Math.min(1, historyNumber(item.maxProgress)),
            watchCount: historyNumber(item.watchCount)
        };
    }
    function historyMergeRecord(target, incoming) {
        target.watchedSeconds += incoming.watchedSeconds;
        target.watchCount += incoming.watchCount;
        target.watchedAt = Math.max(target.watchedAt, incoming.watchedAt);
        target.firstWatchedAt = target.firstWatchedAt
            ? (incoming.firstWatchedAt ? Math.min(target.firstWatchedAt, incoming.firstWatchedAt) : target.firstWatchedAt)
            : incoming.firstWatchedAt;
        target.maxProgress = Math.max(target.maxProgress, incoming.maxProgress);
        if (!target.title || target.title === target.code) target.title = incoming.title || target.title;
        if (!target.url) target.url = incoming.url;
        if (!target.duration && incoming.duration) target.duration = incoming.duration;
        if (!target.maker && incoming.maker) target.maker = incoming.maker;
        if (!target.actresses.length && incoming.actresses.length) target.actresses = incoming.actresses;
        if (!target.genres.length && incoming.genres.length) target.genres = incoming.genres;
        return target;
    }
    function historyNormalizeRecordList(value, mergeDuplicates) {
        const list = Array.isArray(value) ? value : [];
        const records = [];
        const byCode = new Map();
        for (const item of list) {
            const record = historyNormalizeRecord(item);
            if (!record) continue;
            if (!mergeDuplicates) {
                records.push(record);
                continue;
            }
            const existing = byCode.get(record.code);
            if (existing) historyMergeRecord(existing, record);
            else {
                byCode.set(record.code, record);
                records.push(record);
            }
        }
        records.sort((a, b) => (b.watchedAt || 0) - (a.watchedAt || 0));
        return records.slice(0, MAX_RECORDS);
    }
    function historyMergeRecordLists(...lists) {
        return historyNormalizeRecordList(lists.flat(), true);
    }
    function analyticsRecordSite(record) {
        return siteTagFromUrl(record && record.url);
    }
    function siteTagFromUrl(url) {
        const text = String(url || '').toLowerCase();
        if (text.includes('jable.')) return 'jable';
        if (text.includes('missav.')) return 'missav';
        return '';
    }
    function analyticsOtherSiteClaimed() {
        const otherTag = SITE_TAG === 'jable' ? 'missav' : 'jable';
        const otherKey = `${ANALYTICS_KEY_BASE}@${otherTag}`;
        return historyGmGet(otherKey) !== null || historyLocalGet(otherKey) !== null;
    }
    function siteSplitMarked(markerKey) {
        return historyGmGet(markerKey) === '1' || historyLocalGet(markerKey) === '1';
    }
    function markSiteSplit(markerKey) {
        historyGmSet(markerKey, '1');
        historyLocalSet(markerKey, '1');
    }
    function migrateLegacyAnalyticsKey() {
        const markerKey = `${ANALYTICS_SPLIT_KEY}:${SITE_TAG}`;
        if (siteSplitMarked(markerKey)) return;
        const legacy = historyMergeRecordLists(
            historyNormalizeRecordList(historyParseJson(historyGmGet(ANALYTICS_KEY_BASE), []), true),
            historyNormalizeRecordList(historyParseJson(historyLocalGet(ANALYTICS_KEY_BASE), []), true)
        );
        const unclaimed = analyticsOtherSiteClaimed() ? '' : SITE_TAG;
        const mine = legacy.filter(record => {
            const site = analyticsRecordSite(record);
            return site ? site === SITE_TAG : Boolean(unclaimed);
        });
        if (mine.length) {
            const existing = historyMergeRecordLists(
                historyNormalizeRecordList(historyParseJson(historyGmGet(ANALYTICS_KEY), []), true),
                historyNormalizeRecordList(historyParseJson(historyLocalGet(ANALYTICS_KEY), []), true)
            );
            const merged = historyMergeRecordLists(existing, mine);
            historyGmSet(ANALYTICS_KEY, JSON.stringify(merged));
            historyLocalSet(ANALYTICS_KEY, JSON.stringify(merged));
        }
        markSiteSplit(markerKey);
    }
    function migrateLegacySiteKeys() {
        const markerKey = `${SITE_SPLIT_KEY}:${SITE_TAG}`;
        if (siteSplitMarked(markerKey)) return;
        const legacyWatched = [...new Set([
            ...historyWatchedList(historyGmGet(WATCHED_KEY_BASE)),
            ...historyWatchedList(historyLocalGet(WATCHED_KEY_BASE))
        ])].slice(-MAX_WATCHED);
        if (legacyWatched.length) {
            const mergedWatched = [...new Set([
                ...historyWatchedList(historyGmGet(WATCHED_KEY)),
                ...historyWatchedList(historyLocalGet(WATCHED_KEY)),
                ...legacyWatched
            ])].slice(-MAX_WATCHED);
            historyGmSet(WATCHED_KEY, JSON.stringify(mergedWatched));
            historyLocalSet(WATCHED_KEY, JSON.stringify(mergedWatched));
        }
        const legacyResume = Object.assign(
            {},
            historyParseJson(historyGmGet(RESUME_KEY_BASE), {}),
            historyParseJson(historyLocalGet(RESUME_KEY_BASE), {})
        );
        const otherResumeKey = `${RESUME_KEY_BASE}@${SITE_TAG === 'jable' ? 'missav' : 'jable'}`;
        const unclaimed = historyGmGet(otherResumeKey) === null && historyLocalGet(otherResumeKey) === null;
        const mine = {};
        if (legacyResume && typeof legacyResume === 'object' && !Array.isArray(legacyResume)) {
            for (const [code, entry] of Object.entries(legacyResume)) {
                if (!entry || typeof entry !== 'object') continue;
                const site = siteTagFromUrl(entry.url);
                if (site ? site === SITE_TAG : unclaimed) mine[code] = entry;
            }
        }
        if (Object.keys(mine).length) {
            const mergedResume = Object.assign(
                {},
                historyParseJson(historyGmGet(RESUME_KEY), {}),
                historyParseJson(historyLocalGet(RESUME_KEY), {}),
                mine
            );
            historyGmSet(RESUME_KEY, JSON.stringify(mergedResume));
            historyLocalSet(RESUME_KEY, JSON.stringify(mergedResume));
        }
        markSiteSplit(markerKey);
    }
    function initializeHistoryStorage() {
        if (historyStorageReady) return;
        historyStorageReady = true;
        migrateLegacyAnalyticsKey();
        migrateLegacySiteKeys();
        const markerKey = `${HISTORY_MIGRATION_KEY}:${SITE_TAG}:${location.hostname}`;
        if (historyLocalGet(markerKey) === '1') return;
        const gmWatched = historyWatchedList(historyGmGet(WATCHED_KEY));
        const localWatched = historyWatchedList(historyLocalGet(WATCHED_KEY));
        const mergedWatched = [...new Set([...gmWatched, ...localWatched])].slice(-MAX_WATCHED);
        const gmRecordsRaw = historyGmGet(ANALYTICS_KEY);
        const localRecordsRaw = historyLocalGet(ANALYTICS_KEY);
        const gmRecords = historyNormalizeRecordList(historyParseJson(gmRecordsRaw, []), true);
        const localRecords = historyNormalizeRecordList(historyParseJson(localRecordsRaw, []), true);
        const mergedRecords = gmRecordsRaw !== null && gmRecordsRaw === localRecordsRaw
            ? gmRecords
            : historyMergeRecordLists(gmRecords, localRecords);
        historyStorageSet(WATCHED_KEY, JSON.stringify(mergedWatched));
        historyStorageSet(ANALYTICS_KEY, JSON.stringify(mergedRecords));
        historyGmSet(HISTORY_MIGRATION_KEY, '1');
        historyLocalSet(markerKey, '1');
    }
    function historyStorageGet(key) {
        initializeHistoryStorage();
        const gmValue = historyGmGet(key);
        const localValue = historyLocalGet(key);
        if (gmValue !== null) {
            if (localValue !== gmValue) historyLocalSet(key, gmValue);
            return gmValue;
        }
        if (localValue !== null) historyGmSet(key, localValue);
        return localValue;
    }
    function historyStorageSet(key, value) {
        initializeHistoryStorage();
        historyGmSet(key, value);
        historyLocalSet(key, value);
    }
    function resetHistoryCaches() {
        watchedCache = null;
        state.analyticsRecords = null;
        resumeCache = null;
        bumpAnalyticsVersion();
    }
    let resumeCache = null;
    function resumeNumber(value) {
        const number = Number(value);
        return Number.isFinite(number) && number > 0 ? number : 0;
    }
    function resumeCodeKey(code) {
        return String(normalizeVideoCode(code) || '')
            .replace(/_/g, '-')
            .replace(/-+/g, '-')
            .toUpperCase();
    }
    function resumeStore() {
        if (resumeCache) return resumeCache;
        const raw = historyStorageGet(RESUME_KEY) || '{}';
        const parsed = historyParseJson(raw, {});
        const store = {};
        const now = Date.now();
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
            for (const [rawCode, value] of Object.entries(parsed)) {
                if (!value || typeof value !== 'object') continue;
                const key = resumeCodeKey(rawCode);
                const at = resumeNumber(value.at);
                const position = resumeNumber(value.position);
                if (!key || !position || !at || now - at > RESUME_EXPIRE_MS) continue;
                store[key] = {
                    position,
                    duration: resumeNumber(value.duration),
                    at,
                    title: historyText(value.title),
                    url: historyText(value.url)
                };
            }
        }
        resumeCache = store;
        return store;
    }
    function resumeEntry(code) {
        const key = resumeCodeKey(code);
        return key ? (resumeStore()[key] || null) : null;
    }
    function resumePosition(code, total) {
        const entry = resumeEntry(code);
        const position = entry ? entry.position : 0;
        if (!position) return null;
        const duration = total > 0 ? total : entry.duration;
        if (!duration || position < RESUME_MIN_SECONDS || position >= duration * RESUME_TAIL_RATIO) return null;
        return { position, duration, at: entry.at };
    }
    function resumeList() {
        const store = resumeStore();
        return Object.entries(store)
            .map(([code, entry]) => ({ code, ...entry }))
            .sort((a, b) => b.at - a.at);
    }
    function resumePendingList(limit = 12) {
        return resumeList()
            .filter(item => {
                if (!item.position || item.position < RESUME_MIN_SECONDS) return false;
                return !item.duration || item.position < item.duration * RESUME_TAIL_RATIO;
            })
            .slice(0, limit);
    }
    function persistResumeStore(force) {
        if (!force && state.resumeLastSaved && Date.now() - state.resumeLastSaved < RESUME_SAVE_INTERVAL) return;
        const store = resumeStore();
        const keys = Object.keys(store);
        if (keys.length > MAX_RESUME) {
            keys.sort((a, b) => (store[b]?.at || 0) - (store[a]?.at || 0));
            for (const key of keys.slice(MAX_RESUME)) delete store[key];
        }
        state.resumeLastSaved = Date.now();
        historyStorageSet(RESUME_KEY, JSON.stringify(store));
    }
    function clearResume(code) {
        const key = resumeCodeKey(code);
        if (!key) return false;
        const store = resumeStore();
        if (!store[key]) return false;
        delete store[key];
        persistResumeStore(true);
        return true;
    }
    function videoPlaybackWindow(video) {
        const duration = Number(video?.duration);
        if (Number.isFinite(duration) && duration > 0) return { total: duration, origin: 0 };
        const seekable = video?.seekable;
        if (seekable && seekable.length) {
            const origin = Number(seekable.start(0)) || 0;
            const total = (Number(seekable.end(seekable.length - 1)) || 0) - origin;
            if (Number.isFinite(total) && total > 0) return { total, origin };
        }
        return { total: 0, origin: 0 };
    }
    function resumeTotal(video) {
        return videoPlaybackWindow(video).total;
    }
    function resumePageCode() {
        return getPageVideoCode() || '';
    }
    function resumeSaveCurrent(force) {
        const video = state.video;
        const code = resumePageCode();
        if (!video || !code || !video.isConnected) return false;
        const total = resumeTotal(video);
        const position = Number(video.currentTime) || 0;
        if (!total || position < RESUME_MIN_SECONDS) return false;
        const meta = extractPageMetadata();
        const entry = {
            title: meta?.title || '',
            url: location.origin + location.pathname
        };
        const store = resumeStore();
        const key = resumeCodeKey(code);
        const previous = store[key];
        const changed = !previous || Math.abs(previous.position - Math.round(position)) >= 1;
        if (!changed && !force) return false;
        store[key] = {
            position: Math.round(position),
            duration: Math.round(total),
            at: Date.now(),
            title: entry.title || previous?.title || '',
            url: entry.url || previous?.url || ''
        };
        persistResumeStore(force);
        return true;
    }
    function hideResumeToast() {
        clearTimeout(state.resumeToastTimer);
        state.resumeToastTimer = 0;
        if (state.resumeToast) state.resumeToast.remove();
        state.resumeToast = null;
        if (state.resumeHost) {
            state.resumeHost.remove();
            state.resumeHost = null;
        }
    }
    function showResumeToast(container, seconds, onUndo) {
        hideResumeToast();
        if (!container?.isConnected) return;
        const host = document.createElement('div');
        host.className = 'speed-hud-host';
        const toast = document.createElement('div');
        toast.className = 'av-resume-toast';
        const text = document.createElement('span');
        text.className = 'av-resume-toast-text';
        text.textContent = '已从上次位置继续：';
        const pos = document.createElement('span');
        pos.className = 'av-resume-toast-pos';
        pos.textContent = formatDuration(seconds);
        const undo = document.createElement('button');
        undo.type = 'button';
        undo.className = 'av-resume-toast-btn';
        undo.textContent = '从头播放';
        undo.addEventListener('click', () => {
            try {
                if (state.video?.isConnected) state.video.currentTime = 0;
            } catch (_) {
            }
            if (typeof onUndo === 'function') onUndo();
            hideResumeToast();
        });
        const close = document.createElement('button');
        close.type = 'button';
        close.className = 'av-resume-toast-close';
        close.title = '关闭提示';
        close.setAttribute('aria-label', '关闭提示');
        close.textContent = '×';
        close.addEventListener('click', hideResumeToast);
        toast.append(text, pos, undo, close);
        host.appendChild(toast);
        container.appendChild(host);
        state.resumeHost = host;
        state.resumeToast = toast;
        state.resumeToastTimer = setTimeout(hideResumeToast, RESUME_TOAST_MS);
    }
    function resumeStopGuard() {
        state.resumeGuard = null;
    }
    function resumeStartGuard(code, position) {
        if (!code) {
            resumeStopGuard();
            return;
        }
        state.resumeGuard = {
            code,
            target: position,
            until: Date.now() + RESUME_GUARD_MS,
            tries: 0
        };
    }
    function resumeKeepGuard() {
        const guard = state.resumeGuard;
        if (!guard) return false;
        const video = state.video;
        if (!video || !video.isConnected || guard.code !== resumePageCode()) {
            resumeStopGuard();
            return false;
        }
        if (video.paused) guard.until = Date.now() + RESUME_GUARD_MS;
        if (Date.now() > guard.until) {
            resumeStopGuard();
            return false;
        }
        const target = guard.target;
        const position = Number(video.currentTime) || 0;
        if (position >= target + RESUME_GUARD_RELEASE) {
            resumeStopGuard();
            return false;
        }
        if (position >= target - RESUME_GUARD_TOLERANCE) return false;
        if (guard.tries >= RESUME_GUARD_TRIES) {
            resumeStopGuard();
            return false;
        }
        guard.tries += 1;
        try {
            video.currentTime = target;
        } catch (_) {
            return false;
        }
        return true;
    }
    function resumeApplyPosition(video, container, code, entry) {
        const jump = Math.min(Math.max(1, entry.position), Math.max(1, entry.duration - 1));
        try {
            video.currentTime = jump;
        } catch (_) {
            return false;
        }
        resumeStartGuard(code, jump);
        showResumeToast(container, jump, () => {
            resumeStopGuard();
            clearResume(code);
        });
        log(`⏱️ 已从上次位置继续：${formatDuration(jump)}`);
        return true;
    }
    function maybeRestoreResumePosition() {
        const video = state.video;
        if (!video || !video.isConnected) return false;
        const code = resumePageCode();
        if (!code || code === state.resumeDoneCode) return false;
        const total = resumeTotal(video);
        if (!total) return false;
        state.resumeDoneCode = code;
        const saved = resumeEntry(code);
        const entry = resumePosition(code, total);
        if (!entry) {
            if (saved && saved.duration && saved.position >= saved.duration * RESUME_TAIL_RATIO) clearResume(code);
            return false;
        }
        return resumeApplyPosition(video, state.container, code, entry);
    }
    function bindResumeSeekIntent(container) {
        if (resumeSeekBound.has(container)) return;
        resumeSeekBound.add(container);
        const onSeekIntent = event => {
            const target = event.target;
            if (!target || typeof target.closest !== 'function') return;
            if (!target.closest('input[type="range"], .plyr__progress, .plyr__progress__container')) return;
            state.resumeUserSeekAt = Date.now();
        };
        const onSeekKey = event => {
            if (!/^(ArrowLeft|ArrowRight|ArrowUp|ArrowDown|Home|End|PageUp|PageDown|[0-9])$/.test(event.key || '')) return;
            state.resumeUserSeekAt = Date.now();
        };
        for (const type of ['pointerdown', 'mousedown', 'touchstart']) {
            container.addEventListener(type, onSeekIntent, PASSIVE_CAPTURE);
        }
        container.addEventListener('keydown', onSeekKey, PASSIVE_CAPTURE);
    }
    function resumeTick() {
        if (isPageHidden()) return;
        if (resumeKeepGuard()) return;
        if (state.video?.paused) return;
        resumeSaveCurrent(false);
    }
    function setupResumePlayback(video, container) {
        if (!video || !container || video === state.resumeVideo) return;
        const onMeta = () => {
            maybeRestoreResumePosition();
            resumeKeepGuard();
            resumeSaveCurrent(false);
        };
        const onPlay = () => resumeKeepGuard();
        const onPause = () => resumeSaveCurrent(true);
        const onEnded = () => {
            resumeStopGuard();
            clearResume(resumePageCode());
        };
        const onSeeked = () => {
            if (Date.now() - state.resumeUserSeekAt < 1000) resumeStopGuard();
            else resumeKeepGuard();
            resumeSaveCurrent(true);
        };
        video.addEventListener('loadedmetadata', onMeta, { passive: true });
        video.addEventListener('durationchange', onMeta, { passive: true });
        video.addEventListener('play', onPlay, { passive: true });
        video.addEventListener('playing', onPlay, { passive: true });
        video.addEventListener('canplay', onPlay, { passive: true });
        video.addEventListener('pause', onPause, { passive: true });
        video.addEventListener('seeked', onSeeked, { passive: true });
        video.addEventListener('ended', onEnded, { passive: true });
        bindResumeSeekIntent(container);
        state.resumeVideo = video;
        clearInterval(state.resumeTimer);
        state.resumeTimer = trackInterval(setInterval(resumeTick, RESUME_SAVE_INTERVAL));
        if (video.readyState >= 1) onMeta();
    }
    function watchedSet() {
        if (watchedCache) return watchedCache;
        watchedCache = new Set(historyWatchedList(historyStorageGet(WATCHED_KEY)));
        return watchedCache;
    }
    function isWatched(code) {
        if (!code) return false;
        return watchedSet().has(normalizeVideoCode(code));
    }
    function markWatched(code) {
        const key = normalizeVideoCode(code);
        if (!key) return;
        const set = watchedSet();
        if (set.has(key)) return;
        set.add(key);
        const values = [...set];
        while (values.length > MAX_WATCHED) values.shift();
        watchedCache = new Set(values);
        historyStorageSet(WATCHED_KEY, JSON.stringify(values));
        state.watchGen += 1;
    }
    function clearWatched() {
        watchedCache = new Set();
        historyStorageSet(WATCHED_KEY, '[]');
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
            return { el: card, code: cached.code, title: cached.title, duration: cached.duration, isWatched: watchedSet().has(cached.code) };
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
        return { el: card, code, title, duration, isWatched: watchedSet().has(code) };
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
        if (cached && cached.bar === bar && bar.isConnected) return cached;
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
    const FILTER_GRID_SELECTORS = ['.grid', '.video-list', '[id^="list_videos_"]', '.row.gutter-20', '.row'];
    function filterGridScope(card) {
        if (!card) return null;
        if (card.closest) {
            for (const selector of FILTER_GRID_SELECTORS) {
                const found = card.closest(selector);
                if (found) return found;
            }
        }
        return card.parentElement || null;
    }
    function nearestSectionHeader(sections, card) {
        if (!sections.length) return null;
        if (!card || !card.getBoundingClientRect) return sections[0];
        const cardTop = card.getBoundingClientRect().top;
        let best = null;
        let bestGap = Infinity;
        for (const header of sections) {
            const rect = header.getBoundingClientRect ? header.getBoundingClientRect() : null;
            if (!rect || rect.height < 1) continue;
            const gap = Math.abs(cardTop - rect.bottom);
            if (gap < bestGap) {
                bestGap = gap;
                best = header;
            }
        }
        return best || sections[0];
    }
    function sectionHeaderSlot(target) {
        if (!target) return null;
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
        return hostSlotUsable(slot) ? slot : null;
    }
    function topSectionHeader(sections, card) {
        if (!IS_JABLE) return null;
        const pool = sections.slice();
        for (const title of document.querySelectorAll(SECTION_TITLE_SELECTOR)) {
            if (title.closest && title.closest(FILTER_ROW_SKIP)) continue;
            if (pool.indexOf(title) < 0) pool.push(title);
        }
        const cardTop = card && card.getBoundingClientRect ? card.getBoundingClientRect().top : 0;
        pool.sort((a, b) => {
            const ra = a.getBoundingClientRect ? a.getBoundingClientRect() : null;
            const rb = b.getBoundingClientRect ? b.getBoundingClientRect() : null;
            if (!ra || !rb) return 0;
            return ra.top - rb.top;
        });
        for (const header of pool) {
            const rect = header.getBoundingClientRect ? header.getBoundingClientRect() : null;
            if (!rect || rect.height < 1 || rect.width < 280) continue;
            if (cardTop > 0 && rect.top >= cardTop) continue;
            if (sectionHeaderSlot(header)) return header;
        }
        return null;
    }
    function hostSlotUsable(node) {
        const rect = node && node.getBoundingClientRect ? node.getBoundingClientRect() : null;
        if (!rect || rect.height < 1 || rect.width < 280) return false;
        return true;
    }
    function relocateFilterHost(host, card) {
        if (!host || !card || !card.closest) return host;
        if (host.closest('.av-filter-injected-header, .av-filter-inline-row, .profile-nav')) return host;
        if (!host.closest('header, .site-header, .app-nav, nav')) return host;
        const grid = filterGridScope(card);
        if (!grid) return host;
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
        return host;
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
            const target = topSectionHeader(sections, firstCard) || nearestSectionHeader(sections, firstCard);
            const slot = sectionHeaderSlot(target);
            if (slot) {
                const host = takeFilterHost();
                host.classList.remove('av-filter-inline');
                clearInlineRow();
                if (host.parentElement !== slot) {
                    const moreAnchor = slot === target && slot.matches && slot.matches(SECTION_TITLE_SELECTOR) ? slot.querySelector('.more, .title-more, .view-more') : null;
                    if (moreAnchor && moreAnchor.parentElement === slot) slot.insertBefore(host, moreAnchor);
                    else slot.appendChild(host);
                }
                state.filterHost = host;
                return relocateFilterHost(host, firstCard);
            }
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
        let slot = null;
        if (sectionHeader) {
            for (const child of sectionHeader.children) {
                if (child.classList && child.classList.contains('av-filter-host')) continue;
                if (child.classList && (child.classList.contains('flex-1') || child.classList.contains('av-filter-injected-header'))) continue;
                if (child.tagName === 'DIV') {
                    slot = child;
                    break;
                }
            }
            if (!slot && hostSlotUsable(sectionHeader)) {
                slot = document.createElement('div');
                slot.className = 'av-filter-slot';
                sectionHeader.appendChild(slot);
            } else if (slot && !hostSlotUsable(slot)) {
                slot = null;
            }
        }
        const host = takeFilterHost();
        if (slot) {
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
        return relocateFilterHost(host, firstCard);
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
            log('过滤条已隐藏，可在面板「内容过滤与屏蔽」中重新显示');
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
    const LOGIN_RETRY_GUARD_MS = 120000;
    const loginSiteName = () => (IS_JABLE ? 'Jable' : 'MissAV');
    const loginStorageKey = key => `${key}@${SITE_TAG}`;
    const loginUrl = () => `https://${location.hostname}${IS_JABLE ? '/email/' : '/cn/api/login'}`;
    const loginReady = () => Boolean(String(settings.loginUser || '').trim() && settings.loginPass);
    function setLoginStatus(text, tone = '') {
        const node = state.loginStatusEl;
        if (!node) return;
        node.textContent = text;
        node.classList.remove('is-ok', 'is-fail', 'is-warn', 'is-busy');
        if (tone) node.classList.add(`is-${tone}`);
    }
    async function detectLogin() {
        if (IS_JABLE) {
            for (const node of document.getElementsByTagName('script')) {
                if (/userId:\s*'\d+'/.test(node.textContent || '')) return true;
            }
            return Boolean(document.querySelector('a[href*="logout"], .user-info, .user-avatar, [data-user-id]'));
        }
        try {
            const response = await fetch(`https://${location.hostname}/api/actresses/1016525/view`, { credentials: 'same-origin', cache: 'no-store' });
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const data = await response.json();
            if (data && typeof data === 'object' && Object.prototype.hasOwnProperty.call(data, 'user')) return Boolean(data.user);
            return Boolean(data && data.user);
        } catch (_) {
            return Boolean(document.querySelector('a[href*="logout"], .user-avatar, [data-user-id]'));
        }
    }
    function loginErrorText(data) {
        if (!data || typeof data !== 'object') return '';
        const raw = data.message || data.msg || data.error || data.errors;
        if (!raw) return '';
        if (typeof raw === 'string') return raw;
        if (Array.isArray(raw)) return String(raw.find(item => typeof item === 'string' && item) || '');
        for (const key of Object.keys(raw)) {
            const value = raw[key];
            if (typeof value === 'string' && value) return value;
            if (Array.isArray(value)) {
                const first = value.find(item => typeof item === 'string' && item);
                if (first) return first;
            }
        }
        return '';
    }
    function loginFailReason(data) {
        if (!data || typeof data !== 'object') return '';
        const message = loginErrorText(data);
        const flagValue = data.status === undefined ? data.result : data.status;
        const flag = flagValue === undefined || flagValue === null ? '' : String(flagValue).toLowerCase();
        if (data.error === true || data.success === false) return message || '登录失败';
        if (['error', 'fail', 'failed', 'false', '0', 'n'].includes(flag)) return message || flag;
        return /error|fail|invalid|incorrect|required|wrong|denied|unauthorized|not match|mismatch|错误|失败|不正确|无效|不存在|拒绝/.test(message.toLowerCase()) ? message : '';
    }
    async function submitLogin(manual) {
        if (state.loginBusy) return;
        const user = String(settings.loginUser || '').trim();
        const pass = String(settings.loginPass || '');
        if (!user || !pass) {
            setLoginStatus('账号或密码为空', 'warn');
            log('⚠️ 自动登录：账号或密码为空');
            return;
        }
        state.loginBusy = true;
        setLoginStatus('正在登录…', 'busy');
        try {
            const body = IS_JABLE
                ? new URLSearchParams({ username: user, pass, remember_me: 1, action: 'login', email_link: `https://${location.hostname}/email/`, format: 'json', mode: 'async' }).toString()
                : JSON.stringify({ email: user, password: pass, remember: true });
            const response = await fetch(loginUrl(), {
                method: 'POST',
                credentials: 'same-origin',
                cache: 'no-store',
                headers: IS_JABLE
                    ? { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' }
                    : { 'Content-Type': 'application/json', Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
                body
            });
            const text = await response.text();
            let data = null;
            try {
                data = text ? JSON.parse(text) : null;
            } catch (_) {
                data = null;
            }
            if (!response.ok) throw new Error(loginErrorText(data) || `HTTP ${response.status}`);
            if (!data || typeof data !== 'object') throw new Error(`登录接口返回异常：${String(text).trim().slice(0, 80) || '空响应'}`);
            const reason = loginFailReason(data);
            if (reason) throw new Error(reason);
            store.set(loginStorageKey('loginTryAt'), Date.now());
            setLoginStatus('登录成功，正在刷新页面', 'ok');
            log(`✅ ${loginSiteName()} 登录成功，正在刷新页面`);
            setTimeout(() => location.reload(), manual ? 500 : 800);
        } catch (error) {
            store.set(loginStorageKey('loginTryAt'), Date.now());
            if (await detectLogin()) {
                setLoginStatus('已登录', 'ok');
                log(`🔐 ${loginSiteName()} 已处于登录状态`);
                return;
            }
            const message = error && error.message ? error.message : String(error);
            setLoginStatus(`登录失败：${message}`, 'fail');
            log(`❌ ${loginSiteName()} 登录失败：${message}`);
        } finally {
            state.loginBusy = false;
        }
    }
    async function autoLogin() {
        if (isAnalyticsRoute()) return;
        if (!settings.autoLogin) {
            setLoginStatus('自动登录已关闭');
            return;
        }
        if (!loginReady()) {
            setLoginStatus('未配置账号，展开后可填写');
            return;
        }
        const last = Number(store.get(loginStorageKey('loginTryAt'))) || 0;
        if (Date.now() - last < LOGIN_RETRY_GUARD_MS) {
            setLoginStatus('刚刚尝试过登录，暂不重试', 'warn');
            return;
        }
        setLoginStatus('正在检测登录状态…', 'busy');
        const logged = await detectLogin();
        if (logged) {
            setLoginStatus('已登录', 'ok');
            log(`🔐 ${loginSiteName()} 已处于登录状态`);
            return;
        }
        log(`🔐 ${loginSiteName()} 未登录，正在自动登录`);
        await submitLogin(false);
    }
    function buildLoginPanel() {
        const wrap = document.createElement('div');
        wrap.className = 'av-login-panel av-collapse';
        setCollapsed(wrap, !settings.loginPanelOpen);
        const userField = document.createElement('label');
        userField.className = 'av-login-field';
        const userCaption = document.createElement('span');
        userCaption.textContent = IS_JABLE ? 'Jable 用户名 / 邮箱' : 'MissAV 登录邮箱';
        const userInput = document.createElement('input');
        userInput.type = 'text';
        userInput.autocomplete = 'username';
        userInput.spellcheck = false;
        userInput.placeholder = IS_JABLE ? '用户名或邮箱' : '登录邮箱';
        userInput.value = settings.loginUser || '';
        userField.append(userCaption, userInput);
        const passField = document.createElement('label');
        passField.className = 'av-login-field';
        const passCaption = document.createElement('span');
        passCaption.textContent = '密码';
        const passInput = document.createElement('input');
        passInput.type = 'password';
        passInput.autocomplete = 'current-password';
        passInput.placeholder = settings.loginPass ? '已保存密码，留空则不修改' : '登录密码';
        passInput.value = '';
        passField.append(passCaption, passInput);
        const remember = () => {
            settings.loginUser = userInput.value;
            const typed = passInput.value;
            if (typed) settings.loginPass = typed;
            loginVault.write('loginUser', settings.loginUser || '');
            loginVault.write('loginPass', settings.loginPass || '');
            passInput.value = '';
            passInput.placeholder = settings.loginPass ? '已保存密码，留空则不修改' : '登录密码';
        };
        userInput.addEventListener('change', remember);
        passInput.addEventListener('change', remember);
        const autoRow = document.createElement('label');
        autoRow.className = 'av-check-row';
        const autoText = document.createElement('span');
        const autoLabel = document.createElement('span');
        autoLabel.textContent = '自动登录';
        const autoHelp = document.createElement('small');
        autoHelp.className = 'av-help';
        autoHelp.textContent = '未登录时自动用上面的账号登录';
        autoText.append(autoLabel, autoHelp);
        const autoInput = document.createElement('input');
        autoInput.type = 'checkbox';
        autoInput.role = 'switch';
        autoInput.checked = !!settings.autoLogin;
        autoRow.classList.toggle('is-on', autoInput.checked);
        autoInput.addEventListener('change', () => {
            settings.autoLogin = autoInput.checked;
            store.set('autoLogin', settings.autoLogin);
            autoRow.classList.toggle('is-on', autoInput.checked);
            if (autoInput.checked) autoLogin();
            else setLoginStatus('自动登录已关闭');
        });
        autoRow.append(autoText, autoInput);
        const status = document.createElement('div');
        status.className = 'av-login-status';
        status.textContent = '登录状态：未检测';
        state.loginStatusEl = status;
        const actions = document.createElement('div');
        actions.className = 'av-filter-actions';
        const loginBtn = createButton('立即登录', 'btn-primary');
        const clearBtn = createButton('清除账号', 'btn-danger');
        loginBtn.addEventListener('click', () => {
            remember();
            submitLogin(true);
        });
        clearBtn.addEventListener('click', () => {
            settings.loginUser = '';
            settings.loginPass = '';
            userInput.value = '';
            passInput.value = '';
            loginVault.remove('loginUser');
            loginVault.remove('loginPass');
            store.remove(loginStorageKey('loginTryAt'));
            setLoginStatus('账号已清除');
            log(`🧹 已清除 ${loginSiteName()} 保存的登录账号`);
        });
        actions.append(loginBtn, clearBtn);
        wrap.append(userField, passField, autoRow, status, actions);
        return wrap;
    }
    function buildFilterPanel() {
        const wrap = document.createElement('div');
        wrap.className = 'av-filter-panel av-collapse';
        setCollapsed(wrap, !settings.filterPanelOpen);
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
        const rescan = createButton('🔄 立即重新过滤', 'btn-ghost');
        rescan.addEventListener('click', () => {
            applyFilters();
            log(`🛡 过滤完成：共 ${state.filterStats.total} 个条目，屏蔽 ${state.filterStats.filtered} 个`);
        });
        actions.append(rescan);
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
                if (node && node.closest && node.closest('.custom-ui-layer, .av-filter-bar, .av-filter-host, .custom-control-panel, .custom-quick-controls, .loop-menu')) continue;
                state.domGen += 1;
                refreshFilters();
                return;
            }
        });
        observer.observe(document.body, { childList: true, subtree: true });
        state.filterObserver = observer;
        pageLifecycle.push(() => observer.disconnect());
    }
    function analyticsRecords() {
        if (state.analyticsRecords) return state.analyticsRecords;
        const raw = historyStorageGet(ANALYTICS_KEY) || '[]';
        const parsed = historyParseJson(raw, []);
        const normalized = historyNormalizeRecordList(parsed, true);
        state.analyticsRecords = normalized;
        const repaired = repairAnalyticsTitles(normalized);
        if (repaired || JSON.stringify(normalized) !== raw) persistAnalyticsRecords(true);
        return state.analyticsRecords;
    }
    function bumpAnalyticsVersion() {
        state.analyticsVersion = (state.analyticsVersion || 0) + 1;
        state.analyticsDataVersion = (state.analyticsDataVersion || 0) + 1;
    }
    function saveAnalyticsRecords() {
        const list = analyticsRecords();
        if (list.length > MAX_RECORDS + MAX_RECORDS_SLACK) {
            list.sort((a, b) => (b.watchedAt || 0) - (a.watchedAt || 0));
            list.length = MAX_RECORDS;
        }
        state.analyticsSavedAt = Date.now();
        state.analyticsSavePending = false;
        bumpAnalyticsVersion();
        historyStorageSet(ANALYTICS_KEY, JSON.stringify(list));
    }
    function persistAnalyticsRecords(force) {
        if (!state.analyticsRecords && !state.analyticsSavePending) return;
        if (!force && state.analyticsSavedAt && Date.now() - state.analyticsSavedAt < ANALYTICS_SAVE_INTERVAL) {
            state.analyticsSavePending = true;
            bumpAnalyticsVersion();
            return;
        }
        saveAnalyticsRecords();
    }
    const META_SKIP_SELECTOR = 'nav, header, footer, .app-nav, .navbar, .site-header, .site-nav, .dropdown-menu, .pagination, .breadcrumb, .modal, .custom-ui-layer, .custom-control-panel, .av-analytics-page, .av-info-section, .av-hub-tabs, .av-stills-grid, .av-review-list, .av-list-grid, #comments, .comments, .comment-list, .comment, .reply-area';
    const META_TITLE_NOISE = /(?:sukebei|javbus|javdb|javlibrary|avmoo|avsox|kjav|jav321|dmm\.co\.jp|missav|jable|sextb|netflav|supjav|njav|javgg|javtiful|hsex|18av|thisav)/i;
    const META_TITLE_RATING = /^[★☆\s]*\d{1,2}(?:[.,]\d+)?(?:\s*(?:\/\s*10|分|點|点|星))?$/;
    const META_TITLE_LABELS = /^(?:編輯留言|编辑留言|留言|留言板|评论|評論|发表评论|發表評論|相关影片|相關影片|推荐影片|推薦影片|猜你喜欢|猜你喜歡|热门|熱門|标签|標籤|演员|演員|女优|女優|简介|簡介|影片信息|影片資訊|基本資料|基本信息|下载|下載|收藏|分享|举报|檢舉|报错|報錯|更多|更多影片|播放列表|片单|片單|排行榜|排行|分类|分類|首页|首頁|搜索|搜尋|登录|登錄|注册|註冊|观看记录|觀看記錄|历史记录|歷史記錄|上传|上傳|預覽|预览)$/;
    function metaCleanTitle(value) {
        let text = String(value || '').replace(/\s+/g, ' ').trim();
        if (!text) return '';
        const noiseAt = text.search(META_TITLE_NOISE);
        if (noiseAt >= 0) text = text.slice(0, noiseAt).replace(/[\s|丨\-–—·•,，、/:：]+$/, '').trim();
        if (text.length < 2 || text.length > 160) return '';
        if (META_TITLE_LABELS.test(text)) return '';
        if (META_TITLE_RATING.test(text)) return '';
        return text;
    }
    function repairAnalyticsTitles(list) {
        let changed = false;
        for (const record of list) {
            if (!record || typeof record !== 'object') continue;
            const current = typeof record.title === 'string' ? record.title.replace(/\s+/g, ' ').trim() : '';
            if (!current) continue;
            const cleaned = metaCleanTitle(current);
            if (cleaned === record.title) continue;
            record.title = cleaned && cleaned !== record.code ? cleaned : '';
            changed = true;
        }
        return changed;
    }
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
    function metaTitleFallbacks() {
        const found = [];
        for (const selector of ['meta[property="og:title"]', 'meta[name="twitter:title"]', 'meta[name="og:title"]']) {
            for (const node of document.querySelectorAll(selector)) {
                const value = metaCleanTitle(metaAttr(node, 'content'));
                if (value) {
                    found.push(value);
                    break;
                }
            }
        }
        const docTitle = metaCleanTitle(typeof document.title === 'string' ? document.title : '');
        if (docTitle) found.push(docTitle);
        return found;
    }
    const META_INJECTED_SELECTOR = '.info-rating-badge, .social-badges, .av-record-tag, .av-persona-tag';
    function metaHeadingText(element) {
        if (typeof element.cloneNode === 'function') {
            const clone = element.cloneNode(true);
            if (clone && typeof clone.querySelectorAll === 'function') {
                for (const injected of clone.querySelectorAll(META_INJECTED_SELECTOR)) {
                    if (injected && typeof injected.remove === 'function') injected.remove();
                }
                return metaCleanTitle(clone.textContent);
            }
        }
        let text = element.textContent || '';
        if (typeof element.querySelectorAll === 'function') {
            for (const injected of element.querySelectorAll(META_INJECTED_SELECTOR)) {
                const inner = String(injected.textContent || '').replace(/\s+/g, ' ').trim();
                if (inner) text = text.split(inner).join(' ');
            }
        }
        return metaCleanTitle(text);
    }
    function metaHeading() {
        const scoped = ['.video-info .info-header h4', '.video-info h4', '.video-detail .info-header h4', '.video-title', 'h1.text-base', 'h1.text-lg', '.video-detail h1'];
        const loose = ['h1', 'h4'];
        const pick = selectors => {
            for (const selector of selectors) {
                for (const element of document.querySelectorAll(selector)) {
                    if (metaSkipped(element)) continue;
                    const text = metaHeadingText(element);
                    if (text) return text;
                }
            }
            return '';
        };
        const scopedText = pick(scoped);
        if (scopedText) return scopedText;
        for (const fallback of metaTitleFallbacks()) return fallback;
        return pick(loose);
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
            if (!meta.title && META_LABEL_TITLE.test(label)) {
                const value = row.querySelector('.font-medium');
                if (value) meta.title = (value.textContent || '').replace(/\s+/g, ' ').trim();
            }
            if (!meta.maker && META_LABEL_MAKER.test(label)) {
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
    function analyticsTick() {
        const session = state.analyticsSession;
        if (!session || !state.video) return;
        const now = Date.now();
        const wallDelta = Math.max(0, (now - session.lastTick) / 1000);
        session.lastTick = now;
        const mediaTime = Number(state.video.currentTime) || 0;
        const mediaDelta = mediaTime - session.lastMediaTime;
        session.lastMediaTime = mediaTime;
        if (isPageHidden() || wallDelta > 120) return;
        if (!state.video.paused && !state.video.seeking && mediaDelta > 0) {
            const jumped = mediaDelta > wallDelta * 8 + 2;
            session.watchedSeconds += jumped ? wallDelta : mediaDelta;
            session.dirty = true;
            const window_ = videoPlaybackWindow(state.video);
            if (window_.total > 0) {
                session.duration = Math.round(window_.total);
                session.maxProgress = Math.max(session.maxProgress, Math.min(1, (mediaTime - window_.origin) / window_.total));
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
    }
    function startAnalyticsTracking() {
        const video = state.video;
        if (!video) return;
        const code = getPageVideoCode();
        if (!code) return;
        if (state.analyticsSession && state.analyticsSession.code === code && state.analyticsVideo === video) return;
        commitAnalyticsSession(true);
        const meta = extractPageMetadata();
        backfillAnalyticsMetadata(meta);
        state.analyticsSession = {
            code,
            title: meta.title || code,
            url: location.origin + location.pathname,
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
        state.analyticsTimer = trackInterval(setInterval(analyticsTick, 2000));

        const onAnalyticsPause = () => commitAnalyticsSession(true);
        const onAnalyticsEnded = () => commitAnalyticsSession(true);
        if (state.analyticsVideo && state.analyticsVideo !== video && state.analyticsPauseHandler) {
            try {
                state.analyticsVideo.removeEventListener('pause', state.analyticsPauseHandler);
                state.analyticsVideo.removeEventListener('ended', state.analyticsEndedHandler);
            } catch (_) {
            }
        }
        video.addEventListener('pause', onAnalyticsPause, { passive: true });
        video.addEventListener('ended', onAnalyticsEnded, { passive: true });
        state.analyticsVideo = video;
        state.analyticsPauseHandler = onAnalyticsPause;
        state.analyticsEndedHandler = onAnalyticsEnded;
    }
    function resyncAnalyticsClock() {
        if (isPageHidden()) {
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
            if (session.url) existing.url = session.url;
        } else {
            list.unshift({
                code: session.code,
                title: session.title,
                url: session.url || '',
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
        if (state.analyticsVideo && state.analyticsPauseHandler) {
            try {
                state.analyticsVideo.removeEventListener('pause', state.analyticsPauseHandler);
                state.analyticsVideo.removeEventListener('ended', state.analyticsEndedHandler);
            } catch (_) {
            }
        }
        state.analyticsVideo = null;
        state.analyticsPauseHandler = null;
        state.analyticsEndedHandler = null;
    }
    function aggregateAnalytics(range) {
        const records = analyticsRecords();


        const aggKey = `${range}|${state.analyticsDataVersion || 0}`;
        const aggCached = state.analyticsAggCache;
        if (aggCached && aggCached.key === aggKey) return aggCached.data;
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
            hourWeekdayCount: Array.from({ length: 7 }, () => new Array(24).fill(0)),
            hourWeekdaySeconds: Array.from({ length: 7 }, () => new Array(24).fill(0)),
            actressMap: new Map(),
            genreMap: new Map(),
            makerMap: new Map(),
            bucketUnder5: 0,
            bucket5to15: 0,
            bucket15to30: 0,
            bucketOver30: 0,
            dayMap: new Map(),
            daySecondsMap: new Map(),
            rangeRecords: []
        };
        for (const record of records) {
            const seconds = record.watchedSeconds || 0;
            const date = new Date(record.watchedAt || now);
            const dayKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
            result.allActiveDays.add(dayKey);
            result.dayMap.set(dayKey, (result.dayMap.get(dayKey) || 0) + 1);
            result.daySecondsMap.set(dayKey, (result.daySecondsMap.get(dayKey) || 0) + seconds);
            if (floor && (record.watchedAt || 0) < floor) continue;
            result.rangeRecords.push(record);
            result.totalCount++;
            result.totalWatchedSeconds += seconds;
            if ((record.maxProgress || 0) >= 0.75) result.completedCount++;
            result.activeDays.add(dayKey);
            const hour = date.getHours();
            result.hourlyCount[hour]++;
            result.hourlySeconds[hour] += seconds;
            const weekday = date.getDay();
            result.hourWeekdayCount[weekday][hour]++;
            result.hourWeekdaySeconds[weekday][hour] += seconds;
            for (const name of record.actresses || []) {
                const entry = result.actressMap.get(name) || { count: 0, seconds: 0 };
                entry.count++;
                entry.seconds += seconds;
                result.actressMap.set(name, entry);
            }
            for (const genre of record.genres || []) {
                result.genreMap.set(genre, (result.genreMap.get(genre) || 0) + 1);
            }
            if (record.maker) {
                const maker = result.makerMap.get(record.maker) || { count: 0, seconds: 0 };
                maker.count++;
                maker.seconds += seconds;
                result.makerMap.set(record.maker, maker);
            }
            const minutes = seconds / 60;
            if (minutes < 5) result.bucketUnder5++;
            else if (minutes < 15) result.bucket5to15++;
            else if (minutes < 30) result.bucket15to30++;
            else result.bucketOver30++;
        }
        const count = Math.max(1, result.totalCount);
        const avgWatchedMinutes = Math.round((result.totalWatchedSeconds / 60 / count) * 10) / 10;
        const completionRate = Math.round((result.completedCount / count) * 1000) / 10;


        const maxOf = (values, floor = 1) => {
            let best = floor;
            for (const value of values) if (value > best) best = value;
            return best;
        };
        const maxHourly = maxOf(result.hourlyCount);
        const hourlyDistribution = result.hourlyCount.map((value, hour) => ({
            hour,
            count: value,
            seconds: result.hourlySeconds[hour],
            percentage: Math.round((value / maxHourly) * 100)
        }));
        const dayMs = 86400000;
        const nowDate = new Date(now);
        const pastDays = 364 + nowDate.getDay();
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
        for (let offset = 1; offset <= 6 - nowDate.getDay(); offset++) {
            const date = new Date(now + offset * dayMs);
            dailyHeatmap.push({
                date: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`,
                count: 0,
                seconds: 0,
                level: -1,
                isFuture: true
            });
        }
        const hourWeekdayHeat = result.hourWeekdayCount.map((row, weekday) => row.map((countValue, hour) => ({
            weekday,
            hour,
            count: countValue,
            seconds: result.hourWeekdaySeconds[weekday][hour]
        })));
        const maxActressCount = maxOf([...result.actressMap.values()].map(item => item.count));
        const maxActressSeconds = maxOf([...result.actressMap.values()].map(item => item.seconds));
        const actressEntries = [...result.actressMap.entries()]
            .map(([name, entry]) => ({
                name,
                count: entry.count,
                seconds: entry.seconds,
                percentage: Math.round((entry.count / maxActressCount) * 100),
                secondsPercentage: Math.round((entry.seconds / maxActressSeconds) * 100)
            }));
        const topActresses = actressEntries
            .slice()
            .sort((a, b) => b.count - a.count || b.seconds - a.seconds)
            .slice(0, 10);
        const topActressesByTime = actressEntries
            .slice()
            .sort((a, b) => b.seconds - a.seconds || b.count - a.count)
            .slice(0, 10);
        const maxGenreCount = maxOf(result.genreMap.values());
        const topGenres = [...result.genreMap.entries()]
            .map(([name, value]) => ({ name, count: value, percentage: Math.round((value / maxGenreCount) * 100) }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 15);
        const maxMakerCount = maxOf([...result.makerMap.values()].map(item => item.count));
        const maxMakerSeconds = maxOf([...result.makerMap.values()].map(item => item.seconds));
        const makerEntries = [...result.makerMap.entries()]
            .map(([name, entry]) => ({
                name,
                count: entry.count,
                seconds: entry.seconds,
                percentage: Math.round((entry.count / maxMakerCount) * 100),
                secondsPercentage: Math.round((entry.seconds / maxMakerSeconds) * 100)
            }));
        const topMakers = makerEntries
            .slice()
            .sort((a, b) => b.count - a.count || b.seconds - a.seconds)
            .slice(0, 8);
        const topMakersByTime = makerEntries
            .slice()
            .sort((a, b) => b.seconds - a.seconds || b.count - a.count)
            .slice(0, 8);
        const habitBuckets = [
            { label: '< 5 分钟 (速览)', count: result.bucketUnder5 },
            { label: '5 - 15 分钟 (节选)', count: result.bucket5to15 },
            { label: '15 - 30 分钟 (精选)', count: result.bucket15to30 },
            { label: '> 30 分钟 (沉浸)', count: result.bucketOver30 }
        ].map(bucket => ({ ...bucket, percentage: Math.round((bucket.count / count) * 100) }));
        const data = {
            totalCount: result.totalCount,
            totalWatchedSeconds: result.totalWatchedSeconds,
            avgWatchedMinutes,
            completionRate,
            activeDaysCount: result.allActiveDays.size,
            rangeActiveDaysCount: result.activeDays.size,
            hourlyDistribution,
            hourWeekdayHeat,
            dailyHeatmap,
            topActresses,
            topActressesByTime,
            topGenres,
            topMakers,
            topMakersByTime,
            habitBuckets,
            records: result.rangeRecords.slice().sort((a, b) => (b.watchedAt || 0) - (a.watchedAt || 0))
        };
        state.analyticsAggCache = { key: aggKey, data };
        return data;
    }
    function recordWatchUrl(record) {
        if (record && record.url) return record.url;
        const code = encodeURIComponent(record && record.code ? record.code : '');
        return IS_JABLE ? `https://jable.tv/videos/${code}/` : `https://missav.ai/${code}`;
    }
    function formatClock(seconds) {
        const total = Math.max(0, Math.round(Number(seconds) || 0));
        const hours = Math.floor(total / 3600);
        const minutes = Math.floor((total % 3600) / 60);
        const secs = String(total % 60).padStart(2, '0');
        return hours > 0 ? `${hours}:${String(minutes).padStart(2, '0')}:${secs}` : `${minutes}:${secs}`;
    }
    function recordProgress(record) {
        const watched = Math.max(0, Number(record.watchedSeconds) || 0);
        const total = Math.max(0, Number(record.duration) || 0);
        const ratio = total > 0 ? watched / total : 0;
        const percent = Math.max(0, Math.min(100, Math.round(Math.max(Number(record.maxProgress) || 0, ratio) * 100)));
        return {
            percent,
            isCompleted: percent >= 80 || watched >= 1200 || (total > 0 && ratio >= .75),
            timeText: total > 0 ? `${formatDuration(watched)} / ${formatDuration(total)}` : formatDuration(watched),
            timeCompact: total > 0 ? `${formatClock(watched)} / ${formatClock(total)}` : formatClock(watched)
        };
    }
    function formatRecordDate(timestamp) {
        const at = Number(timestamp) || 0;
        if (!at) return '未知时间';
        const diff = Date.now() - at;
        if (diff < 60000) return '刚刚';
        if (diff < 3600000) return `${Math.floor(diff / 60000)} 分钟前`;
        if (diff < 86400000) return `${Math.floor(diff / 3600000)} 小时前`;
        if (diff < 604800000) return `${Math.floor(diff / 86400000)} 天前`;
        const date = new Date(at);
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    }
    const TITLE_SYNC_LIMIT = 8;
    const TITLE_SYNC_FAIL_RETRY = 1800000;
    let titleSyncBusy = false;
    let titleRefillQueued = false;
    const CREDITS_SYNC_LIMIT = 8;
    const CREDITS_SYNC_FAIL_RETRY = 1800000;
    let creditsSyncBusy = false;
    let creditsRefillQueued = false;
    function analyticsFetchUrl(record) {
        if (record && record.url) return record.url;
        const raw = record && record.code ? String(record.code).trim().toLowerCase() : '';
        if (!raw) return '';
        const code = encodeURIComponent(raw);
        return IS_JABLE ? `https://jable.tv/videos/${code}/` : `https://missav.ai/${code}`;
    }
    function decodeHtmlEntities(value) {
        return String(value || '').replace(/&(#x?[0-9a-f]+|amp|lt|gt|quot|apos|nbsp);/gi, (match, code) => {
            const key = String(code).toLowerCase();
            if (key === 'amp') return '&';
            if (key === 'lt') return '<';
            if (key === 'gt') return '>';
            if (key === 'quot') return '"';
            if (key === 'apos' || key === '#39') return "'";
            if (key === 'nbsp') return ' ';
            const hex = key.startsWith('#x');
            const point = parseInt(hex ? key.slice(2) : key.slice(1), hex ? 16 : 10);
            return Number.isFinite(point) && point > 0 ? String.fromCodePoint(point) : match;
        });
    }
    function titleFromHtml(html) {
        const head = String(html || '').slice(0, 40000);
        const meta = head.match(/<meta[^>]+(?:property|name)\s*=\s*["'](?:og:title|twitter:title)["'][^>]*>/i);
        if (meta) {
            const content = meta[0].match(/content\s*=\s*["']([^"']*)["']/i);
            const value = metaCleanTitle(decodeHtmlEntities(content ? content[1] : ''));
            if (value) return value;
        }
        const docTitle = head.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
        return metaCleanTitle(decodeHtmlEntities(docTitle ? docTitle[1] : ''));
    }
    function titleSyncPending(record) {
        if (!record || !record.code) return false;
        const title = typeof record.title === 'string' ? record.title.trim() : '';
        if (title && title !== record.code) return false;
        const failedAt = Number(record.titleSyncFailedAt) || 0;
        return !failedAt || Date.now() - failedAt > TITLE_SYNC_FAIL_RETRY;
    }
    function creditsSyncPending(record) {
        if (!IS_JABLE || !record || !record.code) return false;
        if (String(record.maker || '').trim()) return false;
        const failedAt = Number(record.creditsSyncFailedAt) || 0;
        return !failedAt || Date.now() - failedAt > CREDITS_SYNC_FAIL_RETRY;
    }
    async function javDbTitle(code) {
        const raw = String(code || '').trim();
        if (!javDbCodeKey(raw)) return '';
        let movie = null;
        try {
            movie = await searchJavDbMovie(raw);
        } catch (_) {
            return '';
        }
        if (!movie) return '';
        return metaCleanTitle(movie.title || movie.origin_title || movie.name || movie.translated_title || '');
    }
    const TITLE_REFILL = {
        delay: 1500,
        limit: () => TITLE_SYNC_LIMIT,
        pending: titleSyncPending,
        busy: () => titleSyncBusy,
        setBusy: value => { titleSyncBusy = value; },
        queued: () => titleRefillQueued,
        setQueued: value => { titleRefillQueued = value; },
        async resolve(record) {
            const title = await javDbTitle(record.code);
            if (title) return title;
            const url = analyticsFetchUrl(record);
            if (!url) return null;
            return titleFromHtml(await fetchHtml(url, { skipProxy: true, timeout: 8000 }));
        },
        valid: (value, record) => Boolean(value) && value !== record.code,
        apply(record, value) {
            record.title = value;
            record.titleSyncedAt = Date.now();
            delete record.titleSyncFailedAt;
        },
        fail(record) {
            record.titleSyncFailedAt = Date.now();
        },
        icon: '📝',
        label: '标题',
        warn: error => console.warn('[av-helper] 标题补全失败:', error && error.message ? error.message : error)
    };
    const CREDITS_REFILL = {
        delay: 1800,
        limit: () => CREDITS_SYNC_LIMIT,
        pending: creditsSyncPending,
        busy: () => creditsSyncBusy,
        setBusy: value => { creditsSyncBusy = value; },
        queued: () => creditsRefillQueued,
        setQueued: value => { creditsRefillQueued = value; },
        async resolve(record) {
            const credits = await javDbCreditsFor(record.code);
            return credits && credits.maker ? String(credits.maker).trim() : '';
        },
        valid: value => Boolean(value),
        apply(record, value) {
            record.maker = value;
            record.creditsSyncedAt = Date.now();
            delete record.creditsSyncFailedAt;
        },
        fail(record) {
            record.creditsSyncFailedAt = Date.now();
        },
        icon: '🏷️',
        label: '片商',
        warn: error => console.warn('[av-helper] 片商补全失败:', error && error.message ? error.message : error)
    };
    async function runRefill(config) {
        if (config.busy()) return;
        const targets = analyticsRecords().filter(config.pending).slice(0, config.limit());
        if (!targets.length) return;
        config.setBusy(true);
        let filled = 0;
        try {
            for (const record of targets) {
                const value = await config.resolve(record);
                if (value === null) continue;
                if (config.valid(value, record)) {
                    config.apply(record, value);
                    filled++;
                } else {
                    config.fail(record);
                }
                await new Promise(resolve => setTimeout(resolve, 350));
            }
        } catch (error) {
            config.warn(error);
        } finally {
            config.setBusy(false);
        }
        saveAnalyticsRecords();
        if (filled) {
            renderAnalytics();
            log(`${config.icon} 已补全 ${filled} 部影片${config.label}`);
        }
    }
    function scheduleRefill(config) {
        if (config.queued() || config.busy()) return;
        if (!analyticsRecords().some(config.pending)) return;
        config.setQueued(true);
        setTimeout(() => {
            config.setQueued(false);
            runRefill(config);
        }, config.delay);
    }
    function scheduleTitleRefill() {
        scheduleRefill(TITLE_REFILL);
    }
    function scheduleCreditsRefill() {
        scheduleRefill(CREDITS_REFILL);
    }
    function deleteAnalyticsRecord(code) {
        const key = String(code || '').toUpperCase();
        state.analyticsRecords = analyticsRecords().filter(item => String(item && item.code ? item.code : '').toUpperCase() !== key);
        saveAnalyticsRecords();
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
    function computeUserPersona(records, summary) {
        const list = Array.isArray(records) ? records : [];
        const totalCount = list.length;
        if (!totalCount) {
            return {
                archetype: '初登探索者',
                summary: '暂无足够的观影数据，开始观看影片后将自动生成您的专属画像与偏好洞察。',
                timeSlotTrait: { label: '尚未形成', percentage: 0, description: '记录累积中' },
                pacingTrait: { label: '探索中', avgDurationText: '0 分钟', completionBadge: '0%' },
                tasteLoyalty: { label: '待发掘', actressDiversityText: '未确定', topMakerText: '多元厂牌' },
                signatureTags: []
            };
        }
        const slotCounts = [0, 0, 0, 0];
        for (const record of list) {
            const hour = new Date(Number(record.watchedAt) || 0).getHours();
            slotCounts[hour < 6 ? 0 : hour < 12 ? 1 : hour < 18 ? 2 : 3]++;
        }
        const timeSlots = [
            { type: 'night', name: '深夜漫游', label: '深夜时段 (00:00 - 06:00)', desc: '习惯在静谧深宵专属探索', count: slotCounts[0] },
            { type: 'evening', name: '晚间黄金档', label: '晚间黄金档 (18:00 - 24:00)', desc: '多在晚间闲暇时段静心品鉴', count: slotCounts[3] },
            { type: 'afternoon', name: '午后休憩', label: '午后闲暇 (12:00 - 18:00)', desc: '倾向于在白昼空隙或午后放松', count: slotCounts[2] },
            { type: 'morning', name: '晨光早起', label: '晨间时段 (06:00 - 12:00)', desc: '偏好在清晨或上午开启观影', count: slotCounts[1] }
        ];
        timeSlots.sort((a, b) => b.count - a.count);
        const dominantSlot = timeSlots[0];
        const slotPercent = Math.round(dominantSlot.count / totalCount * 100);
        const avgMinutes = summary.avgWatchedMinutes;
        const completionRate = summary.completionRate;
        let pacingType = 'balanced';
        let pacingLabel = '精选聚焦型';
        if (avgMinutes >= 25 || completionRate >= 50) {
            pacingType = 'immersive';
            pacingLabel = '深度沉浸型';
        } else if (avgMinutes < 8 && summary.habitBuckets[0] && summary.habitBuckets[0].percentage > 40) {
            pacingType = 'speed';
            pacingLabel = '敏锐速览型';
        }
        const topActress = summary.topActresses[0];
        const topMaker = summary.topMakers[0];
        let loyaltyType = 'free';
        let loyaltyLabel = '自由漫游';
        let actressDiversityText = '博览群芳';
        if (topActress && (topActress.count >= 3 || topActress.count / totalCount >= .3)) {
            loyaltyType = 'devoted';
            loyaltyLabel = `专情长情 (${topActress.name})`;
            actressDiversityText = `深宠 ${topActress.name}`;
        } else if (summary.topActresses.length >= 4) {
            loyaltyType = 'diverse';
            loyaltyLabel = '广泛涉猎';
            actressDiversityText = '涉猎多元女优';
        } else if (topActress) {
            loyaltyType = 'focused';
            loyaltyLabel = `聚焦偏好 (${topActress.name})`;
            actressDiversityText = `偏爱 ${topActress.name}`;
        }
        const topMakerText = topMaker ? `${topMaker.name} 阵营` : '多元厂牌';
        const signatureTags = summary.topGenres.slice(0, 4).map(item => item.name).filter(Boolean);
        let archetype = '专注品味鉴赏家';
        if (pacingType === 'immersive') {
            if (dominantSlot.type === 'night') archetype = '暗夜沉浸品鉴家';
            else if (dominantSlot.type === 'evening') archetype = '晚间深度鉴赏者';
            else archetype = '全景剧情探索家';
        } else if (pacingType === 'speed') {
            if (dominantSlot.type === 'night') archetype = '深宵敏锐搜寻者';
            else if (dominantSlot.type === 'evening') archetype = '黄金档快节奏先锋';
            else archetype = '敏锐速览探索者';
        } else if (loyaltyType === 'devoted') {
            archetype = '专情专注鉴赏者';
        } else if (dominantSlot.type === 'night') {
            archetype = '夜阑精准品味家';
        } else if (dominantSlot.type === 'evening') {
            archetype = '晚风闲适鉴赏家';
        } else {
            archetype = '敏慧平衡探索者';
        }
        const genreStr = signatureTags.length ? signatureTags.map(name => `「${name}」`).join('、') : '';
        const makerStr = topMaker ? `（常驻 ${topMaker.name}）` : '';
        const actressStr = topActress ? `，特别钟情于 ${topActress.name} 的作品` : '';
        let summaryText = `观影集中在${dominantSlot.name}（占比 ${slotPercent}%），节奏呈现${pacingLabel}（平均单部停留 ${avgMinutes} 分钟，完播率 ${completionRate}%）。`;
        summaryText += genreStr
            ? `核心题材基因聚焦于 ${genreStr}${makerStr}${actressStr}，展现出鲜明且专注的个人品味取向。`
            : '整体鉴赏习惯稳定，展现出专注的个人品味取向。';
        return {
            archetype,
            summary: summaryText,
            timeSlotTrait: { label: dominantSlot.label, percentage: slotPercent, description: `${dominantSlot.desc} (占比 ${slotPercent}%)` },
            pacingTrait: { label: pacingLabel, avgDurationText: `单部均长 ${avgMinutes} 分钟`, completionBadge: `${completionRate}%` },
            tasteLoyalty: { label: loyaltyLabel, actressDiversityText, topMakerText },
            signatureTags
        };
    }
    function buildPersonaCard(persona, range) {
        const section = document.createElement('section');
        section.className = 'av-persona-card';
        const head = document.createElement('div');
        head.className = 'av-persona-head';
        const titleGroup = document.createElement('div');
        titleGroup.className = 'av-persona-title-group';
        const kicker = document.createElement('div');
        kicker.className = 'av-persona-kicker';
        kicker.textContent = '用户画像 · 鉴赏档案';
        const archetype = document.createElement('h2');
        archetype.className = 'av-persona-archetype';
        archetype.textContent = persona.archetype;
        titleGroup.append(kicker, archetype);
        const scope = document.createElement('span');
        scope.className = 'av-persona-scope';
        scope.textContent = range === 'all' ? '全历史画像' : range === '30d' ? '近 30 天画像' : '近 7 天画像';
        head.append(titleGroup, scope);
        const body = document.createElement('div');
        body.className = 'av-persona-body';
        const narrativeCol = document.createElement('div');
        narrativeCol.className = 'av-persona-narrative-col';
        const narrative = document.createElement('p');
        narrative.className = 'av-persona-narrative';
        narrative.textContent = persona.summary;
        narrativeCol.appendChild(narrative);
        if (persona.signatureTags.length) {
            const tagWrap = document.createElement('div');
            tagWrap.className = 'av-persona-tags-wrap';
            const tagLabel = document.createElement('span');
            tagLabel.className = 'av-persona-tags-label';
            tagLabel.textContent = '核心题材基因';
            const tags = document.createElement('div');
            tags.className = 'av-persona-tags';
            for (const name of persona.signatureTags) {
                const chip = document.createElement('span');
                chip.className = 'av-persona-tag';
                chip.textContent = `#${name}`;
                tags.appendChild(chip);
            }
            tagWrap.append(tagLabel, tags);
            narrativeCol.appendChild(tagWrap);
        }
        const traits = document.createElement('div');
        traits.className = 'av-persona-traits';
        const traitRows = [
            ['活跃时段型态', persona.timeSlotTrait.label, persona.timeSlotTrait.description],
            ['观影节奏偏好', persona.pacingTrait.label, `${persona.pacingTrait.avgDurationText} · 完播率 ${persona.pacingTrait.completionBadge}`],
            ['专属偏好专注度', persona.tasteLoyalty.label, `${persona.tasteLoyalty.actressDiversityText} · ${persona.tasteLoyalty.topMakerText}`]
        ];
        for (const [label, value, sub] of traitRows) {
            const card = document.createElement('div');
            card.className = 'av-trait-card';
            const labelEl = document.createElement('span');
            labelEl.className = 'av-trait-label';
            labelEl.textContent = label;
            const valueEl = document.createElement('span');
            valueEl.className = 'av-trait-val';
            valueEl.textContent = value;
            const subEl = document.createElement('span');
            subEl.className = 'av-trait-sub';
            subEl.textContent = sub;
            card.append(labelEl, valueEl, subEl);
            traits.appendChild(card);
        }
        body.append(narrativeCol, traits);
        section.append(head, body);
        return section;
    }
    function recordMatches(record, query) {
        for (const value of [record.code, record.title, record.maker]) {
            if (String(value || '').toLowerCase().includes(query)) return true;
        }
        for (const value of record.actresses || []) {
            if (String(value).toLowerCase().includes(query)) return true;
        }
        for (const value of record.genres || []) {
            if (String(value).toLowerCase().includes(query)) return true;
        }
        return false;
    }
    function recordRowKey(record) {
        const progress = recordProgress(record);
        return JSON.stringify([
            record.code,
            record.title || '',
            record.maker || '',
            Array.prototype.slice.call(record.actresses || [], 0, 3),
            Array.prototype.slice.call(record.genres || [], 0, 3),
            recordWatchUrl(record),
            progress.percent,
            progress.timeText,
            progress.isCompleted ? 1 : 0,
            formatRecordDate(record.watchedAt),
            new Date(Number(record.watchedAt) || 0).toLocaleString()
        ]);
    }
    function buildRecordRow(record) {
        const progress = recordProgress(record);
        const row = document.createElement('div');
        row.className = 'av-record-row';
        const codeLink = document.createElement('a');
        codeLink.className = 'av-record-code av-open-record';
        codeLink.href = recordWatchUrl(record);
        codeLink.target = '_blank';
        codeLink.rel = 'noopener noreferrer';
        codeLink.title = `${record.code} · 在新标签页观看`;
        codeLink.textContent = record.code;
        const main = document.createElement('div');
        main.className = 'av-record-main';
        const title = document.createElement('div');
        title.className = 'av-record-title';
        title.textContent = record.title || record.code;
        title.title = title.textContent;
        const tags = document.createElement('div');
        tags.className = 'av-record-tags';
        const tagTexts = [];
        if (record.maker) tagTexts.push(record.maker);
        for (const name of (record.actresses || []).slice(0, 3)) tagTexts.push(name);
        for (const name of (record.genres || []).slice(0, 3)) tagTexts.push(name);
        for (const text of tagTexts) {
            const tag = document.createElement('span');
            tag.className = 'av-record-tag';
            tag.textContent = text;
            tags.appendChild(tag);
        }
        if (progress.isCompleted) {
            const badge = document.createElement('span');
            badge.className = 'av-record-tag is-state is-complete';
            badge.textContent = '完播';
            tags.appendChild(badge);
        }
        const resume = resumeEntry(record.code);
        if (resume && resume.position >= RESUME_MIN_SECONDS && (!resume.duration || resume.position < resume.duration * RESUME_TAIL_RATIO)) {
            const badge = document.createElement('span');
            badge.className = 'av-record-tag is-state is-resume';
            badge.textContent = `续播 ${formatClock(resume.position)}`;
            badge.title = `已保存上次播放位置：${formatDuration(resume.position)}${resume.duration ? ` / ${formatDuration(resume.duration)}` : ''}`;
            tags.appendChild(badge);
        }
        main.append(title, tags);
        const prog = document.createElement('div');
        prog.className = 'av-record-progress';
        const progHead = document.createElement('div');
        progHead.className = 'av-record-progress-head';
        const progLeft = document.createElement('span');
        progLeft.className = 'av-record-progress-left';
        const pct = document.createElement('span');
        pct.className = 'av-record-progress-pct';
        pct.textContent = `${progress.percent}%`;
        progLeft.appendChild(pct);
        const time = document.createElement('span');
        time.className = 'av-record-time';
        time.textContent = progress.timeCompact;
        time.title = progress.timeText;
        progHead.append(progLeft, time);
        const track = document.createElement('div');
        track.className = 'av-progress-bar';
        const fill = document.createElement('div');
        fill.style.width = `${progress.percent}%`;
        track.appendChild(fill);
        prog.append(progHead, track);
        const date = document.createElement('span');
        date.className = 'av-record-date';
        date.title = new Date(Number(record.watchedAt) || 0).toLocaleString();
        date.textContent = formatRecordDate(record.watchedAt);
        const actions = document.createElement('div');
        actions.className = 'av-record-actions';
        const play = document.createElement('a');
        play.className = 'av-icon-btn av-open-record';
        play.href = recordWatchUrl(record);
        play.target = '_blank';
        play.rel = 'noopener noreferrer';
        play.title = '在新标签页观看';
        play.setAttribute('aria-label', '播放');
        play.appendChild(iconSvg('<polygon points="6 3 20 12 6 21 6 3"/>'));
        const remove = document.createElement('button');
        remove.type = 'button';
        remove.className = 'av-icon-btn is-danger';
        remove.title = '移除此记录';
        remove.setAttribute('aria-label', '移除此记录');
        remove.appendChild(iconSvg('<path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>'));
        remove.addEventListener('click', () => {
            if (!confirm(`确定要移除番号 ${record.code} 的观看记录吗？`)) return;
            deleteAnalyticsRecord(record.code);
            renderAnalytics();
            log(`🗑 已移除观影记录 ${record.code}`);
        });
        actions.append(play, remove);
        row.append(codeLink, main, prog, date, actions);
        return row;
    }
    function buildRecordsSection(data, range) {
        const records = data.records || [];
        const section = document.createElement('section');
        section.className = 'av-cockpit-card';
        const head = document.createElement('div');
        head.className = 'av-records-head';
        const titleGroup = document.createElement('div');
        titleGroup.className = 'av-records-title-group';
        const title = document.createElement('h2');
        title.className = 'av-records-title';
        title.appendChild(iconSvg('<path d="M4 19.5V6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v13.5"/><path d="M8 9h8M8 13h5"/>'));
        const titleText = document.createElement('span');
        titleText.textContent = '观影记录明细';
        title.appendChild(titleText);
        const subtitle = document.createElement('p');
        subtitle.className = 'av-records-subtitle';
        subtitle.textContent = '本地记录的播放历史与时长清单';
        titleGroup.append(title, subtitle);
        const controls = document.createElement('div');
        controls.className = 'av-records-controls';
        const box = document.createElement('div');
        box.className = 'av-search-box';
        const input = document.createElement('input');
        input.type = 'search';
        input.className = 'av-search-input';
        input.placeholder = '搜索番号 / 标题 / 女优 / 题材';
        input.setAttribute('aria-label', '搜索观影记录');
        input.value = state.analyticsQuery || '';
        const clearSearch = document.createElement('button');
        clearSearch.type = 'button';
        clearSearch.className = 'av-search-clear';
        clearSearch.title = '清空搜索';
        clearSearch.setAttribute('aria-label', '清空搜索');
        clearSearch.appendChild(iconSvg('<path d="M18 6 6 18M6 6l12 12"/>'));
        clearSearch.hidden = !input.value;
        box.append(input, clearSearch);
        const count = document.createElement('span');
        count.className = 'av-records-count';
        controls.append(box, count);
        head.append(titleGroup, controls);
        const list = document.createElement('div');
        list.className = 'av-records-list';
        const more = document.createElement('div');
        more.className = 'av-records-more';
        const limitState = { value: 25 };
        const paint = () => {
            const query = (state.analyticsQuery || '').trim().toLowerCase();
            const found = query ? records.filter(record => recordMatches(record, query)) : records;
            const shown = found.slice(0, limitState.value);
            const pooled = new Map();
            for (const entry of state.analyticsRowPool || []) {
                const bucket = pooled.get(entry.key);
                if (bucket) bucket.push(entry.row);
                else pooled.set(entry.key, [entry.row]);
            }
            const nextPool = [];
            list.replaceChildren();
            more.replaceChildren();
            if (!found.length) {
                const empty = document.createElement('div');
                empty.className = 'av-records-empty';
                empty.textContent = query ? `未找到匹配「${state.analyticsQuery}」的观影记录` : '本时间范围内暂无观影记录';
                list.appendChild(empty);
            } else {
                for (const record of shown) {
                    const rowKey = recordRowKey(record);
                    const bucket = pooled.get(rowKey);
                    const row = bucket && bucket.length ? bucket.shift() : buildRecordRow(record);
                    nextPool.push({ key: rowKey, row });
                    list.appendChild(row);
                }
            }
            state.analyticsRowPool = nextPool;
            count.textContent = `共 ${found.length} 部影片`;
            const rest = found.length - shown.length;
            if (rest > 0) {
                const moreBtn = document.createElement('button');
                moreBtn.type = 'button';
                moreBtn.className = 'av-btn';
                moreBtn.textContent = `加载更多记录 (剩余 ${rest} 部)`;
                moreBtn.addEventListener('click', () => {
                    limitState.value += 25;
                    paint();
                });
                more.appendChild(moreBtn);
            }
        };
        input.addEventListener('input', () => {
            state.analyticsQuery = input.value;
            clearSearch.hidden = !input.value;
            limitState.value = 25;
            paint();
        });
        clearSearch.addEventListener('click', () => {
            state.analyticsQuery = '';
            input.value = '';
            clearSearch.hidden = true;
            limitState.value = 25;
            paint();
            input.focus();
        });
        section.append(head, list, more);
        section.dataset.range = range;
        paint();
        return section;
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
        main.appendChild(buildPersonaCard(computeUserPersona(data.records || [], data), range));
        const resumeCard = buildResumeCard();
        if (resumeCard) main.appendChild(resumeCard);
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
        const tilePool = state.analyticsHeatTiles || (state.analyticsHeatTiles = []);
        for (let tileIndex = 0; tileIndex < data.dailyHeatmap.length; tileIndex++) {
            const day = data.dailyHeatmap[tileIndex];
            if (!tilePool[tileIndex]) {
                const fresh = document.createElement('div');
                fresh.className = 'av-heatmap-box';
                tilePool[tileIndex] = fresh;
            }
            const box = tilePool[tileIndex];
            const boxClass = `av-heatmap-box level-${day.level}${day.isFuture ? ' is-future' : ''}`;
            if (box.className !== boxClass) box.className = boxClass;
            const boxTip = `${day.date}：观看 ${day.count} 部 · ${formatDuration(day.seconds)}`;
            if (box.title !== boxTip) box.title = boxTip;
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
        const hourmap = document.createElement('section');
        hourmap.className = 'av-cockpit-card';
        hourmap.appendChild(buildCardTitle('<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/><path d="M12 17h.01"/>', '周内时段热力图', '星期 × 小时，定位高效时段'));
        const hourmapWrap = document.createElement('div');
        hourmapWrap.className = 'av-hourmap';
        const hourmapGrid = document.createElement('div');
        hourmapGrid.className = 'av-hourmap-grid';
        const weekdayNames = ['日', '一', '二', '三', '四', '五', '六'];
        const paintHourmap = metric => {
            state.analyticsHourmapMetric = metric;
            const peak = Math.max(1, ...data.hourWeekdayHeat.flatMap(row => row.map(cell => (metric === 'seconds' ? cell.seconds : cell.count))));
            hourmapGrid.replaceChildren();
            const corner = document.createElement('span');
            corner.className = 'av-hourmap-day';
            hourmapGrid.appendChild(corner);
            for (let hour = 0; hour < 24; hour++) {
                const head = document.createElement('span');
                head.className = 'av-hourmap-head';
                head.textContent = hour % 3 === 0 ? String(hour) : '';
                hourmapGrid.appendChild(head);
            }
            for (let weekday = 0; weekday < 7; weekday++) {
                const dayLabel = document.createElement('span');
                dayLabel.className = 'av-hourmap-day';
                dayLabel.textContent = weekdayNames[weekday];
                hourmapGrid.appendChild(dayLabel);
                for (let hour = 0; hour < 24; hour++) {
                    const cell = data.hourWeekdayHeat[weekday][hour];
                    const value = metric === 'seconds' ? cell.seconds : cell.count;
                    const level = value <= 0 ? 0 : Math.max(1, Math.min(4, Math.ceil((value / peak) * 4)));
                    const box = document.createElement('div');
                    box.className = `av-hourmap-cell level-${level}`;
                    box.title = `周${weekdayNames[weekday]} ${String(hour).padStart(2, '0')}:00 - ${String(hour).padStart(2, '0')}:59：${cell.count} 部 · ${formatDuration(cell.seconds)}`;
                    hourmapGrid.appendChild(box);
                }
            }
            syncMetricToggle(hourmapToggle, metric);
        };
        const hourmapToggle = buildMetricToggle(
            [{ value: 'count', label: '按频次' }, { value: 'seconds', label: '按时长' }],
            state.analyticsHourmapMetric || 'count',
            paintHourmap
        );
        hourmap.append(hourmapToggle, hourmapWrap);
        hourmapWrap.appendChild(hourmapGrid);
        paintHourmap(state.analyticsHourmapMetric || 'count');
        main.appendChild(hourmap);
        const duo = document.createElement('div');
        duo.className = 'av-duo-grid';
        const hourly = document.createElement('section');
        hourly.className = 'av-cockpit-card';
        hourly.appendChild(buildCardTitle('<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>', '24 小时活跃时段分布', '作息节律洞察'));
        const bars = document.createElement('div');
        bars.className = 'av-bar-chart';
        const paintHourly = metric => {
            state.analyticsHourlyMetric = metric;
            const values = data.hourlyDistribution.map(item => (metric === 'seconds' ? item.seconds : item.count));
            const peak = Math.max(1, ...values);
            bars.replaceChildren();
            for (const item of data.hourlyDistribution) {
                const value = metric === 'seconds' ? item.seconds : item.count;
                const percentage = Math.round((value / peak) * 100);
                const col = document.createElement('div');
                col.className = 'av-bar-col';
                col.title = `${item.hour}:00 - ${item.hour}:59：观看 ${item.count} 次 · ${formatDuration(item.seconds)}`;
                const track = document.createElement('div');
                track.className = 'av-bar-track';
                const fill = document.createElement('div');
                fill.className = `av-bar-fill${percentage >= 70 ? ' is-peak' : ''}`;
                fill.style.height = `${Math.max(4, percentage)}%`;
                track.appendChild(fill);
                const label = document.createElement('span');
                label.className = 'av-bar-label';
                label.textContent = item.hour % 3 === 0 ? `${item.hour}h` : '';
                col.append(track, label);
                bars.appendChild(col);
            }
            syncMetricToggle(toggle, metric);
        };
        const toggle = buildMetricToggle(
            [{ value: 'count', label: '按频次' }, { value: 'seconds', label: '按时长' }],
            state.analyticsHourlyMetric || 'count',
            paintHourly
        );
        hourly.appendChild(toggle);
        paintHourly(state.analyticsHourlyMetric || 'count');
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
            actressCard.appendChild(buildMiniEmpty('暂无女优信息（将在观看带演员标签的影片时更新）'));
        } else {
            const rankList = document.createElement('div');
            rankList.className = 'av-rank-list';
            const paintActress = metric => {
                state.analyticsActressMetric = metric;
                const source = metric === 'seconds' ? data.topActressesByTime : data.topActresses;
                rankList.replaceChildren();
                source.forEach((item, index) => {
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
                    meta.textContent = metric === 'seconds'
                        ? `${formatDuration(item.seconds)} · ${item.count} 次`
                        : `${item.count} 次 · ${formatDuration(item.seconds)}`;
                    head.append(link, meta);
                    const bar = document.createElement('div');
                    bar.className = 'av-progress-bar is-actress';
                    const fill = document.createElement('div');
                    fill.style.width = `${Math.min(100, metric === 'seconds' ? item.secondsPercentage : item.percentage)}%`;
                    bar.appendChild(fill);
                    body.append(head, bar);
                    row.append(badge, body);
                    rankList.appendChild(row);
                });
                syncMetricToggle(toggle, metric);
            };
            const toggle = buildMetricToggle(
                [{ value: 'count', label: '按频次' }, { value: 'seconds', label: '按时长' }],
                state.analyticsActressMetric || 'count',
                paintActress
            );
            actressCard.append(toggle, rankList);
            paintActress(state.analyticsActressMetric || 'count');
        }
        const genreCard = document.createElement('section');
        genreCard.className = 'av-cockpit-card';
        genreCard.appendChild(buildCardTitle('<path d="M20.6 13.4 12 22l-9-9V3h10z"/><path d="M7.5 7.5h.01"/>', '偏好题材 TOP 15', '出现频次，条长为相对榜首'));
        if (!data.topGenres.length) {
            genreCard.appendChild(buildMiniEmpty('暂无题材信息'));
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
            makerCard.appendChild(buildMiniEmpty(IS_JABLE ? '暂无片商信息（已尝试从 JavDB 补全）' : '暂无片商信息'));
        } else {
            const makerList = document.createElement('div');
            makerList.className = 'av-rank-list';
            const paintMaker = metric => {
                state.analyticsMakerMetric = metric;
                const source = metric === 'seconds' ? data.topMakersByTime : data.topMakers;
                makerList.replaceChildren();
                source.forEach((item, index) => {
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
                    meta.textContent = metric === 'seconds'
                        ? `${formatDuration(item.seconds)} · ${item.count} 部`
                        : `${item.count} 部 · ${formatDuration(item.seconds)}`;
                    head.append(link, meta);
                    const bar = document.createElement('div');
                    bar.className = 'av-progress-bar is-maker';
                    const fill = document.createElement('div');
                    fill.style.width = `${Math.min(100, metric === 'seconds' ? item.secondsPercentage : item.percentage)}%`;
                    bar.appendChild(fill);
                    body.append(head, bar);
                    row.append(badge, body);
                    makerList.appendChild(row);
                });
                syncMetricToggle(makerToggle, metric);
            };
            const makerToggle = buildMetricToggle(
                [{ value: 'count', label: '按频次' }, { value: 'seconds', label: '按时长' }],
                state.analyticsMakerMetric || 'count',
                paintMaker
            );
            makerCard.append(makerToggle, makerList);
            paintMaker(state.analyticsMakerMetric || 'count');
        }
        main.appendChild(makerCard);
        main.appendChild(buildRecordsSection(data, range));
        main.dataset.range = range;
        return main;
    }
    function syncMetricToggle(group, metric) {
        if (!group) return;
        const buttons = Array.prototype.slice.call(group.querySelectorAll('button[data-metric]'));
        let target = null;
        for (const button of buttons) {
            const on = button.dataset.metric === metric;
            button.classList.toggle('is-on', on);
            if (on) target = button;
        }
        group.dataset.metric = metric;
        const pill = group.querySelector('.av-stat-toggle-pill');
        if (!target || !pill) return;
        pill.style.width = `${target.offsetWidth}px`;
        pill.style.transform = `translateX(${target.offsetLeft}px)`;
    }
    function buildMetricToggle(options, active, onPick) {
        const wrap = document.createElement('div');
        wrap.className = 'av-stat-toggle-row';
        const group = document.createElement('div');
        group.className = 'av-stat-toggle';
        group.dataset.metric = active;
        const pill = document.createElement('span');
        pill.className = 'av-stat-toggle-pill';
        pill.setAttribute('aria-hidden', 'true');
        group.appendChild(pill);
        for (const option of options) {
            const button = document.createElement('button');
            button.type = 'button';
            button.dataset.metric = option.value;
            button.textContent = option.label;
            button.classList.toggle('is-on', option.value === active);
            button.addEventListener('click', () => onPick(option.value));
            group.appendChild(button);
        }
        const settle = () => syncMetricToggle(group, group.dataset.metric);
        if (typeof requestAnimationFrame === 'function') requestAnimationFrame(settle);
        else setTimeout(settle, 0);
        wrap.appendChild(group);
        return wrap;
    }
    function buildResumeCard() {
        const items = resumePendingList(12);
        if (!items.length) return null;
        const card = document.createElement('section');
        card.className = 'av-cockpit-card';
        card.appendChild(buildCardTitle('<path d="M8 5v14l11-7z"/>', '继续观看', '按上次播放位置排序，点击番号回到该位置', true));
        for (const item of items) {
            const row = document.createElement('div');
            row.className = 'av-rank-row';
            const badge = document.createElement('span');
            badge.className = 'av-rank-badge';
            badge.textContent = '▶';
            const body = document.createElement('div');
            body.className = 'av-rank-body';
            const head = document.createElement('div');
            head.className = 'av-rank-head';
            const link = document.createElement('a');
            link.className = 'av-actress-link av-open-record';
            link.href = item.url || (IS_JABLE ? `https://jable.tv/videos/${encodeURIComponent(item.code.toLowerCase())}/` : `https://missav.ai/${encodeURIComponent(item.code.toLowerCase())}`);
            link.target = '_blank';
            link.rel = 'noopener noreferrer';
            link.textContent = item.title || item.code;
            link.title = `${item.code} · ${formatDuration(item.position)}${item.duration ? ` / ${formatDuration(item.duration)}` : ''}`;
            const meta = document.createElement('span');
            meta.className = 'av-rank-meta';
            const percent = item.duration ? Math.min(100, Math.round((item.position / item.duration) * 100)) : 0;
            meta.textContent = `${item.code} · ${formatDuration(item.position)}${item.duration ? ` / ${formatDuration(item.duration)} · ${percent}%` : ''} · ${formatRecordDate(item.at)}`;
            head.append(link, meta);
            const bar = document.createElement('div');
            bar.className = 'av-progress-bar is-actress';
            const fill = document.createElement('div');
            fill.style.width = `${Math.max(2, percent)}%`;
            bar.appendChild(fill);
            body.append(head, bar);
            row.append(badge, body);
            card.appendChild(row);
        }
        return card;
    }
    function buildMiniEmpty(text) {
        const empty = document.createElement('div');
        empty.className = 'av-mini-empty';
        empty.textContent = text;
        return empty;
    }
    function renderAnalytics() {
        const page = state.analyticsPage;
        if (!page) return;
        state.analyticsSignature = `${historyStorageGet(ANALYTICS_KEY) || '[]'}|${historyStorageGet(RESUME_KEY) || '{}'}`;
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
        scheduleTitleRefill();
        scheduleCreditsRefill();
    }
    function exportAnalyticsJson() {
        const records = analyticsRecords();
        const watched = [...watchedSet()];
        const payload = {
            app: 'AV Helper Analytics',
            version: '2.0',
            schemaVersion: HISTORY_SCHEMA_VERSION,
            exportedAt: new Date().toISOString(),
            watchedCount: watched.length,
            recordsCount: records.length,
            watched,
            records
        };
        const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `av-helper-history-${new Date().toISOString().slice(0, 10)}.json`;
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        link.remove();
        setTimeout(() => URL.revokeObjectURL(url), 2000);
    }
    function historyDecodeBackupValue(value) {
        if (typeof value !== 'string') return value;
        return historyParseJson(value, []);
    }
    function parseHistoryImport(payload) {
        if (!payload || typeof payload !== 'object') throw new Error('备份文件不是有效对象');
        const data = payload.data && typeof payload.data === 'object' ? payload.data : {};
        let watchedRaw = null;
        let recordsRaw = null;
        for (const source of [payload, data]) {
            if (watchedRaw === null && source.watched !== void 0) watchedRaw = historyDecodeBackupValue(source.watched);
            if (watchedRaw === null && source[WATCHED_KEY_BASE] !== void 0) watchedRaw = historyDecodeBackupValue(source[WATCHED_KEY_BASE]);
            if (watchedRaw === null && source.missavWatchedList !== void 0) watchedRaw = historyDecodeBackupValue(source.missavWatchedList);
            if (recordsRaw === null && source.records !== void 0) recordsRaw = historyDecodeBackupValue(source.records);
            if (recordsRaw === null && source[ANALYTICS_KEY_BASE] !== void 0) recordsRaw = historyDecodeBackupValue(source[ANALYTICS_KEY_BASE]);
            if (recordsRaw === null && source.missavAnalyticsRecords_v1 !== void 0) recordsRaw = historyDecodeBackupValue(source.missavAnalyticsRecords_v1);
        }
        if (watchedRaw === null && recordsRaw === null) throw new Error('未找到可导入的历史记录');
        return {
            watched: watchedRaw === null ? null : historyWatchedList(watchedRaw),
            records: recordsRaw === null ? null : historyNormalizeRecordList(recordsRaw, true)
        };
    }
    function importAnalyticsJson() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json,application/json';
        input.style.display = 'none';
        input.addEventListener('change', async () => {
            const file = input.files && input.files[0];
            input.remove();
            if (!file) return;
            try {
                const payload = JSON.parse(await file.text());
                const imported = parseHistoryImport(payload);
                const details = [];
                if (imported.watched) details.push(`观看标记 ${imported.watched.length} 条`);
                if (imported.records) details.push(`播放记录 ${imported.records.length} 条`);
                if (!confirm(`将用备份覆盖当前数据：${details.join('，')}。\n此操作无法撤销，确定继续吗？`)) return;
                if (imported.watched) {
                    historyStorageSet(WATCHED_KEY, JSON.stringify(imported.watched));
                    state.watchGen += 1;
                }
                if (imported.records) historyStorageSet(ANALYTICS_KEY, JSON.stringify(imported.records));
                resetHistoryCaches();
                refreshFilters();
                refreshCockpit();
                log(`✅ 历史备份已导入：${details.join('，')}`);
            } catch (error) {
                alert(`导入失败：${error.message || '文件格式错误'}`);
            }
        });
        document.body.appendChild(input);
        input.click();
    }
    function clearAnalyticsData() {
        state.analyticsRecords = [];
        resumeCache = {};
        state.resumeDoneCode = '';
        resumeStopGuard();
        historyStorageSet(RESUME_KEY, '{}');
        bumpAnalyticsVersion();
        historyStorageSet(ANALYTICS_KEY, '[]');
    }
    function refreshCockpit() {
        if (!state.analyticsPage) return;
        state.analyticsRecords = null;
        bumpAnalyticsVersion();
        analyticsRecords();
        renderAnalytics();
    }
    function syncCockpit() {
        if (!state.analyticsPage || isPageHidden()) return;
        const recordsRaw = historyStorageGet(ANALYTICS_KEY) || '[]';
        const resumeRaw = historyStorageGet(RESUME_KEY) || '{}';
        if (`${recordsRaw}|${resumeRaw}` === state.analyticsSignature) return;
        state.analyticsRecords = null;
        resumeCache = null;
        bumpAnalyticsVersion();
        renderAnalytics();
    }
    function handleClearAnalytics() {
        if (!confirm('确定要清空本站的观影统计、续播与行为数据吗？另一个站点的数据不受影响，此操作无法撤销。')) return;
        clearAnalyticsData();
        state.analyticsQuery = '';
        refreshCockpit();
        log('🗑 数据大屏记录已清空');
    }
    function quitCockpitMode() {
        analyticsRequested = false;
        cockpitSticky = false;
        cockpitPinGuard = '';
        if (analyticsGuard) {
            clearInterval(analyticsGuard);
            analyticsGuard = 0;
        }
        cockpitFlagClear();
        if (analyticsObserver) {
            analyticsObserver.disconnect();
            analyticsObserver = null;
        }
        disarmMediaKiller();
        releaseCockpitGuard();
    }
    function leaveCockpitFor(url) {
        let target = null;
        try {
            target = new URL(url, location.href);
            if (/^#av-analytics\b/.test(target.hash)) target.hash = '';
        } catch (_) {
            target = null;
        }
        quitCockpitMode();
        if (!target) {
            location.assign(url);
            return;
        }
        let current = null;
        try {
            current = new URL(location.href);
        } catch (_) {
            current = null;
        }
        const sameDocument = current && current.origin === target.origin && current.pathname === target.pathname && current.search === target.search;
        if (!sameDocument) {
            location.assign(target.href);
            return;
        }
        try {
            history.replaceState(null, '', target.href);
        } catch (_) {
        }
        location.reload();
    }
    function closeCockpit() {
        const exitUrl = analyticsUrl().replace('#av-analytics', '');
        quitCockpitMode();
        window.close();
        setTimeout(() => {
            if (window.closed || !state.analyticsPage) return;
            leaveCockpitFor(exitUrl);
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
        trackObserver(analyticsObserver, document.documentElement, { childList: true });
        if (document.body) trackObserver(analyticsObserver, document.body, { childList: true });
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
        const importBtn = buildCockpitAction('<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/>', '导入 JSON', 'av-btn av-btn-secondary', '导入历史与播放进度备份', importAnalyticsJson);
        const clearBtn = buildCockpitAction('<path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>', '清空', 'av-btn av-btn-danger', '清空全部行为记录', handleClearAnalytics);
        const close = buildCockpitAction('<path d="M18 6 6 18M6 6l12 12"/>', '', 'av-btn av-btn-close', '关闭大屏', closeCockpit);
        actions.append(refresh, exportBtn, importBtn, clearBtn, close);
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
        cockpitFlagSet();
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
            const guardTimer = setInterval(() => {
                if (!analyticsRequested) {
                    clearInterval(guardTimer);
                    analyticsGuard = 0;
                    return;
                }
                ensureCockpit();
            }, 500);
            analyticsGuard = trackInterval(guardTimer);
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
            jableCardCode = '';
            document.querySelector('.av-jable-meta')?.remove();
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
        trackObserver(hostObserver, document.documentElement, { childList: true });
        if (document.body) trackObserver(hostObserver, document.body, { childList: true });
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
    for (const type of ['click', 'auxclick', 'pointerdown', 'mousedown']) {
        document.addEventListener(type, event => {
            const target = event.target;
            if (!target || typeof target.closest !== 'function') return;
            const link = target.closest('.av-fb-cockpit, .av-open-cockpit');
            if (link) {
                link.href = analyticsUrl();
                event.stopImmediatePropagation();
                return;
            }
            const recordLink = target.closest('.av-open-record');
            if (recordLink) {
                const url = String(recordLink.getAttribute('href') || recordLink.href || '');
                if (!url) return;
                event.stopImmediatePropagation();
                if (type !== 'click' && type !== 'auxclick') return;
                if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
                    if (state.analyticsPage) quitCockpitMode();
                    return;
                }
                event.preventDefault();
                if (state.analyticsPage) leaveCockpitFor(url);
                else location.assign(url);
                return;
            }
            const cockpitAnchor = (type === 'click' || type === 'auxclick') && state.analyticsPage && target.closest('.av-analytics-page') && target.closest('a[href]');
            if (cockpitAnchor) quitCockpitMode();
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
        resumeSaveCurrent(true);
        hideResumeToast();
        stopPlayerPoll();
        clearInterval(state.quickWatchTimer);
        cancelAnimationFrame(state.subtitleRAF);
        clearTimeout(state.holdTimer);
        disposePageLifecycle();
    }, { once: true });
    } catch (error) {
        console.error('[av-helper] 初始化失败:', error && error.message ? error.message : error);
    }
})();
