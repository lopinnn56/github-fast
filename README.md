# 🚀 GitHub 加速

将 GitHub 链接一键转换为加速镜像，解决下载慢、克隆卡、Raw 打不开的问题。

> 纯前端静态站点 · 零依赖 · 不代理、不缓存任何数据，链接仅在浏览器本地拼接生成。

---

## 一、在线演示

本网站的线上部署地址为：**https://fast.lopinnn.de5.net**

该站点由 **lopinnn** 部署并维护，内容与本仓库一致，可直接访问使用。

开源仓库地址：**https://github.com/lopinnn56/github-fast**（本项目所有代码均已开源，可自由查看、学习与二次分发）。

---

## 二、这个网站是做什么的

这是一个**完全运行在浏览器端的 GitHub 加速工具**，不需要任何后端服务器。你只需要把 GitHub 链接粘贴进来，网站会把它转换成多个公益加速镜像的地址，你可以：

- **链接模式**：直接打开 / 下载文件、Release、Archive；
- **Clone 命令模式**：生成 `git clone` 命令用于仓库克隆；
- **一键复制全部**：把所有节点的加速链接批量复制到剪贴板；
- **批量转换**：一次粘贴多行链接，结果按链接分组展示，可逐组复制；
- **URL 参数直达**：访问带 `?url=...` 的链接自动填充并转换，方便分享；
- **节点测速（并发）**：6 路并发探测节点连通性与延迟，超时 / 不可达节点标记 ✕，结果缓存 5 分钟；
- **深浅主题**：自动跟随系统深浅色模式（`prefers-color-scheme`）切换，无需手动设置；
- **拖拽排序 / 置顶 / 删除**：自由管理你的节点列表；
- **恢复默认**：随时重置回内置的公益节点集合。

### 支持的链接类型

| 类型 | 说明 |
|------|------|
| 仓库主页 / 文件 / Blob | `github.com/user/repo` 、`/blob/...` |
| Raw | `raw.githubusercontent.com/...` |
| Release / Archive | `/releases/download/...` 、`/archive/*.zip` |
| Gist | `gist.github.com/...` |
| Clone | 仓库地址（替换域名模式） |

工具会自动识别链接类型并在结果上标注（`RAW` / `RELEASE` / `FILE` / `REPO` / `GIST`）。

---

## 三、公益节点来自哪里

本项目的加速节点均来自**互联网上的公益 GitHub 镜像服务**，主要来自以下网站：

### 1. GitHub Proxy 聚合站 — [github.akams.cn](https://github.akams.cn/)

本项目内置的大部分节点（20 个）采集自该站点。它是一个 **GitHub 镜像加速聚合与实时测速平台**，本身也提供 GitHub Proxy / Docker Proxy / KMS 等服务。

- 站点明确支持 **API、Git Clone、Releases、Archive、Gist、Raw** 等资源加速；
- 页面提供**实时节点测速列表**，本项目优先选取了其中带有有效延迟、且稳定性相对较好的节点；
- 站点声明：*“加速源来自热心网友贡献，在此感谢每一位分享者的慷慨奉献！公益服务，请勿滥用。”*

### 2. 经典公益镜像 — ghproxy 系列

如 `ghproxy.net` 等，是长期存在的开源公益 GitHub 代理项目，被社区广泛使用。

> ⚠️ 提示：公益镜像的稳定性随时可能变化，某个节点失效时请切换其它节点，或点击「测速」识别并标记不可用的。

---

## 四、关于这些节点的作者

本项目**不拥有、也不控制**任何加速节点。所有节点均为**热心网友自发搭建并公益分享**的镜像服务：

- 在 `github.akams.cn` 的节点列表中，每一个节点都标注了 `[贡献]` 或 `[测绘]`，代表由不同网友贡献或测绘收录；
- 聚合站本身由 **HubP** 团队维护（页面署名 *“© 2026 • HubP All rights reserved”*，备案号：萌ICP备20251215号、幸ICP备20251111号）；
- 这些镜像多为个人利用 Cloudflare 等边缘网络自建，作者匿名或仅以域名示人，**没有统一的可考作者身份**；
- 正因为是网友自费、公益提供，站点也特别提醒用户**「请勿滥用」**，合理使用、避免给分享者带来过大流量压力。

