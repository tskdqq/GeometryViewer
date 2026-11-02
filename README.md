# GeometryViewer

在线几何查看与编辑工具（React + Three.js）。

## 开发

```bash
npm install
NODE_OPTIONS=--openssl-legacy-provider npm start
```

## 构建并更新 GitHub Pages 静态资源

```bash
NODE_OPTIONS=--openssl-legacy-provider TSC_COMPILE_ON_ERROR=true npm run build:deploy
```

## 画矩形

- 工具栏：点击 **矩形 (G)** 按钮（方框图标）
- 快捷键：**G**
- 操作：在画布上点击第一个角点，移动鼠标预览，再点击对角点完成；**Esc** 或右键结束命令

生成的几何为逆时针 **Loop**（可继续布尔运算、拉伸等）。
