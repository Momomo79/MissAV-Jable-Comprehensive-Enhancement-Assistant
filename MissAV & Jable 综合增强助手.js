// ==UserScript==
// @name         MissAV & Jable 综合增强助手
// @namespace    http://tampermonkey.net/
// @version      6.0
// @description  PC端专用、广告清理、SRT字幕加载/偏移/字号高度、偏移按视频记忆、临时加速、快进倒退、区间循环、可拖拽可隐藏UI、实时日志
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
// @run-at       document-start
// @noframes
// @license      MIT
// ==/UserScript==
(function () {
    'use strict';
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
    const settings = {
        accelerationRate: store.getNumber('accelerationRate', 3, SPEED_MIN, SPEED_MAX),
        skipTime: store.getNumber('skipTime', 5, SKIP_MIN, SKIP_MAX),
        subtitleOffset: store.getNumber('subtitleOffset', 0, OFFSET_MIN, OFFSET_MAX),
        subtitleFontSize: store.getNumber('subtitleFontSize', 24, FONT_SIZE_MIN, FONT_SIZE_MAX),
        subtitleBottom: store.getNumber('subtitleBottom', 10, SUBTITLE_BOTTOM_MIN, SUBTITLE_BOTTOM_MAX),
        panelX: store.getNumber('panelX', 20, 0, 99999),
        panelY: store.getNumber('panelY', 100, 0, 99999),
        isMinimized: store.getBool('isMinimized'),
        opacity: store.getNumber('opacity', 0.3, 0, 1),
        blur: store.getNumber('blur', 1, 0, 20),
        hoverOpacity: store.getNumber('hoverOpacity', 0.9, 0, 1),
        hoverBlur: store.getNumber('hoverBlur', 1, 0, 20),
        keys: {
            accelerate: store.getKeyName('keyAccelerate', 'z'),
            forward: store.getKeyName('keyForward', 'x'),
            backward: store.getKeyName('keyBackward', 'c')
        }
    };
    const offsetKeyFor = videoID => (videoID ? `offset:${videoID}` : '');
    function loadOffsetForVideo(videoID) {
        const fallback = store.getNumber('subtitleOffset', 0, OFFSET_MIN, OFFSET_MAX);
        if (!videoID) return fallback;
        const parsed = Number.parseFloat(store.get(offsetKeyFor(videoID)));
        return Number.isFinite(parsed) ? clamp(parsed, OFFSET_MIN, OFFSET_MAX) : fallback;
    }
    function saveOffsetForVideo(videoID, offset) {
        store.set('subtitleOffset', offset);
        if (videoID) store.set(offsetKeyFor(videoID), offset);
    }
    function forgetOffsetForVideo(videoID) {
        if (!videoID) return false;
        if (store.get(offsetKeyFor(videoID)) === null) return false;
        store.remove(offsetKeyFor(videoID));
        return true;
    }
    function persistSettings() {
        store.set('accelerationRate', settings.accelerationRate);
        store.set('skipTime', settings.skipTime);
        store.set('subtitleOffset', settings.subtitleOffset);
        store.set('subtitleFontSize', settings.subtitleFontSize);
        store.set('subtitleBottom', settings.subtitleBottom);
        store.set('keyAccelerate', settings.keys.accelerate);
        store.set('keyForward', settings.keys.forward);
        store.set('keyBackward', settings.keys.backward);
        store.set('opacity', settings.opacity);
        store.set('blur', settings.blur);
        store.set('hoverOpacity', settings.hoverOpacity);
        store.set('hoverBlur', settings.hoverBlur);
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
        videoID: null
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
        .panel-header { display: flex; justify-content: space-between; align-items: center; gap: 8px; padding: 8px 14px; background: rgba(0,0,0,.4); cursor: move; font-size: 14px; font-weight: 700; color: #f1f5f9; border-bottom: 1px solid rgba(255,255,255,.15); user-select: none; letter-spacing: .5px; }
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
        .slider-row-container { display: flex; flex-direction: column; gap: 8px; margin-top: 12px; padding-top: 10px; border-top: 1px solid rgba(255,255,255,.15); max-height: 200px; opacity: 1; overflow: hidden; transition: max-height .3s ease, opacity .3s ease, margin .3s ease, padding .3s ease; }
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
        .subtitle-picker { position: fixed; left: 15px; bottom: 175px; z-index: 10001; min-width: 320px; max-height: 280px; overflow-y: auto; padding: 12px; border-radius: 12px; background: rgba(20,22,30,.92); color: #fff; font: 13px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Microsoft YaHei",sans-serif; backdrop-filter: blur(6px); box-shadow: 0 12px 32px rgba(0,0,0,.5); }
        .subtitle-picker-header { display: flex; justify-content: space-between; align-items: center; gap: 10px; padding-bottom: 6px; }
        .subtitle-picker-title { color: #60a5fa; font-weight: 700; }
        .subtitle-picker-close { cursor: pointer; color: #94a3b8; }
        .subtitle-picker-close:hover { color: #fff; }
        .subtitle-picker-row { padding: 8px; margin-top: 5px; border-bottom: 1px solid rgba(255,255,255,.1); cursor: pointer; word-break: break-all; }
        .subtitle-picker-row:hover { background: rgba(96,165,250,.16); }
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
    function createButton(text, className = '') {
        const button = document.createElement('button');
        button.type = 'button';
        button.textContent = text;
        if (className) button.className = className;
        return button;
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
    function makeDraggable(element, handle) {
        let originX = 0;
        let originY = 0;
        let startX = 0;
        let startY = 0;
        const onMove = event => {
            event.preventDefault();
            const maxX = Math.max(0, window.innerWidth - element.offsetWidth);
            const maxY = Math.max(0, window.innerHeight - element.offsetHeight);
            element.style.left = `${clamp(originX + event.clientX - startX, 0, maxX)}px`;
            element.style.top = `${clamp(originY + event.clientY - startY, 0, maxY)}px`;
        };
        const onUp = () => {
            document.removeEventListener('mousemove', onMove);
            document.removeEventListener('mouseup', onUp);
            store.set('panelX', element.offsetLeft);
            store.set('panelY', element.offsetTop);
        };
        handle.addEventListener('mousedown', event => {
            if (event.button !== 0) return;
            event.preventDefault();
            originX = element.offsetLeft;
            originY = element.offsetTop;
            startX = event.clientX;
            startY = event.clientY;
            document.addEventListener('mousemove', onMove);
            document.addEventListener('mouseup', onUp);
        });
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
        const btnForget = createButton('重置本片偏移', 'btn-danger');
        btnSave.style.gridColumn = 'span 2';
        btnLocal.addEventListener('click', () => fileInput.click());
        btnWeb.addEventListener('click', searchSubtitleWeb);
        btnAPI.addEventListener('click', searchSubtitleAPI);
        btnClear.addEventListener('click', clearSubtitles);
        btnForget.addEventListener('click', () => {
            const hadRecord = forgetOffsetForVideo(state.videoID);
            if (!state.videoID) {
                log('⚠️ 无法识别视频ID，仅重置本次偏移');
            } else if (hadRecord) {
                log(`🧹 已清除 ${state.videoID} 的专属偏移`);
            } else {
                log(`ℹ️ ${state.videoID} 没有保存过专属偏移`);
            }
            settings.subtitleOffset = 0;
            state.cueCursor = -1;
            store.set('subtitleOffset', 0);
            if (state.videoID && hadRecord) store.remove(offsetKeyFor(state.videoID));
            renderSubtitle(true);
            offsetInput.value = 0;
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
        actionRow.append(btnLocal, btnWeb, btnAPI, btnClear, btnForget, btnSave);
        const sliderRow = document.createElement('div');
        sliderRow.className = 'slider-row-container';
        sliderRow.hidden = true;
        const applyUiStyles = () => {
            if (!state.panel) return;
            state.panel.style.setProperty('--ui-bg-opacity', settings.opacity);
            state.panel.style.setProperty('--ui-blur', `${settings.blur}px`);
            state.panel.style.setProperty('--ui-hover-opacity', settings.hoverOpacity);
            state.panel.style.setProperty('--ui-hover-blur', `${settings.hoverBlur}px`);
        };
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
        document.body.appendChild(panel);
        applyUiStyles();
        makeDraggable(panel, header);
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
    function setupDoubleClickSeek() {
        const video = state.video;
        if (!video || video.dataset.quickSeekBound === '1') return;
        video.dataset.quickSeekBound = '1';
        video.addEventListener('dblclick', event => {
            const rect = video.getBoundingClientRect();
            if (!rect.width) return;
            const isBackward = event.clientX - rect.left < rect.width / 2;
            seek(isBackward ? -10 : 10);
            log(isBackward ? '⏪ 双击：-10 秒' : '⏩ 双击：+10 秒');
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
        saveOffsetForVideo(state.videoID, offset);
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
        log(`✅ ${label}加载成功：${items.length} 条${fileName && fileName !== label ? `（${fileName}）` : ''}`);
        return true;
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
    async function loadRemoteSubtitle(url, name = '') {
        if (state.subtitleLoading) {
            log('⏳ 正有字幕在下载中，请稍候');
            return;
        }
        state.subtitleLoading = true;
        log(`⬇️ 正在下载字幕${name ? `：${name}` : ''}…`);
        try {
            const payload = await gmRequest(url, { timeout: 20000, binary: true });
            const text = decodeSubtitleBuffer(payload);
            if (applySubtitleText(text, '字幕')) {
                closeSubtitlePicker();
            }
        } catch (error) {
            const host = (() => {
                try {
                    return new URL(url).host;
                } catch (_) {
                    return '';
                }
            })();
            log(`❌ 下载失败: ${error.message}${host ? ` (${host})` : ''}`);
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
        document.body.appendChild(list);
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
        state.videoID = getCurrentVideoID();
        settings.subtitleOffset = loadOffsetForVideo(state.videoID);
        state.subtitleEl = document.createElement('div');
        state.subtitleEl.className = 'custom-subtitle';
        state.subtitleEl.style.display = 'none';
        container.appendChild(state.subtitleEl);
        applySubtitleStyle();
        createPanel();
        createQuickControls();
        setupShortcuts();
        setupDoubleClickSeek();
        for (const type of ['play', 'pause', 'ended', 'loadedmetadata', 'ratechange', 'seeked']) {
            video.addEventListener(type, updatePlayPauseButton, { passive: true });
        }
        video.addEventListener('loadedmetadata', () => renderSubtitle(true), { passive: true });
        startSubtitleLoop();
        updatePlayPauseButton();
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
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initPage, { once: true });
    } else {
        initPage();
    }
    window.addEventListener('beforeunload', () => {
        state.adObserver?.disconnect();
        stopPlayerPoll();
        cancelAnimationFrame(state.subtitleRAF);
    }, { once: true });
})();
