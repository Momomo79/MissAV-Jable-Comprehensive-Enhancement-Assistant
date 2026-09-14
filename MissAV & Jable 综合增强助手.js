// ==UserScript==
// @name         MissAV & Jable 综合增强助手
// @namespace    http://tampermonkey.net/
// @version      4.0
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

    const isDesktop = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    if (!isDesktop) return;

    const STORAGE = 'avSub_';
    const IS_JABLE = location.hostname.includes('jable');

    const settings = {
        accelerationRate: getNumber('accRate', 3, 0.1, 16),
        skipTime: getNumber('skipTime', 5, 1, 600),
        subtitleOffset: getNumber('offset', 0, -30, 30),
        shortcutKeys: {
            accelerate: getString('keyAcc', 'z'),
            forward: getString('keyFwd', 'x'),
            backward: getString('keyBwd', 'c')
        },
        panelX: getNumber('panelX', 20, 0, 9999),
        panelY: getNumber('panelY', 100, 0, 9999),
        isMinimized: localStorage.getItem(STORAGE + 'minimized') === 'true',
        opacity: getNumber('opacity', 0.3, 0, 1),
        blur: getNumber('blur', 1, 0, 20),
        hoverOpacity: getNumber('hoverOpacity', 0.9, 0, 1),
        hoverBlur: getNumber('hoverBlur', 1, 0, 20)
    };

    let player = null;
    let videoElement = null;
    let videoContainer = null;
    let subtitleElement = null;
    let subtitleList = null;
    let controlPanel = null;
    let logElement = null;
    let playPauseButton = null;
    let loopBtn = null;
    let loopMenu = null;

    let subtitles = [];
    let originalSubtitleText = '';
    let activeSubText = '';
    let currentSubIndex = -1;
    let acceleratePressed = false;
    let speedBeforeAccelerate = 1;
    let playerReady = false;
    let subtitleRAF = 0;
    let quickHideTimer = 0;

    let loopActive = false;
    let loopStart = 0;
    let loopDuration = 5;

    if (/^https:\/\/(missav|thisav)\.com/.test(location.href)) {
        location.replace(location.href.replace('missav.com', 'missav.live').replace('thisav.com', 'missav.live'));
        return;
    }

    if (typeof unsafeWindow !== 'undefined') {
        try { unsafeWindow.open = function () {}; } catch (_) {}
    }

    function getString(key, fallback) {
        const value = localStorage.getItem(STORAGE + key);
        return value ? value.toLowerCase().trim() : fallback;
    }

    function getNumber(key, fallback, min, max) {
        const value = Number.parseFloat(localStorage.getItem(STORAGE + key));
        if (!Number.isFinite(value)) return fallback;
        return Math.min(max, Math.max(min, value));
    }

    function clamp(value, min, max) { return Math.min(max, Math.max(min, value)); }

    function showLog(message) {
        if (!logElement) return;
        const now = new Date();
        const t = [now.getHours(), now.getMinutes(), now.getSeconds()].map(v => v.toString().padStart(2, '0')).join(':');

        const entry = document.createElement('div');
        entry.className = 'log-entry';

        const timeSpan = document.createElement('span');
        timeSpan.className = 'log-time';
        timeSpan.textContent = `[${t}]`;

        const msgSpan = document.createElement('span');
        msgSpan.textContent = message;

        entry.append(timeSpan, msgSpan);
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
        /* 增大循环字体（12px）并优化行高与最小宽度，确保在控制栏UI内完美显示 */
        .quick-loop-btn { min-width: 36px !important; height: 34px !important; padding: 0 !important; display: inline-flex !important; flex-direction: column !important; align-items: center !important; justify-content: center !important; line-height: 1.0 !important; font-size: 12px !important; }
        .quick-loop-btn span { display: block; }
        .quick-loop-btn.active { background: rgba(59,130,246,0.4) !important; color: #60a5fa !important; }
        .loop-menu { position: absolute; bottom: 44px; left: 50%; transform: translateX(-50%); background: rgba(20,22,30,0.95); border: 1px solid rgba(255,255,255,0.2); border-radius: 8px; padding: 6px; display: none; flex-direction: column; gap: 4px; z-index: 9991; white-space: nowrap; backdrop-filter: blur(6px); box-shadow: 0 8px 24px rgba(0,0,0,0.5); }
        .loop-menu.show { display: flex; }
        .loop-menu-btn { background: transparent; border: 0; color: #fff; padding: 6px 12px; text-align: left; border-radius: 4px; cursor: pointer; font-size: 12px; font-weight: 600; }
        .loop-menu-btn:hover { background: rgba(255,255,255,0.15); color: #60a5fa; }
    `);

    function getVideo() { return videoElement; }
    function getCurrentTime() { return videoElement?.currentTime ?? 0; }
    function seek(seconds) {
        if (!videoElement) return;
        const duration = Number.isFinite(videoElement.duration) ? videoElement.duration : Infinity;
        videoElement.currentTime = clamp(videoElement.currentTime + seconds, 0, duration);
    }
    function isPaused() { return !videoElement || videoElement.paused; }
    function updatePlayPauseButton() {
        if (!playPauseButton) return;
        const paused = isPaused();
        playPauseButton.textContent = paused ? '▶ 播放' : '⏸ 暂停';
        playPauseButton.classList.toggle('is-paused', paused);
        playPauseButton.classList.toggle('is-playing', !paused);
    }
    async function togglePlayPause() {
        if (!videoElement) return;
        try {
            if (videoElement.paused) { await videoElement.play(); showLog('▶️ 开始播放'); }
            else { videoElement.pause(); showLog('⏸️ 已暂停'); }
        } catch (error) { showLog(`❌ 播放失败`); } finally { updatePlayPauseButton(); }
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

    function createButton(text, className = '') {
        const button = document.createElement('button');
        button.type = 'button';
        button.textContent = text;
        if (className) button.className = className;
        return button;
    }

    function makeDraggable(element, handle) {
        let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
        handle.onmousedown = dragMouseDown;

        function dragMouseDown(e) {
            e.preventDefault();
            pos3 = e.clientX;
            pos4 = e.clientY;
            document.onmouseup = closeDragElement;
            document.onmousemove = elementDrag;
        }

        function elementDrag(e) {
            e.preventDefault();
            pos1 = pos3 - e.clientX;
            pos2 = pos4 - e.clientY;
            pos3 = e.clientX;
            pos4 = e.clientY;
            element.style.top = (element.offsetTop - pos2) + "px";
            element.style.left = (element.offsetLeft - pos1) + "px";
        }

        function closeDragElement() {
            document.onmouseup = null;
            document.onmousemove = null;
            localStorage.setItem(STORAGE + 'panelX', element.offsetLeft);
            localStorage.setItem(STORAGE + 'panelY', element.offsetTop);
        }
    }

    function createControlPanel() {
        if (controlPanel || document.querySelector('.custom-control-panel')) return;

        controlPanel = document.createElement('div');
        controlPanel.className = 'custom-control-panel';

        const initX = clamp(settings.panelX, 0, window.innerWidth - 320);
        const initY = clamp(settings.panelY, 0, window.innerHeight - 50);
        controlPanel.style.left = initX + 'px';
        controlPanel.style.top = initY + 'px';

        const header = document.createElement('div');
        header.className = 'panel-header';

        const titleSpan = document.createElement('span');
        titleSpan.textContent = '⚙️ 增强助手 (拖拽移动)';

        const minBtn = document.createElement('span');
        minBtn.className = 'panel-header-btn';
        minBtn.textContent = settings.isMinimized ? '➕' : '➖';

        header.append(titleSpan, minBtn);

        const body = document.createElement('div');
        body.className = 'panel-body';
        body.style.display = settings.isMinimized ? 'none' : 'block';

        minBtn.onclick = () => {
            settings.isMinimized = !settings.isMinimized;
            body.style.display = settings.isMinimized ? 'none' : 'block';
            minBtn.textContent = settings.isMinimized ? '➕' : '➖';
            localStorage.setItem(STORAGE + 'minimized', settings.isMinimized);
        };

        const row1 = document.createElement('div');
        row1.className = 'panel-row';
        row1.append(
            createInputGroup('加速键:', 'text', settings.shortcutKeys.accelerate, e => {
                settings.shortcutKeys.accelerate = normalizeKey(e.target.value, 'z');
            }),
            createInputGroup('快进键:', 'text', settings.shortcutKeys.forward, e => {
                settings.shortcutKeys.forward = normalizeKey(e.target.value, 'x');
            }),
            createInputGroup('倒退键:', 'text', settings.shortcutKeys.backward, e => {
                settings.shortcutKeys.backward = normalizeKey(e.target.value, 'c');
            }),
            createInputGroup('加速倍数:', 'number', settings.accelerationRate, e => {
                settings.accelerationRate = clamp(Number.parseFloat(e.target.value) || 1, .1, 16);
            }, .1, 16, .1),
            createInputGroup('快进(秒):', 'number', settings.skipTime, e => {
                settings.skipTime = clamp(Number.parseFloat(e.target.value) || 5, 1, 600);
            }, 1, 600, 1),
            createInputGroup('字幕偏移:', 'number', settings.subtitleOffset, async e => {
                settings.subtitleOffset = clamp(Number.parseFloat(e.target.value) || 0, -30, 30);
                if (originalSubtitleText) { subtitles = await parseSRT(originalSubtitleText); updateSubtitle(true); }
            }, -30, 30, .1)
        );

        const row3 = document.createElement('div');
        row3.className = 'btn-group';

        const subtitleInput = document.createElement('input');
        subtitleInput.type = 'file'; subtitleInput.accept = '.srt';
        subtitleInput.style.display = 'none';
        document.documentElement.appendChild(subtitleInput);

        const btnLoadLocal = createButton('加载本地'); btnLoadLocal.onclick = () => subtitleInput.click();
        const btnSearchWeb = createButton('网页搜字幕'); btnSearchWeb.onclick = searchSubtitleWeb;
        const btnSearchAPI = createButton('API搜字幕'); btnSearchAPI.onclick = searchSubtitleAPI;
        const btnClear = createButton('清除字幕', 'btn-danger'); btnClear.onclick = clearSubtitles;
        const btnSave = createButton('保存设置', 'btn-primary');
        btnSave.style.gridColumn = 'span 2';
        btnSave.onclick = () => { saveSettings(); showLog('💾 设置已保存'); };

        subtitleInput.addEventListener('change', async event => {
            const file = event.target.files?.[0]; if (!file) return;
            try {
                const text = await file.text(); originalSubtitleText = text;
                subtitles = await parseSRT(text); updateSubtitle(true);
                showLog(`✅ 本地字幕加载成功：${subtitles.length} 条`);
            } catch (error) { showLog(`❌ 字幕读取失败`); } finally { event.target.value = ''; }
        });

        row3.append(btnLoadLocal, btnSearchWeb, btnSearchAPI, btnClear, btnSave);

        const sliderRow = document.createElement('div');
        sliderRow.className = 'slider-row-container hidden';

        function applyUiStyles() {
            if (!controlPanel) return;
            controlPanel.style.setProperty('--ui-bg-opacity', settings.opacity);
            controlPanel.style.setProperty('--ui-blur', settings.blur + 'px');
            controlPanel.style.setProperty('--ui-hover-opacity', settings.hoverOpacity);
            controlPanel.style.setProperty('--ui-hover-blur', settings.hoverBlur + 'px');
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

            const val = document.createElement('span');
            val.className = 'slider-value';
            val.textContent = settings[key];

            slider.addEventListener('input', e => {
                settings[key] = Number.parseFloat(e.target.value);
                val.textContent = settings[key];
                applyUiStyles();
            });

            group.append(label, slider, val);
            return group;
        }

        sliderRow.append(
            createSlider('常规透明', 'opacity', 0, 1, 0.05),
            createSlider('常规磨砂', 'blur', 0, 20, 1),
            createSlider('悬浮透明', 'hoverOpacity', 0, 1, 0.05),
            createSlider('悬浮磨砂', 'hoverBlur', 0, 20, 1)
        );

        const toggleSliderBtn = createButton('👁 隐藏/显示透明UI设置', 'btn-primary');
        toggleSliderBtn.style.width = '100%';
        toggleSliderBtn.style.marginTop = '12px';
        toggleSliderBtn.style.marginBottom = '2px';
        toggleSliderBtn.onclick = () => {
            sliderRow.classList.toggle('hidden');
        };

        logElement = document.createElement('div');
        logElement.className = 'panel-status-log';

        body.append(row1, row3, toggleSliderBtn, sliderRow, logElement);
        controlPanel.append(header, body);
        
        document.body.appendChild(controlPanel);
        
        applyUiStyles();

        makeDraggable(controlPanel, header);
        showLog('▶️ 系统初始化完成');
    }

    function showQuickControls() {
        if (!videoContainer) return;
        const controls = videoContainer.querySelector('.custom-quick-controls');
        if (!controls) return;
        controls.classList.add('quick-visible');
        clearTimeout(quickHideTimer);
        quickHideTimer = setTimeout(() => {
            if (!controls.matches(':hover') && !controls.contains(document.activeElement) && !loopMenu?.classList.contains('show')) {
                controls.classList.remove('quick-visible');
            }
        }, 2200);
    }

    function hideQuickControls() {
        if (!videoContainer || loopMenu?.classList.contains('show')) return;
        const controls = videoContainer.querySelector('.custom-quick-controls');
        if (!controls) return;
        clearTimeout(quickHideTimer);
        controls.classList.remove('quick-visible');
    }

    function setupQuickControlsAutoHide() {
        if (!videoContainer || videoContainer.dataset.quickAutohide === '1') return;
        videoContainer.dataset.quickAutohide = '1';
        videoContainer.addEventListener('mousemove', showQuickControls);
        videoContainer.addEventListener('mouseleave', hideQuickControls);
        videoContainer.addEventListener('click', showQuickControls);
        const controls = videoContainer.querySelector('.custom-quick-controls');
        if (controls) {
            controls.addEventListener('mouseenter', () => { clearTimeout(quickHideTimer); controls.classList.add('quick-visible'); });
            controls.addEventListener('mouseleave', () => { if (!loopMenu?.classList.contains('show')) quickHideTimer = setTimeout(hideQuickControls, 800); });
        }
    }

    function startLoop(seconds) {
        if (!videoElement) return;
        loopStart = videoElement.currentTime;
        loopDuration = seconds;
        loopActive = true;
        loopBtn.classList.add('active');
        const timeText = seconds >= 60 ? (seconds / 60) + 'm' : seconds + 's';
        loopBtn.innerHTML = `<span>循</span><span>${timeText}</span>`;
        loopMenu.classList.remove('show');
        showLog(`🔂 已开启区间循环：从当前起 ${seconds >= 60 ? (seconds / 60) + '分钟' : seconds + '秒'}`);
    }

    function stopLoop() {
        loopActive = false;
        loopBtn.classList.remove('active');
        loopBtn.innerHTML = '<span>循</span><span>环</span>';
        loopMenu.classList.remove('show');
        showLog('⏹️ 已关闭区间循环');
    }

    function createPlayerQuickControls() {
        if (!videoContainer || videoContainer.querySelector('.custom-quick-controls')) return;
        const quickControls = document.createElement('div'); quickControls.className = 'custom-quick-controls';
        const jumpGroup = document.createElement('div'); jumpGroup.className = 'quick-jump-group';

        const leftButtons = [{ label: '10m', jump: -600 }, { label: '5m', jump: -300 }, { label: '1m', jump: -60 }, { label: '10s', jump: -10 }];
        const rightButtons = [{ label: '10s', jump: 10 }, { label: '1m', jump: 60 }, { label: '5m', jump: 300 }, { label: '10m', jump: 600 }];

        const appendJumpButton = ({ label, jump }, direction) => {
            const button = createButton('', `quick-btn`);
            button.textContent = direction === 'back' ? `‹ ${label}` : `${label} ›`;
            button.onclick = event => { event.stopPropagation(); seek(jump); showLog(`${jump > 0 ? '⏩' : '⏪'} 跳转 ${Math.abs(jump)} 秒`); };
            jumpGroup.appendChild(button);
        };

        leftButtons.forEach(item => appendJumpButton(item, 'back'));
        jumpGroup.appendChild(Object.assign(document.createElement('span'), {className: 'quick-divider'}));

        playPauseButton = createButton('▶ 播放', 'quick-btn quick-play-btn is-paused');
        playPauseButton.onclick = event => { event.stopPropagation(); togglePlayPause(); };
        jumpGroup.appendChild(playPauseButton);

        jumpGroup.appendChild(Object.assign(document.createElement('span'), {className: 'quick-divider'}));
        rightButtons.forEach(item => appendJumpButton(item, 'forward'));

        const loopWrapper = document.createElement('div');
        loopWrapper.className = 'quick-loop-wrapper';
        jumpGroup.appendChild(Object.assign(document.createElement('span'), {className: 'quick-divider'}));

        loopBtn = createButton('', 'quick-btn quick-loop-btn');
        loopBtn.innerHTML = '<span>循</span><span>环</span>';
        loopBtn.onclick = event => {
            event.stopPropagation();
            if (loopActive) {
                stopLoop();
            } else {
                loopMenu.classList.toggle('show');
            }
        };

        loopMenu = document.createElement('div');
        loopMenu.className = 'loop-menu';

        const addMenuOption = (text, onClick) => {
            const opt = createButton(text, 'loop-menu-btn');
            opt.onclick = e => { e.stopPropagation(); onClick(); };
            loopMenu.appendChild(opt);
        };

        addMenuOption('5秒循环', () => startLoop(5));
        addMenuOption('10秒循环', () => startLoop(10));
        addMenuOption('1分钟循环', () => startLoop(60));
        addMenuOption('自定义时间...', () => {
            const input = prompt('请输入自定义循环时间（秒）:', '15');
            const sec = Number.parseFloat(input);
            if (Number.isFinite(sec) && sec > 0) {
                startLoop(sec);
            } else if (input !== null) {
                showLog('⚠️ 输入无效');
            }
        });
        addMenuOption('关闭循环', () => stopLoop());

        loopWrapper.append(loopBtn, loopMenu);
        jumpGroup.appendChild(loopWrapper);

        document.addEventListener('click', e => {
            if (loopMenu && !loopWrapper.contains(e.target)) {
                loopMenu.classList.remove('show');
            }
        });

        quickControls.appendChild(jumpGroup);
        videoContainer.appendChild(quickControls);
        setupQuickControlsAutoHide();
        hideQuickControls();
    }

    function normalizeKey(value, fallback) { const key = String(value || '').trim().toLowerCase(); return key.length ? key.slice(0, 1) : fallback; }

    async function parseSRT(text) {
        if (!text) return [];
        const blocks = text.replace(/\r/g, '').split(/\n\s*\n+/);
        const result = [];
        for (const block of blocks) {
            const lines = block.trim().split('\n');
            if (!lines.length) continue;
            const timeIndex = lines.findIndex(line => line.includes('-->'));
            if (timeIndex === -1) continue;
            const [startRaw, endRaw] = lines[timeIndex].split('-->');
            if (!startRaw || !endRaw) continue;
            const start = parseTime(startRaw.trim()) + settings.subtitleOffset;
            const end = parseTime(endRaw.trim()) + settings.subtitleOffset;
            const textLines = lines.slice(timeIndex + 1).join('\n').replace(/<[^>]+>/g, '').trim();
            if (textLines && Number.isFinite(start) && Number.isFinite(end)) result.push({ start, end, text: textLines });
        }
        return result.sort((a, b) => a.start - b.start);
    }

    function parseTime(timeString) {
        const parts = String(timeString || '').replace(',', '.').trim().split(':');
        if (parts.length !== 3) return Number.NaN;
        const [h, m, s] = parts.map(Number.parseFloat);
        return [h, m, s].every(Number.isFinite) ? h * 3600 + m * 60 + s : Number.NaN;
    }

    function clearSubtitles() {
        subtitles = []; originalSubtitleText = ''; activeSubText = ''; currentSubIndex = -1;
        if (subtitleElement) { subtitleElement.textContent = ''; subtitleElement.style.display = 'none'; }
        if (subtitleList) { subtitleList.remove(); subtitleList = null; }
        showLog('🗑️ 字幕已清除');
    }

    function findDetailVideo() {
        return Array.from(document.querySelectorAll('video')).filter(v => {
            const wrap = v.closest('.plyr') || v.parentElement;
            if (!wrap) return false;
            const r = wrap.getBoundingClientRect();
            return r.width >= 520 && r.height >= 280;
        }).sort((a, b) => {
            const ra = a.getBoundingClientRect(), rb = b.getBoundingClientRect();
            return (rb.width * rb.height) - (ra.width * ra.height);
        })[0] || null;
    }

    function initPlayer() {
        if (playerReady) return;
        const checkPlayer = setInterval(() => {
            const video = findDetailVideo();
            if (!video) return;
            const wrapper = video.closest('.plyr__video-wrapper') || video.closest('.plyr') || video.parentElement;
            if (!wrapper) return;

            clearInterval(checkPlayer);
            videoElement = video; videoContainer = wrapper; playerReady = true;
            createControlPanel(); setupShortcuts();

            if (typeof unsafeWindow !== 'undefined' && unsafeWindow.player) player = unsafeWindow.player;
            else if (video.plyr) player = video.plyr;
            else player = video;

            subtitleElement = document.createElement('div');
            subtitleElement.className = 'custom-subtitle';
            subtitleElement.style.display = 'none';
            videoContainer.appendChild(subtitleElement);

            createPlayerQuickControls();

            ['play', 'pause', 'ended', 'loadedmetadata'].forEach(e => videoElement.addEventListener(e, updatePlayPauseButton));
            startSubtitleLoop(); setupDoubleClickSeek();
        }, 500);
        setTimeout(() => clearInterval(checkPlayer), 12000);
    }

    function startSubtitleLoop() {
        cancelAnimationFrame(subtitleRAF);
        const loop = () => { updateSubtitle(false); subtitleRAF = requestAnimationFrame(loop); };
        subtitleRAF = requestAnimationFrame(loop);
    }

    function updateSubtitle(forceUpdate = false) {
        if (!videoElement) return;

        if (loopActive) {
            const currentTime = videoElement.currentTime;
            if (currentTime >= loopStart + loopDuration || currentTime < loopStart) {
                videoElement.currentTime = loopStart;
            }
        }

        if (!subtitles.length || !subtitleElement) return;
        const currentTime = getCurrentTime();
        let sub = null;
        if (currentSubIndex >= 0 && currentSubIndex < subtitles.length) {
            const current = subtitles[currentSubIndex];
            if (currentTime >= current.start && currentTime <= current.end) sub = current;
        }
        if (!sub) {
            let low = 0, high = subtitles.length - 1;
            while (low <= high) {
                const mid = (low + high) >> 1; const item = subtitles[mid];
                if (currentTime < item.start) high = mid - 1;
                else if (currentTime > item.end) low = mid + 1;
                else { sub = item; currentSubIndex = mid; break; }
            }
        }
        const newText = sub ? sub.text : '';
        if (!forceUpdate && newText === activeSubText) return;
        activeSubText = newText;
        subtitleElement.textContent = newText;
        subtitleElement.style.display = newText ? 'block' : 'none';
    }

    function setupDoubleClickSeek() {
        if (!videoElement || videoElement.dataset.quickSeekReady) return;
        videoElement.dataset.quickSeekReady = 'true';
        videoElement.addEventListener('dblclick', event => {
            const rect = videoElement.getBoundingClientRect();
            const x = event.clientX - rect.left;
            if (x < rect.width / 2) { seek(-10); showLog(`⏪ 双击：-10 秒`); }
            else { seek(10); showLog(`⏩ 双击：+10 秒`); }
        });
    }

    function setupShortcuts() {
        document.addEventListener('keydown', event => {
            if (event.target?.matches?.('input,textarea,select,[contenteditable="true"]')) return;
            if (!player || !videoElement) return;
            const key = event.key.toLowerCase();
            if (event.code === 'Space') { event.preventDefault(); if (!event.repeat) togglePlayPause(); return; }
            if (key === settings.shortcutKeys.accelerate) {
                if (acceleratePressed || event.repeat) return;
                speedBeforeAccelerate = Number.isFinite(videoElement.playbackRate) ? videoElement.playbackRate : 1;
                videoElement.playbackRate = settings.accelerationRate; acceleratePressed = true;
                showLog(`⏩ 临时加速 ${settings.accelerationRate}x`); return;
            }
            if (key === settings.shortcutKeys.forward) { seek(settings.skipTime); showLog(`⏩ 快进 ${settings.skipTime} 秒`); return; }
            if (key === settings.shortcutKeys.backward) { seek(-settings.skipTime); showLog(`⏪ 倒退 ${settings.skipTime} 秒`); }
        });
        document.addEventListener('keyup', event => {
            if (event.key.toLowerCase() !== settings.shortcutKeys.accelerate || !acceleratePressed || !videoElement) return;
            videoElement.playbackRate = speedBeforeAccelerate; acceleratePressed = false;
        });
    }

    function getCurrentVideoID() {
        if (IS_JABLE) return location.pathname.match(/\/videos\/([^/]+)/)?.[1] || null;
        const last = location.pathname.split('/').filter(Boolean).pop();
        return last?.match(/([a-zA-Z]+-\d+|[a-zA-Z]+\d+-\d+|[a-zA-Z]+\d+[a-zA-Z]+-\d+)/i)?.[1] || last || '';
    }

    function searchSubtitleWeb() {
        const id = getCurrentVideoID(); if (!id) { showLog('⚠️ 无法识别视频ID'); return; }
        showLog(`🌐 网页搜索: ${id}`);
        GM_openInTab(`https://subtitlecat.com/index.php?search=${encodeURIComponent(id)}`, { active: true });
    }

    async function requestText(url, timeout = 15000) {
        return new Promise((resolve, reject) => {
            GM_xmlhttpRequest({
                method: 'GET', url, timeout,
                onload: r => r.status === 200 ? resolve(r.responseText) : reject(new Error(`HTTP ${r.status}`)),
                onerror: () => reject(new Error('网络错误')),
                ontimeout: () => reject(new Error('请求超时'))
            });
        });
    }

    async function searchSubtitleAPI() {
        const id = getCurrentVideoID(); if (!id) { showLog('⚠️ 无法获取ID'); return; }
        showLog(`🔍 正在API搜索: ${id}`);
        try {
            const text = await requestText(`https://api-shoulei-ssl.xunlei.com/oracle/subtitle?name=${encodeURIComponent(id)}`, 10000);
            const data = JSON.parse(text);
            const validSubs = (data?.data || []).filter(item => item?.url && /\.srt(?:$|\?)/i.test(item.url));
            if (validSubs.length) {
                showLog(`✅ 找到 ${validSubs.length} 个字幕`);
                showSubtitleList(validSubs);
            }
            else showLog('⚠️ 未找到匹配的SRT');
        } catch (error) { showLog(`❌ API错误: ${error.message}`); }
    }

    function showSubtitleList(items) {
        subtitleList?.remove(); subtitleList = document.createElement('div');
        subtitleList.style.cssText = 'position:fixed;left:15px;bottom:175px;z-index:10001;min-width:320px;max-height:280px;overflow-y:auto;padding:12px;border-radius:12px;background:rgba(20,22,30,.92);color:#fff;';
        const header = document.createElement('div');
        header.innerHTML = `<span style="color:#60a5fa;font-weight:bold;">选择字幕 (${items.length})</span><span style="cursor:pointer;color:#94a3b8;float:right;">[关闭]</span>`;
        header.lastChild.onclick = () => { subtitleList.remove(); subtitleList = null; };
        subtitleList.appendChild(header);
        items.forEach(item => {
            const div = document.createElement('div');
            div.style.cssText = 'padding:8px;margin-top:5px;border-bottom:1px solid rgba(255,255,255,.1);cursor:pointer;font-size:13px;';
            div.textContent = `📄 ${item.name}`;
            div.onclick = () => loadRemoteSubtitle(item.url);
            subtitleList.appendChild(div);
        });
        document.body.appendChild(subtitleList);
    }

    function saveSettings() {
        ['accRate','skipTime','offset'].forEach(k => localStorage.setItem(STORAGE + k, settings[k + (k==='accRate'?'elerationRate':'')]));
        localStorage.setItem(STORAGE + 'accRate', String(settings.accelerationRate));
        localStorage.setItem(STORAGE + 'skipTime', String(settings.skipTime));
        localStorage.setItem(STORAGE + 'offset', String(settings.subtitleOffset));
        localStorage.setItem(STORAGE + 'keyAcc', settings.shortcutKeys.accelerate);
        localStorage.setItem(STORAGE + 'keyFwd', settings.shortcutKeys.forward);
        localStorage.setItem(STORAGE + 'keyBwd', settings.shortcutKeys.backward);
        localStorage.setItem(STORAGE + 'opacity', String(settings.opacity));
        localStorage.setItem(STORAGE + 'blur', String(settings.blur));
        localStorage.setItem(STORAGE + 'hoverOpacity', String(settings.hoverOpacity));
        localStorage.setItem(STORAGE + 'hoverBlur', String(settings.hoverBlur));
    }

    function removeAds() {
        const selectors = ['div[class^="root"]', 'div[class*="fixed"][class*="right-"][class*="bottom-"]', 'iframe'];
        document.querySelectorAll(selectors.join(',')).forEach(el => {
            if (el === videoContainer || el.contains(videoContainer)) return;
            if (el.tagName === 'IFRAME') el.remove(); else el.style.display = 'none';
        });
    }

    function throttle(fn, delay) {
        let timer = 0; let lastArgs = null;
        return (...args) => {
            lastArgs = args; if (timer) return;
            timer = setTimeout(() => { timer = 0; fn(...lastArgs); lastArgs = null; }, delay);
        };
    }

    function initPage() {
        initPlayer(); removeAds();
        document.querySelector('a.text-nord13.font-medium.flex.items-center')?.click();
        new MutationObserver(throttle(() => { removeAds(); if (!playerReady) initPlayer(); }, 500))
            .observe(document.body || document.documentElement, { childList: true, subtree: true });
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initPage, { once: true });
    else initPage();
})();
