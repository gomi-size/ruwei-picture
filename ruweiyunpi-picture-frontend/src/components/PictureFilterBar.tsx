import { useState, useMemo, useCallback } from 'react'

// ==================== 类型定义 ====================
export interface FilterBarProps {
  categories: string[]
  tags: string[]
  selectedCategory: string
  selectedTags: string[]
  searchQuery: string
  selectedColor: string
  isSpaceOnly: boolean
  hasSpaceId?: boolean // 是否有空间 ID（用于判断是否显示颜色搜索）
  showUploadButton?: boolean // 是否显示上传按钮（默认 true）
  onSearchChange: (query: string) => void
  onCategoryChange: (category: string) => void
  onTagToggle: (tag: string) => void
  onColorChange: (color: string) => void
  onSpaceOnlyChange: (value: boolean) => void
  onUpload: () => void
}

export interface ColorOption {
  name: string
  value: string
  hex: string
}

// ==================== 常量定义 ====================
const COLOR_OPTIONS: ColorOption[] = [
  { name: '红色', value: '#FF0000', hex: '#FF0000' },
  { name: '橙色', value: '#FFA500', hex: '#FFA500' },
  { name: '黄色', value: '#FFFF00', hex: '#FFFF00' },
  { name: '绿色', value: '#008000', hex: '#008000' },
  { name: '青色', value: '#00FFFF', hex: '#00FFFF' },
  { name: '蓝色', value: '#0000FF', hex: '#0000FF' },
  { name: '紫色', value: '#800080', hex: '#800080' },
  { name: '黑色', value: '#000000', hex: '#000000' },
  { name: '白色', value: '#FFFFFF', hex: '#FFFFFF' },
  { name: '灰色', value: '#808080', hex: '#808080' },
]

const MAX_VISIBLE_TAGS = 8

