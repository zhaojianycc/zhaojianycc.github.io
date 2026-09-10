# BiCASL 实验室网站

赵健教授课题组（BiCASL, SJTU）的 GitHub Pages 静态网站。

- 线上地址：<https://zhaojianycc.github.io>
- 发布分支：`master`
- 发布方式：推送到 GitHub 后由 GitHub Pages 自动更新

## 目录结构

```text
.
├── *.html                 # 网站页面，直接编辑
├── assets/
│   ├── css/site.css       # 全站样式
│   ├── images/            # 页面实际使用的图片
│   │   ├── chips/         # 芯片图片
│   │   ├── leisure/       # 团队活动图片
│   │   └── opensources/   # 开源项目图片
├── .nojekyll              # 按静态文件直接发布
└── README.md              # 本维护说明
```

网站已改为直接维护 HTML，不再依赖 Python 2、jemdoc 或生成脚本。

## 常用页面

| 内容 | 文件 |
| --- | --- |
| 首页 | `index.html` |
| 个人简介 | `bio.html` |
| 成员 | `people.html` |
| 新闻 | `news.html` |
| 研究方向 | `topics.html` |
| 出版物 | `publications.html` |
| 教学 | `teaching.html` |
| 服务 | `services.html` |
| 招聘 | `recruitment.html` |
| 联系方式 | `contact.html` |
| 团队活动 | `leisure.html` |
| 开源项目 | `rtesim.html`、`memspn.html`、`n4000.html` |
| MR413 课程页面 | `mr413.html` |

## 维护方法

1. 修改对应的 HTML 文件。所有页面的左侧导航都各自保存一份；导航变化时应同步修改所有页面。
2. 图片放入 `assets/images/` 的对应子目录。
3. 在本地启动静态服务器预览：

   ```powershell
   python -m http.server 8000
   ```

4. 浏览 `http://localhost:8000/`，确认页面、图片和链接正常。
5. 提交并推送：

   ```powershell
   git add -A
   git commit -m "Update website content"
   git push
   ```

## 内容格式约定

- `news.html`：最新年份和最新消息放在前面。
- `people.html`：在读成员使用连续数字编号，毕业成员使用连续的 `A01`、`A02` 编号。
- `publications.html`：直接编辑 HTML；新增论文时保持年份倒序，并延续作者高亮格式。
- 文件名优先使用简短的英文、数字和连字符，避免空格及临时版本后缀。

## 发布前检查

- 所有本地 `href` 和 `src` 路径存在。
- 页面导航指向有效 HTML 文件。
- 新图片大小适合网页使用。
- `git status` 中没有日志、交换文件、压缩包或设计源文件。
