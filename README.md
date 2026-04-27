# 家庭点餐小程序前端

基于 `Taro 4 + React + TypeScript` 的微信小程序前端项目，用于家庭场景下的菜品浏览、下单、订单查看，以及厨师角色的菜品管理与订单处理。

## 项目功能

- 点单页：按分类浏览菜品，选择日期、餐期、人数并加入购物车下单
- 订单页：普通用户查看自己的订单；厨师角色可查看全部订单并确认订单状态
- 我的页：厨师角色可新增、编辑、删除菜品，并支持图片上传
- 全局鉴权：基于 token 的登录态校验与请求封装

## 技术栈

- `Taro 4`
- `React 18`
- `TypeScript`
- `Sass`
- `Webpack 5`

## 目录结构

```text
frontend/
├─ assets/                静态资源
├─ config/                Taro 构建配置
├─ src/
│  ├─ components/         公共组件
│  ├─ pages/              页面
│  │  ├─ home/            点单页
│  │  ├─ orders/          订单页
│  │  ├─ profile/         我的/菜品管理页
│  │  └─ cart/            购物车页
│  ├─ services/           接口服务层
│  ├─ utils/              鉴权、请求、会话等工具
│  ├─ data/               本地 mock 数据
│  ├─ app.config.ts       小程序路由与 tabBar 配置
│  └─ app.ts              应用入口
├─ project.config.json    微信开发者工具配置
├─ package.json
└─ README.md
```

## 本地开发

### 1. 安装依赖

```bash
npm install
```

### 2. 启动微信小程序开发构建

```bash
npm run dev:weapp
```

### 3. 生产构建

```bash
npm run build:weapp
```

### 4. 代码检查

```bash
npm run lint
```

## 接口与配置

- 当前 API 地址配置在 [src/utils/api.ts](d:/developer/dinging-order-app/frontend/src/utils/api.ts:1)
- 默认值为本地开发地址：`http://localhost:3000/api`
- 发布前请根据后端环境修改为正式接口地址

## 角色说明

- 普通用户：浏览菜品、提交订单、查看自己的订单
- 厨师用户：除普通能力外，还可管理菜品、查看全部订单、确认订单

## Git 提交建议

以下内容已加入 `.gitignore`，不建议上传：

- `node_modules/`
- `dist-weapp/`
- `.swc/`
- `docs/`
- `.env*`
- 各类日志、证书、私钥、本地数据库文件

补充说明：

- `project.config.json` 中的 `appid` 通常不是密钥，可以提交
- 如果仓库是公开的，且你不想暴露小程序标识，可以自行改成占位值
- 真正不能提交的是 `appSecret`、接口密钥、私钥、数据库密码等敏感信息

## 说明

当前仓库主要保存前端源码与构建配置，不包含 `node_modules`、构建产物和文档目录。
