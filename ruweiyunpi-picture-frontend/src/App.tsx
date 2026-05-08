import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { MainLayout } from './layouts/MainLayout'
import { BatchUploadPage } from './pages/BatchUploadPage'
import { CreatePicturePage } from './pages/CreatePicturePage'
import { CreateUserPage } from './pages/CreateUserPage'
import MasonryGalleryDemo from './pages/MasonryGalleryDemo'
import { PictureManagePage } from './pages/PictureManagePage'
import { PictureReviewPage } from './pages/PictureReviewPage'
import { PublicGalleryPage } from './pages/PublicGalleryPage'
import { SearchResultsPage } from './pages/SearchResultsPage'
import { SpaceManagePage } from './pages/SpaceManagePage'
import { MyTeamsPage } from './pages/MyTeamsPage'
import { TeamSpacePage } from './pages/TeamSpacePage'
import { SpaceMemberManagePage } from './pages/SpaceMemberManagePage'
import { SpacePictureDemoPage } from './pages/SpacePictureDemoPage'
import { SpacePictureUploadPage } from './pages/SpacePictureUploadPage'
import { SpacePictureViewPage } from './pages/SpacePictureViewPage'
import { UploadToSpacePage } from './pages/UploadToSpacePage'
import { UserManagePage } from './pages/UserManagePage'
import { SpaceAnalyzePage } from './pages/SpaceAnalyzePage'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route element={<MainLayout />}>
            <Route index element={<PublicGalleryPage />} />
            <Route path="demo/gallery" element={<MasonryGalleryDemo />} />
            <Route path="demo/space-pictures" element={<SpacePictureDemoPage />} />
            <Route path="pictures/create" element={<CreatePicturePage />} />
          <Route path="pictures/batch-upload" element={<BatchUploadPage />} />
          <Route path="pictures/manage" element={<PictureManagePage />} />
          <Route path="pictures/manage/upload" element={<UploadToSpacePage />} />
          <Route path="pictures/review" element={<PictureReviewPage />} />
            <Route path="spaces" element={<SpaceManagePage />} />
            <Route path="spaces/analyze" element={<SpaceAnalyzePage />} />
            <Route path="my-teams" element={<MyTeamsPage />} />
            <Route path="my-teams/:spaceId" element={<TeamSpacePage />} />
            <Route path="spaces/:id/pictures/upload" element={<SpacePictureUploadPage />} />
            <Route path="spaces/:id/members" element={<SpaceMemberManagePage />} />
            <Route path="users" element={<UserManagePage />} />
            <Route path="user/create" element={<CreateUserPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
          
          {/* 独立页面（不使用 MainLayout） */}
          <Route path="spaces/:id/pictures/view" element={<SpacePictureViewPage />} />
          <Route path="picture/search-results" element={<SearchResultsPage />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
