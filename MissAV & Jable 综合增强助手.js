// ==UserScript==
// @name         MissAV & Jable 综合增强助手
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  PC端专用、Apple磨砂玻璃控制面板、光标跟随磨砂亮点、广告清理、字幕加载、倍速/快进、播放暂停、快捷键、女优悬浮预览
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
        ui: {
            panelOpacity: getNumber('uiPanelOp', .62, .1, 1),
            glassBlur: getNumber('uiGlassBlur', 22, 2, 60),
            spotRadius: getNumber('uiSpotRadius', 150, 40, 400),
            spotStrength: getNumber('uiSpotStr', 1.4, .2, 3)
        }
    };

    let player = null;
    let videoElement = null;
    let videoContainer = null;
    let subtitleElement = null;
    let subtitleList = null;
    let controlPanel = null;
    let logElement = null;
    let playPauseButton = null;

    let subtitles = [];
    let originalSubtitleText = '';
    let activeSubText = '';
    let currentSubIndex = -1;
    let acceleratePressed = false;
    let speedBeforeAccelerate = 1;
    let playerReady = false;
    let subtitleRAF = 0;
    let quickHideTimer = 0;

    const actressCache = new Map();

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

    function showLog(message) { if (logElement) logElement.textContent = message; }

    GM_addStyle(`
        .custom-control-panel,
        .custom-control-panel * { box-sizing: border-box; }
        .custom-control-panel {
            position: fixed;
            left: 15px;
            bottom: 15px;
            z-index: 99999;
            overflow: hidden;
            width: 620px;
            max-width: calc(100vw - 30px);
            padding: 14px 16px 10px;
            border: 1px solid rgba(255,255,255,.14);
            border-radius: 18px;
            background:
                linear-gradient(150deg, rgba(255,255,255,.16), rgba(255,255,255,.02) 38%, rgba(255,255,255,.10)),
                rgba(28,28,34, calc(var(--avsub-alpha, .62)));
            backdrop-filter: blur(var(--avsub-blur, 22px)) saturate(185%);
            -webkit-backdrop-filter: blur(var(--avsub-blur, 22px)) saturate(185%);
            box-shadow:
                inset 0 1px 0 rgba(255,255,255,.18),
                0 16px 48px rgba(0,0,0,.42);
            color: #f1f5f9;
            font-family: -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;
            transition: opacity .25s ease, background .25s ease;
        }
        .avsub-glass-spot {
            position: absolute;
            left: 0;
            top: 0;
            width: calc(var(--avsub-spotR, 150px) * 2);
            height: calc(var(--avsub-spotR, 150px) * 2);
            margin-left: calc(var(--avsub-spotR, 150px) * -1);
            margin-top: calc(var(--avsub-spotR, 150px) * -1);
            border-radius: 50%;
            pointer-events: none;
            z-index: 1;
            opacity: var(--avsub-spotS, 1.4);
            backdrop-filter: blur(18px) brightness(1.25) saturate(150%);
            -webkit-backdrop-filter: blur(18px) brightness(1.25) saturate(150%);
            background: radial-gradient(circle at center, rgba(255,255,255,.9), rgba(255,255,255,0) 68%);
            mix-blend-mode: screen;
            transition: width .18s ease, height .18s ease, margin .18s ease;
        }
        .custom-control-panel .glass-caption {
            position: relative;
            z-index: 2;
        }
        .panel-row {
            position: relative;
            z-index: 2;
            display: flex !important;
            align-items: center !important;
            justify-content: flex-start !important;
            gap: 12px !important;
            margin: 0 0 8px 0 !important;
            padding: 0 !important;
            width: 100% !important;
            min-height: 26px !important;
            flex-wrap: nowrap !important;
            overflow: visible !important;
        }
        .input-group {
            display: inline-flex !important;
            align-items: center !important;
            justify-content: flex-start !important;
            gap: 6px !important;
            flex: 0 0 auto !important;
            width: auto !important;
            min-width: 0 !important;
            margin: 0 !important;
            padding: 0 !important;
            color: #dbe2ef !important;
            font-size: 13px !important;
            font-weight: 500 !important;
            white-space: nowrap !important;
            text-shadow: 0 1px 1px rgba(0,0,0,.4);
        }
        .custom-control-panel input[type="number"]::-webkit-outer-spin-button,
        .custom-control-panel input[type="number"]::-webkit-inner-spin-button { -webkit-appearance:none; margin:0; }
        .custom-control-panel input[type="number"] { -moz-appearance:textfield; }
        .custom-control-panel input[type="text"],
        .custom-control-panel input[type="number"] {
            width: 52px;
            height: 26px;
            box-sizing: border-box;
            padding: 0 4px;
            border: 1px solid rgba(255,255,255,.20);
            border-radius: 7px;
            outline: none;
            background: rgba(255,255,255,.12);
            color: #fff;
            font-size: 13px;
            font-weight: 600;
            text-align: center;
            transition: border-color .2s, background .2s, box-shadow .2s;
        }
        .custom-control-panel input:focus {
            border-color: #5aa7ff;
            background: rgba(90,167,255,.18);
            box-shadow: 0 0 0 3px rgba(90,167,255,.28);
        }
        .btn-group {
            position: relative;
            z-index: 2;
            display: flex !important;
            align-items: stretch !important;
            gap: 6px !important;
            margin: 10px 0 0 0 !important;
            padding: 0 !important;
            width: 100% !important;
            flex-wrap: nowrap !important;
        }
        .btn-group button {
            flex: 1 1 0 !important;
            min-width: 0;
            padding: 7px 10px;
            border: 1px solid rgba(255,255,255,.16);
            border-radius: 8px;
            background: rgba(255,255,255,.09);
            color: #f1f5f9;
            cursor: pointer;
            font-size: 12px;
            font-weight: 500;
            white-space: nowrap !important;
            line-height: 1.2 !important;
            transition: all .2s ease;
        }
        .btn-group button:hover {
            border-color: rgba(255,255,255,.30);
            background: rgba(255,255,255,.22);
            transform: translateY(-1px);
        }
        .btn-group button.btn-primary {
            border-color: transparent;
            background: linear-gradient(135deg, #2f7cf6, #1d5ed4);
            box-shadow: 0 4px 14px rgba(47,124,246,.38);
        }
        .btn-group button.btn-danger {
            border-color: rgba(239,68,68,.28);
            background: rgba(239,68,68,.14);
            color: #fca5a5;
        }
        .btn-group button.btn-danger:hover { background: rgba(239,68,68,.30); color:#fff; }
        .btn-group button.btn-gear {
            flex: 0 0 auto !important;
            width: 38px;
            font-size: 15px;
            text-align: center;
        }
        .panel-status-log {
            position: relative;
            z-index: 2;
            min-height: 16px;
            margin-top: 9px;
            padding-top: 7px;
            border-top: 1px solid rgba(255,255,255,.12);
            color: #7dd3fc;
            font-size: 11px;
            font-weight: 500;
            letter-spacing: .2px;
            text-shadow: 0 1px 1px rgba(0,0,0,.4);
        }

        .avsub-settings {
            display: none;
            position: relative;
            z-index: 2;
            margin: 10px -16px -10px;
            padding: 14px 16px 12px;
            border-top: 1px solid rgba(255,255,255,.12);
            background: rgba(0,0,0,.18);
        }
        .custom-control-panel.settings-open .avsub-settings { display: block; }
        .avsub-setting-item {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 12px;
            margin-bottom: 10px;
            font-size: 12px;
            color: #dbe2ef;
        }
        .avsub-setting-item:last-child { margin-bottom: 2px; }
        .avsub-setting-item span { white-space: nowrap; }
        .avsub-setting-item input[type="range"] {
            flex: 1;
            height: 4px;
            margin: 0 10px;
            -webkit-appearance: none;
            appearance: none;
            background: linear-gradient(90deg, #2f7cf6, #7dd3fc);
            border-radius: 4px;
            outline: none;
        }
        .avsub-setting-item input[type="range"]::-webkit-slider-thumb {
            -webkit-appearance: none;
            width: 15px; height: 15px;
            border-radius: 50%;
            background: #fff;
            border: 2px solid #2f7cf6;
            box-shadow: 0 2px 8px rgba(0,0,0,.4);
            cursor: pointer;
        }
        .avsub-setting-item b { min-width: 34px; text-align: right; color:#fff; font-weight:600; }

        .custom-quick-controls {
            position: absolute;
            left: 50%;
            bottom: 48px;
            transform: translateX(-50%);
            z-index: 9990;
            display: inline-flex;
            align-items: center;
            gap: 6px;
            flex: 0 0 auto;
            padding: 6px 8px;
            border: 1px solid rgba(255,255,255,.20);
            border-radius: 24px;
            background:
                linear-gradient(150deg, rgba(255,255,255,.14), rgba(255,255,255,.02)),
                rgba(14,17,24,.78);
            backdrop-filter: blur(18px) saturate(170%);
            -webkit-backdrop-filter: blur(18px) saturate(170%);
            box-shadow: 0 10px 30px rgba(0,0,0,.4), inset 0 1px 0 rgba(255,255,255,.10);
            opacity: 0;
            visibility: hidden;
            pointer-events: none;
            user-select: none;
            transition: opacity .22s ease, visibility .22s ease;
        }
        .custom-quick-controls.quick-visible,
        .custom-quick-controls:hover,
        .custom-quick-controls:focus-within {
            opacity: 1;
            visibility: visible;
            pointer-events: auto;
        }
        .quick-jump-group {
            display: flex;
            align-items: center;
            gap: 2px;
        }
        .quick-btn {
            position: relative;
            min-width: 46px;
            height: 34px;
            padding: 4px 10px;
            border: 0;
            border-radius: 8px;
            outline: none;
            background: transparent;
            color: rgba(255,255,255,.92);
            cursor: pointer;
            font-size: 14px;
            font-weight: 600;
            white-space: nowrap;
            transition: background .16s ease, color .16s ease, transform .16s ease;
            display: inline-flex;
            align-items: center;
            justify-content: center;
        }
        .quick-btn:hover { background: rgba(255,255,255,.12); color:#fff; }
        .quick-btn:active { transform: scale(.94); }
        .quick-btn.quick-jump-back:hover { color:#93c5fd; }
        .quick-btn.quick-jump-forward:hover { color:#86efac; }
        .quick-play-btn {
            min-width: 80px;
            height: 34px;
            padding: 4px 16px;
            margin: 0 6px;
            border: 1px solid rgba(255,255,255,.12) !important;
            border-radius: 17px;
            background: #476a9f !important;
            box-shadow: inset 0 1px 0 rgba(255,255,255,.14);
            font-weight: 600;
            color: #fff !important;
        }
        .quick-play-btn.is-playing { color:#86efac !important; }
        .quick-divider {
            width: 1px; height: 18px;
            background: rgba(255,255,255,.12);
            flex: 0 0 1px;
            margin: 0 4px;
        }
        .custom-subtitle {
            position: absolute; left: 50%; bottom: 110px; z-index: 10000;
            max-width: 85%; transform: translateX(-50%); padding: 4px 10px;
            border-radius: 4px; color:#fff; background:transparent;
            font-size: 24px; font-weight: 700; line-height: 1.25; text-align:center;
            text-shadow: -1px -1px 0 #000,1px -1px 0 #000,-1px 1px 0 #000,1px 1px 0 #000,2px 2px 4px rgba(0,0,0,.8);
            pointer-events:none; white-space:pre-wrap;
        }
        .subtitle-list {
            position: fixed; left:15px; bottom:175px; z-index:10001;
            min-width:320px; max-height:280px; overflow-y:auto; padding:12px;
            border:1px solid rgba(255,255,255,.16); border-radius:12px;
            background: rgba(20,22,30,.92);
            backdrop-filter: blur(14px) saturate(160%);
            -webkit-backdrop-filter: blur(14px) saturate(160%);
            box-shadow: 0 8px 32px rgba(0,0,0,.5);
            color:#fff;
        }
        .subtitle-item {
            padding:8px 10px; border-bottom:1px solid rgba(255,255,255,.08);
            border-radius:4px; cursor:pointer; font-size:13px;
            word-break:break-all; transition:background .2s;
        }
        .subtitle-item:hover { background: rgba(59,130,246,.32); }
        div.my-2.text-sm.text-nord4.truncate { white-space:normal; }
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
        playPauseButton.title = paused ? '开始播放' : '暂停播放';
    }

    async function togglePlayPause() {
        if (!videoElement) return;
        try {
            if (videoElement.paused) { await videoElement.play(); showLog('▶️ 开始播放'); }
            else { videoElement.pause(); showLog('⏸️ 已暂停'); }
        } catch (error) {
            showLog(`❌ 播放失败: ${error.message || '浏览器阻止播放'}`);
        } finally { updatePlayPauseButton(); }
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

    function bindGlassSpot(panel, spot) {
        const move = event => {
            const rect = panel.getBoundingClientRect();
            spot.style.left = `${event.clientX - rect.left}px`;
            spot.style.top = `${event.clientY - rect.top}px`;
        };
        panel.addEventListener('mousemove', move);
        panel.addEventListener('mouseenter', move);
        panel.addEventListener('mouseleave', () => {
            spot.style.left = '-9999px';
            spot.style.top = '-9999px';
        });
    }

    function setupSettings(panel) {
        const drawer = document.createElement('div');
        drawer.className = 'avsub-settings';

        const ui = settings.ui;
        const items = [
            { label: '面板透明度', field: 'panelOpacity', min: 10, max: 100, step: 5, unit: '%', conv: f => Math.round(f * 100), rev: v => v / 100, apply: v => setPanelVar(panel, '--avsub-alpha', v) },
            { label: '磨砂模糊', field: 'glassBlur', min: 2, max: 60, step: 1, unit: 'px', conv: f => f, rev: v => v, apply: v => setPanelVar(panel, '--avsub-blur', `${v}px`) },
            { label: '光标光圈半径', field: 'spotRadius', min: 40, max: 400, step: 5, unit: 'px', conv: f => f, rev: v => v, apply: v => setPanelVar(panel, '--avsub-spotR', `${v}px`) },
            { label: '光标磨砂强度', field: 'spotStrength', min: 20, max: 300, step: 5, unit: '', conv: f => Math.round(f * 100), rev: v => v / 100, apply: v => { const s = panel.querySelector('.avsub-glass-spot'); if (s) s.style.opacity = v; } }
        ];

        items.forEach(item => {
            const row = document.createElement('div');
            row.className = 'avsub-setting-item';
            const label = document.createElement('span');
            label.textContent = item.label;
            const range = document.createElement('input');
            range.type = 'range';
            range.min = item.min;
            range.max = item.max;
            range.step = item.step;
            range.value = item.conv(ui[item.field]);
            const valueB = document.createElement('b');
            const syncDisplay = () => { valueB.textContent = `${range.value}${item.unit}`; };
            range.addEventListener('input', () => {
                const v = Number(range.value);
                const stored = item.rev(v);
                ui[item.field] = stored;
                item.apply(stored);
                syncDisplay();
                localStorage.setItem(STORAGE + 'ui' + cap(item.field), String(stored));
            });
            syncDisplay();
            row.append(label, range, valueB);
            drawer.appendChild(row);
        });

        panel.appendChild(drawer);
        return drawer;
    }

    function cap(str) {
        const keyMap = {
            panelOpacity: 'PanelOp',
            glassBlur: 'GlassBlur',
            spotRadius: 'SpotRadius',
            spotStrength: 'SpotStr'
        };
        return keyMap[str] || str;
    }

    function setPanelVar(panel, name, value) { panel.style.setProperty(name, value); }

    function applyGlassyDefaults(panel) {
        panel.style.setProperty('--avsub-alpha', settings.ui.panelOpacity);
        panel.style.setProperty('--avsub-blur', `${settings.ui.glassBlur}px`);
        panel.style.setProperty('--avsub-spotR', `${settings.ui.spotRadius}px`);
        const spot = panel.querySelector('.avsub-glass-spot');
        if (spot) { spot.style.opacity = settings.ui.spotStrength; spot.style.left = '-9999px'; spot.style.top = '-9999px'; }
    }

    function createControlPanel() {
        if (controlPanel || document.querySelector('.custom-control-panel')) return;

        controlPanel = document.createElement('div');
        controlPanel.className = 'custom-control-panel';
        if (IS_JABLE) controlPanel.style.width = '620px';

        const spot = document.createElement('div');
        spot.className = 'avsub-glass-spot';
        controlPanel.appendChild(spot);

        const row1 = document.createElement('div');
        row1.className = 'panel-row';
        row1.append(
            createInputGroup('加速键:', 'text', settings.shortcutKeys.accelerate, e => {
                settings.shortcutKeys.accelerate = normalizeKey(e.target.value, 'z');
                e.target.value = settings.shortcutKeys.accelerate;
            }),
            createInputGroup('快进键:', 'text', settings.shortcutKeys.forward, e => {
                settings.shortcutKeys.forward = normalizeKey(e.target.value, 'x');
                e.target.value = settings.shortcutKeys.forward;
            }),
            createInputGroup('倒退键:', 'text', settings.shortcutKeys.backward, e => {
                settings.shortcutKeys.backward = normalizeKey(e.target.value, 'c');
                e.target.value = settings.shortcutKeys.backward;
            })
        );

        const row2 = document.createElement('div');
        row2.className = 'panel-row';
        row2.append(
            createInputGroup('加速倍数:', 'number', settings.accelerationRate, e => {
                settings.accelerationRate = clamp(Number.parseFloat(e.target.value) || 1, .1, 16);
            }, .1, 16, .1),
            createInputGroup('快进(秒):', 'number', settings.skipTime, e => {
                settings.skipTime = clamp(Number.parseFloat(e.target.value) || 5, 1, 600);
            }, 1, 600, 1),
            createInputGroup('字幕偏移:', 'number', settings.subtitleOffset, async e => {
                settings.subtitleOffset = clamp(Number.parseFloat(e.target.value) || 0, -30, 30);
                if (originalSubtitleText) subtitles = await parseSRT(originalSubtitleText);
                updateSubtitle(true);
            }, -30, 30, .1)
        );

        const row3 = document.createElement('div');
        row3.className = 'btn-group';

        const subtitleInput = document.createElement('input');
        subtitleInput.type = 'file';
        subtitleInput.accept = '.srt';
        subtitleInput.style.cssText = 'position:fixed;left:-9999px;top:-9999px;width:1px;height:1px;opacity:0;pointer-events:none;';
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
        btnSave.onclick = () => { saveSettings(); showLog('💾 设置已保存'); };

        const btnGear = createButton('⚙', 'btn-gear');
        btnGear.title = '外观设置';
        btnGear.onclick = () => controlPanel.classList.toggle('settings-open');

        logElement = document.createElement('div');
        logElement.className = 'panel-status-log';
        logElement.textContent = '▶️ 系统初始化完成';

        subtitleInput.addEventListener('change', async event => {
            const file = event.target.files?.[0];
            if (!file) return;
            try {
                const text = await file.text();
                originalSubtitleText = text;
                subtitles = await parseSRT(text);
                updateSubtitle(true);
                showLog(`✅ 本地字幕加载成功：${subtitles.length} 条`);
            } catch (error) {
                showLog(`❌ 字幕读取失败: ${error.message}`);
            } finally { event.target.value = ''; }
        });

        row3.append(btnLoadLocal, btnSearchWeb, btnSearchAPI, btnClear, btnSave, btnGear);
        controlPanel.append(row1, row2, row3, logElement);

        setupSettings(controlPanel);
        applyGlassyDefaults(controlPanel);
        bindGlassSpot(controlPanel, spot);

        document.body.appendChild(controlPanel);
    }

    function showQuickControls() {
        if (!videoContainer) return;
        const controls = videoContainer.querySelector('.custom-quick-controls');
        if (!controls) return;
        controls.classList.add('quick-visible');
        clearTimeout(quickHideTimer);
        quickHideTimer = setTimeout(() => {
            if (!controls.matches(':hover') && !controls.contains(document.activeElement)) {
                controls.classList.remove('quick-visible');
            }
        }, 2200);
    }

    function hideQuickControls() {
        if (!videoContainer) return;
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
            controls.addEventListener('mouseleave', () => { quickHideTimer = setTimeout(hideQuickControls, 800); });
        }
    }

    function createPlayerQuickControls() {
        if (!videoContainer || videoContainer.querySelector('.custom-quick-controls')) return;

        const quickControls = document.createElement('div');
        quickControls.className = 'custom-quick-controls';

        const jumpGroup = document.createElement('div');
        jumpGroup.className = 'quick-jump-group';

        const leftButtons = [
            { label: '10m', jump: -600 }, { label: '5m', jump: -300 },
            { label: '1m', jump: -60 }, { label: '10s', jump: -10 }
        ];
        const rightButtons = [
            { label: '10s', jump: 10 }, { label: '1m', jump: 60 },
            { label: '5m', jump: 300 }, { label: '10m', jump: 600 }
        ];

        const appendJumpButton = ({ label, jump }, direction) => {
            const button = createButton('', `quick-btn ${direction === 'back' ? 'quick-jump-back' : 'quick-jump-forward'}`);
            button.title = `${jump > 0 ? '快进' : '倒退'} ${Math.abs(jump)} 秒`;
            button.textContent = direction === 'back' ? `‹ ${label}` : `${label} ›`;
            button.onclick = event => {
                event.stopPropagation();
                seek(jump);
                showLog(`${jump > 0 ? '⏩' : '⏪'} ${Math.abs(jump)} 秒`);
            };
            jumpGroup.appendChild(button);
        };

        leftButtons.forEach(item => appendJumpButton(item, 'back'));

        const divider = document.createElement('span');
        divider.className = 'quick-divider';
        jumpGroup.appendChild(divider);

        playPauseButton = createButton('▶ 播放', 'quick-btn quick-play-btn is-paused');
        playPauseButton.onclick = event => { event.stopPropagation(); togglePlayPause(); };
        playPauseButton.title = '开始播放 / 暂停播放';
        jumpGroup.appendChild(playPauseButton);

        const divider2 = document.createElement('span');
        divider2.className = 'quick-divider';
        jumpGroup.appendChild(divider2);

        rightButtons.forEach(item => appendJumpButton(item, 'forward'));

        quickControls.appendChild(jumpGroup);
        videoContainer.appendChild(quickControls);
        setupQuickControlsAutoHide();
        hideQuickControls();
        updatePlayPauseButton();
    }

    function normalizeKey(value, fallback) {
        const key = String(value || '').trim().toLowerCase();
        return key.length ? key.slice(0, 1) : fallback;
    }

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
            if (textLines && Number.isFinite(start) && Number.isFinite(end)) {
                result.push({ start, end, text: textLines });
            }
        }
        return result.sort((a, b) => a.start - b.start);
    }

    function parseTime(timeString) {
        const normalized = String(timeString || '').replace(',', '.').trim();
        const parts = normalized.split(':');
        if (parts.length !== 3) return Number.NaN;
        const hours = Number.parseFloat(parts[0]);
        const minutes = Number.parseFloat(parts[1]);
        const seconds = Number.parseFloat(parts[2]);
        if (![hours, minutes, seconds].every(Number.isFinite)) return Number.NaN;
        return hours * 3600 + minutes * 60 + seconds;
    }

    function clearSubtitles() {
        subtitles = [];
        originalSubtitleText = '';
        activeSubText = '';
        currentSubIndex = -1;
        if (subtitleElement) {
            subtitleElement.textContent = '';
            subtitleElement.style.display = 'none';
        }
        if (subtitleList) { subtitleList.remove(); subtitleList = null; }
        showLog('🗑️ 字幕已清除');
    }

    function isDetailPlayerCandidate(video) {
        if (!video) return false;
        const wrapper = video.closest('.plyr') || video.parentElement;
        if (!wrapper) return false;
        const rect = wrapper.getBoundingClientRect();
        const area = rect.width * rect.height;
        return rect.width >= 520 && rect.height >= 280 && area >= 180000;
    }

    function findDetailVideo() {
        const videos = Array.from(document.querySelectorAll('video'));
        const candidates = videos.filter(isDetailPlayerCandidate).sort((a, b) => {
            const ra = a.getBoundingClientRect();
            const rb = b.getBoundingClientRect();
            return (rb.width * rb.height) - (ra.width * ra.height);
        });
        return candidates[0] || null;
    }

    function initPlayer() {
        if (playerReady) return;
        const checkPlayer = setInterval(() => {
            const video = findDetailVideo();
            if (!video) return;
            const wrapper = video.closest('.plyr__video-wrapper') || video.closest('.plyr') || video.parentElement;
            if (!wrapper) return;

            clearInterval(checkPlayer);
            videoElement = video;
            videoContainer = wrapper;
            playerReady = true;

            if (typeof unsafeWindow !== 'undefined' && unsafeWindow.player) {
                player = unsafeWindow.player;
                try {
                    const nativePause = HTMLVideoElement.prototype.pause;
                    unsafeWindow.player.pause = () => {
                        if (document.hasFocus()) nativePause.call(videoElement);
                    };
                } catch (_) {}
            } else if (video.plyr) {
                player = video.plyr;
            } else {
                player = video;
            }

            subtitleElement = document.createElement('div');
            subtitleElement.className = 'custom-subtitle';
            subtitleElement.style.display = 'none';
            videoContainer.appendChild(subtitleElement);

            createPlayerQuickControls();

            videoElement.addEventListener('play', updatePlayPauseButton);
            videoElement.addEventListener('pause', updatePlayPauseButton);
            videoElement.addEventListener('ended', updatePlayPauseButton);
            videoElement.addEventListener('loadedmetadata', updatePlayPauseButton);

            startSubtitleLoop();
            setupDoubleClickSeek();
            showLog('▶️ 详情页播放器及控制面板初始化完成');
        }, 500);
        setTimeout(() => clearInterval(checkPlayer), 12000);
    }

    function startSubtitleLoop() {
        cancelAnimationFrame(subtitleRAF);
        const loop = () => {
            updateSubtitle(false);
            subtitleRAF = requestAnimationFrame(loop);
        };
        subtitleRAF = requestAnimationFrame(loop);
    }

    function updateSubtitle(forceUpdate = false) {
        if (!subtitles.length || !subtitleElement || !videoElement) return;
        const currentTime = getCurrentTime();
        let sub = null;
        if (currentSubIndex >= 0 && currentSubIndex < subtitles.length) {
            const current = subtitles[currentSubIndex];
            if (currentTime >= current.start && currentTime <= current.end) sub = current;
        }
        if (!sub) {
            let low = 0, high = subtitles.length - 1;
            while (low <= high) {
                const mid = (low + high) >> 1;
                const item = subtitles[mid];
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
            const seekAmount = 10;
            if (x < rect.width / 2) { seek(-seekAmount); showLog(`⏪ 双击：-${seekAmount} 秒`); }
            else { seek(seekAmount); showLog(`⏩ 双击：+${seekAmount} 秒`); }
        });
    }

    function setupShortcuts() {
        document.addEventListener('keydown', event => {
            const target = event.target;
            if (target?.matches?.('input,textarea,select,[contenteditable="true"]')) return;
            if (!player || !videoElement) return;
            const key = event.key.toLowerCase();

            if (event.code === 'Space') {
                event.preventDefault();
                if (!event.repeat) togglePlayPause();
                return;
            }
            if (key === settings.shortcutKeys.accelerate) {
                if (acceleratePressed || event.repeat) return;
                speedBeforeAccelerate = Number.isFinite(videoElement.playbackRate) ? videoElement.playbackRate : 1;
                videoElement.playbackRate = settings.accelerationRate;
                acceleratePressed = true;
                showLog(`⏩ 临时加速 ${settings.accelerationRate}x`);
                return;
            }
            if (key === settings.shortcutKeys.forward) {
                seek(settings.skipTime);
                showLog(`⏩ 快进 ${settings.skipTime} 秒`);
                return;
            }
            if (key === settings.shortcutKeys.backward) {
                seek(-settings.skipTime);
                showLog(`⏪ 倒退 ${settings.skipTime} 秒`);
            }
        });
        document.addEventListener('keyup', event => {
            if (event.key.toLowerCase() !== settings.shortcutKeys.accelerate || !acceleratePressed || !videoElement) return;
            videoElement.playbackRate = speedBeforeAccelerate;
            acceleratePressed = false;
        });
    }

    function getCurrentVideoID() {
        if (IS_JABLE) {
            return location.pathname.match(/\/videos\/([^/]+)/)?.[1] || null;
        }
        const parts = location.pathname.split('/').filter(Boolean);
        if (!parts.length) return '';
        const last = parts[parts.length - 1];
        const matched = last.match(/([a-zA-Z]+-\d+|[a-zA-Z]+\d+-\d+|[a-zA-Z]+\d+[a-zA-Z]+-\d+)/i);
        return matched?.[1] || last;
    }

    function searchSubtitleWeb() {
        const videoID = getCurrentVideoID();
        if (!videoID) { showLog('⚠️ 无法识别视频番号'); return; }
        GM_openInTab(`https://subtitlecat.com/index.php?search=${encodeURIComponent(videoID)}`, { active: true });
    }

    async function requestText(url, timeout = 15000) {
        return new Promise((resolve, reject) => {
            GM_xmlhttpRequest({
                method: 'GET',
                url,
                timeout,
                onload: response => response.status === 200
                    ? resolve(response.responseText)
                    : reject(new Error(`HTTP ${response.status}`)),
                onerror: () => reject(new Error('网络错误')),
                ontimeout: () => reject(new Error('请求超时'))
            });
        });
    }

    async function searchSubtitleAPI() {
        const videoID = getCurrentVideoID();
        if (!videoID) { showLog('⚠️ 无法获取视频ID'); return; }
        showLog('🔍 正在搜索字幕...');
        try {
            const text = await requestText(`https://api-shoulei-ssl.xunlei.com/oracle/subtitle?name=${encodeURIComponent(videoID)}`, 10000);
            const data = JSON.parse(text);
            const items = Array.isArray(data?.data) ? data.data : [];
            const validSubs = items.filter(item =>
                item?.url && /\.srt(?:$|\?)/i.test(item.url) &&
                String(item.name || '').toUpperCase().includes(videoID.toUpperCase())
            );
            if (data?.code === 0 && validSubs.length) showSubtitleList(validSubs);
            else showLog('⚠️ 未找到完全匹配的SRT字幕');
        } catch (error) {
            showLog(`❌ API错误: ${error.message}`);
        }
    }

    function showSubtitleList(items) {
        subtitleList?.remove();
        subtitleList = document.createElement('div');
        subtitleList.className = 'subtitle-list';
        const header = document.createElement('div');
        header.style.cssText = 'color:#60a5fa;margin-bottom:10px;font-weight:bold;display:flex;justify-content:space-between;align-items:center;';
        const title = document.createElement('span');
        title.textContent = `选择要加载的字幕 (${items.length})`;
        const close = document.createElement('span');
        close.textContent = '[关闭]';
        close.style.cssText = 'cursor:pointer;color:#94a3b8;';
        close.onclick = () => { subtitleList?.remove(); subtitleList = null; };
        header.append(title, close);
        subtitleList.appendChild(header);
        items.forEach(item => {
            const div = document.createElement('div');
            div.className = 'subtitle-item';
            div.textContent = `📄 ${item.name} (${item.extra_name || '网络节点'})`;
            div.onclick = () => loadRemoteSubtitle(item.url);
            subtitleList.appendChild(div);
        });
        document.body.appendChild(subtitleList);
    }

    async function loadRemoteSubtitle(url) {
        showLog('⏳ 正在下载字幕...');
        try {
            const content = await requestText(url, 15000);
            originalSubtitleText = content;
            subtitles = await parseSRT(content);
            currentSubIndex = -1;
            activeSubText = '';
            updateSubtitle(true);
            subtitleList?.remove();
            subtitleList = null;
            showLog(`✅ 在线字幕加载成功：${subtitles.length} 条`);
        } catch (error) {
            showLog(`❌ 字幕加载失败: ${error.message}`);
        }
    }

    function saveSettings() {
        localStorage.setItem(STORAGE + 'accRate', String(settings.accelerationRate));
        localStorage.setItem(STORAGE + 'skipTime', String(settings.skipTime));
        localStorage.setItem(STORAGE + 'offset', String(settings.subtitleOffset));
        localStorage.setItem(STORAGE + 'keyAcc', settings.shortcutKeys.accelerate);
        localStorage.setItem(STORAGE + 'keyFwd', settings.shortcutKeys.forward);
        localStorage.setItem(STORAGE + 'keyBwd', settings.shortcutKeys.backward);
    }

    function removeAds() {
        const selectors = [
            'div[class^="root"]',
            'div[class*="fixed"][class*="right-"][class*="bottom-"]',
            'div[class*="pt-"][class*="pb-"][class*="px-"]:not([class*="sm:"])',
            'div[class*="lg:hidden"]',
            'div[class*="lg:block"]',
            'div.ts-outstream-video',
            'iframe',
            'ul.mb-4.list-none.text-nord14',
            '.prose',
            'img[alt="MissAV takeover Fanza"]'
        ];
        document.querySelectorAll(selectors.join(',')).forEach(element => {
            if (element === videoContainer || element.contains(videoContainer)) return;
            if (element.tagName.toLowerCase() === 'iframe') element.remove();
            else element.style.display = 'none';
        });
    }

    function convertTagsToLinks() {
        const origin = location.origin;
        document.querySelectorAll('div.flex-1.min-w-0').forEach(container => {
            const h2 = container.querySelector('h2');
            if (!h2 || h2.querySelector('a')) return;
            const text = h2.textContent.trim();
            if (!text) return;
            const link = document.createElement('a');
            link.href = `${origin}/genres/${encodeURIComponent(text)}`;
            link.textContent = text;
            h2.textContent = '';
            h2.appendChild(link);
        });
    }

    async function fetchActressInfo(url) {
        if (actressCache.has(url)) return actressCache.get(url);
        const promise = fetch(url)
            .then(response => response.text())
            .then(html => {
                const doc = new DOMParser().parseFromString(html, 'text/html');
                return {
                    image: doc.querySelector('.bg-norddark img')?.src || '',
                    profileHTML: doc.querySelector('.font-medium.text-lg.leading-6')?.outerHTML || ''
                };
            })
            .catch(() => null);
        actressCache.set(url, promise);
        return promise;
    }

    function setupActressHover() {
        document.querySelectorAll('.space-y-2 > div:nth-child(4) a').forEach(link => {
            if (link.dataset.hasPreview === 'true') return;
            link.dataset.hasPreview = 'true';
            const actressUrl = link.href;
            fetchActressInfo(actressUrl).then(info => {
                if (!info) return;
                const profileDiv = document.createElement('div');
                profileDiv.className = 'ChinaGodMan';
                profileDiv.style.cssText = 'display:none;position:absolute;background:rgba(0,0,0,.9);color:#fff;padding:10px;border-radius:8px;z-index:10000;border:1px solid rgba(255,255,255,.2);box-shadow:0 8px 24px rgba(0,0,0,.5);';
                if (info.image) {
                    const avatar = document.createElement('img');
                    avatar.src = info.image;
                    avatar.width = 20;
                    avatar.height = 20;
                    avatar.style.cssText = 'display:inline-block;vertical-align:middle;border-radius:50%;margin-right:4px;object-fit:cover;';
                    link.prepend(avatar);
                    const preview = document.createElement('img');
                    preview.src = info.image.replace('-t', '');
                    preview.alt = 'preview';
                    preview.style.cssText = 'display:block;max-width:200px;max-height:280px;object-fit:cover;border-radius:4px;margin-bottom:8px;';
                    profileDiv.appendChild(preview);
                }
                if (info.profileHTML) {
                    const wrapper = document.createElement('div');
                    wrapper.innerHTML = info.profileHTML;
                    const profile = wrapper.firstElementChild;
                    if (profile) {
                        const saveBtn = profile.querySelector('div.hero-pattern button');
                        if (saveBtn) saveBtn.remove();
                        profileDiv.appendChild(profile);
                    }
                }
                link.parentElement?.appendChild(profileDiv);
                const hideAll = () => {
                    document.querySelectorAll('.ChinaGodMan').forEach(el => {
                        if (el !== profileDiv) el.style.display = 'none';
                    });
                };
                link.addEventListener('mouseenter', () => {
                    hideAll();
                    const rect = link.getBoundingClientRect();
                    profileDiv.style.left = `${rect.left + window.scrollX}px`;
                    profileDiv.style.top = `${rect.bottom + window.scrollY + 5}px`;
                    profileDiv.style.display = 'block';
                });
                profileDiv.addEventListener('mouseleave', () => { profileDiv.style.display = 'none'; });
            });
        });
    }

    function throttle(fn, delay) {
        let timer = 0;
        let lastArgs = null;
        return (...args) => {
            lastArgs = args;
            if (timer) return;
            timer = setTimeout(() => {
                timer = 0;
                const argsToUse = lastArgs;
                lastArgs = null;
                fn(...argsToUse);
            }, delay);
        };
    }

    function initPage() {
        const meta = document.createElement('meta');
        meta.name = 'theme-color';
        meta.content = '#090811';
        document.head.appendChild(meta);

        createControlPanel();
        setupShortcuts();
        initPlayer();

        const showMore = document.querySelector('a.text-nord13.font-medium.flex.items-center');
        showMore?.click();

        setupActressHover();
        removeAds();
        convertTagsToLinks();

        const observer = new MutationObserver(throttle(() => {
            removeAds();
            convertTagsToLinks();
            setupActressHover();
            if (!playerReady) initPlayer();
        }, 500));
        observer.observe(document.body || document.documentElement, { childList: true, subtree: true });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initPage, { once: true });
    } else {
        initPage();
    }
})();
