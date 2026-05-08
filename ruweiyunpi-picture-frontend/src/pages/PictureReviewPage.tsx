import { useCallback, useEffect, useState } from 'react'
import { pictureApi } from '../api/picture'
import { ConfirmDialog } from '../components/ConfirmDialog'
import type { DialogButton } from '../components/ConfirmDialog'
import type { PictureVO } from '../types/api'
import { AdminOnly } from '../components/AdminOnly'

export function PictureReviewPage() {
  return (
    <AdminOnly>
      <PictureReviewInner />
    </AdminOnly>
  )
}

function PictureReviewInner() {
  const [pictures, setPictures] = useState<PictureVO[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedPicture, setSelectedPicture] = useState<PictureVO | null>(null)
  const [confirmDialog, setConfirmDialog] = useState<{
    title: string
    message: string
    buttons: DialogButton[]
  } | null>(null)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      // 使用管理员接口获取所有审核状态的图片
      const picturesPage = await pictureApi.listPictureByPageAdmin({ 
        current: 1, 
        pageSize: 100
      })
      setPictures(picturesPage.records || [])
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadData()
  }, [loadData])

  const onApprovePicture = (pic: PictureVO) => {
    setConfirmDialog({
      title: '审核通过',
      message: `确定要通过${pic.name ? `"${pic.name}"` : '这张图片'}的审核吗？`,
      buttons: [
        { label: '取消', onClick: () => {}, variant: 'secondary' },
        {
          label: '确认通过',
          variant: 'primary',
          onClick: async () => {
            try {
              await pictureApi.review({ id: pic.id, reviewStatus: 1 })
              await loadData()
            } catch (error) {
              console.error('审核失败:', error)
            }
          }
        }
      ]
    })
  }

  const onRejectPicture = (pic: PictureVO) => {
    setConfirmDialog({
      title: '审核拒绝',
      message: `确定要拒绝${pic.name ? `"${pic.name}"` : '这张图片'}吗？拒绝后将删除该图片。`,
      buttons: [
        { label: '取消', onClick: () => {}, variant: 'secondary' },
        {
          label: '确认拒绝',
          variant: 'danger',
          onClick: async () => {
            try {
              await pictureApi.review({ id: pic.id, reviewStatus: 2 })
              await loadData()
            } catch (error) {
              console.error('审核失败:', error)
            }
          }
        }
      ]
    })
  }

  const onViewPictureDetail = (pic: PictureVO) => {
    setSelectedPicture(pic)
  }

  if (loading) {
    return <p className="page-hint">加载中…</p>
  }

  return (
    <section className="admin-layout">
      <div className="card">
        <h2>图片审核</h2>
        <p>图片条数（当前页）：{pictures.length}</p>
      </div>
      <div className="card">
        {pictures.length === 0 ? (
          <p className="page-muted">暂无待审核图片</p>
        ) : (
          pictures.map((pic) => (
            <div className="picture-item card" key={pic.id} style={{ marginBottom: '16px', padding: '16px', cursor: 'pointer' }} onClick={() => onViewPictureDetail(pic)}>
              <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                <div style={{ flexShrink: 0, width: '120px', height: '80px', borderRadius: '8px', overflow: 'hidden', border: '1px solid #e5e7eb' }}>
                  <img src={pic.url} alt={pic.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
                <div style={{ flex: '1', minWidth: '200px' }}>
                  <h3 style={{ margin: '0 0 8px 0', fontSize: '1rem', fontWeight: '600' }}>
                    {pic.name || `图片 #${pic.id}`}
                  </h3>
                  <p style={{ margin: '0 0 8px 0', fontSize: '0.875rem', color: '#6b7280' }}>
                    {pic.introduction || '无描述'}
                  </p>
                  <div style={{ marginBottom: '8px' }}>
                    {pic.tags && Array.isArray(pic.tags) && pic.tags.length > 0 ? (
                      pic.tags.map((tag, index) => (
                        <span key={index} className="tag" style={{ marginRight: '6px', marginBottom: '4px', display: 'inline-block' }}>
                          {tag}
                        </span>
                      ))
                    ) : (
                      <span style={{ fontSize: '0.875rem', color: '#9ca3af' }}>无标签</span>
                    )}
                  </div>
                  <div style={{ marginBottom: '8px' }}>
                    <span className="tag" style={{ 
                      backgroundColor: pic.reviewStatus === 0 ? '#fef3c7' : pic.reviewStatus === 1 ? '#d1fae5' : '#fee2e2',
                      color: pic.reviewStatus === 0 ? '#92400e' : pic.reviewStatus === 1 ? '#065f46' : '#991b1b',
                      padding: '2px 8px',
                      borderRadius: '4px',
                      fontSize: '0.75rem',
                      fontWeight: '500'
                    }}>
                      {pic.reviewStatus === 0 ? '待审核' : pic.reviewStatus === 1 ? '已通过' : '已拒绝'}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#9ca3af' }}>
                    <span>分类: {pic.category || '未分类'}</span>
                    <span style={{ marginLeft: '16px' }}>创建时间: {new Date(pic.createTime).toLocaleString()}</span>
                  </div>
                </div>
                <div className="row-actions" style={{ flexShrink: 0, alignSelf: 'flex-start', display: 'flex', gap: '8px' }}>
                  <button type="button" onClick={(e) => {
                    e.stopPropagation();
                    onApprovePicture(pic);
                  }} style={{ 
                    padding: '6px 12px',
                    fontSize: '0.85rem',
                    backgroundColor: '#d1fae5', 
                    color: '#065f46', 
                    borderColor: '#a7f3d0',
                    border: '1px solid',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    marginBottom: '8px'
                  }} onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#a7f3d0';
                    e.currentTarget.style.borderColor = '#6ee7b7';
                  }} onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#d1fae5';
                    e.currentTarget.style.borderColor = '#a7f3d0';
                  }}>
                    通过
                  </button>
                  <button type="button" onClick={(e) => {
                    e.stopPropagation();
                    onRejectPicture(pic);
                  }} style={{ 
                    padding: '6px 12px',
                    fontSize: '0.85rem',
                    backgroundColor: '#fef2f2', 
                    color: '#dc2626', 
                    borderColor: '#fecaca',
                    border: '1px solid',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    marginBottom: '8px'
                  }} onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#fee2e2';
                    e.currentTarget.style.borderColor = '#fca5a5';
                  }} onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#fef2f2';
                    e.currentTarget.style.borderColor = '#fecaca';
                  }}>
                    拒绝
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
      
      {selectedPicture && (
        <div className="detail-overlay" onClick={() => setSelectedPicture(null)}>
          <div className="detail-panel card" onClick={(e) => e.stopPropagation()}>
            <div className="detail-panel-header">
              <h2>图片详情</h2>
              <button className="detail-close" onClick={() => setSelectedPicture(null)}>
                关闭
              </button>
            </div>
            <div className="detail-body">
              <div className="detail-image-wrap">
                <img src={selectedPicture.url} alt={selectedPicture.name} />
              </div>
              <dl className="detail-meta">
                <div>
                  <dt>图片名称</dt>
                  <dd>{selectedPicture.name || '未命名'}</dd>
                </div>
                <div>
                  <dt>描述</dt>
                  <dd>{selectedPicture.introduction || '无描述'}</dd>
                </div>
                <div key="tags">
                  <dt>标签</dt>
                  <dd>
                    {selectedPicture.tags && Array.isArray(selectedPicture.tags) && selectedPicture.tags.length > 0 ? (
                      selectedPicture.tags.map((tag, index) => (
                        <span key={index} className="tag detail-tag">{tag}</span>
                      ))
                    ) : (
                      '无标签'
                    )}
                  </dd>
                </div>
                <div>
                  <dt>分类</dt>
                  <dd>{selectedPicture.category || '未分类'}</dd>
                </div>
                <div>
                  <dt>创建时间</dt>
                  <dd>{new Date(selectedPicture.createTime).toLocaleString()}</dd>
                </div>
              </dl>
            </div>
            <div className="detail-footer" style={{ marginTop: '20px', display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button className="create-btn" onClick={() => setSelectedPicture(null)}>
                关闭
              </button>
              <button className="create-btn" onClick={(e) => {
                e.stopPropagation();
                if (selectedPicture) {
                  onRejectPicture(selectedPicture);
                }
              }}>
                拒绝
              </button>
              <button className="create-btn create-btn--primary" onClick={(e) => {
                e.stopPropagation();
                if (selectedPicture) {
                  onApprovePicture(selectedPicture);
                }
              }}>
                通过
              </button>
            </div>
          </div>
        </div>
      )}
      {confirmDialog && (
        <ConfirmDialog
          title={confirmDialog.title}
          message={confirmDialog.message}
          buttons={confirmDialog.buttons}
          visible={!!confirmDialog}
          onClose={() => setConfirmDialog(null)}
        />
      )}
    </section>
  )
}
