## 📖 简介
二次元笑传之猜猜呗，快来弗/灯一把吧！

- 一个猜动漫角色的游戏, 建议使用桌面端浏览器游玩。
- 灵感来源 [BLAST.tv](https://blast.tv/counter-strikle), 数据来源 [Bangumi](https://bgm.tv/)。

## 📦 运行教程

### 1. 本地 npm 运行

分别在 `client` 和 `server` 目录下执行以下命令：
```
npm install
npm run dev
```

### 2. docker 运行
使用项目中的 docker-compose 文件一键运行：
```
docker-compose up --build
```
删除容器：
```
docker-compose down
```

## 🎮 游戏玩法

- 猜一个神秘动漫角色。搜索角色，然后做出猜测。
- 每次猜测后，你会获得你猜的角色的信息。
- 绿色高亮：正确或非常接近；黄色高亮：有点接近。
- "↑"表示：应该往高了猜；"↓"表示：应该往低了猜