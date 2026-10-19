# 🚀 MissAV & Jable 综合增强助手

![Version](https://img.shields.io/badge/version-13.20-blue.svg)
![Platform](https://img.shields.io/badge/platform-PC%20(Desktop)-orange.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)

# MissAV & Jable 综合增强助手

支持 MissAV 与 Jable 

移动端/桌面端双识别：自动判断运行环境并切换到对应的策略。广告清理、字幕加载/偏移/字号高度、音量增强与音频设备路由、站点独立记忆与统计、倍速与HUD、原生画中画、剧照画廊、评分徽章、短评聚合、女优社交直达、观影行为数据大屏、断点续播、内容过滤与屏蔽、切屏检测屏蔽、站内自动登录、收藏批量备份、临时加速、快进倒退、区间循环、可拖拽可隐藏UI、实时日志；移动端专属：屏幕常亮、锁屏与耳机键控制、双击视频左右两侧快进快退


## 安装

1. 安装 Tampermonkey 扩展
2. 新建脚本，粘贴脚本全文并保存
3. 打开站点自动生效，播放页左上角为控制面板

## 数据与隐私

所有配置与统计只存在本机，走油猴 GM_setValue 或 localStorage，键名统一前缀 avSub:，不上传任何服务器。
登录密码优先写入油猴存储；降级方案为 XOR + Base64 混淆，仅用于规避明文，不等同于加密，是否保存请自行判断。
跨站请求只用于字幕检索、评分 / 剧照 / 短评补全、收藏备份，统一走 GM_xmlhttpRequest。
「清空已看库」只影响当前站点，不会波及其它站点。




使用前请确认所在地区法律与站点条款。
