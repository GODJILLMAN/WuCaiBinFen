# 《五猜缤纷》Got Five! - 多人在线H5推理桌游

基于 PRD 文档实现的数字化版本。2-4人在线逻辑推理桌游，前端使用 React + antd-mobile，后端使用 NodeJS + WebSocket(ws)。

## 游戏规则

1. 每位玩家获得5个彩色数字方块（红/绿/蓝/橙/紫各一），数字只有其他玩家能看到
2. 方块按升序排列在立架上，玩家通过提问收集线索
3. 每回合两步：抽牌 → 提问
4. 提问类型：
   - **排序线索**：某张牌在我的5个数字中排第几位？
   - **圆点比较**：我的某色方块的数字比这张牌大还是小？
5. 率先猜对全部5个数字并喊出 "Got Five!" 者获胜

## 技术栈

| 层 | 技术 |
|---|---|
| 前端 | React 18 + antd-mobile 5 + Vite 5 |
| 后端 | Node.js + ws (WebSocket) 或内置 mini-ws |
| 通信 | WebSocket 实时双向通信 |

## 项目结构

```
got-five-online/
├── package.json          # 根目录配置
├── server/               # 后端
│   ├── package.json
│   ├── index.js          # WebSocket 服务入口
│   ├── GameServer.js     # 游戏服务器（消息路由）
│   ├── Game.js           # 游戏逻辑（发牌/提问/判定）
│   ├── Room.js           # 房间管理
│   ├── mini-ws.js        # 内置 WebSocket 服务实现（ws 包的备选方案）
│   └── constants.js      # 游戏常量
├── client/               # 前端
│   ├── package.json
│   ├── vite.config.js
│   ├── index.html
│   └── src/
│       ├── main.jsx
│       ├── App.jsx
│       ├── hooks/
│       │   └── useWebSocket.js
│       ├── pages/
│       │   ├── LoginPage.jsx      # 登录页
│       │   ├── LobbyPage.jsx      # 大厅
│       │   ├── RoomPage.jsx        # 房间等待页
│       │   └── GamePage.jsx       # 游戏主页面
│       ├── components/
│       │   ├── Tile.jsx           # 方块组件
│       │   ├── PlayerRack.jsx     # 玩家立架
│       │   ├── PublicArea.jsx     # 公共牌堆区
│       │   ├── QuestionPanel.jsx  # 提问/回答/宣告面板
│       │   ├── QuestionHistory.jsx# 线索历史
│       │   ├── ReasoningBoard.jsx # 推理板
│       │   └── GameResult.jsx     # 游戏结果
│       ├── utils/
│       │   └── constants.js       # 前端常量
│       └── styles/
│           └── game.css           # 全局样式
└── README.md
```

## 快速启动

### 1. 安装依赖

```bash
cd got-five-online
npm install        # 安装 concurrently
npm run install:all # 安装 server 和 client 依赖
```

> **注意**：后端内置了 `mini-ws.js`（基于 Node.js 原生 http 模块的 WebSocket 实现），即使 `ws` 包安装失败也能正常运行。安装 `ws` 包可以获得更好的性能和兼容性。

### 2. 启动开发服务器

```bash
# 同时启动前后端
npm run dev

# 或分别启动
npm run dev:server  # 后端: ws://localhost:3000
npm run dev:client  # 前端: http://localhost:5173
```

### 3. 开始游戏

1. 打开浏览器访问 `http://localhost:5173`
2. 输入昵称进入大厅
3. 创建房间或输入房间号加入
4. 房主点击"开始游戏"
5. 轮流抽牌、提问、推理
6. 猜对全部5个数字喊出 "Got Five!" 获胜

## WebSocket 通信协议

### 客户端 → 服务端

| 消息类型 | 说明 | 负载 |
|---------|------|------|
| `register` | 注册玩家 | `{ name }` |
| `get_room_list` | 获取房间列表 | - |
| `create_room` | 创建房间 | - |
| `join_room` | 加入房间 | `{ roomCode }` |
| `leave_room` | 离开房间 | - |
| `start_game` | 开始游戏 | - |
| `draw_tile` | 抽牌 | - |
| `ask_question` | 提问 | `{ type, tileId, color }` |
| `answer_question` | 回答 | `{ answer }` |
| `skip_declare` | 跳过宣告 | - |
| `declare_got_five` | 宣告 | `{ numbers: [n1,n2,n3,n4,n5] }` |
| `chat` | 聊天 | `{ message }` |

### 服务端 → 客户端

| 消息类型 | 说明 |
|---------|------|
| `registered` | 注册成功，返回 playerId |
| `room_list` | 可用房间列表 |
| `room_created` | 房间创建成功 |
| `room_joined` | 加入房间成功 |
| `room_state` | 房间状态更新 |
| `left_room` | 已离开房间 |
| `game_state` | 游戏状态同步（含通知） |
| `chat` | 聊天消息 |
| `error` | 错误消息 |

## 游戏特性

- 实时多人游戏 (2-4人)
- 信息不对称：自己看不到自己的数字，但能看到别人的
- 两种提问方式：排序线索 & 圆点比较
- 内置推理板：标记排除数字
- 线索历史记录
- 聊天功能
- 出局机制：猜错即淘汰