// ==================== 主组件 ====================
export function PictureFilterBar(props: FilterBarProps) {
  const {
    categories,
    tags,
    selectedCategory,
    selectedTags,
    searchQuery,
    selectedColor,
    isSpaceOnly,
    hasSpaceId = false,
    showUploadButton = true, // 默认显示上传按钮
    onSearchChange,
    onCategoryChange,
    onTagToggle,
    onColorChange,
    onSpaceOnlyChange,
    onUpload,
  } = props

  const [showAllTags, setShowAllTags] = useState(false)

  // 记忆化处理
  const visibleTags = useMemo(() => {
    if (showAllTags) return tags
    return tags.slice(0, MAX_VISIBLE_TAGS)
  }, [tags, showAllTags])

  const hasMoreTags = tags.length > MAX_VISIBLE_TAGS

  // 回调函数记忆化
  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onSearchChange(e.target.value)
    },
    [onSearchChange]
  )

  const handleClearSearch = useCallback(() => {
    onSearchChange('')
  }, [onSearchChange])

  const handleClearFilters = useCallback(() => {
    onSearchChange('')
    onCategoryChange('')
    selectedTags.forEach((tag) => onTagToggle(tag))
    onColorChange('')
  }, [onSearchChange, onCategoryChange, selectedTags, onTagToggle, onColorChange])

  const hasActiveFilters = searchQuery || selectedCategory || selectedTags.length > 0 || selectedColor

  return (
    <div className="picture-filter-bar">
      <style>{`
        .picture-filter-bar {
          background: #ffffff;
          padding: 0;
        }

        .filter-bar-row {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 12px;
        }

        .filter-bar-row:last-child {
          margin-bottom: 0;
        }

        /* 搜索框 */
        .search-wrapper {
          position: relative;
          flex: 1;
          max-width: 480px;
        }

        .search-input {
          width: 100%;
          height: 36px;
          padding: 0 36px 0 40px;
          border: 1px solid #e5e7eb;
          border-radius: 18px;
          font-size: 0.875rem;
          background: #f9fafb;
          transition: all 0.2s;
          outline: none;
        }

        .search-input:focus {
          background: #ffffff;
          border-color: #667eea;
          box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
        }

        .search-icon {
          position: absolute;
          left: 14px;
          top: 50%;
          transform: translateY(-50%);
          color: #9ca3af;
          pointer-events: none;
        }

        .search-clear {
          position: absolute;
          right: 8px;
          top: 50%;
          transform: translateY(-50%);
          width: 20px;
          height: 20px;
          padding: 0;
          border: none;
          background: #e5e7eb;
          border-radius: 50%;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #6b7280;
          transition: all 0.2s;
        }

        .search-clear:hover {
          background: #d1d5db;
          color: #374151;
        }

        /* 颜色选择器 */
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

        /* 操作按钮 */
        .action-buttons {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-left: auto;
        }

        .filter-btn {
          height: 36px;
          padding: 0 16px;
          border: 1px solid #e5e7eb;
          border-radius: 18px;
          background: #ffffff;
          font-size: 0.875rem;
          color: #374151;
          cursor: pointer;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .filter-btn:hover {
          background: #f9fafb;
          border-color: #d1d5db;
        }

        .filter-btn.active {
          background: #667eea;
          border-color: #667eea;
          color: #ffffff;
        }

        .upload-btn {
          height: 36px;
          padding: 0 20px;
          border: none;
          border-radius: 18px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: #ffffff;
          font-size: 0.875rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          gap: 6px;
          box-shadow: 0 2px 8px rgba(102, 126, 234, 0.3);
        }

        .upload-btn:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
        }

        .upload-btn:active {
          transform: translateY(0);
        }

        /* 分类和标签行 */
        .filter-chips {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
        }

        .chip-label {
          font-size: 0.75rem;
          color: #6b7280;
          font-weight: 500;
          white-space: nowrap;
        }

        .chip {
          height: 28px;
          padding: 0 12px;
          border: 1px solid #e5e7eb;
          border-radius: 14px;
          background: #ffffff;
          font-size: 0.8125rem;
          color: #6b7280;
          cursor: pointer;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .chip:hover {
          background: #f9fafb;
          border-color: #d1d5db;
          color: #374151;
        }

        .chip.active {
          background: #667eea;
          border-color: #667eea;
          color: #ffffff;
        }

        .chip-tag {
          background: #f3f4f6;
          border-color: transparent;
        }

        .chip-tag:hover {
          background: #e5e7eb;
        }

        .chip-tag.active {
          background: #10b981;
          border-color: #10b981;
          color: #ffffff;
        }

        .show-more-btn {
          height: 28px;
          padding: 0 8px;
          border: none;
          background: transparent;
          font-size: 0.75rem;
          color: #667eea;
          cursor: pointer;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          gap: 2px;
        }

        .show-more-btn:hover {
          color: #764ba2;
        }

        /* 清空筛选 */
        .clear-filters {
          margin-left: auto;
          font-size: 0.75rem;
          color: #6b7280;
          cursor: pointer;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .clear-filters:hover {
          color: #ef4444;
        }

        /* 滚动条美化 */
        .filter-chips::-webkit-scrollbar {
          height: 4px;
        }

        .filter-chips::-webkit-scrollbar-track {
          background: #f3f4f6;
          border-radius: 2px;
        }

        .filter-chips::-webkit-scrollbar-thumb {
          background: #d1d5db;
          border-radius: 2px;
        }

        .filter-chips::-webkit-scrollbar-thumb:hover {
          background: #9ca3af;
        }
      `}</style>

      {/* 第一行：搜索 + 颜色 + 操作按钮 */}
      <div className="filter-bar-row">
        {/* 搜索框 */}
        <div className="search-wrapper">
          <svg
            className="search-icon"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="11" cy="11" r="8"></circle>
            <path d="m21 21-4.35-4.35"></path>
          </svg>
          <input
            type="text"
            className="search-input"
            placeholder="搜索图片名称、简介..."
            value={searchQuery}
            onChange={handleSearchChange}
          />
          {searchQuery && (
            <button className="search-clear" onClick={handleClearSearch} type="button">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6 6 18"></path>
                <path d="m6 6 12 12"></path>
              </svg>
            </button>
          )}
        </div>

        {/* 颜色筛选（仅在有空间 ID 时显示） */}
        {hasSpaceId && (
          <div className="color-picker">
            <span className="color-label">颜色：</span>
            <div className="color-options">
              <button
                type="button"
                className={`color-btn ${!selectedColor ? 'active' : ''}`}
                data-color=""
                title="全部"
                onClick={() => onColorChange('')}
              />
              {COLOR_OPTIONS.map((color) => (
                <button
                  key={color.value}
                  type="button"
                  className={`color-btn ${selectedColor === color.value ? 'active' : ''}`}
                  data-color={color.value}
                  title={color.name}
                  style={{ backgroundColor: color.hex }}
                  onClick={() => onColorChange(selectedColor === color.value ? '' : color.value)}
                />
              ))}
              <div className="color-separator"></div>
              <div className="custom-color-wrapper">
                <span className="custom-color-label">自定义：</span>
                <input
                  type="color"
                  className={`custom-color-input ${selectedColor && !COLOR_OPTIONS.some(c => c.value === selectedColor) ? 'active' : ''}`}
                  title="选择自定义颜色"
                  value={selectedColor || '#FF0000'}
                  onChange={(e) => onColorChange(e.target.value)}
                />
              </div>
            </div>
          </div>
        )}

        {/* 操作按钮 */}
        <div className="action-buttons">
          {showUploadButton && (
            <button className="upload-btn" onClick={onUpload} type="button">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="17 8 12 3 7 8"></polyline>
                <line x1="12" y1="3" x2="12" y2="15"></line>
              </svg>
              上传图片
            </button>
          )}
        </div>
      </div>

      {/* 第二行：分类 + 标签 */}
      <div className="filter-bar-row">
        {/* 分类 */}
        <div className="filter-chips">
          <span className="chip-label">分类</span>
          <button
            className={`chip ${!selectedCategory ? 'active' : ''}`}
            onClick={() => onCategoryChange('')}
            type="button"
          >
            全部
          </button>
          {categories.map((category) => (
            <button
              key={category}
              className={`chip ${selectedCategory === category ? 'active' : ''}`}
              onClick={() => onCategoryChange(category)}
              type="button"
            >
              {category}
            </button>
          ))}
        </div>

        {/* 标签 */}
        <div className="filter-chips">
          <span className="chip-label">标签</span>
          {visibleTags.map((tag) => (
            <button
              key={tag}
              className={`chip chip-tag ${selectedTags.includes(tag) ? 'active' : ''}`}
              onClick={() => onTagToggle(tag)}
              type="button"
            >
              {tag}
            </button>
          ))}
          {hasMoreTags && (
            <button
              className="show-more-btn"
              onClick={() => setShowAllTags(!showAllTags)}
              type="button"
            >
              {showAllTags ? (
                <>
                  收起
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="m6 9 6 6 6-6"></path>
                  </svg>
                </>
              ) : (
                <>
                  更多
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="m6 9 6 6 6-6"></path>
                  </svg>
                </>
              )}
            </button>
          )}
        </div>

        {/* 清空筛选 */}
        {hasActiveFilters && (
          <button className="clear-filters" onClick={handleClearFilters} type="button">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6 6 18"></path>
              <path d="m6 6 12 12"></path>
            </svg>
            清空筛选
          </button>
        )}
      </div>
    </div>
  )
}