如果你也想分享自己的镜像节点，通常可以在对应聚合站的留言 / 贡献入口提交，或参考 Cloudflare Workers 类开源方案（如 `cmliu/CF-Workers-docker.io` 思路）自行搭建。

---

## 五、如何使用

1. 打开网站，粘贴 GitHub 链接（也支持 `github.com/user/repo` 简写、或 `raw.githubusercontent.com/...`）；
2. 网站会实时转换并在「加速链接」区列出所有节点的结果；
3. 点击「**测速**」按钮，检测节点连通性与延迟，超时 / 不可达节点会被标记 ✕；
4. 复制链接或 Clone 命令直接使用即可。

> 若浏览器本地曾保存过旧节点配置，请先点击节点区的「**恢复默认**」，再执行测速。

---

## 六、技术说明

- **纯静态零依赖**：`index.html` + `style.css` + `js/`（ES Modules，无任何第三方依赖、无构建步骤），可直接用任意静态服务器 / GitHub Pages 托管；
- **模块化结构**：`js/convert.js`（链接解析与构建）、`js/nodes.js`（节点管理）、`js/speed.js`（并发测速与缓存）、`js/ui.js`（主题 / toast / 复制）、`js/main.js`（页面逻辑）；
- **隐私友好**：不发送你的链接到任何服务器（节点测速为浏览器直连节点本身），不记录、不缓存；
- **本地拼接**：所有加速 URL 均在浏览器端通过字符串拼接生成；
- **节点持久化**：你的节点增删 / 排序保存在浏览器 `localStorage`；测速结果缓存在 `sessionStorage`（5 分钟）。

---

## 七、关于作者

本网站由 **lopinnn** 制作，是一个用于学习与研究的纯前端 GitHub 加速工具。

> 提示：本网站（包括界面、功能逻辑与说明文档）**全由 AI 制作**，由 lopinnn 提出需求并整理节点来源。

项目中内置的加速节点均来自上文提到的公益镜像聚合站与社区分享，lopinnn 仅对节点进行汇总、整理，并基于实时测速筛选出相对可用的部分内置其中；节点本身的服务与可用性由对应提供者负责。

欢迎在遵守法律法规的前提下合理使用，并感谢每一位公益镜像的分享者。

---

## 八、部署（Cloudflare Pages）

本项目是纯静态站点（index.html + style.css + js/），可一键部署到 Cloudflare Pages。

### 方式一：从 GitHub 仓库部署

1. 将本项目推送到你的 GitHub 仓库；
2. 登录 Cloudflare Dashboard 的 Workers & Pages，点击 Create 选择 Pages；
3. 选择 Connect to Git，授权并选中你的仓库；
4. 构建配置：Framework preset 选 None，Build command 留空，Build output directory 填 /（根目录）；
5. 点击 Save and Deploy，等待部署完成即可获得 *.pages.dev 域名。

### 方式二：使用 Wrangler CLI

安装 wrangler 后，在项目根目录执行：wrangler pages deploy ./ --project-name=github-accel （部署前先 wrangler login）。

### 绑定自定义域名（可选）

在 Cloudflare Pages 项目的 Custom domains 中添加你的域名（需 DNS 托管在 Cloudflare），按提示添加 CNAME 记录即可。纯静态站点无需任何后端函数（Functions）。

---

## 九、免责声明

- 本项目仅供**学习交流与技术研究**使用，请遵守你所在地的法律法规；
- 加速节点为第三方公益服务，其可用性、安全性与合规性由对应提供者负责，本项目不作任何担保；
- 请勿将本工具用于任何违反法律法规或侵犯他人权益的用途。

---

*GitHub 加速工具 by lopinnn · 仅供学习交流 · 请遵守当地法律法规*

