# 聚有趣运营后台

换电脑首次配置、数据库准备和前后端启动步骤见后端仓库的 [QUICKSTART.md](https://github.com/yangchunping1989/haveFunServer/blob/main/QUICKSTART.md)。Node.js 要求 22.12 以上，推荐 24 LTS。

在同一个目录分别拉取两个项目，保留下面指定的本地目录名：

```powershell
git clone https://github.com/yangchunping1989/haveFunServer.git backend
git clone https://github.com/yangchunping1989/haveFunMonitorWeb.git admin-web
```

Vue3 + TypeScript + Vite，复用 `../backend`，没有第二套业务后端。独立管理员会话、CSRF、后端接口校验；小程序微信令牌无法访问管理接口。

## 首次本地使用

1. 在 `backend` 目录执行 `./scripts/configure-admin.ps1 -Username admin -LocalHttp`，按提示输入至少12位密码并确认。只保存加盐PBKDF2哈希；文件限制当前Windows用户访问，没有内置默认密码。
2. 从 `backend` 目录按原方式启动新JAR：`java -jar build/libs/party-games-backend-0.0.1-SNAPSHOT.jar`。后端自动读取 `config/admin.properties`，默认端口8080。已有数据库正常启动时增量迁移，不重建词库。
3. 在 `admin-web` 目录执行 `npm ci`（已有依赖可跳过），再执行 `npm run dev`。
4. 浏览器打开 http://127.0.0.1:5173，用刚配置的账号登录。小程序重新编译后会开始上报访问记录。

`-LocalHttp` 仅用于本机HTTP开发，生产不要使用。其他后端地址可设置 `ADMIN_API_TARGET=http://127.0.0.1:其他端口` 后启动Vite。管理员未配置时返回503、管理数据接口始终拒绝未登录访问。正式对战来源由配置脚本设为 `LIVE`；未配置时来源为 `UNKNOWN`，后台可查看，但技能分析默认仅统计 `LIVE`。

本次开发只运行了隔离数据库/随机端口测试，未常驻启动8080或5173，也未更改真实微信认证。

## 当前功能

- 运营概览、按日使用趋势，分别统计登录账号与安装；词语轮次、卧底完局、狼人杀开局/完局、五子棋开局。
- 用户建议列表、搜索、日期/状态筛选、处理状态和内部备注；写操作保留审计。
- 你画我猜/谁是卧底的词条评价操作记录、当前已计分票数、权重与状态。
- 权重变化列表、上升/下降筛选、历史曲线、前后输入计数、关联任务下钻。
- 原有五类调度任务，以及新增权重观测/记录维护任务的计划、执行结果、耗时、处理水位、证据计数、变更和失败摘要。
- 五子棋每局独立记录，按真实事件逐步回放，包含落子、技能、反制、超时结算及状态变化。房间重开/删除不覆盖历史。
- 全30技能的黑白方统计，包含无人选择的技能、配装选择率、完结使用率、携带胜率与95%区间、使用后胜率、发动/反制/生效数量、镜像和不同玩家组合样本；配装对手统计。

## 数据口径与限制

- 历史记录从功能接入后开始。默认启动约1分钟后采集首次词库基线，之后每小时比较一次观测状态；定时评分另记录执行前后变化。区间观测不是每一次实时权重更新日志，不能把下降直接归因于差评。
- 页面日期和图表使用北京时间；日期最多覆盖366个自然日。事件趋势使用服务端接收时间，访问上报为尽力采集，不能当精确在线人数或完整会话时长。
- 词语游戏轮次按安装标识与roundId去重；局数、词条结果次数和玩家人数分开。卧底为已上报完局，狼人杀和五子棋为后端有效状态变更。
- 五子棋来源分LIVE/UNKNOWN/TEST/SIMULATION。五子棋联调可用 `party-games.gomoku.record-source=TEST` 排除对战样本；涉及访问、词语、卧底等全链路测试应使用隔离数据库，避免正式统计污染。
- 接入前开始的棋局为PARTIAL，跨版本继续进行的棋局为MIXED；两者保留真实状态回放，默认不参与强度统计。完整新局为FULL。无终局记录单列，不推断断线即失败。
- 同一三技能配装按技能ID排序归一化；每房间重开为新对局。镜像样本及重复玩家组合会影响结果，页面显示相关数量，不能把原始胜率直接当成技能收益或克制证明。尚未实现按玩家实力校正和自动平衡建议。
- 首版采用完整前后状态保存回放，后续数据量增大时可迁移为增量事件与检查点；当前不自动删除对战历史。高频清理任务的成功无变更记录保留30天；有变更和失败记录保留。
- 不提供编辑权重、手动执行任务、自动修改技能的入口。

## 生产部署

执行 `npm run build`，将 `dist` 静态文件经HTTPS发布，并同域代理 `/api/admin/v1` 到现有后端。Vue路由需要回退到index.html，可参考 `nginx.conf.example`。

生产设置 `party-games.admin.secure-cookie=true`，并配置 `party-games.admin.origin=https://你的管理域名`。普通小程序跨域规则仅覆盖 `/api/v1/**`，不包含管理接口。管理员会话8小时过期，退出撤销，修改密码哈希并重启后旧会话失效。密码配置文件禁止发布到静态站点或提交到仓库。当前登录限流为单实例每5分钟15次；多实例部署需要入口统一限流。建议管理入口再限制VPN或指定IP。

## 验证

- 后台：`npm test`；类型检查与打包：`npm run build`。
- 小程序：根目录 `node --test automation-tests/*.test.js`。
- 后端：`./gradle-with-pipe-fallback.ps1 --no-daemon test databaseBootstrapRegression bootJar`。
- 数据库回归自动创建唯一临时库、随机HTTP端口，结束删除临时库。覆盖真实鉴权、CSRF、退出/过期/凭据轮换、反馈处理、任务失败回滚审计、权重基线及五子棋回放/重开/超时/清理。
- 只有渲染验证缺口时才运行浏览器冒烟：设 `ADMIN_UI_SMOKE=1` 后运行数据库回归。使用本机Edge和临时Vite端口，结束自动关闭；截图在 `automation-tests/artifacts/admin-web/`。它不依赖真实联系人或模拟微信登录。

## GitHub 提交与环境配置

本项目不保存数据库密码、微信密钥或管理员密码。开发代理使用 `ADMIN_API_TARGET` 环境变量（默认 `http://127.0.0.1:8080`）；本地 `.env.local` 已忽略。不要将任何密钥放进 `VITE_*`，这些变量会进入浏览器。

提交源码、`package.json` 和 `package-lock.json`；`node_modules/`、`dist/`、日志和本地环境文件已忽略。后端私密配置见 [PUBLICATION.md](https://github.com/yangchunping1989/haveFunServer/blob/main/PUBLICATION.md)。
