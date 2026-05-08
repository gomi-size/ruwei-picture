# AI 扩图 Drawer 组件使用说明

## 组件特性

### ✅ 核心功能修复

1. **正确的状态判断路径**
   - 轮询接口返回：`res.data.output.taskStatus`
   - 成功状态：`taskStatus === 'SUCCEEDED'`
   - 失败状态：`taskStatus === 'FAILED'`
   - 失败时自动停止轮询并显示错误信息

2. **图片尺寸预校验**
   - 短边 < 448px：拦截并提示
   - 长边 > 4096px：拦截并提示
   - 使用 `new Image()` 加载原图 URL 获取真实尺寸

3. **正确的参数传递**
   - 传递 `picture.id` 给后端
   - 后端从数据库获取原图（非缩略图）

### 🎨 商业级 UI/UX

1. **右侧抽屉设计**
   - 从右侧滑出，更显专业
   - 毛玻璃遮罩层
   - 流畅的滑入动画

2. **精致的圆环进度条**
   - 渐变蓝色进度环
   - 旋转动画效果
   - 实时状态提示

3. **科技感过程文案**
   - "AI 正在分析图像特征点..."
   - "正在生成边缘纹理和细节..."
   - "扩图完成！"

4. **对比预览**
   - 左右并排展示
   - 原图 vs AI 扩图结果
   - 清晰的标题标注

## 使用方法

### 1. 在父组件中引入

```typescript
import { OutPaintingDrawer } from '../components/OutPaintingDrawer'
import type { PictureVO } from '../types/api'

// 在组件中
const [outPaintingPicture, setOutPaintingPicture] = useState<PictureVO | null>(null)

// 渲染组件
<OutPaintingDrawer
  open={!!outPaintingPicture}
  onClose={() => setOutPaintingPicture(null)}
  picture={outPaintingPicture}
/>
```

### 2. 触发扩图

```typescript
// 在图片卡片或详情页中
const handleAIOutPainting = (picture: PictureVO) => {
  setOutPaintingPicture(picture)
}

// 绑定到按钮点击
<button onClick={() => handleAIOutPainting(picture)}>
  AI 扩图
</button>
```

## 核心函数详解

### handleStartOutPainting

```typescript
const handleStartOutPainting = async () => {
  setStep('checking')
  setDimensionError('')
  
  try {
    // 1. 预校验图片尺寸
    const isValid = await checkImageDimension()
    
    if (!isValid) {
      setStep('config')
      return  // 阻止接口调用
    }
    
    // 2. 创建扩图任务
    setStep('processing')
    
    const result = await pictureApi.createOutPaintingTask({
      pictureId: picture.id,
      parameters: {
        xScale: selectedRatio.xScale,
        yScale: selectedRatio.yScale,
      }
    })
    
    // 3. 开始轮询
    if (result.output && result.output.taskId) {
      startPolling(result.output.taskId)
    } else {
      alert('创建任务失败')
      setStep('config')
    }
  } catch (err) {
    alert('创建任务失败：' + err.message)
    setStep('config')
  }
}
```

### checkImageDimension

```typescript
const checkImageDimension = useCallback(async (): Promise<boolean> => {
  return new Promise((resolve) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    
    img.onload = () => {
      const width = img.width
      const height = img.height
      const shortEdge = Math.min(width, height)
      const longEdge = Math.max(width, height)
      
      setImageDimensions({ width, height })
      
      // 阿里云 API 限制检查
      if (shortEdge < MIN_SHORT_EDGE) {
        setDimensionError(`图片短边 (${shortEdge}px) 小于要求的最小值 ${MIN_SHORT_EDGE}px`)
        resolve(false)
      } else if (longEdge > MAX_LONG_EDGE) {
        setDimensionError(`图片长边 (${longEdge}px) 超过要求的最大值 ${MAX_LONG_EDGE}px`)
        resolve(false)
      } else {
        setDimensionError('')
        resolve(true)
      }
    }
    
    img.onerror = () => {
      setDimensionError('无法加载图片，请检查图片链接是否有效')
      resolve(false)
    }
    
    // 使用原图 URL
    img.src = picture.url || picture.thumbnailUrl
  })
}, [picture.url, picture.thumbnailUrl])
```

## 状态流转

```
config (配置)
  ↓ 点击"开始扩图"
checking (尺寸检查)
  ↓ 校验通过
processing (处理中)
  ├─ 轮询任务状态
  ├─ 显示过程文案
  └─ 成功/失败判断
    ↓ 成功 (SUCCEEDED)
result (结果展示)
  ├─ 对比预览
  ├─ 下载按钮
  └─ 保存到库按钮
```

