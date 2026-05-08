import { useState, useEffect } from 'react'
import { MasonryGallery } from '../components/MasonryGallery'
import type { PictureVO } from '../types/api'

/**
 * 瀑布流画廊演示页面 - Mock 数据版本（精致优化版）
 * 
 * 演示核心：
 * - 列表展示：使用 thumbnailUrl（缩略图）+ dominantColor 背景占位
 * - 大图预览：使用 webpUrl（WebP 高清格式）
 * - 防抖动：使用 aspectRatio 提前撑开高度
 */

/**
 * Mock 数据：模拟后端返回的图片列表
 * 包含完整字段：
 * - id: 图片唯一标识
 * - title: 图片标题
 * - aspectRatio: 图片宽高比（用于占位防抖动）
 * - thumbnailUrl: 低清缩略图地址
 * - webpUrl: 高清 WebP 格式地址
 * - dominantColor: 图片主色调 Hex 值（用于加载前背景占位）
 */
const MOCK_PICTURES: PictureVO[] = [
  {
    id: 1,
    title: '风景 - 山川湖泊',
    name: '山川湖泊',
    introduction: '壮丽的自然风光，蓝天白云下的山川湖泊',
    url: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=2000&q=80',
    thumbnailUrl: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&q=60',
    webpUrl: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1920&fm=webp&q=90',
    dominantColor: '#4A90A8',
    category: '风景',
    tags: ['山川', '湖泊', '自然'],
    picWidth: 1920,
    picHeight: 1280,
    aspectRatio: 1.5,
  },
  {
    id: 2,
    title: '城市 - 夜景天际线',
    name: '城市夜景',
    introduction: '繁华都市的夜景，灯火辉煌的摩天大楼',
    url: 'https://images.unsplash.com/photo-1519501025264-65ba15a82390?w=2000&q=80',
    thumbnailUrl: 'https://images.unsplash.com/photo-1519501025264-65ba15a82390?w=400&q=60',
    webpUrl: 'https://images.unsplash.com/photo-1519501025264-65ba15a82390?w=1920&fm=webp&q=90',
    dominantColor: '#1A2B4A',
    category: '城市',
    tags: ['夜景', '建筑', '都市'],
    picWidth: 1920,
    picHeight: 1080,
    aspectRatio: 1.78,
  },
  {
    id: 3,
    title: '动物 - 森林小鹿',
    name: '森林小鹿',
    introduction: '清晨森林中的小鹿，自然和谐的画面',
    url: 'https://images.unsplash.com/photo-1484406566174-9da000ce6478?w=2000&q=80',
    thumbnailUrl: 'https://images.unsplash.com/photo-1484406566174-9da000ce6478?w=400&q=60',
    webpUrl: 'https://images.unsplash.com/photo-1484406566174-9da000ce6478?w=1920&fm=webp&q=90',
    dominantColor: '#6B5B4A',
    category: '动物',
    tags: ['鹿', '森林', '野生动物'],
    picWidth: 1280,
    picHeight: 1920,
    aspectRatio: 0.67,
  },
  {
    id: 4,
    title: '美食 - 精致甜点',
    name: '法式甜点',
    introduction: '精美的法式甜点，令人垂涎欲滴',
    url: 'https://images.unsplash.com/photo-1563729784474-d77dbb933a9e?w=2000&q=80',
    thumbnailUrl: 'https://images.unsplash.com/photo-1563729784474-d77dbb933a9e?w=400&q=60',
    webpUrl: 'https://images.unsplash.com/photo-1563729784474-d77dbb933a9e?w=1920&fm=webp&q=90',
    dominantColor: '#D4A574',
    category: '美食',
    tags: ['甜点', '蛋糕', '美食摄影'],
    picWidth: 1920,
    picHeight: 1280,
    aspectRatio: 1.5,
  },
  {
    id: 5,
    title: '科技 - 未来感电路板',
    name: '电路板',
    introduction: '高科技电路板特写，展现科技之美',
    url: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=2000&q=80',
    thumbnailUrl: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=400&q=60',
    webpUrl: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=1920&fm=webp&q=90',
    dominantColor: '#2D4A3E',
    category: '科技',
    tags: ['科技', '电路板', '未来感'],
    picWidth: 1920,
    picHeight: 1280,
    aspectRatio: 1.5,
  },
  {
    id: 6,
    title: '人物 - 街头摄影师',
    name: '街头摄影师',
    introduction: '专注的街头摄影师，记录城市瞬间',
    url: 'https://images.unsplash.com/photo-1554048612-387768052bf7?w=2000&q=80',
    thumbnailUrl: 'https://images.unsplash.com/photo-1554048612-387768052bf7?w=400&q=60',
    webpUrl: 'https://images.unsplash.com/photo-1554048612-387768052bf7?w=1920&fm=webp&q=90',
    dominantColor: '#3D3D3D',
    category: '人物',
    tags: ['人物', '摄影', '街头'],
    picWidth: 1280,
    picHeight: 1920,
    aspectRatio: 0.67,
  },
  {
    id: 7,
    title: '自然 - 极光奇观',
    name: '北极光',
    introduction: '北极光在夜空中舞动，梦幻般的景象',
    url: 'https://images.unsplash.com/photo-1531366936337-7c912a4589a7?w=2000&q=80',
    thumbnailUrl: 'https://images.unsplash.com/photo-1531366936337-7c912a4589a7?w=400&q=60',
    webpUrl: 'https://images.unsplash.com/photo-1531366936337-7c912a4589a7?w=1920&fm=webp&q=90',
    dominantColor: '#2D5A4A',
    category: '自然',
    tags: ['极光', '夜空', '自然奇观'],
    picWidth: 1920,
    picHeight: 1080,
    aspectRatio: 1.78,
  },
  {
    id: 8,
    title: '建筑 - 现代美术馆',
    name: '现代美术馆',
    introduction: '极简主义风格的现代美术馆建筑',
    url: 'https://images.unsplash.com/photo-1487958449943-2429e8be8625?w=2000&q=80',
    thumbnailUrl: 'https://images.unsplash.com/photo-1487958449943-2429e8be8625?w=400&q=60',
    webpUrl: 'https://images.unsplash.com/photo-1487958449943-2429e8be8625?w=1920&fm=webp&q=90',
    dominantColor: '#B8A89A',
    category: '建筑',
    tags: ['建筑', '现代', '美术馆'],
    picWidth: 1920,
    picHeight: 1280,
    aspectRatio: 1.5,
  },
  {
    id: 9,
    title: '海洋 - 深海珊瑚',
    name: '海底珊瑚',
    introduction: '五彩斑斓的海底珊瑚礁生态系统',
    url: 'https://images.unsplash.com/photo-1583212292454-1fe6229603b7?w=2000&q=80',
    thumbnailUrl: 'https://images.unsplash.com/photo-1583212292454-1fe6229603b7?w=400&q=60',
    webpUrl: 'https://images.unsplash.com/photo-1583212292454-1fe6229603b7?w=1920&fm=webp&q=90',
    dominantColor: '#1A4A6A',
    category: '海洋',
    tags: ['珊瑚', '海洋', '水下摄影'],
    picWidth: 1280,
    picHeight: 1920,
    aspectRatio: 0.67,
  },
  {
    id: 10,
    title: '花卉 - 樱花盛开',
    name: '樱花',
    introduction: '春天盛开的樱花，浪漫唯美',
    url: 'https://images.unsplash.com/photo-1522383225659-ed40af6210a8?w=2000&q=80',
    thumbnailUrl: 'https://images.unsplash.com/photo-1522383225659-ed40af6210a8?w=400&q=60',
    webpUrl: 'https://images.unsplash.com/photo-1522383225659-ed40af6210a8?w=1920&fm=webp&q=90',
    dominantColor: '#D4A5B8',
    category: '植物',
    tags: ['樱花', '花卉', '春天'],
    picWidth: 1920,
    picHeight: 1280,
    aspectRatio: 1.5,
  },
  {
    id: 11,
    title: '运动 - 极限滑雪',
    name: '极限滑雪',
    introduction: '雪山上的极限滑雪运动，速度与激情',
    url: 'https://images.unsplash.com/photo-1551698618-1dfe5d97d256?w=2000&q=80',
    thumbnailUrl: 'https://images.unsplash.com/photo-1551698618-1dfe5d97d256?w=400&q=60',
    webpUrl: 'https://images.unsplash.com/photo-1551698618-1dfe5d97d256?w=1920&fm=webp&q=90',
    dominantColor: '#A8C8D8',
    category: '运动',
    tags: ['滑雪', '极限运动', '雪山'],
    picWidth: 1920,
    picHeight: 1080,
    aspectRatio: 1.78,
  },
  {
    id: 12,
    title: '艺术 - 抽象油画',
    name: '抽象油画',
    introduction: '色彩斑斓的抽象油画作品',
    url: 'https://images.unsplash.com/photo-1541963463532-d68292c34b19?w=2000&q=80',
    thumbnailUrl: 'https://images.unsplash.com/photo-1541963463532-d68292c34b19?w=400&q=60',
    webpUrl: 'https://images.unsplash.com/photo-1541963463532-d68292c34b19?w=1920&fm=webp&q=90',
    dominantColor: '#8A5A7A',
    category: '艺术',
    tags: ['油画', '抽象', '艺术'],
    picWidth: 1280,
    picHeight: 1920,
    aspectRatio: 0.67,
  },
]

