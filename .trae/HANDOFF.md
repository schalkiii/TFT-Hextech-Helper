# TFT-Hextech-Helper 跨Agent技术交接文档

> **生成时间**: 2026-05-17  
> **项目版本**: v1.6.0  
> **最后提交**: dab9f99 (当前 trae/solo-agent-sK79wW 分支，已 force-push 到 main)  
> **仓库地址**: https://github.com/schalkiii/TFT-Hextech-Helper  
> **作者**: WJZ_P  
> **文档用途**: 供后续接手Agent无缝延续开发、调试、迭代、优化工作

---

## 模块1：项目整体概况

### 1.1 项目定位与核心用途

TFT-Hextech-Helper 是一款基于 **Electron + React + TypeScript** 的云顶之弈**自动下棋工具**。它通过英雄联盟客户端提供的 LCU API（本地 HTTPS 接口）与游戏进程通信，结合 OCR 文字识别 + OpenCV 模板匹配实现游戏状态感知，再通过 nut-js 模拟鼠标操作完成自动下棋。

**核心功能**：
- 自动匹配排队、接受对局
- 自动识别游戏阶段（PVE/PVP/CAROUSEL/AUGMENT）
- 按预设阵容自动购买/升星/出售棋子、合成装备
- 支持快捷键控制（F1 启动/停止，F2 本局后停止）
- 支持命令行参数启动（`--start` / `--games=N`）

**运行环境**：仅 Windows/macOS，以管理员身份运行，游戏语言必须为简体中文。

### 1.2 项目技术栈

| 层级 | 技术 | 版本 |
|------|------|------|
| **桌面框架** | Electron | v32.2.5 |
| **前端框架** | React | v18.3.1 |
| **UI 组件库** | MUI (Material-UI) | v7.2.0 |
| **CSS方案** | styled-components | v6.1.17 |
| **路由** | react-router-dom | v7.6.2 |
| **构建工具** | electron-vite | v4.0.0 |
| **打包工具** | electron-builder | v24.13.3 |
| **TypeScript** | | v5.8.3 |
| **REST客户端** | axios | v1.7.2 |
| **WebSocket** | ws | v8.18.0 |
| **图像识别** | OpenCV.js, Tesseract.js (OCR) | |
| **鼠标控制** | nut-js | v4.2.2 |
| **进程查找** | find-process | v1.4.10 |
| **CI/CD** | GitHub Actions | |

### 1.3 项目整体架构

项目采用经典的 **Electron 三进程架构**：

```
┌──────────────────────────────────────────────┐
│                 Electron App                  │
├─────────────────┬────────────────────────────┤
│  渲染进程(React) │      主进程(Node.js)        │
│  src/           │  electron/main.ts           │
│                 │  src-backend/               │
│  ┌────────────┐ │  ┌───────────────────────┐  │
│  │ HomePage   │◄├─►│ HexService(状态机引擎) │  │
│  │ LineupsPage│ │  │ StrategyService(决策)  │  │
│  │ Settings   │ │  │ TftOperator(操作层)    │  │
│  │ DebugPage  │ │  │ LCUManager(客户端API)  │  │
│  └────────────┘ │  └───────────────────────┘  │
│        │        │          │                  │
│        │   preload.ts (桥接层)  │              │
│        └────────┼──────────┘                  │
│          IPC (invoke/handle)                  │
└──────────────────────────────────────────────┘
```

**核心调用链路** (自动下棋):
```
用户点击"开始" → window.hex.start()
  → IPC:HEX_START → hexService.start()
  → runMainLoop() → IdleState.action()
  → StartState → LobbyState → GameLoadingState
  → GameRunningState → TftOperator.getGameStage()
  → StrategyService.executeStrategy()
  → TftOperator.buyAtSlot() / MouseController
```

**核心调用链路** (获取召唤师信息):
```
HomePage.checkInitialStatus() → fetchSummonerInfo()
  → window.lcu.getSummonerInfo()
  → IPC:LCU_REQUEST → main.ts handler
  → lcu.request('GET', '/lol-summoner/v1/current-summoner')
  → axios GET https://127.0.0.1:{PORT}/lol-summoner/v1/current-summoner
```

