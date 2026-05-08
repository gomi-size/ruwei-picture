import { useState, useEffect, useCallback, useRef } from 'react'

/**
 * 颜色选择器组件 - 用于按颜色搜索图片
 * 功能：
 * 1. 提供预设颜色块快速选择
 * 2. 支持自定义颜色选择器
 * 3. 支持清除颜色选择
 * 4. 防抖处理避免频繁触发搜索
 */

/**
 * 预设颜色配置数组
 * 包含常用颜色和对应的名称
 */
const PRESET_COLORS = [
  { name: '全部', color: '' },
  { name: '红色', color: '#FF0000' },
  { name: '橙色', color: '#FFA500' },
  { name: '黄色', color: '#FFFF00' },
  { name: '绿色', color: '#008000' },
  { name: '青色', color: '#00FFFF' },
  { name: '蓝色', color: '#0000FF' },
  { name: '紫色', color: '#800080' },
  { name: '黑色', color: '#000000' },
  { name: '白色', color: '#FFFFFF' },
  { name: '灰色', color: '#808080' },
] as const

/**
 * 颜色选项类型
 */
type ColorOption = typeof PRESET_COLORS[number]

interface ColorPickerProps {
  /**
   * 选中的颜色值（Hex 格式）
   */
  value: string
  /**
   * 颜色变化回调函数
   */
  onChange: (color: string) => void
  /**
   * 自定义类名
   */
  className?: string
}

export function ColorPicker({ value, onChange, className = '' }: ColorPickerProps) {
  // 内部状态：当前选中的颜色
  const [selectedColor, setSelectedColor] = useState<string>(value)
  // 自定义颜色选择器的值
  const [customColor, setCustomColor] = useState<string>('#FF0000')
  // 防抖定时器引用
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null)
  // 标记是否是自定义颜色选择器触发
  const isCustomColorRef = useRef<boolean>(false)

  /**
   * 处理颜色变化（带防抖）
   * 防抖延迟：500ms
   * 避免自定义颜色拖动时频繁触发搜索
   */
  const handleColorChangeWithDebounce = useCallback((color: string) => {
    // 清除之前的定时器
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }

    // 设置新的定时器，500ms 后触发回调
    debounceTimerRef.current = setTimeout(() => {
      onChange(color)
    }, 500)
  }, [onChange])

  /**
   * 处理预设颜色点击
   */
  const handlePresetColorClick = (color: string) => {
    setSelectedColor(color)
    isCustomColorRef.current = false
    // 预设颜色直接触发，不需要防抖
    onChange(color)
  }

  /**
   * 处理自定义颜色选择器变化
   */
  const handleCustomColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newColor = e.target.value
    setCustomColor(newColor)
    setSelectedColor(newColor)
    isCustomColorRef.current = true
    // 使用防抖处理
    handleColorChangeWithDebounce(newColor)
  }

  /**
   * 判断某个颜色是否被选中
   */
  const isSelected = (color: string): boolean => {
    // 如果当前是自定义颜色，则精确匹配
    if (isCustomColorRef.current) {
      return selectedColor === color
    }
    // 如果是预设颜色，也匹配自定义选择器中相同的颜色
    return selectedColor === color || (!selectedColor && !color)
  }

  // 组件卸载时清除定时器
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
    }
  }, [])

  // 同步外部 value 变化
  useEffect(() => {
    if (value !== selectedColor) {
      setSelectedColor(value)
    }
  }, [value])

  return (
    <div className={`color-picker ${className}`}>
      <style>{`
        .color-picker {
          display: flex;
          align-items: center;
          gap: 12px;
          flex-wrap: wrap;
          padding: 12px;
          background: #f9fafb;
          border-radius: 8px;
          margin-bottom: 16px;
        }
        
        .color-label {
          font-weight: 600;
          color: #374151;
          font-size: 0.95rem;
          white-space: nowrap;
        }
        
        .color-options {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          align-items: center;
        }
        
        .color-btn {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          border: 2px solid #e5e7eb;
          cursor: pointer;
          transition: all 0.2s ease;
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        
        .color-btn:hover {
          transform: scale(1.1);
          border-color: #9ca3af;
        }
        
        .color-btn.active {
          border-color: #2563eb;
          border-width: 3px;
          box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.2);
          transform: scale(1.05);
        }
        
        .color-btn.active::after {
          content: '✓';
          color: white;
          font-size: 16px;
          font-weight: bold;
          text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
        }
        
        /* 特殊处理白色和浅色背景的对勾颜色 */
        .color-btn.active[data-color="#FFFFFF"]::after,
        .color-btn.active[data-color="#FFFF00"]::after,
        .color-btn.active[data-color="#00FFFF"]::after {
          color: #374151;
          text-shadow: none;
        }
        
        .color-btn[data-color=""] {
          background: linear-gradient(135deg, #FF0000 25%, #008000 25%, #0000FF 25%, #FFFF00 25%, 
                                      #00FFFF 25%, #800080 25%, #FFFFFF 25%, #000000 25%);
          background-size: 12px 12px;
        }
        
        .color-separator {
          width: 1px;
          height: 24px;
          background: #e5e7eb;
          margin: 0 4px;
        }
        
        .custom-color-wrapper {
          display: flex;
          align-items: center;
          gap: 6px;
        }
        
        .custom-color-label {
          font-size: 0.85rem;
          color: #6b7280;
          white-space: nowrap;
        }
        
        .custom-color-input {
          width: 36px;
          height: 36px;
          border: 2px solid #e5e7eb;
          border-radius: 50%;
          cursor: pointer;
          padding: 0;
          background: none;
          transition: all 0.2s ease;
        }
        
        .custom-color-input::-webkit-color-swatch-wrapper {
          padding: 0;
          border-radius: 50%;
        }
        
        .custom-color-input::-webkit-color-swatch {
          border: none;
          border-radius: 50%;
        }
        
        .custom-color-input::-moz-color-swatch {
          border: none;
          border-radius: 50%;
        }
        
        .custom-color-input:hover {
          border-color: #9ca3af;
          transform: scale(1.05);
        }
        
        .custom-color-input.active {
          border-color: #2563eb;
          box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.2);
        }
      `}</style>

      <span className="color-label">颜色：</span>
      
      <div className="color-options">
        {/* 预设颜色块 */}
        {PRESET_COLORS.map((item) => (
          <button
            key={item.color || 'all'}
            type="button"
            className={`color-btn${isSelected(item.color) ? ' active' : ''}`}
            data-color={item.color}
            onClick={() => handlePresetColorClick(item.color)}
            title={item.name}
            style={{
              backgroundColor: item.color || undefined,
            }}
          />
        ))}
        
        {/* 分隔线 */}
        <div className="color-separator" />
        
        {/* 自定义颜色选择器 */}
        <div className="custom-color-wrapper">
          <span className="custom-color-label">自定义：</span>
          <input
            type="color"
            value={customColor}
            onChange={handleCustomColorChange}
            className={`custom-color-input${isSelected(customColor) && isCustomColorRef.current ? ' active' : ''}`}
            title="选择自定义颜色"
          />
        </div>
      </div>
    </div>
  )
}