/**
 * Toast 提示类型
 */
interface Toast {
  message: string
  type: 'success' | 'error' | 'info'
}

export default function MasonryGalleryDemo() {
  const [pictures, setPictures] = useState<PictureVO[]>([])
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState<Toast | null>(null)

  // 模拟加载数据
  useEffect(() => {
    const loadData = async () => {
      // 模拟网络延迟
      await new Promise(resolve => setTimeout(resolve, 800))
      setPictures(MOCK_PICTURES)
      setLoading(false)
      
      // 显示加载完成提示
      setToast({
        message: `加载完成！共 ${MOCK_PICTURES.length} 张图片，点击卡片查看 WebP 大图预览`,
        type: 'success'
      })
      setTimeout(() => setToast(null), 3000)
    }

    loadData()
  }, [])

  // 处理图片点击
  const handlePictureClick = (picture: PictureVO, index: number) => {
    console.log('=== 🖼️ 图片点击事件 ===')
    console.log('📌 图片:', picture.title)
    console.log('📍 索引:', index)
    console.log('🔖 缩略图 URL:', picture.thumbnailUrl)
    console.log('🖼️ WebP 大图 URL:', picture.webpUrl)
    console.log('🎨 主色调:', picture.dominantColor)
    console.log('📐 宽高比:', picture.aspectRatio)
    console.log('==================')
  }

  // 处理下载
  const handleDownload = (picture: PictureVO) => {
    console.log('⬇️ 下载图片:', picture.title)
    setToast({
      message: `开始下载：${picture.title}`,
      type: 'info'
    })
    setTimeout(() => setToast(null), 2000)
  }

  // 处理收藏
  const handleFavorite = (picture: PictureVO) => {
    console.log('⭐ 收藏图片:', picture.title)
    setToast({
      message: `已收藏：${picture.title}`,
      type: 'success'
    })
    setTimeout(() => setToast(null), 2000)
  }

  return (
    <div style={{ 
      minHeight: '100vh', 
      background: '#f9fafb',
      paddingBottom: '40px'
    }}>
      {/* 页面头部 */}
      <div style={{
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        padding: '48px 20px',
        marginBottom: '24px',
        color: 'white',
        textAlign: 'center'
      }}>
        <h1 style={{ 
          fontSize: '2.5rem', 
          margin: '0 0 12px',
          fontWeight: '700',
          letterSpacing: '-0.5px'
        }}>
          瀑布流画廊演示
        </h1>
        <p style={{ 
          fontSize: '1.1rem', 
          margin: 0,
          opacity: 0.95
        }}>
          双分辨率图片加载 · 主色调背景占位 · 精致交互体验
        </p>
        <div style={{ 
          marginTop: '20px', 
          fontSize: '0.95rem',
          opacity: 0.9,
          display: 'flex',
          justifyContent: 'center',
          gap: '16px',
          flexWrap: 'wrap'
        }}>
          <span style={{ 
            background: 'rgba(255,255,255,0.2)',
            padding: '6px 14px',
            borderRadius: '6px',
            backdropFilter: 'blur(8px)'
          }}>
            📦 列表：thumbnailUrl（缩略图）
          </span>
          <span style={{ 
            background: 'rgba(255,255,255,0.2)',
            padding: '6px 14px',
            borderRadius: '6px',
            backdropFilter: 'blur(8px)'
          }}>
            🖼️ 预览：webpUrl（WebP 高清）
          </span>
          <span style={{ 
            background: 'rgba(255,255,255,0.2)',
            padding: '6px 14px',
            borderRadius: '6px',
            backdropFilter: 'blur(8px)'
          }}>
            🎨 占位：dominantColor（主色调）
          </span>
        </div>
      </div>

      {/* Toast 提示 */}
      {toast && (
        <div style={{
          position: 'fixed',
          top: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 10000,
          padding: '14px 28px',
          borderRadius: '12px',
          color: 'white',
          fontWeight: '500',
          boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
          animation: 'toast-fade-in 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          background: toast.type === 'success' ? '#10b981' 
                    : toast.type === 'error' ? '#ef4444' 
                    : '#3b82f6'
        }}>
          {toast.message}
        </div>
      )}

      {/* Toast 动画样式 */}
      <style>{`
        @keyframes toast-fade-in {
          from {
            opacity: 0;
            transform: translateX(-50%) translateY(-20px);
          }
          to {
            opacity: 1;
            transform: translateX(-50%) translateY(0);
          }
        }
      `}</style>

      {/* 使用说明卡片 */}
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto 24px',
        padding: '24px',
        background: 'white',
        borderRadius: '16px',
        boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
        border: '1px solid #f3f4f6'
      }}>
        <h2 style={{ 
          fontSize: '1.3rem', 
          margin: '0 0 16px',
          color: '#1f2937',
          fontWeight: '600'
        }}>
          💡 核心特性
        </h2>
        <ul style={{ 
          margin: 0, 
          paddingLeft: '20px',
          lineHeight: '2',
          color: '#4b5563',
          fontSize: '0.95rem'
        }}>
          <li>
            <strong style={{ color: '#1f2937' }}>双分辨率加载：</strong>
            列表使用 <code style={{ 
              background: '#fef2f2',
              padding: '2px 8px',
              borderRadius: '4px',
              color: '#dc2626',
              fontSize: '0.85rem'
            }}>thumbnailUrl</code>，预览使用 <code style={{ 
              background: '#f0fdf4',
              padding: '2px 8px',
              borderRadius: '4px',
              color: '#059669',
              fontSize: '0.85rem'
            }}>webpUrl</code>，平衡性能与画质
          </li>
          <li>
            <strong style={{ color: '#1f2937' }}>主色调背景占位：</strong>
            使用 <code style={{ 
              background: '#fffbeb',
              padding: '2px 8px',
              borderRadius: '4px',
              color: '#d97706',
              fontSize: '0.85rem'
            }}>dominantColor</code> 作为加载前背景，视觉更连贯
          </li>
          <li>
            <strong style={{ color: '#1f2937' }}>防抖动布局：</strong>
            通过 <code style={{ 
              background: '#eff6ff',
              padding: '2px 8px',
              borderRadius: '4px',
              color: '#2563eb',
              fontSize: '0.85rem'
            }}>aspectRatio</code> 提前撑开容器高度，防止页面跳动
          </li>
          <li>
            <strong style={{ color: '#1f2937' }}>懒加载优化：</strong>
            使用 <code>loading="lazy"</code> 实现原生懒加载，滚动时按需加载
          </li>
          <li>
            <strong style={{ color: '#1f2937' }}>预加载体验：</strong>
            打开预览后自动预加载下一张图的 WebP 大图
          </li>
          <li>
            <strong style={{ color: '#1f2937' }}>精致交互：</strong>
            渐变遮罩、毛玻璃效果、流畅动画，提升 C 端产品质感
          </li>
        </ul>
        <div style={{
          marginTop: '20px',
          padding: '16px',
          background: '#eff6ff',
          borderRadius: '12px',
          border: '1px solid #dbeafe'
        }}>
          <strong style={{ color: '#1e40af', fontSize: '1rem' }}>🔍 调试技巧：</strong>
          <div style={{
            marginTop: '8px',
            color: '#1e40af',
            lineHeight: '1.8',
            fontSize: '0.9rem'
          }}>
            打开浏览器开发者工具（F12）→ Network 面板 → 筛选 Img 类型：
            <ul style={{ 
              margin: '8px 0 0 20px',
              padding: 0
            }}>
              <li>初始加载：只加载缩略图（~20-50KB）</li>
              <li>点击预览：加载 WebP 大图（~200-500KB）</li>
              <li>控制台：查看详细的 URL 切换日志</li>
            </ul>
          </div>
        </div>
      </div>

      {/* 瀑布流画廊组件 */}
      <MasonryGallery
        pictures={pictures}
        loading={loading}
        onPictureClick={handlePictureClick}
        onDownload={handleDownload}
        onFavorite={handleFavorite}
        columnMinWidth={300}
        gap={16}
      />

      {/* 页脚 */}
      <div style={{
        textAlign: 'center',
        padding: '40px 20px',
        color: '#9ca3af',
        fontSize: '0.9rem'
      }}>
        <p style={{ fontWeight: '500', color: '#6b7280' }}>
          Masonry Gallery Demo · 云批智能图库
        </p>
        <p style={{ marginTop: '8px', fontSize: '0.85rem' }}>
          Mock Data provided by Unsplash · React + TypeScript
        </p>
      </div>
    </div>
  )
}