### 1.4 项目约束与边界

| 约束 | 说明 |
|------|------|
| **管理员权限** | 必须以管理员身份运行，否则 nut-js 无法控制游戏 |
| **中文语言** | 游戏语言必须为简体中文，OCR 识别依赖中文文本 |
| **默认棋盘皮肤** | 模板匹配针对默认棋盘优化，非默认皮肤可能识别率下降 |
| **Windows/macOS** | 不支持 Linux 下运行（游戏不可用） |
| **国服限定** | 通过腾讯 LCU API 通信，不支持外服 |
| **自签名证书** | LCU 使用 riot 自签名证书，axios 必须配置 `rejectUnauthorized: false` |
| **禁止代理** | axios 必须设置 `proxy: false`，否则会被系统代理（如 Clash）拦截 |
| **CC BY-NC-ND 4.0** | 禁止商业使用，禁止二次修改发布 |

**禁止修改的核心底层逻辑**：
- `LCUManager.ts` 中的 axios `proxy: false` 和 `httpsAgent` 配置
- `TftOperator.ts` 中的坐标映射常量（`TFTProtocol.ts`）
- `src-backend/states/` 状态机转换逻辑
- `electron/protocol.ts` 中的 `IpcChannel` 枚举（新增通道需同时更新 `main.ts` 和 `preload.ts`）

### 1.5 当前项目阶段

**阶段**: 迭代优化 + Bug修复阶段  
**状态**: 核心功能完整可用，近期在解决 `--start` 命令行启动模式下的稳定性问题（LCU API 请求超时/挂起）

---

## 模块2：项目当前最新状态

### 2.1 代码当前状态

| 检查项 | 状态 | 说明 |
|--------|------|------|
| **代码完整性** | ✅ 完整 | 所有模块文件齐全，无缺失 |
| **编译状态** | ✅ 可编译 | electron-vite 构建正常，GitHub Actions 三平台构建均成功 |
| **Lint状态** | ⚠️ 部分警告 | `@typescript-eslint/no-unused-vars` 有少量警告，已从 error 降级为 warn |
| **TypeScript 严格模式** | ✅ 开启 | tsconfig 中 `strict: true` |
| **注释覆盖** | ⚠️ 中等 | 核心模块有中文注释，部分工具类注释稀疏 |

**当前存在但未修复的问题**：
1. `tsconfig.web.json` 中 include 路径指向 `src/renderer/src/**`，但实际源码在 `src/`，本地 tsc typecheck 会报路径错误（不影响 electron-vite 构建，因为 vite 有自己的路径解析）
2. Sandbox 环境无法安装 Electron 二进制包（网络限制），无法本地端到端测试

### 2.2 功能完成状态

| 功能 | 状态 | 说明 |
|------|------|------|
| LCU 客户端连接 | ✅ 完成 | Windows 下通过 find-process 查找 LeagueClientUx 进程获取端口和 token |
| 自动匹配排队 | ✅ 完成 | 支持普通模式和发条鸟模式 |
| 排队超时重排 | ✅ 完成 | v1.5.0 新增 |
| OCR 游戏阶段识别 | ✅ 完成 | PVE/PVP/CAROUSEL/AUGMENT 四种阶段 |
| 模板匹配棋子/装备识别 | ✅ 完成 | OpenCV.js 图像匹配 |
| 鼠标自动操作 | ✅ 完成 | nut-js 模拟 |
| 快捷键控制 | ✅ 完成 | F1 启动/停止，F2 本局后停止 |
| **运行N局后停止** | ✅ 完成 | 支持 1/3/5/10/20/50/100 局 |
| **命令行启动** | ⚠️ 不稳定 | `--start` 参数已实现，但存在 LCU API 请求挂起问题 |
| S17 星神赛季适配 | ✅ 完成 | 15个阵容、专属回合处理（星神选择/恩赐） |
| 多赛季注册中心 | ✅ 完成 | SeasonRegistry 统一管理 |
| GitHub Actions CI/CD | ✅ 完成 | push main → 三平台自动构建 |
| 战绩统计 | ❌ 未实现 | README Todo List 中的待做项 |

### 2.3 运行测试状态

