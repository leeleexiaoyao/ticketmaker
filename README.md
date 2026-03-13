# 票根制作器小程序（MVP）

## 功能范围
- 首页模板选择（3分类各1模板）
- 模板详情 + 编辑面板（文字/图片/背景）
- 最终预览 + 保存相册
- 保存成功页
- 个人中心 + 用户说明
- 全流程本地缓存恢复

## 工程结构
- `pages/`: 页面层
- `components/`: 组件层（首页模板卡片）
- `services/`: 业务服务（缓存、渲染、模板、图片编辑）
- `models/`: 类型定义

## 本地缓存
- key: `ticket_stub_draft_v1`
- 编辑输入 500ms 防抖落盘
- 图片/颜色编辑完成立即落盘
- 保存相册成功清理当前模板草稿
- 个人中心可清理全部草稿

## 主题模式
- 个人中心支持 `浅色 / 深色` 切换，选择会持久化到本地：`ticket_stub_theme_mode_v1`
- 页面根节点通过 `theme-dark` / `theme-light` 控制主题
- 每个页面的 `.wxss` 末尾都有浅色覆盖区，后续改动深色颜色时需同步更新浅色覆盖

## 资源说明
当前项目已实现三层海报渲染（着色层 -> 固定层 -> 图片与文字），正式资源建议按模板目录组织：
- `assets/templates/{templateId}/tint.svg`（着色层，统一占位色）
- `assets/templates/{templateId}/fixed.svg`（固定层，渐变/透明效果）
- `assets/templates/{templateId}/layout.json`（相对坐标配置）
- `assets/templates/{templateId}/preview.png`（模板缩略图）

当前代码里内置了占位 SVG 示例，着色层默认占位色为 `#FF4D8D`，运行时会替换为用户选色。  
导出固定为宽 `1080px`，高度按模板比例自动计算。

正式资源可直接替换：
- 模板固定层 SVG（`fixed.svg`）
- 可变色 SVG（`tint.svg`）
- 自定义字体文件（留言/出自字段，联动）

字体默认读取路径：
- `/assets/fonts/remark-style-1.ttf`
- `/assets/fonts/remark-style-2.ttf`
- `/assets/fonts/remark-style-3.ttf`
- `/assets/fonts/remark-style-4.ttf`

## 运行
1. 用微信开发者工具导入当前目录。
2. 使用测试 AppID 或你的正式 AppID。
3. 如需本地类型检查：
   - `npm install`
   - `npm run typecheck`
