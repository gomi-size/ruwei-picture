import { useState } from 'react'
import type { PictureVO } from '../types/api'

/**
 * 空间图片管理页面 - Mock 数据演示版
 * 用于展示重构后的网格布局效果
 */
export function SpacePictureDemoPage() {
  const [editingPicture, setEditingPicture] = useState<PictureVO | null>(null)

  // Mock 数据：12 张图片，模拟真实场景
  // 使用 picsum.photos 作为图片源，避免跨域问题
  const mockPictures: PictureVO[] = [
    {
      id: 1,
      name: '山间晨曦',
      url: 'https://picsum.photos/800/600?random=1',
      category: '风景',
      tags: ['山川', '日出'],
    },
    {
      id: 2,
      name: '城市夜景',
      url: 'https://picsum.photos/800/600?random=2',
      category: '城市',
      tags: ['夜景', '建筑'],
    },
    {
      id: 3,
      name: '森林小鹿',
      url: 'https://picsum.photos/600/800?random=3',
      category: '动物',
      tags: ['鹿', '森林'],
    },
    {
      id: 4,
      name: '法式甜点',
      url: 'https://picsum.photos/800/600?random=4',
      category: '美食',
      tags: ['甜点', '蛋糕'],
    },
    {
      id: 5,
      name: '科技电路板',
      url: 'https://picsum.photos/800/600?random=5',
      category: '科技',
      tags: ['科技', '电子'],
    },
    {
      id: 6,
      name: '街头摄影',
      url: 'https://picsum.photos/600/800?random=6',
      category: '人物',
      tags: ['摄影', '街头'],
    },
    {
      id: 7,
      name: '北极光',
      url: 'https://picsum.photos/800/600?random=7',
      category: '自然',
      tags: ['极光', '夜空'],
    },
    {
      id: 8,
      name: '现代建筑',
      url: 'https://picsum.photos/800/600?random=8',
      category: '建筑',
      tags: ['现代', '美术馆'],
    },
    {
      id: 9,
      name: '海底珊瑚',
      url: 'https://picsum.photos/600/800?random=9',
      category: '海洋',
      tags: ['珊瑚', '水下'],
    },
    {
      id: 10,
      name: '樱花盛开',
      url: 'https://picsum.photos/800/600?random=10',
      category: '植物',
      tags: ['樱花', '春天'],
    },
    {
      id: 11,
      name: '极限滑雪',
      url: 'https://picsum.photos/800/600?random=11',
      category: '运动',
      tags: ['滑雪', '极限'],
    },
    {
      id: 12,
      name: '抽象艺术',
      url: 'https://picsum.photos/600/800?random=12',
      category: '艺术',
      tags: ['油画', '抽象'],
    },
  ]

  return (
    <section className="space-picture-demo-page">
      <style>{`
        .space-picture-demo-page {
          max-width: 1400px;
          margin: 0 auto;
          padding: 24px;
          background: #f9fafb;
          min-height: 100vh;
        }

        /* 顶部区域 */
        .space-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 32px;
          padding: 20px 24px;
          background: white;
          border-radius: 16px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
        }

        .space-header-left {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .back-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 8px 12px;
          background: #f3f4f6;
          border: none;
          border-radius: 8px;
          color: #6b7280;
          font-size: 0.9rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .back-btn:hover {
          background: #e5e7eb;
          color: #374151;
        }

        .space-title-section {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .space-title {
          margin: 0;
          font-size: 1.5rem;
          font-weight: 700;
          color: #111827;
          letter-spacing: -0.02em;
        }

        .space-stats {
          font-size: 0.875rem;
          color: #6b7280;
          font-weight: 500;
        }

        .upload-btn-primary {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 12px 24px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border: none;
          border-radius: 12px;
          font-size: 0.95rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
        }

        .upload-btn-primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(102, 126, 234, 0.4);
        }

        /* 网格布局 */
        .picture-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 20px;
          padding: 4px;
        }

        @media (max-width: 1600px) {
          .picture-grid {
            grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
          }
        }

        @media (max-width: 1200px) {
          .picture-grid {
            grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
          }
        }

        @media (max-width: 768px) {
          .picture-grid {
            grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
            gap: 12px;
          }
        }

        /* 图片卡片 */
        .picture-card {
          position: relative;
          aspect-ratio: 4 / 3;
          border-radius: 12px;
          overflow: hidden;
          background: #f3f4f6;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .picture-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 12px 24px rgba(0, 0, 0, 0.1);
        }

        .picture-card-image {
          width: 100%;
          height: 100%;
          object-fit: cover;
          transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .picture-card:hover .picture-card-image {
          transform: scale(1.05);
        }

        /* Hover 遮罩层 */
        .picture-card-overlay {
          position: absolute;
          inset: 0;
          background: linear-gradient(
            to bottom,
            transparent 0%,
            transparent 50%,
            rgba(0, 0, 0, 0.75) 100%
          );
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          padding: 16px;
          opacity: 0;
          transition: opacity 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .picture-card:hover .picture-card-overlay {
          opacity: 1;
        }

        .picture-card-overlay-top {
          display: flex;
          justify-content: flex-end;
          gap: 8px;
        }

        .picture-card-overlay-bottom {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .icon-btn {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          border: none;
          background: rgba(255, 255, 255, 0.2);
          backdrop-filter: blur(8px);
          color: white;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .icon-btn:hover {
          background: rgba(255, 255, 255, 0.3);
          transform: scale(1.08);
        }

        .icon-btn.edit-btn:hover {
          background: rgba(59, 130, 246, 0.5);
        }

        .icon-btn.delete-btn:hover {
          background: rgba(239, 68, 68, 0.5);
        }

        .icon-btn.download-btn:hover {
          background: rgba(16, 185, 129, 0.5);
        }

        .picture-title {
          color: white;
          font-size: 0.95rem;
          font-weight: 600;
          margin: 0;
          text-shadow: 0 2px 4px rgba(0, 0, 0, 0.5);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .picture-category-badge {
          display: inline-block;
          padding: 4px 10px;
          background: rgba(255, 255, 255, 0.2);
          backdrop-filter: blur(8px);
          color: white;
          font-size: 0.75rem;
          font-weight: 600;
          border-radius: 6px;
          width: fit-content;
        }

        /* 演示提示 */
        .demo-notice {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 16px 24px;
          border-radius: 12px;
          margin-bottom: 24px;
          display: flex;
          align-items: center;
          gap: 12px;
          font-size: 0.95rem;
          font-weight: 500;
        }

        .demo-notice svg {
          flex-shrink: 0;
        }
      `}</style>

      {/* 演示提示 */}
      <div className="demo-notice">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="12" y1="16" x2="12" y2="12"></line>
          <line x1="12" y1="8" x2="12.01" y2="8"></line>
        </svg>
        <span>这是重构后的空间图片管理页面效果 - 请将鼠标悬停在图片卡片上查看交互效果</span>
      </div>

      {/* 顶部区域 */}
      <div className="space-header">
        <div className="space-header-left">
          <button className="back-btn">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6"></polyline>
            </svg>
            返回空间列表
          </button>
          <div className="space-title-section">
            <h1 className="space-title">陈航的空间</h1>
            <p className="space-stats">共 {mockPictures.length} 张图片</p>
          </div>
        </div>

        <button className="upload-btn-primary">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="16 16 12 12 8 16"></polyline>
            <line x1="12" y1="12" x2="12" y2="21"></line>
            <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"></path>
          </svg>
          上传图片
        </button>
      </div>

      {/* 图片网格 */}
      <div className="picture-grid">
        {mockPictures.map((pic) => (
          <div key={pic.id} className="picture-card">
            <img 
              src={pic.url} 
              alt={pic.name} 
              className="picture-card-image"
              loading="lazy"
            />
            
            <div className="picture-card-overlay">
              <div className="picture-card-overlay-top">
                <button
                  type="button"
                  className="icon-btn download-btn"
                  title="下载"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                    <polyline points="7 10 12 15 17 10"></polyline>
                    <line x1="12" y1="15" x2="12" y2="3"></line>
                  </svg>
                </button>
                <button
                  type="button"
                  className="icon-btn edit-btn"
                  onClick={() => setEditingPicture(pic)}
                  title="编辑"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                  </svg>
                </button>
                <button
                  type="button"
                  className="icon-btn delete-btn"
                  title="删除"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="3 6 5 6 21 6"></polyline>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                  </svg>
                </button>
              </div>

              <div className="picture-card-overlay-bottom">
                <h4 className="picture-title">{pic.name}</h4>
                {pic.category && (
                  <span className="picture-category-badge">{pic.category}</span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