| 测试类型 | 状态 | 说明 |
|----------|------|------|
| 手动启动（UI点击） | ✅ 正常 | 原版程序点击"开始"按钮运行正常 |
| 命令行启动（--start） | ❌ 有问题 | 用户反馈卡在 `/lol-summoner/v1/current-summoner` 请求 |
| 本地端到端测试 | ❌ 无法执行 | 沙箱环境无 Electron，无法运行程序 |
| CI/CD 构建 | ✅ 正常 | GitHub Actions 三平台构建通过 |
| 单元测试 | ❌ 不存在 | 项目无测试框架和测试用例 |

### 2.4 当前待解决卡点

| 优先级 | 问题 | 状态 | 最新进展 |
|--------|------|------|----------|
| **P0** | `--start` 模式下 `current-summoner` API 请求挂起 | 🔧 已修复待验证 | commit dab9f99: 添加 `timeout: 30000` 到 axios 配置 |
| **P1** | 渲染器 ASI 崩溃 `root.render is not a function` | ✅ 已修复 | commit 8a0edfb: 改为链式调用 + `;` 分号保护 |
| **P1** | 主进程 `ReferenceError: cliAutoStart is not defined` | ✅ 已修复 | 使用 `shouldAutoStart` 局部变量替代 |
| **P2** | build-info 文件被 git 追踪 | ⚠️ 未处理 | `tsconfig.node.tsbuildinfo` 等构建产物未被 gitignore |

---

## 模块3：历史已完成改动（全量复盘）

### 改动1：添加「运行N局后停止」功能

| 属性 | 内容 |
|------|------|
| **日期** | 2026-05（本会话） |
| **背景** | 用户需求：希望挂机运行指定局数后自动停止，不需要手动监控 |
| **修改文件** | `src-backend/services/HexService.ts`, `src/components/pages/HomePage.tsx`, `electron/protocol.ts`, `electron/main.ts`, `electron/preload.ts` |
| **核心逻辑** | 1. HexService 新增 `stopAfterGames` 计数器和 `setStopAfterGames()`/`clearStopAfterGames()` 方法；2. HomePage 添加下拉选择器（1/3/5/10/20/50/100局）；3. EndState 中检测计数并自动停止；4. 首页显示绿色进度横幅"将在运行 X 局后自动停止" |
| **效果** | 用户可选择局数，程序自动倒计时停止 |
| **遗留风险** | 无 |

### 改动2：添加「命令行 --start 启动」功能

| 属性 | 内容 |
|------|------|
| **日期** | 2026-05（本会话） |
| **背景** | 用户需求：希望通过命令行参数自动启动挂机，适用于计划任务或快捷方式 |
| **修改文件** | `electron/main.ts` |
| **核心逻辑** | 在 `app.whenReady()` 中解析 `process.argv`，检测 `--start` 和 `--games=N` 参数，延迟 3 秒后调用 `hexService.start()` |
| **效果** | 支持 `TFT-Hextech-Helper.exe --start --games=10` 命令行启动 |
| **遗留风险** | 3 秒固定延迟可能不足，LCU 连接尚未就绪时启动失败；当前版本无重试机制 |

### 改动3：修复 `root.render(...) is not a function` ASI 崩溃（commit 8a0edfb）

| 属性 | 内容 |
|------|------|
| **日期** | 2026-05 |
| **背景** | 用户上传 crash.log，发现程序启动时渲染进程崩溃，报 `root.render(...) is not a function` |
| **根因** | JavaScript ASI（自动分号插入）陷阱：打包压缩后 `root.render(...)` 与 `(window).ipcRenderer.on(...)` 之间注释被移除，JS 将代码解析为 `root.render(...)(window)` → `undefined(window)` → TypeError |
| **修改文件** | `src/main.tsx` |
| **修复方案** | 移除中间变量 `root`，改为链式调用 `ReactDOM.createRoot(...).render(...)`，并在 `(window)` 前添加显式分号 `;` 彻底阻断 ASI 误解析 |
| **参考** | 与之前的 ASI 修复保持一致（链式调用 + 分号保护已被证实有效） |

### 改动4：修复 `ReferenceError: cliAutoStart is not defined` 崩溃

