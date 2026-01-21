# 云函数配置说明

## videoToGif 云函数

### 功能说明
处理视频，自动抠除绿色或蓝色背景，生成透明底GIF文件。

### 云函数代码示例

在云函数目录 `cloud/videoToGif/index.js` 中：

```javascript
const cloud = require('wx-server-sdk')
const ffmpeg = require('fluent-ffmpeg')
const fs = require('fs')
const path = require('path')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

exports.main = async (event, context) => {
  const {
    videoPath,
    startTime = 0,
    endTime = 10,
    chromaKey = {
      enabled: true,
      colors: [{ r: 0, g: 255, b: 0 }, { r: 0, g: 0, b: 255 }],
      threshold: 30
    },
    fps = 12,
    width = 240,
    height = 240,
    maxSize = 500 * 1024
  } = event

  try {
    // 1. 下载视频文件
    const res = await cloud.downloadFile({
      fileID: videoPath
    })
    const tempVideoPath = res.fileContent

    // 2. 使用ffmpeg进行色度键抠图
    // 构建ffmpeg命令
    let command = ffmpeg(tempVideoPath)
      .videoFilters([
        // 色度键抠图滤镜
        `chromakey=color=0x00ff00:similarity=0.3:blend=0.1`, // 绿色背景
        `chromakey=color=0x0000ff:similarity=0.3:blend=0.1`  // 蓝色背景
      ])
      .fps(fps)
      .size(`${width}x${height}`)
      .outputOptions([
        '-t', (endTime - startTime).toString(), // 时长
        '-ss', startTime.toString(), // 开始时间
        '-loop', '0', // 循环
        '-f', 'gif' // 输出格式
      ])

    // 3. 生成GIF文件
    const outputPath = path.join('/tmp', `output_${Date.now()}.gif`)
    await new Promise((resolve, reject) => {
      command
        .on('end', resolve)
        .on('error', reject)
        .save(outputPath)
    })

    // 4. 压缩GIF（如果文件过大）
    let fileSize = fs.statSync(outputPath).size
    if (fileSize > maxSize) {
      // 使用gifsicle或其他工具压缩
      // 这里简化处理，实际需要调用压缩工具
    }

    // 5. 上传到云存储
    const uploadRes = await cloud.uploadFile({
      cloudPath: `gifs/${Date.now()}.gif`,
      fileContent: fs.readFileSync(outputPath)
    })

    // 6. 清理临时文件
    fs.unlinkSync(tempVideoPath)
    fs.unlinkSync(outputPath)

    return {
      success: true,
      filePath: uploadRes.fileID
    }
  } catch (error) {
    console.error('处理失败:', error)
    return {
      success: false,
      error: error.message
    }
  }
}
```

### 云函数 package.json

```json
{
  "name": "videoToGif",
  "version": "1.0.0",
  "description": "视频转GIF并抠图",
  "main": "index.js",
  "dependencies": {
    "wx-server-sdk": "latest",
    "fluent-ffmpeg": "^2.1.2"
  }
}
```

### 注意事项

1. **ffmpeg安装**：云函数环境需要安装ffmpeg，可能需要自定义运行环境
2. **文件大小限制**：云函数有文件大小和处理时间限制
3. **性能优化**：对于长视频，建议先分段处理再合并
4. **错误处理**：需要完善的错误处理和日志记录

### 简化方案

如果无法配置云函数，可以考虑：
1. 使用第三方视频处理服务
2. 使用小程序Canvas API逐帧处理（性能有限）
3. 提示用户使用其他工具预处理视频