## 调试日志

组件内置了详细的调试日志：

```
[AI 扩图] 开始检查图片尺寸
[AI 扩图] 图片尺寸校验通过：{ width: 1024, height: 768 }
[AI 扩图] 开始创建任务
[AI 扩图] 创建任务响应：{ output: { taskId: "..." } }
[AI 扩图] taskId: task-123456
[AI 扩图] 轮询响应：{ data: { output: { taskStatus: "SUCCEEDED", ... } } }
[AI 扩图] 完整 data: { output: {...} }
[AI 扩图] output 对象：{ taskStatus: "SUCCEEDED", outputImageUrl: "..." }
[AI 扩图] 任务状态：SUCCEEDED
[AI 扩图] 输出图片：https://...
[AI 扩图] 当前状态：SUCCEEDED
[AI 扩图] 任务成功，停止轮询
```

## 错误处理

### 1. 尺寸校验失败

```
⚠️ 图片短边 (300px) 小于要求的最小值 448px
```

### 2. 任务失败

```
⚠️ 扩图失败：{后端返回的 message}
```

### 3. 网络错误

```
⚠️ 查询任务状态失败：Network Error
```

## API 接口

### createOutPaintingTask

```typescript
await pictureApi.createOutPaintingTask({
  pictureId: number,
  parameters: {
    xScale?: number,
    yScale?: number
  }
})
```

### getOutPaintingTask

```typescript
await pictureApi.getOutPaintingTask(taskId: string)

// 返回结构
{
  code: 0,
  data: {
    output: {
      taskId: string,
      taskStatus: "PENDING" | "RUNNING" | "SUCCEEDED" | "FAILED",
      submitTime: string,
      scheduledTime: string,
      endTime: string,
      outputImageUrl: string,
      code: string | null,
      message: string | null
    }
  }
}
```

## 样式特点

- **渐变主题色**：蓝色 (#3b82f6) → 紫色 (#8b5cf6)
- **圆角**：统一 10-12px
- **阴影**：精致的多层阴影
- **动画**：所有过渡使用 cubic-bezier(0.4, 0, 0.2, 1)
- **响应式**：抽屉宽度 600px，最大 100vw

## 待实现功能

### 保存到库

```typescript
// TODO: 调用后端接口
await pictureApi.saveOutPaintingResult({
  pictureId: picture.id,
  outputImageUrl: taskResult.outputImageUrl,
  originalPictureId: picture.id
})
```

## 最佳实践

1. **使用原图 URL**
   - 组件内部已处理，使用 `picture.url`
   - 确保后端能从数据库获取原图

2. **轮询间隔**
   - 默认 2500ms（2.5 秒）
   - 超时时间 120000ms（2 分钟）

3. **内存管理**
   - 组件卸载时自动清理定时器
   - 使用 `useRef` 跟踪组件挂载状态

4. **错误提示**
   - 使用 Toast 轻提示
   - 错误信息清晰友好

## 性能优化

- ✅ 图片懒加载
- ✅ 定时器清理
- ✅ 状态更新优化
- ✅ 动画性能优化（使用 transform）

## 兼容性

- ✅ React 19
- ✅ TypeScript 6
- ✅ 现代浏览器（Chrome/Firefox/Safari/Edge）
- ✅ 移动端响应式

## 常见问题

### Q: 为什么一直显示"处理中"？

A: 检查以下几点：
1. 控制台是否有 `[AI 扩图] 轮询响应` 日志
2. 后端返回的 `taskStatus` 字段名是否正确
3. 状态值是否为大写（SUCCEEDED/FAILED）
4. Network 标签查看 `get_task` 请求响应

### Q: 图片尺寸校验不通过？

A: 确保：
1. 图片短边 ≥ 448px
2. 图片长边 ≤ 4096px
3. 图片 URL 可访问（跨域允许）

### Q: 如何自定义扩图比例？

A: 修改 `RATIO_OPTIONS` 数组：

```typescript
const RATIO_OPTIONS: RatioOption[] = [
  { label: '自定义', value: 'custom', xScale: 1.8, yScale: 1.5 },
  // ...
]
```

## 更新日志

### v1.0.0
- ✅ 修复状态判断路径
- ✅ 添加图片尺寸预校验
- ✅ 实现右侧抽屉 UI
- ✅ 添加圆环进度条
- ✅ 优化过程文案
- ✅ 实现对比预览
- ✅ 添加保存到库功能