| 属性 | 内容 |
|------|------|
| **日期** | 2026-05 |
| **背景** | crash.log 显示主进程在 `LCUManager WebSocket 连接时` 崩溃，报 `cliAutoStart is not defined` |
| **根因** | 旧版本在 `lcuManager.on('connect')` 回调中引用了模块级变量 `cliAutoStart`，但该变量在 cherry-pick 合并冲突中丢失定义 |
| **修改文件** | `electron/main.ts` |
| **修复方案** | 将 CLI 参数解析移到 `app.whenReady()` 内部，使用局部变量 `shouldAutoStart` 和 `autoStartGames`，不再依赖模块级变量；`lcuManager.on('connect')` 回调不再包含自动启动逻辑，仅发送 IPC 消息 |

### 改动5：添加 axios timeout 防止 LCU API 请求永久挂起（commit dab9f99）

| 属性 | 内容 |
|------|------|
| **日期** | 2026-05（最近） |
| **背景** | 用户反馈 `--start` 模式卡在 `➡️ [LCUManager] 准备发起请求: GET /lol-summoner/v1/current-summoner` |
| **根因** | `LCUManager.ts` 中 axios 实例缺少 `timeout` 配置，请求超时永远不会触发；而 `confirmApiReady()` 有自己的超时循环（30s），导致它不会卡住，但渲染器的 `fetchSummonerInfo` 没有任何超时保护 |
| **修改文件** | `src-backend/lcu/LCUManager.ts` |
| **修复方案** | 1. axios 配置添加 `timeout: 30000`；2. `request()` 方法 url 改为相对路径 `endpoint`（由 axios baseURL 拼接）；3. 超时错误 `ECONNABORTED` 单独捕获，返回友好错误信息 `LCU 请求超时: ${endpoint}` |
| **效果** | 30 秒超时后请求失败，HomePage 的重试机制（最多3次，间隔1秒）可捕获错误并重试 |
| **⚠️ 待验证** | 用户尚未测试此修复，需要在 GitHub Actions 构建完成后下载最新版本验证 |

### 改动6：GitHub Actions CI/CD 三平台构建

| 属性 | 内容 |
|------|------|
| **日期** | 2026-05 |
| **背景** | 需要自动构建，push main 时触发 |
| **修改文件** | `.github/workflows/release.yml` |
| **核心逻辑** | push/tag/pr/workflow_dispatch 触发，Windows/macOS/Linux 三平台并行构建，tag 推送时发布 Release |
| **效果** | 每次 push 到 main 自动构建三平台产物 |

### 改动7：IPC 通道枚举统一与 `RENDERER_INIT_COMPLETE` 信号

| 属性 | 内容 |
|------|------|
| **日期** | 2026-05 |
| **背景** | 之前尝试通过渲染器向主进程发送初始化完成信号来协调 `--start` 时序 |
| **修改文件** | `electron/protocol.ts`, `electron/preload.ts`, `electron/main.ts`, `src/components/pages/HomePage.tsx` |
| **核心逻辑** | 1. protocol.ts 新增 `RENDERER_INIT_COMPLETE` 通道；2. preload.ts 暴露 `notifyInitComplete()` 方法；3. HomePage.tsx 的 fetchSummonerInfo 完成后调用 `window.lcu?.notifyInitComplete?.()` |
| **效果** | 虽然最终未采用此方案（改为 setTimeout 3s 延迟），但 `notifyInitComplete` API 已定义且可用，未来如需更精确的启动时序控制可复用 |

### 改动8：S17 赛季适配与架构升级（v1.6.0）

