# 第三方声明

本项目底部导航的内置图标在构建期由 `scripts/gen-page-icons.mjs` 从下列 `@vicons` 图标包渲染为 SVG 字符串，产物位于 `src/assets/page-icons.json`。`@vicons` 包本身不再附带 LICENSE / NOTICE 文件，因此在此统一声明上游许可证与版权。

| 图标包 | 许可证 | 上游项目 |
| --- | --- | --- |
| `@vicons/tabler` | MIT | [Tabler Icons](https://github.com/tabler/tabler-icons) |
| `@vicons/fluent` | MIT | [Fluent UI System Icons](https://github.com/microsoft/fluentui-system-icons) |
| `@vicons/ionicons4` | MIT | [Ionicons 4](https://github.com/ionic-team/ionicons) |
| `@vicons/ionicons5` | MIT | [Ionicons 5](https://github.com/ionic-team/ionicons) |
| `@vicons/antd` | MIT | [Ant Design Icons](https://github.com/ant-design/ant-design-icons) |
| `@vicons/carbon` | Apache-2.0 | [Carbon Icons](https://github.com/carbon-design-system/carbon) |
| `@vicons/material` | Apache-2.0 | [Material Design Icons](https://github.com/google/material-design-icons) |

Fluent UI System Icons 上游另附 NOTICE；若需再分发，请一并保留其 NOTICE 内容。各图标仍受其上游许可证约束，本项目仅以构建期生成的数据形式使用。
