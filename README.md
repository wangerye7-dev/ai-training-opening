# AI教师能力现场共创

面向高职院校教师AI应用培训的公网扫码互动应用。手机端支持匿名提交，大屏端实时显示需求排行和一句话期待。

## 功能

- 任意网络访问的固定 HTTPS 地址
- 手机端匿名选择与一句话期待
- 扫码页内置常用AI工具多选画像，便于讲师判断现场基础
- 大屏实时统计、关注热点和关键词气泡
- 同一浏览器重复提交时更新原选择
- 管理密码保护的清空与 CSV 导出
- 不收集姓名、手机号和单位信息

## 部署到 Cloudflare Workers

本项目使用 Cloudflare Workers Static Assets 和 SQLite Durable Objects。GitHub 用于保存代码，Cloudflare 提供公网运行和实时数据存储。

1. 注册或登录 Cloudflare，进入 Workers & Pages。
2. 选择从 GitHub 导入项目，授权仓库 `wangerye7-dev/ai-training-opening`。
3. 构建命令填写 `npm run deploy`，根目录保持仓库根目录。
4. 部署完成后，在 Worker 的设置中新增加密变量 `ADMIN_KEY`，值设置为至少6位、仅讲师知道的管理密码。
5. 重新部署一次，打开系统给出的 `workers.dev` 地址。
6. 手机填写页为网站根地址，大屏页为 `/dashboard`。

也可在已登录 Cloudflare 的命令行中运行：

```text
npm install
npx wrangler secret put ADMIN_KEY
npm run deploy
```

## 现场使用

1. 培训前打开 `https://你的地址/dashboard`。
2. 让教师扫描大屏二维码；教师可使用校园网、手机流量或其他网络。
3. 结果约每1.6秒自动更新。
4. 点击“导出结果”或“清空重来”时输入 `ADMIN_KEY`。

## 隐私与安全

- 不要在一句话期待中填写个人或涉密信息。
- 不要把 `ADMIN_KEY` 写进仓库或前端代码。
- 活动结束后可在大屏页清空全部结果。