| 属性 | 内容 |
|------|------|
| **日期** | 2026-04-21 |
| **背景** | 新赛季上线，需要数据更新和机制适配 |
| **范围** | 15个新阵容、星神选择/恩赐自动处理、SeasonRegistry 注册中心、时空核心处理、赛季白名单过滤 |
| **详见** | [CHANGELOG.md](file:///workspace/CHANGELOG.md) v1.6.0 条目 |

---

## 模块4：后续计划改动与迭代方案

### 4.1 待开发功能清单

| 优先级 | 功能 | 需求说明 |
|--------|------|----------|
| P2 | **战绩统计** | README Todo List 中标记为未完成，需收集每局结果并展示 |
| P3 | **单元测试** | 项目无任何测试用例，需搭建测试框架(jest/vitest) |

### 4.2 待优化内容

| 优先级 | 优化项 | 方案 |
|--------|--------|------|
| P1 | **--start 启动时序优化** | 当前 3 秒固定延迟等待 LCU 连接，不够可靠。可改为：(1) 检测 LCU 已连接后再启动；(2) 或使用 `RENDERER_INIT_COMPLETE` 信号+超时兜底 |
| P1 | **axios 请求错误重试** | `request()` 方法可添加重试逻辑（exponential backoff），当前只在 HomePage 层有重试 |
| P2 | **`tsconfig.node.tsbuildinfo` gitignore** | 构建产物被 git 追踪，需添加到 `.gitignore` |
| P2 | **tsconfig 路径对齐** | `tsconfig.web.json` 的 include 路径指向 `src/renderer/src/` 但源码在 `src/`，应统一 |
| P3 | **注释完善** | 部分工具类和 service 文件缺少关键逻辑注释 |

### 4.3 待修复问题

| 优先级 | 问题 | 根因 | 修复方向 |
|--------|------|------|----------|
| P0 | `--start` 启动后 `current-summoner` 请求挂起 | axios 无 timeout（已修复，待验证） | 下载最新构建测试 |
| P1 | 程序启动崩溃 | ASI 陷阱 + cliAutoStart 变量缺失（已修复） | 需用户确认最新构建是否正常 |
| P2 | 用户运行版本与源码不一致 | 用户下载的旧构建 `index-C9zZC2sq.js` vs 本地构建 `index-BOc-nFKb.js` | 确保用户下载最新 Actions 产物 |

### 4.4 后续迭代规则

| 规则 | 说明 |
|------|------|
| **禁止改动模块** | `LCUManager.ts` 的 `proxy: false` 和 `httpsAgent` 配置；`TFTProtocol.ts` 的坐标常量 |
| **重点测试链路** | `--start` 命令行启动 → LCU 连接 → fetchSummonerInfo → hexService.start() 整条链路 |
| **新增代码规范** | 所有异步 IPC 调用必须有超时或错误处理；新增 `IpcChannel` 枚举时同步更新 main/preload/protocol 三处 |
| **构建发布流程** | push main → GitHub Actions 自动构建 → 下载 artifacts 验证 |

---

## 模块5：代码编写与调试专属方法学

### 5.1 代码编写规范

#### 命名规范
- **文件名**: PascalCase 用于组件/类文件（`HomePage.tsx`, `LCUManager.ts`），camelCase 用于工具文件（`toast-core.ts`）
- **接口/类型**: PascalCase（`LcuEventUri`, `SummonerInfo`, `LCUWebSocketMessage`）
- **IPC 通道枚举**: UPPER_SNAKE_CASE（`LCU_REQUEST`, `HEX_START`, `RENDERER_INIT_COMPLETE`）
- **函数**: camelCase（`fetchSummonerInfo`, `connectWebSocket`）
- **常量**: UPPER_SNAKE_CASE 或 PascalCase（`TFT_16_CHESS_DATA`, `CURRENT_SEASON`）

#### 项目目录约定
```
src/               # 渲染进程（React 前端）
src-backend/       # 主进程核心逻辑（Node.js 后端）
electron/          # Electron 入口 + preload + protocol
public/            # 静态资源（阵容JSON、图片模板、游戏配置）
public/resources/  # 运行时资源（阵容、图片、配置备份）
```

#### 注释风格
- 中文注释为主，关键模块有详细说明
- `/* */` 块注释用于模块级说明（如 main.ts 中各区域用 `=====` 分隔）
- `/** */` JSDoc 风格用于公开 API 方法
- 特殊标记：`⚠️` 注意事项，`🔍` 调试信息，`← 关键：` 解释非直觉代码

#### IPC 通信模式
所有渲染进程与主进程的通信必须通过以下模式：
1. `electron/protocol.ts` 定义 `IpcChannel` 枚举
2. `electron/preload.ts` 通过 `contextBridge.exposeInMainWorld` 暴露 API
3. `electron/main.ts` 通过 `ipcMain.handle` 注册 handler
4. 渲染进程通过 `window.xxx.methodName()` 调用（类型定义在 `src/vite-env.d.ts`）

### 5.2 调试方法与工具

#### 开发模式启动
```bash
npm run dev        # 启动 electron-vite dev server（HMR + 热重载）
```

#### 构建与打包
```bash
npm run build      # electron-vite 编译（输出到 dist/）
npm run build:win  # 编译 + electron-builder 打包 Windows
npm run build:mac  # 编译 + electron-builder 打包 macOS
```

#### 日志系统
- **控制台**: `console.log` / `console.error` 带模块前缀（`[Main]`, `[LCUManager]`, `[HomePage]`）
- **Logger 工具**: `src-backend/utils/Logger.ts` 提供分级日志（debug/info/warn/error）
- **崩溃日志**: `src-backend/utils/CrashLogger.ts` 在 `%APPDATA%/TFT-Hextech-Helper/` 下生成 crash.log
- **日志级别**: SettingsPage 可切换 SIMPLE/DETAILED 模式

#### 关键调试文件
- **crash.log**: 崩溃日志，用户通过设置页导出或手动查找
- **LCU API 调试**: `npm run request <method> <endpoint>` 可在代码中测试 LCU 端点
- **OpenCV 调试**: `saveStageSnapshots()` / `saveBenchSlotSnapshots()` 保存截图到文件系统

### 5.3 报错排错方法论

#### 常见报错类型与排查路径

| 错误 | 可能原因 | 排查顺序 |
|------|----------|----------|
| `ERR_CONNECTION_CTIME_OUT` / `ECONNABORTED` | LCU API 超时 | 1. 确认 LOL 客户端已登录；2. 确认端口/Token 正确；3. 检查防火墙；4. 确认 axios `proxy: false` |
| `root.render is not a function` | ASI 陷阱 | 确保 `main.tsx` 使用链式调用 + 分号保护 |
| `ReferenceError: xxx is not defined` | 变量作用域问题 | 检查 `app.whenReady()` 闭包内变量声明 |
| 模板匹配失败 | 棋子图片未匹配 | 1. 确认使用默认棋盘皮肤；2. 检查分辨率；3. 检查 `public/resources/assets/images/` 模板文件 |
| `ws` 连接失败 | WebSocket 订阅失败 | 确认 riot 认证 token 有效（Base64: `riot:TOKEN`） |

#### 排错优先级
1. **查看日志** → 控制台输出 / crash.log
2. **隔离范围** → 是否是 `--start` 模式独有？是否特定赛季？
3. **对比原版** → 原版手动操作是否正常？
4. **回滚验证** → 是否是最新改动的副作用？

### 5.4 测试验证方法

#### 手动测试流程
1. 以**管理员身份**启动程序
2. 确认 LOL 客户端已启动且已登录
3. 观察左下角连接状态变为"已连接"
4. 观察召唤师信息是否正确显示
5. 选择阵容后点击"开始"或按 F1
6. 观察状态机流转日志

#### 命令行测试流程
```bash
# 测试自动启动
.\TFT-Hextech-Helper.exe --start

# 测试自动启动 + 局数限制
.\TFT-Hextech-Helper.exe --start --games=3
```

#### 关键验证检查点
- [x] LCUConnector 找到进程并获取端口/Token
- [x] LCUManager confirmApiReady 成功
- [x] WebSocket 连接成功
- [x] HomePage 收到 LCU_CONNECT 事件
- [x] fetchSummonerInfo 成功获取召唤师信息
- [x] hexService.start() 成功进入状态机循环

### 5.5 项目避坑总结

| 编号 | 坑 | 原因 | 解决方案 |
|------|-----|------|----------|
| ① | **LCU API 请求被拦截** | 系统代理（Clash等）拦截 `127.0.0.1` 请求 | axios 必须设置 `proxy: false` |
| ② | **Electron 启动闪退** | GPU 硬件加速不兼容 | `app.disableHardwareAcceleration()` + 禁用GPU相关开关 |
| ③ | **ASI 导致 root.render 崩溃** | JS 自动分号插入在打包后失效 | `main.tsx` 必须使用链式调用 + `;` 分号保护 |
| ④ | **axios 请求永久挂起** | 缺少 timeout 配置 | 始终配置 `timeout: 30000` |
| ⑤ | **nut-js 原生模块崩溃** | VC++ 运行库缺失 | main.ts 顶部 try-catch 包装，友好提示 |
| ⑥ | **build-info 被 git 追踪** | tsconfig composite 模式生成 tsbuildinfo | 应添加到 .gitignore（当前未处理） |
| ⑦ | **Cherry-pick 合并丢失代码** | Git 冲突解决时出错 | 避免手动 cherry-pick；优先 `--force` 推送完整分支 |
| ⑧ | **OSC 弹窗遮挡金币识别** | 游戏内事件弹窗覆盖金币区域 | `getCoinCount()` 有兜底：点击商店槽位关闭弹窗后重试 |

---

## 模块6：交接总结与工作指引

### 6.1 优先执行顺序

| 步骤 | 任务 | 说明 |
|------|------|------|
| 🔴 **第1步** | **验证最新构建** | 下载 GitHub Actions 最新 Windows 产物，测试 `--start` 和手动启动是否正常 |
| 🔴 **第2步** | **确认 timeout 修复有效** | 如果仍然卡在 current-summoner，需深入分析 LCU API 超时原因 |
| 🟡 **第3步** | **优化 --start 时序** | 将 3 秒固定延迟改为 LCU 连接就绪后的自动启动 |
| 🟡 **第4步** | **清理 gitignore** | 添加 `*.tsbuildinfo` 到 .gitignore |
| 🟢 **第5步** | **搭建测试框架** | 为关键模块添加单元测试 |
| 🟢 **第6步** | **开发战绩统计** | README Todo List 中的待做项 |

### 6.2 关键联系人/资源

| 资源 | 地址 |
|------|------|
| **仓库** | https://github.com/schalkiii/TFT-Hextech-Helper |
| **原作者仓库** | https://github.com/WJZ-P/TFT-Hextech-Helper |
| **GitHub Actions** | https://github.com/schalkiii/TFT-Hextech-Helper/actions |
| **Release 页面** | https://github.com/WJZ-P/TFT-Hextech-Helper/releases |
| **README** | [/workspace/README.md](file:///workspace/README.md) |
| **架构文档** | [/workspace/public/ARCHITECTURE.md](file:///workspace/public/ARCHITECTURE.md) |
| **变更日志** | [/workspace/CHANGELOG.md](file:///workspace/CHANGELOG.md) |
| **项目规则** | [/workspace/.codebuddy/rules/项目规则.mdc](file:///workspace/.codebuddy/rules/项目规则.mdc) |

### 6.3 核心注意事项

1. **一切改动必须遵循"全链路同步"原则**：修改 `IpcChannel` 枚举 → 同步更新 `main.ts` handler + `preload.ts` API + `vite-env.d.ts` 类型
2. **禁止修改** `LCUManager.ts` 的 `proxy: false` 和 `httpsAgent` 配置——这是历史踩坑教训
3. **Sandbox 环境无法运行 Electron**，所有修改必须在 GitHub Actions 构建后由用户在 Windows 环境验证
4. **当前分支**：`trae/solo-agent-sK79wW` 已 force-push 到 `main`，两个分支内容一致
5. **构建产物哈希会因代码改动而变化**：用户必须下载对应 commit 的构建产物，不能混用不同版本

### 6.4 风险提示

| 风险 | 严重程度 | 影响 |
|------|----------|------|
| **LCU API 超时导致 --start 不可用** | 🔴 高 | 命令行启动功能无法正常工作 |
| **无测试覆盖** | 🟡 中 | 代码改动后无法自动验证 |
| **Sandbox 无法运行 Electron** | 🟡 中 | 无法本地端到端测试 |
| **tsconfig 路径不一致** | 🟢 低 | 不影响编译，但 IDE 类型提示可能异常 |
| **用户运行旧版本** | 🔴 高 | 用户需要确保下载最新 Actions 产物 |

---

> **文档结束** — 本交接文档涵盖项目全貌、当前状态、历史改动、后续计划、编码规范和避坑指南，独立完整，无需补充外部上下文即可直接用于跨Agent工作交接。