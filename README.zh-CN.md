# ImageCompare 多图对比版

基于 https://github.com/toshas/ImageCompare_vscode 开发，保留原插件的文件夹匹配、单图切换和类别排序。

## 安装和使用

1. 在 VS Code 扩展面板菜单中选择 **Install from VSIX…**，安装本目录的 `image-compare-multiview.vsix`，然后重新加载窗口。
2. 选中图片或包含多个类别子目录的文件夹，右键 **Open in ImageCompare**。
3. 点击 **Compare all** 同时显示未隐藏的类别：2、3 张横向排列，4 张为 2×2，更多图片自动网格排列。点击 **Single view** 返回原来的切换视图。
4. 在任一图片区域滚轮缩放、按住左键拖动，所有图片同步变化；按 `Esc` 恢复适应窗口。每张图按自身宽高比适应栏位，共享缩放倍率和位移。
5. 点击某一栏或底部类别标签选中类别，再点击底部左右箭头或按 `[` / `]` 调整顺序。显示与复制均遵循这个顺序。右键类别标签可隐藏/恢复该类别。
6. 点击 **Copy collage** 将拼图作为 PNG 复制到剪贴板，每栏下方带完整类别名称。对比视图内 `Ctrl+C` / `Cmd+C` 也复制拼图。复制保留当前缩放和平移区域，通常输出为视图的 2 倍分辨率（超大窗口会限制尺寸）。单图视图的 Copy collage 则复制全部未隐藏类别的完整适应视图。

加载尚未完成或存在不可用图片时，复制会提示等待或隐藏该类别，避免生成不完整拼图。所有类别都隐藏时，请先恢复至少一个类别。Crop 会切回单图视图，以保持原裁剪工具的坐标一致。

## 开发

```powershell
npm ci
npm run compile
npx playwright test --config test/webview/playwright.config.ts comparison.spec.ts --workers=1
npx @vscode/vsce package --out image-compare-multiview.vsix
```

也可以在 VS Code 打开本目录后按 F5，在 Extension Development Host 中使用。
