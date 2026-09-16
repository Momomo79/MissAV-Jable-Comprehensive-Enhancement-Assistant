// ==UserScript==
// @name         MissAV & Jable 综合增强助手
// @namespace    http://tampermonkey.net/
// @version      5.0
// @description  PC端专用、可拖拽可隐藏式UI、广告清理、强大字幕加载、倍速与快进、便捷快捷键、实时日志栏、快捷控制栏
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
// @license      MIT
// @run-at       document-start
// ==/UserScript==

(function () {
    'use strict';

    const STORAGE = 'avSub_';
    const IS_JABLE = location.hostname.includes('jable');

    const PLAYER_POLL_INTERVAL = 500;
    const PLAYER_POLL_TIMEOUT = 12000;
    const ADS_CLEAN_DELAY = 500;
    const QUICK_HIDE_DELAY = 2200;
    const QUICK_LEAVE_DELAY = 800;
    const MIN_PLAYER_WIDTH = 520;
    const MIN_PLAYER_HEIGHT = 280;
    const REPEAT_SEEK_INTERVAL = 120;

    const JUMP_PRESETS = {
        back: [
            { label: '10m', seconds: 600 },
            { label: '5m', seconds: 300 },
            { label: '1m', seconds: 60 },
            { label: '10s', seconds: 10 }
        ],
        forward: [
            { label: '10s', seconds: 10 },
            { label: '1m', seconds: 60 },
            { label: '5m', seconds: 300 },
            { label: '10m', seconds: 600 }
        ]
    };

    const LOOP_PRESETS = [
        { text: '5秒循环', seconds: 5 },
        { text: '10秒循环', seconds: 10 },
        { text: '1分钟循环', seconds: 60 }
    ];

    const AD_SELECTORS = [
        'div[class^="root"]',
        'div[class*="fixed"][class*="right-"][class*="bottom-"]',
        'iframe'
    ].join(',');

    const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
    const pad2 = value => String(value).padStart(2, '0');
    const isEditableTarget = target => Boolean(target?.matches?.('input,textarea,select,[contenteditable="true"]'));

    function readNumber(key, fallback, min, max) {
        const value = Number.parseFloat(localStorage.getItem(STORAGE + key));
        return Number.isFinite(value) ? clamp(value, min, max) : fallback;
    }

    function readString(key, fallback) {
        const value = localStorage.getItem(STORAGE + key);
        return value ? value.toLowerCase().trim() : fallback;
    }

    function writeSetting(key, value) {
        localStorage.setItem(STORAGE + key, String(value));
    }

    function throttle(fn, delay) {
        let timer = 0;
        let lastArgs = null;
        return (...args) => {
            lastArgs = args;
            if (timer) return;
            timer = setTimeout(() => {
                timer = 0;
                fn(...lastArgs);
                lastArgs = null;
            }, delay);
        };
    }

    const settings = {
        accelerationRate: readNumber('accRate', 3, 0.1, 16),
        skipTime: readNumber('skipTime', 5, 1, 600),
        subtitleOffset: readNumber('offset', 0, -30, 30),
        shortcutKeys: {
            accelerate: readString('keyAcc', 'z'),
            forward: readString('keyFwd', 'x'),
            backward: readString('keyBwd', 'c')
        },
        panelX: readNumber('panelX', 20, 0, 9999),
        panelY: readNumber('panelY', 100, 0, 9999),
        isMinimized: localStorage.getItem(STORAGE + 'minimized') === 'true',
        opacity: readNumber('opacity', 0.3, 0, 1),
        blur: readNumber('blur', 1, 0, 20),
        hoverOpacity: readNumber('hoverOpacity', 0.9, 0, 1),
        hoverBlur: readNumber('hoverBlur', 1, 0, 20)
    };

    const state = {
        player: null,
        videoElement: null,
        videoContainer: null,
        subtitleElement: null,
        subtitleList: null,
        controlPanel: null,
        quickControls: null,
        logElement: null,
        playPauseButton: null,
        loopBtn: null,
        loopMenu: null,

        subtitles: [],
        originalSubtitleText: '',
        activeSubText: '',
        currentSubIndex: -1,
        subtitleLoading: false,

        acceleratePressed: false,
        speedBeforeAccelerate: 1,
        seekRepeatAt: 0,
        playerReady: false,
        playerPollTimer: 0,
        subtitleRAF: 0,
        quickHideTimer: 0,

        loopActive: false,
        loopStart: 0,
        loopDuration: 5
    };

    if (/^https:\/\/(missav|thisav)\.com/.test(location.href)) {
        location.replace(location.href.replace('missav.com', 'missav.live').replace('thisav.com', 'missav.live'));
        return;
    }

    const blockWindowOpen = target => {
        if (!target) return;
        try { target.open = function () {}; } catch (_) {}
    };

    blockWindowOpen(typeof unsafeWindow !== 'undefined' ? unsafeWindow : window);

    function blockFramePopups() {
        for (const frame of document.querySelectorAll('iframe')) blockWindowOpen(frame.contentWindow);
    }

    function showLog(message) {
        const logElement = state.logElement;
        if (!logElement) return;

        const now = new Date();
        const time = `[${pad2(now.getHours())}:${pad2(now.getMinutes())}:${pad2(now.getSeconds())}]`;

        const entry = document.createElement('div');
        entry.className = 'log-entry';

        const timeSpan = document.createElement('span');
        timeSpan.className = 'log-time';
        timeSpan.textContent = time;

        const messageSpan = document.createElement('span');
        messageSpan.textContent = message;

        entry.append(timeSpan, messageSpan);
        logElement.appendChild(entry);
        logElement.scrollTop = logElement.scrollHeight;
    }

    GM_addStyle(`
        .custom-control-panel,
        .custom-control-panel * { box-sizing: border-box; }
        .custom-control-panel {
            --ui-bg-opacity: 0.3;
            --ui-blur: 1px;
            --ui-hover-opacity: 0.9;
            --ui-hover-blur: 1px;
            position: fixed;
            z-index: 99999;
            width: 310px;
            border: 1px solid rgba(255,255,255,.18);
            border-radius: 12px;
            background: rgba(28,28,34, var(--ui-bg-opacity));
            backdrop-filter: blur(var(--ui-blur)) saturate(200%);
            -webkit-backdrop-filter: blur(var(--ui-blur)) saturate(200%);
            box-shadow: inset 0 1px 0 rgba(255,255,255,.2), 0 12px 34px rgba(0,0,0,.45);
            color: #f8fafc;
            font-family: -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;
            -webkit-font-smoothing: antialiased;
            -moz-osx-font-smoothing: grayscale;
            text-shadow: 0 1px 2px rgba(0,0,0,0.6);
            transition: background .2s ease, box-shadow .2s ease;
            overflow: hidden;
        }
        .custom-control-panel:hover,
        .custom-control-panel:focus-within {
            background: rgba(28,28,34, var(--ui-hover-opacity));
            backdrop-filter: blur(var(--ui-hover-blur)) saturate(200%);
            -webkit-backdrop-filter: blur(var(--ui-hover-blur)) saturate(200%);
            box-shadow: inset 0 1px 0 rgba(255,255,255,.25), 0 14px 38px rgba(0,0,0,.55);
        }
        .panel-header { display: flex; justify-content: space-between; align-items: center; padding: 8px 14px; background: rgba(0,0,0,0.4); cursor: move; font-size: 14px; font-weight: 700; color: #f1f5f9; border-bottom: 1px solid rgba(255,255,255,.15); user-select: none; letter-spacing: 0.5px; }
        .panel-header:hover { color: #ffffff; }
        .panel-header-btn { cursor: pointer; padding: 0 4px; font-size: 14px; text-shadow: none; }
        .panel-body { padding: 12px 14px; }
        .panel-row { display: flex !important; flex-wrap: wrap !important; justify-content: space-between !important; gap: 8px 0 !important; margin: 0 0 10px 0 !important; width: 100% !important; }
        .input-group { display: inline-flex !important; align-items: center !important; justify-content: space-between !important; width: 48% !important; margin: 0 !important; color: #e2e8f0 !important; font-size: 13px !important; font-weight: 600 !important; white-space: nowrap !important; letter-spacing: 0.3px; }
        .custom-control-panel input[type="number"]::-webkit-outer-spin-button,
        .custom-control-panel input[type="number"]::-webkit-inner-spin-button { -webkit-appearance:none; margin:0; }
        .custom-control-panel input[type="number"] { -moz-appearance:textfield; }
        .custom-control-panel input[type="text"],
        .custom-control-panel input[type="number"] { width: 50px; height: 26px; padding: 0 4px; border: 1px solid rgba(255,255,255,.30); border-radius: 6px; outline: none; background: rgba(255,255,255,.15); color: #ffffff; font-size: 13px; font-weight: 700; text-align: center; text-shadow: none; transition: border-color .2s; }
        .custom-control-panel input:focus { border-color: #60a5fa; background: rgba(255,255,255,.2); }
        .btn-group { display: grid !important; grid-template-columns: repeat(2, minmax(0, 1fr)) !important; gap: 8px !important; width: 100% !important; }
        .btn-group button { width: 100%; min-height: 30px; padding: 5px; border: 1px solid rgba(255,255,255,.25); border-radius: 6px; background: rgba(255,255,255,.12); color: #f8fafc; cursor: pointer; font-size: 13px; font-weight: 600; letter-spacing: 0.5px; text-shadow: 0 1px 2px rgba(0,0,0,0.4); transition: all .2s ease; }
        .btn-group button:hover { background: rgba(255,255,255,.25); }
        .btn-group button.btn-primary { background: linear-gradient(135deg, #3b82f6, #2563eb); border: 1px solid rgba(59,130,246,0.5); }
        .btn-group button.btn-danger { background: rgba(239,68,68,.25); color: #fecaca; border-color: rgba(239,68,68,.4); }
        .panel-status-log { margin-top: 12px; padding: 8px; border: 1px solid rgba(255,255,255,.15); border-radius: 6px; background: rgba(0,0,0,.3); color: #bae6fd; font-size: 11px; font-weight: 500; text-align: left; letter-spacing: 0.5px; height: 90px; overflow-y: auto; display: flex; flex-direction: column; gap: 4px; text-shadow: none; }
        .panel-status-log::-webkit-scrollbar { width: 4px; }
        .panel-status-log::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.3); border-radius: 2px; }
        .log-entry { display: flex; align-items: flex-start; word-break: break-all; }
        .log-time { color: #94a3b8; margin-right: 6px; font-family: monospace; flex-shrink: 0; }
        .custom-quick-controls { position: absolute; left: 50%; bottom: 48px; transform: translateX(-50%); z-index: 9990; display: inline-flex; align-items: center; gap: 6px; padding: 8px 10px; border: 1px solid rgba(255,255,255,.20); border-radius: 24px; background: rgba(14,17,24,.2); backdrop-filter: blur(4px); opacity: 0; visibility: hidden; pointer-events: none; transition: opacity .22s ease; }
        .custom-quick-controls.quick-visible, .custom-quick-controls:hover { opacity: 1; visibility: visible; pointer-events: auto; }
        .quick-jump-group { display: flex; align-items: center; gap: 2px; }
        .quick-btn { min-width: 52px; height: 34px; border: 0; border-radius: 8px; background: transparent; color: rgba(255,255,255,.92); cursor: pointer; font-size: 14px; font-weight: 600; display: inline-flex; align-items: center; justify-content: center; }
        .quick-btn:hover { background: rgba(255,255,255,.12); color:#fff; }
        .quick-play-btn { min-width: 80px; margin: 0 6px; background: #476a9f !important; border-radius: 17px; }
        .quick-divider { width: 1px; height: 18px; background: rgba(255,255,255,.12); margin: 0 4px; }
        .custom-subtitle { position: absolute; left: 50%; bottom: 110px; z-index: 10000; max-width: 85%; transform: translateX(-50%); color:#fff; font-size: 24px; font-weight: 700; text-shadow: -1px -1px 0 #000,1px -1px 0 #000,-1px 1px 0 #000,1px 1px 0 #000,2px 2px 4px rgba(0,0,0,.8); pointer-events:none; }
        
        .slider-row-container { display: flex; flex-direction: column; gap: 8px 0; margin-top: 12px; padding-top: 10px; border-top: 1px solid rgba(255,255,255,.15); width: 100%; transition: max-height 0.3s ease, opacity 0.3s ease, margin 0.3s ease, padding 0.3s ease; max-height: 200px; opacity: 1; overflow: hidden; }
        .slider-row-container.hidden { max-height: 0; opacity: 0; margin-top: 0; padding-top: 0; border-top-color: transparent; }
        .slider-group { display: inline-flex; align-items: center; justify-content: space-between; width: 100%; margin: 0; color: #e2e8f0; font-size: 12px; font-weight: 600; }
        .slider-group label { width: 65px; flex-shrink: 0; white-space: nowrap; }
        .slider-group input[type="range"] { flex: 1; margin: 0 8px; cursor: pointer; accent-color: #3b82f6; height: 4px; border-radius: 2px; }
        .slider-value { width: 26px; text-align: right; font-family: monospace; font-size: 11px; flex-shrink: 0; }

        .quick-loop-wrapper { position: relative; display: inline-flex; align-items: center; }
        .quick-loop-btn { min-width: 36px !important; height: 34px !important; padding: 0 !important; display: inline-flex !important; flex-direction: column !important; align-items: center !important; justify-content: center !important; line-height: 1.0 !important; font-size: 12px !important; }
        .quick-loop-btn span { display: block; }
        .quick-loop-btn.active { background: rgba(59,130,246,0.4) !important; color: #60a5fa !important; }
        .loop-menu { position: absolute; bottom: 44px; left: 50%; transform: translateX(-50%); background: rgba(20,22,30,0.95); border: 1px solid rgba(255,255,255,0.2); border-radius: 8px; padding: 6px; display: none; flex-direction: column; gap: 4px; z-index: 9991; white-space: nowrap; backdrop-filter: blur(6px); box-shadow: 0 8px 24px rgba(0,0,0,0.5); }
        .loop-menu.show { display: flex; }
        .loop-menu-btn { background: transparent; border: 0; color: #fff; padding: 6px 12px; text-align: left; border-radius: 4px; cursor: pointer; font-size: 12px; font-weight: 600; }
        .loop-menu-btn:hover { background: rgba(255,255,255,0.15); color: #60a5fa; }
    `);

    const getCurrentTime = () => state.videoElement?.currentTime ?? 0;
    const isPaused = () => !state.videoElement || state.videoElement.paused;

    function seek(seconds) {
        const video = state.videoElement;
        if (!video) return;
        const duration = Number.isFinite(video.duration) ? video.duration : Infinity;
        video.currentTime = clamp(video.currentTime + seconds, 0, duration);
    }

    function updatePlayPauseButton() {
        const button = state.playPauseButton;
        if (button) button.textContent = isPaused() ? '▶ 播放' : '⏸ 暂停';
    }

    async function togglePlayPause() {
        const video = state.videoElement;
        if (!video) return;
        try {
            if (video.paused) {
                await video.play();
                showLog('▶️ 开始播放');
            } else {
                video.pause();
                showLog('⏸️ 已暂停');
            }
        } catch (_) {
            showLog('❌ 播放失败');
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

    function createInputGroup(labelText, type, value, onInput, min, max, step) {
        const group = document.createElement('div');
        group.className = 'input-group';

        const label = document.createElement('label');
        label.textContent = labelText;

        const input = document.createElement('input');
        input.type = type;
        input.value = value;
        if (min !== undefined) input.min = min;
        if (max !== undefined) input.max = max;
        if (step !== undefined) input.step = step;
        input.addEventListener('input', onInput);

        group.append(label, input);
        return group;
    }

    function makeDraggable(element, handle) {
        let originX = 0;
        let originY = 0;
        let startX = 0;
        let startY = 0;

        const onMouseMove = event => {
            event.preventDefault();
            element.style.left = `${originX + event.clientX - startX}px`;
            element.style.top = `${originY + event.clientY - startY}px`;
        };

        const onMouseUp = () => {
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
            writeSetting('panelX', element.offsetLeft);
            writeSetting('panelY', element.offsetTop);
        };

        handle.addEventListener('mousedown', event => {
            event.preventDefault();
            originX = element.offsetLeft;
            originY = element.offsetTop;
            startX = event.clientX;
            startY = event.clientY;
            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
        });
    }

    function createControlPanel() {
        if (state.controlPanel || document.querySelector('.custom-control-panel')) return;

        const panel = document.createElement('div');
        panel.className = 'custom-control-panel';
        panel.style.left = `${clamp(settings.panelX, 0, window.innerWidth - 320)}px`;
        panel.style.top = `${clamp(settings.panelY, 0, window.innerHeight - 50)}px`;
        state.controlPanel = panel;

        const header = document.createElement('div');
        header.className = 'panel-header';

        const titleSpan = document.createElement('span');
        titleSpan.textContent = '⚙️ 增强助手 (拖拽移动)';

        const minimizeButton = document.createElement('span');
        minimizeButton.className = 'panel-header-btn';
        minimizeButton.textContent = settings.isMinimized ? '➕' : '➖';

        header.append(titleSpan, minimizeButton);

        const body = document.createElement('div');
        body.className = 'panel-body';
        body.style.display = settings.isMinimized ? 'none' : 'block';

        minimizeButton.onclick = () => {
            settings.isMinimized = !settings.isMinimized;
            body.style.display = settings.isMinimized ? 'none' : 'block';
            minimizeButton.textContent = settings.isMinimized ? '➕' : '➖';
            writeSetting('minimized', settings.isMinimized);
        };

        const row1 = document.createElement('div');
        row1.className = 'panel-row';
        row1.append(
            createInputGroup('加速键:', 'text', settings.shortcutKeys.accelerate, event => {
                settings.shortcutKeys.accelerate = normalizeKey(event.target.value, 'z');
            }),
            createInputGroup('快进键:', 'text', settings.shortcutKeys.forward, event => {
                settings.shortcutKeys.forward = normalizeKey(event.target.value, 'x');
            }),
            createInputGroup('倒退键:', 'text', settings.shortcutKeys.backward, event => {
                settings.shortcutKeys.backward = normalizeKey(event.target.value, 'c');
            }),
            createInputGroup('加速倍数:', 'number', settings.accelerationRate, event => {
                settings.accelerationRate = clamp(Number.parseFloat(event.target.value) || 1, 0.1, 16);
            }, 0.1, 16, 0.1),
            createInputGroup('快进(秒):', 'number', settings.skipTime, event => {
                settings.skipTime = clamp(Number.parseFloat(event.target.value) || 5, 1, 600);
            }, 1, 600, 1),
            createInputGroup('字幕偏移:', 'number', settings.subtitleOffset, async event => {
                settings.subtitleOffset = clamp(Number.parseFloat(event.target.value) || 0, -30, 30);
                if (state.originalSubtitleText) {
                    state.subtitles = await parseSRT(state.originalSubtitleText);
                    updateSubtitle(true);
                }
            }, -30, 30, 0.1)
        );

        const row3 = document.createElement('div');
        row3.className = 'btn-group';

        const subtitleInput = document.createElement('input');
        subtitleInput.type = 'file';
        subtitleInput.accept = '.srt';
        subtitleInput.style.display = 'none';
        document.documentElement.appendChild(subtitleInput);

        const btnLoadLocal = createButton('加载本地');
        btnLoadLocal.onclick = () => subtitleInput.click();

        const btnSearchWeb = createButton('网页搜字幕');
        btnSearchWeb.onclick = searchSubtitleWeb;

        const btnSearchAPI = createButton('API搜字幕');
        btnSearchAPI.onclick = searchSubtitleAPI;

        const btnClear = createButton('清除字幕', 'btn-danger');
        btnClear.onclick = clearSubtitles;

        const btnSave = createButton('保存设置', 'btn-primary');
        btnSave.style.gridColumn = 'span 2';
        btnSave.onclick = () => {
            saveSettings();
            showLog('💾 设置已保存');
        };

        subtitleInput.addEventListener('change', async event => {
            const file = event.target.files?.[0];
            if (!file) return;
            try {
                const text = await file.text();
                state.originalSubtitleText = text;
                state.subtitles = await parseSRT(text);
                updateSubtitle(true);
                showLog(`✅ 本地字幕加载成功：${state.subtitles.length} 条`);
            } catch (_) {
                showLog('❌ 字幕读取失败');
            } finally {
                event.target.value = '';
            }
        });

        row3.append(btnLoadLocal, btnSearchWeb, btnSearchAPI, btnClear, btnSave);

        const sliderRow = document.createElement('div');
        sliderRow.className = 'slider-row-container hidden';

        function applyUiStyles() {
            if (!state.controlPanel) return;
            state.controlPanel.style.setProperty('--ui-bg-opacity', settings.opacity);
            state.controlPanel.style.setProperty('--ui-blur', `${settings.blur}px`);
            state.controlPanel.style.setProperty('--ui-hover-opacity', settings.hoverOpacity);
            state.controlPanel.style.setProperty('--ui-hover-blur', `${settings.hoverBlur}px`);
        }

        function createSlider(labelText, key, min, max, step) {
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
            valueLabel.textContent = settings[key];

            slider.addEventListener('input', event => {
                settings[key] = Number.parseFloat(event.target.value);
                valueLabel.textContent = settings[key];
                applyUiStyles();
            });

            group.append(label, slider, valueLabel);
            return group;
        }

        sliderRow.append(
            createSlider('常规透明', 'opacity', 0, 1, 0.05),
            createSlider('常规磨砂', 'blur', 0, 20, 1),
            createSlider('悬浮透明', 'hoverOpacity', 0, 1, 0.05),
            createSlider('悬浮磨砂', 'hoverBlur', 0, 20, 1)
        );

        const toggleSliderButton = createButton('👁 隐藏/显示透明UI设置', 'btn-primary');
        toggleSliderButton.style.width = '100%';
        toggleSliderButton.style.marginTop = '12px';
        toggleSliderButton.style.marginBottom = '2px';
        toggleSliderButton.onclick = () => sliderRow.classList.toggle('hidden');

        state.logElement = document.createElement('div');
        state.logElement.className = 'panel-status-log';

        body.append(row1, row3, toggleSliderButton, sliderRow, state.logElement);
        panel.append(header, body);

        document.body.appendChild(panel);

        applyUiStyles();
        makeDraggable(panel, header);
        showLog('▶️ 系统初始化完成');
    }

    const isLoopMenuOpen = () => Boolean(state.loopMenu?.classList.contains('show'));

    function showQuickControls() {
        const controls = state.quickControls;
        if (!controls) return;
        controls.classList.add('quick-visible');
        clearTimeout(state.quickHideTimer);
        state.quickHideTimer = setTimeout(() => {
            if (!controls.matches(':hover') && !controls.contains(document.activeElement) && !isLoopMenuOpen()) {
                controls.classList.remove('quick-visible');
            }
        }, QUICK_HIDE_DELAY);
    }

    function hideQuickControls() {
        const controls = state.quickControls;
        if (!controls || isLoopMenuOpen()) return;
        clearTimeout(state.quickHideTimer);
        controls.classList.remove('quick-visible');
    }

    function setupQuickControlsAutoHide() {
        const container = state.videoContainer;
        const controls = state.quickControls;
        if (!container || container.dataset.quickAutohide === '1') return;

        container.dataset.quickAutohide = '1';
        container.addEventListener('mousemove', showQuickControls);
        container.addEventListener('mouseleave', hideQuickControls);
        container.addEventListener('click', showQuickControls);

        if (!controls) return;
        controls.addEventListener('mouseenter', () => {
            clearTimeout(state.quickHideTimer);
            controls.classList.add('quick-visible');
        });
        controls.addEventListener('mouseleave', () => {
            if (!isLoopMenuOpen()) state.quickHideTimer = setTimeout(hideQuickControls, QUICK_LEAVE_DELAY);
        });
    }

    const formatLoopSpan = seconds => (seconds >= 60 ? `${seconds / 60}m` : `${seconds}s`);
    const formatLoopSpanText = seconds => (seconds >= 60 ? `${seconds / 60}分钟` : `${seconds}秒`);

    function startLoop(seconds) {
        if (!state.videoElement) return;
        state.loopStart = state.videoElement.currentTime;
        state.loopDuration = seconds;
        state.loopActive = true;
        state.loopBtn?.classList.add('active');
        state.loopBtn.innerHTML = `<span>循</span><span>${formatLoopSpan(seconds)}</span>`;
        state.loopMenu?.classList.remove('show');
        showLog(`🔂 已开启区间循环：从当前起 ${formatLoopSpanText(seconds)}`);
    }

    function stopLoop() {
        state.loopActive = false;
        state.loopBtn?.classList.remove('active');
        state.loopBtn.innerHTML = '<span>循</span><span>环</span>';
        state.loopMenu?.classList.remove('show');
        showLog('⏹️ 已关闭区间循环');
    }

    function createPlayerQuickControls() {
        const container = state.videoContainer;
        if (!container || container.querySelector('.custom-quick-controls')) return;

        const quickControls = document.createElement('div');
        quickControls.className = 'custom-quick-controls';
        state.quickControls = quickControls;

        const jumpGroup = document.createElement('div');
        jumpGroup.className = 'quick-jump-group';

        const appendJumpButton = ({ label, seconds }, direction) => {
            const delta = direction === 'back' ? -seconds : seconds;
            const button = createButton(direction === 'back' ? `‹ ${label}` : `${label} ›`, 'quick-btn');
            button.onclick = event => {
                event.stopPropagation();
                seek(delta);
                showLog(`${delta > 0 ? '⏩' : '⏪'} 跳转 ${Math.abs(delta)} 秒`);
            };
            jumpGroup.appendChild(button);
        };

        JUMP_PRESETS.back.forEach(item => appendJumpButton(item, 'back'));
        jumpGroup.appendChild(createDivider());

        state.playPauseButton = createButton('▶ 播放', 'quick-btn quick-play-btn');
        state.playPauseButton.onclick = event => {
            event.stopPropagation();
            togglePlayPause();
        };
        jumpGroup.appendChild(state.playPauseButton);

        jumpGroup.appendChild(createDivider());
        JUMP_PRESETS.forward.forEach(item => appendJumpButton(item, 'forward'));
        jumpGroup.appendChild(createDivider());

        const loopWrapper = document.createElement('div');
        loopWrapper.className = 'quick-loop-wrapper';

        state.loopBtn = createButton('', 'quick-btn quick-loop-btn');
        state.loopBtn.innerHTML = '<span>循</span><span>环</span>';
        state.loopBtn.onclick = event => {
            event.stopPropagation();
            if (state.loopActive) stopLoop();
            else state.loopMenu.classList.toggle('show');
        };

        state.loopMenu = document.createElement('div');
        state.loopMenu.className = 'loop-menu';

        const addMenuOption = (text, onClick) => {
            const option = createButton(text, 'loop-menu-btn');
            option.onclick = event => {
                event.stopPropagation();
                onClick();
            };
            state.loopMenu.appendChild(option);
        };

        LOOP_PRESETS.forEach(({ text, seconds }) => addMenuOption(text, () => startLoop(seconds)));
        addMenuOption('自定义时间...', () => {
            const input = prompt('请输入自定义循环时间（秒）:', '15');
            const seconds = Number.parseFloat(input);
            if (Number.isFinite(seconds) && seconds > 0) startLoop(seconds);
            else if (input !== null) showLog('⚠️ 输入无效');
        });
        addMenuOption('关闭循环', () => stopLoop());

        loopWrapper.append(state.loopBtn, state.loopMenu);
        jumpGroup.appendChild(loopWrapper);

        document.addEventListener('click', event => {
            if (!loopWrapper.contains(event.target)) state.loopMenu.classList.remove('show');
        });

        quickControls.appendChild(jumpGroup);
        container.appendChild(quickControls);

        setupQuickControlsAutoHide();
        hideQuickControls();
    }

    function normalizeKey(value, fallback) {
        const key = String(value || '').trim().toLowerCase();
        return key.length ? key.slice(0, 1) : fallback;
    }

    function parseTime(timeString) {
        const parts = String(timeString || '').replace(',', '.').trim().split(':');
        if (parts.length !== 3) return Number.NaN;
        const [hours, minutes, seconds] = parts.map(Number.parseFloat);
        return [hours, minutes, seconds].every(Number.isFinite) ? hours * 3600 + minutes * 60 + seconds : Number.NaN;
    }

    async function parseSRT(text) {
        if (!text) return [];

        const result = [];
        for (const block of text.replace(/\r/g, '').split(/\n\s*\n+/)) {
            const lines = block.trim().split('\n');
            const timeIndex = lines.findIndex(line => line.includes('-->'));
            if (timeIndex === -1) continue;

            const [startRaw, endRaw] = lines[timeIndex].split('-->');
            if (!startRaw || !endRaw) continue;

            const start = parseTime(startRaw.trim()) + settings.subtitleOffset;
            const end = parseTime(endRaw.trim()) + settings.subtitleOffset;
            const content = lines.slice(timeIndex + 1).join('\n').replace(/<[^>]+>/g, '').trim();

            if (content && Number.isFinite(start) && Number.isFinite(end)) result.push({ start, end, text: content });
        }
        return result.sort((a, b) => a.start - b.start);
    }

    function clearSubtitles() {
        state.subtitles = [];
        state.originalSubtitleText = '';
        state.activeSubText = '';
        state.currentSubIndex = -1;

        if (state.subtitleElement) {
            state.subtitleElement.textContent = '';
            state.subtitleElement.style.display = 'none';
        }
        if (state.subtitleList) {
            state.subtitleList.remove();
            state.subtitleList = null;
        }
        showLog('🗑️ 字幕已清除');
    }

    function locateSubtitle(time) {
        const list = state.subtitles;
        const cached = list[state.currentSubIndex];
        if (cached && time >= cached.start && time <= cached.end) return cached;

        let low = 0;
        let high = list.length - 1;
        while (low <= high) {
            const mid = (low + high) >> 1;
            const item = list[mid];
            if (time < item.start) high = mid - 1;
            else if (time > item.end) low = mid + 1;
            else {
                state.currentSubIndex = mid;
                return item;
            }
        }
        return null;
    }

    function updateSubtitle(forceUpdate = false) {
        const video = state.videoElement;
        if (!video) return;

        if (state.loopActive) {
            const time = video.currentTime;
            if (time >= state.loopStart + state.loopDuration || time < state.loopStart) {
                video.currentTime = state.loopStart;
            }
        }

        if (!state.subtitles.length || !state.subtitleElement) return;

        const sub = locateSubtitle(getCurrentTime());
        const newText = sub ? sub.text : '';
        if (!forceUpdate && newText === state.activeSubText) return;

        state.activeSubText = newText;
        state.subtitleElement.textContent = newText;
        state.subtitleElement.style.display = newText ? 'block' : 'none';
    }

    function startSubtitleLoop() {
        cancelAnimationFrame(state.subtitleRAF);
        const tick = () => {
            updateSubtitle(false);
            state.subtitleRAF = requestAnimationFrame(tick);
        };
        state.subtitleRAF = requestAnimationFrame(tick);
    }

    function searchSubtitleWeb() {
        const id = getCurrentVideoID();
        if (!id) {
            showLog('⚠️ 无法识别视频ID');
            return;
        }
        showLog(`🌐 网页搜索: ${id}`);
        GM_openInTab(`https://subtitlecat.com/index.php?search=${encodeURIComponent(id)}`, { active: true });
    }

    function request(url, timeout, buffer = false) {
        return new Promise((resolve, reject) => {
            GM_xmlhttpRequest({
                method: 'GET',
                url,
                timeout,
                responseType: buffer ? 'arraybuffer' : undefined,
                onload: response => response.status === 200
                    ? resolve(buffer ? (response.response ?? response.responseText) : response.responseText)
                    : reject(new Error(`HTTP ${response.status}`)),
                onerror: () => reject(new Error('网络错误')),
                ontimeout: () => reject(new Error('请求超时'))
            });
        });
    }

    async function searchSubtitleAPI() {
        const id = getCurrentVideoID();
        if (!id) {
            showLog('⚠️ 无法获取ID');
            return;
        }
        showLog(`🔍 正在API搜索: ${id}`);
        try {
            const text = await request(`https://api-shoulei-ssl.xunlei.com/oracle/subtitle?name=${encodeURIComponent(id)}`, 10000);
            const validSubs = (JSON.parse(text)?.data || []).filter(item => item?.url && /\.srt(?:$|\?)/i.test(item.url));
            if (validSubs.length) {
                showLog(`✅ 找到 ${validSubs.length} 个字幕`);
                showSubtitleList(validSubs);
            } else {
                showLog('⚠️ 未找到匹配的SRT');
            }
        } catch (error) {
            showLog(`❌ API错误: ${error.message}`);
        }
    }

    function decodeSubtitleText(payload) {
        if (!(payload instanceof ArrayBuffer)) return String(payload ?? '');
        const bytes = new Uint8Array(payload);
        try {
            return new TextDecoder('utf-8', { fatal: true }).decode(bytes).replace(/^\uFEFF/, '');
        } catch (_) {}
        try {
            return new TextDecoder('gb18030').decode(bytes).replace(/^\uFEFF/, '');
        } catch (_) {
            return new TextDecoder('utf-8').decode(bytes).replace(/^\uFEFF/, '');
        }
    }

    async function loadRemoteSubtitle(url, name = '') {
        if (state.subtitleLoading) {
            showLog('⏳ 正有字幕在下载中，请稍候');
            return;
        }
        state.subtitleLoading = true;
        showLog(`⬇️ 正在下载字幕${name ? `：${name}` : ''}...`);
        try {
            const payload = await request(url, 20000, true);
            const text = decodeSubtitleText(payload);
            const parsed = await parseSRT(text);
            if (!parsed.length) {
                showLog('⚠️ 该文件不是有效字幕（解析结果为空）');
                return;
            }
            state.originalSubtitleText = text;
            state.subtitles = parsed;
            state.currentSubIndex = -1;
            state.activeSubText = '';
            state.subtitleList?.remove();
            state.subtitleList = null;
            updateSubtitle(true);
            showLog(`✅ 字幕加载成功：${parsed.length} 条`);
        } catch (error) {
            const host = (() => { try { return new URL(url).host; } catch (_) { return ''; } })();
            showLog(`❌ 下载失败: ${error.message}${host ? ` (${host})` : ''}`);
        } finally {
            state.subtitleLoading = false;
        }
    }

    function showSubtitleList(items) {
        state.subtitleList?.remove();
        const list = document.createElement('div');
        list.style.cssText = 'position:fixed;left:15px;bottom:175px;z-index:10001;min-width:320px;max-height:280px;overflow-y:auto;padding:12px;border-radius:12px;background:rgba(20,22,30,.92);color:#fff;';

        const header = document.createElement('div');
        const title = document.createElement('span');
        title.style.cssText = 'color:#60a5fa;font-weight:bold;';
        title.textContent = `选择字幕 (${items.length})`;

        const closeButton = document.createElement('span');
        closeButton.style.cssText = 'cursor:pointer;color:#94a3b8;float:right;';
        closeButton.textContent = '[关闭]';
        closeButton.onclick = () => {
            list.remove();
            state.subtitleList = null;
        };

        header.append(title, closeButton);
        list.appendChild(header);

        items.forEach(item => {
            const row = document.createElement('div');
            row.style.cssText = 'padding:8px;margin-top:5px;border-bottom:1px solid rgba(255,255,255,.1);cursor:pointer;font-size:13px;';
            row.textContent = `📄 ${item.name}`;
            row.onclick = () => loadRemoteSubtitle(item.url, item.name);
            list.appendChild(row);
        });

        state.subtitleList = list;
        document.body.appendChild(list);
    }

    function saveSettings() {
        writeSetting('accRate', settings.accelerationRate);
        writeSetting('skipTime', settings.skipTime);
        writeSetting('offset', settings.subtitleOffset);
        writeSetting('keyAcc', settings.shortcutKeys.accelerate);
        writeSetting('keyFwd', settings.shortcutKeys.forward);
        writeSetting('keyBwd', settings.shortcutKeys.backward);
        writeSetting('opacity', settings.opacity);
        writeSetting('blur', settings.blur);
        writeSetting('hoverOpacity', settings.hoverOpacity);
        writeSetting('hoverBlur', settings.hoverBlur);
    }

    function getCurrentVideoID() {
        if (IS_JABLE) return location.pathname.match(/\/videos\/([^/]+)/)?.[1] || null;
        const last = location.pathname.split('/').filter(Boolean).pop();
        return last?.match(/([a-zA-Z]+-\d+|[a-zA-Z]+\d+-\d+|[a-zA-Z]+\d+[a-zA-Z]+-\d+)/i)?.[1] || last || '';
    }

    function findDetailVideo() {
        const candidates = [];
        for (const video of document.querySelectorAll('video')) {
            const wrapper = video.closest('.plyr') || video.parentElement;
            if (!wrapper) continue;
            const rect = wrapper.getBoundingClientRect();
            if (rect.width < MIN_PLAYER_WIDTH || rect.height < MIN_PLAYER_HEIGHT) continue;
            candidates.push({ video, area: rect.width * rect.height });
        }
        candidates.sort((a, b) => b.area - a.area);
        return candidates[0]?.video || null;
    }

    function stopPlayerPolling() {
        if (!state.playerPollTimer) return;
        clearInterval(state.playerPollTimer);
        state.playerPollTimer = 0;
    }

    function initPlayer() {
        if (state.playerReady || state.playerPollTimer) return;

        state.playerPollTimer = setInterval(() => {
            const video = findDetailVideo();
            if (!video) return;
            const wrapper = video.closest('.plyr__video-wrapper') || video.closest('.plyr') || video.parentElement;
            if (!wrapper) return;
            stopPlayerPolling();
            bindPlayer(video, wrapper);
        }, PLAYER_POLL_INTERVAL);

        setTimeout(stopPlayerPolling, PLAYER_POLL_TIMEOUT);
    }

    function bindPlayer(video, wrapper) {
        state.videoElement = video;
        state.videoContainer = wrapper;
        state.playerReady = true;

        createControlPanel();
        setupShortcuts();

        if (typeof unsafeWindow !== 'undefined' && unsafeWindow.player) state.player = unsafeWindow.player;
        else if (video.plyr) state.player = video.plyr;
        else state.player = video;

        state.subtitleElement = document.createElement('div');
        state.subtitleElement.className = 'custom-subtitle';
        state.subtitleElement.style.display = 'none';
        wrapper.appendChild(state.subtitleElement);

        createPlayerQuickControls();

        ['play', 'pause', 'ended', 'loadedmetadata'].forEach(type => video.addEventListener(type, updatePlayPauseButton));

        startSubtitleLoop();
        setupDoubleClickSeek();
    }

    function setupDoubleClickSeek() {
        const video = state.videoElement;
        if (!video || video.dataset.quickSeekReady) return;

        video.dataset.quickSeekReady = 'true';
        video.addEventListener('dblclick', event => {
            const rect = video.getBoundingClientRect();
            const isBackward = (event.clientX - rect.left) < rect.width / 2;
            seek(isBackward ? -10 : 10);
            showLog(isBackward ? '⏪ 双击：-10 秒' : '⏩ 双击：+10 秒');
        });
    }

    function setupShortcuts() {
        document.addEventListener('keydown', event => {
            if (isEditableTarget(event.target)) return;
            if (!state.player || !state.videoElement) return;

            const video = state.videoElement;
            const { accelerate, forward, backward } = settings.shortcutKeys;
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
                showLog(`⏩ 临时加速 ${settings.accelerationRate}x`);
                return;
            }
            if (key === forward || key === backward) {
                if (event.repeat && event.timeStamp - state.seekRepeatAt < REPEAT_SEEK_INTERVAL) return;
                state.seekRepeatAt = event.timeStamp;
            }
            if (key === forward) {
                seek(settings.skipTime);
                showLog(`⏩ 快进 ${settings.skipTime} 秒`);
                return;
            }
            if (key === backward) {
                seek(-settings.skipTime);
                showLog(`⏪ 倒退 ${settings.skipTime} 秒`);
            }
        });

        document.addEventListener('keyup', event => {
            if (event.key.toLowerCase() !== settings.shortcutKeys.accelerate) return;
            if (!state.acceleratePressed || !state.videoElement) return;
            state.videoElement.playbackRate = state.speedBeforeAccelerate;
            state.acceleratePressed = false;
        });
    }

    function removeAds() {
        const videoContainer = state.videoContainer;
        blockFramePopups();
        document.querySelectorAll(AD_SELECTORS).forEach(element => {
            if (element === videoContainer || element.contains(videoContainer)) return;
            if (element.tagName === 'IFRAME') element.remove();
            else if (element.style.display !== 'none') element.style.display = 'none';
        });
    }

    function initPage() {
        initPlayer();
        removeAds();

        document.querySelector('a.text-nord13.font-medium.flex.items-center')?.click();

        const refresh = throttle(() => {
            removeAds();
            if (!state.playerReady) initPlayer();
        }, ADS_CLEAN_DELAY);

        new MutationObserver(refresh).observe(document.body || document.documentElement, { childList: true, subtree: true });
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initPage, { once: true });
    else initPage();
})();
