# AI 扩图任务调试指南

## 问题现象
AI 扩图任务一直显示"处理中..."，不会自动跳转到结果展示。

## 修复内容

### 1. 前端轮询 Hook 修复 (useImageTaskPolling.ts)

#### 主要问题
- ❌ **字段映射错误**：后端返回 `response.output.taskStatus`，前端直接访问 `result.taskStatus`
- ❌ **缺少超时机制**：无限轮询，没有超时终止
- ❌ **缺少调试日志**：无法追踪轮询过程

#### 修复方案

**修复前：**
```typescript
const result = await pictureApi.getOutPaintingTask(currentTaskId)
setTaskResult(result)

if (result.taskStatus === 'SUCCEEDED' || result.taskStatus === 'FAILED') {
  stopPolling()
}
```

**修复后：**
```typescript
const response = await pictureApi.getOutPaintingTask(currentTaskId)

// 记录调试日志
console.log('[AI 扩图] 轮询响应:', response)
console.log('[AI 扩图] 任务状态:', response.output?.taskStatus)
console.log('[AI 扩图] 输出图片:', response.output?.outputImageUrl)

// 正确映射后端返回的数据结构
const output = response.output || response
const mappedResult: OutPaintingTaskResult = {
  taskId: output.taskId || currentTaskId,
  taskStatus: output.taskStatus as TaskStatus,
  submitTime: output.submitTime,
  scheduledTime: output.scheduledTime,
  endTime: output.endTime,
  outputImageUrl: output.outputImageUrl,
  code: output.code,
  message: output.message
}

setTaskResult(mappedResult)

// 检查任务是否完成
const status = output.taskStatus
console.log('[AI 扩图] 当前状态:', status)

if (status === 'SUCCEEDED') {
  console.log('[AI 扩图] 任务成功，停止轮询')
  stopPolling()
  setIsLoading(false)
} else if (status === 'FAILED') {
  console.log('[AI 扩图] 任务失败:', output.message)
  setError('扩图失败：' + (output.message || '未知错误'))
  stopPolling()
  setIsLoading(false)
}
```

#### 新增功能

1. **超时机制**（2 分钟）
```typescript
timeoutRef.current = setTimeout(() => {
  if (isComponentMounted.current && isPolling) {
    const elapsed = Math.round((Date.now() - startTimeRef.current) / 1000)
    console.warn('[AI 扩图] 任务超时，已耗时:', elapsed, '秒')
    setError(`任务超时（${elapsed}秒），请稍后重试或联系客服`)
    stopPolling()
    setIsLoading(false)
  }
}, timeout) // timeout = 120000ms
```

2. **详细的调试日志**
- `[AI 扩图] 开始轮询任务：{taskId}`
- `[AI 扩图] 轮询响应：{完整响应对象}`
- `[AI 扩图] 任务状态：{taskStatus}`
- `[AI 扩图] 输出图片：{outputImageUrl}`
- `[AI 扩图] 当前状态：{status}`
- `[AI 扩图] 任务成功，停止轮询`
- `[AI 扩图] 任务失败：{message}`
- `[AI 扩图] 任务超时，已耗时：{elapsed}秒`

### 2. 后端检查建议

#### 检查后端返回的数据结构

**正确的返回结构：**
```json
{
  "requestId": "xxx-xxx-xxx",
  "output": {
    "taskId": "task-123456",
    "taskStatus": "SUCCEEDED",  // 或 PENDING/RUNNING/FAILED
    "submitTime": "2024-01-01 12:00:00.000",
    "scheduledTime": "2024-01-01 12:00:01.000",
    "endTime": "2024-01-01 12:01:00.000",
    "outputImageUrl": "https://...",
    "code": null,
    "message": null
  }
}
```

#### 后端需要检查的点

1. **taskStatus 字段值**
   - ✅ 确保返回大写字母：`PENDING`, `RUNNING`, `SUCCEEDED`, `FAILED`
   - ❌ 不要返回小写或其他格式

2. **output 对象不为空**
   - ✅ 确保 `response.output` 对象存在
   - ❌ 避免返回 `null` 或 `undefined`

3. **状态更新逻辑**
   ```java
   // 检查任务状态机是否正确流转
   // PENDING -> RUNNING -> SUCCEEDED/FAILED
   ```

4. **添加后端日志**
   ```java
   log.info("查询扩图任务：taskId={}, status={}", taskId, task.getTaskStatus());
   ```

## 调试步骤

### 步骤 1：打开浏览器控制台
1. 打开 Chrome DevTools (F12)
2. 切换到 Console 标签
3. 清空控制台

### 步骤 2：触发 AI 扩图
1. 点击任意图片的"AI 扩图"按钮
2. 选择扩图比例
3. 点击"开始扩图"

### 步骤 3：观察控制台日志

**正常流程应该看到：**
```
[AI 扩图] 开始轮询任务：task-123456
[AI 扩图] 轮询响应：{output: {taskId: "...", taskStatus: "PENDING", ...}}
[AI 扩图] 任务状态：PENDING
[AI 扩图] 输出图片：undefined
[AI 扩图] 当前状态：PENDING
[AI 扩图] 轮询响应：{output: {taskId: "...", taskStatus: "RUNNING", ...}}
[AI 扩图] 任务状态：RUNNING
[AI 扩图] 当前状态：RUNNING
[AI 扩图] 轮询响应：{output: {taskId: "...", taskStatus: "SUCCEEDED", ...}}
[AI 扩图] 任务状态：SUCCEEDED
[AI 扩图] 输出图片：https://...
[AI 扩图] 当前状态：SUCCEEDED
[AI 扩图] 任务成功，停止轮询
```

### 步骤 4：检查问题

**如果一直看到 PENDING/RUNNING：**
- 后端任务状态没有更新
- 检查后端任务调度逻辑

**如果看到 undefined：**
- 后端返回的 output 对象为空
- 检查后端响应结构

**如果看到超时错误：**
- 任务执行时间超过 2 分钟
- 检查后端任务执行效率

### 步骤 5：检查 Network 标签

1. 打开 Network 标签
2. 过滤 `get_task` 请求
3. 查看请求响应

**期望的响应：**
```json
{
  "code": 0,
  "data": {
    "requestId": "xxx",
    "output": {
      "taskId": "xxx",
      "taskStatus": "SUCCEEDED",
      "outputImageUrl": "https://..."
    }
  }
}
```

## 常见问题排查

### 问题 1：taskStatus 字段名错误
- ❌ 后端返回：`status: "SUCCEEDED"`
- ✅ 应该返回：`taskStatus: "SUCCEEDED"`

### 问题 2：数据结构嵌套错误
- ❌ 后端返回：`{ taskId: "...", taskStatus: "..." }`
- ✅ 应该返回：`{ output: { taskId: "...", taskStatus: "..." } }`

### 问题 3：状态值格式错误
- ❌ 后端返回：`taskStatus: "succeeded"` (小写)
- ✅ 应该返回：`taskStatus: "SUCCEEDED"` (大写)

### 问题 4：轮询间隔过长
- ❌ 轮询间隔：10 秒
- ✅ 推荐间隔：2.5 秒

## 修复后的改进

1. ✅ **正确的字段映射**：`response.output.taskStatus`
2. ✅ **超时保护**：2 分钟自动终止
3. ✅ **详细日志**：追踪每一步状态
4. ✅ **错误处理**：失败时显示具体原因
5. ✅ **内存管理**：组件卸载时清理定时器

## 下一步

如果修复后仍然有问题，请提供：
1. 控制台的完整日志
2. Network 标签中 `get_task` 请求的响应
3. 后端日志中的任务状态变化
