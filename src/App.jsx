import { useState } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import reactLogo from './assets/react.svg'
import HomePage from './Pages/HomePage.tsx'
import viteLogo from '/vite.svg'
import MainLayout from './Layout/MainLayout.tsx'
import Goats from './Pages/goats.jsx';
import ImageGalleryComponent from './Pages/DesignGallery.tsx';
import SubmitArt from './Pages/SubmitArt.tsx';
import TvArtReview from './Pages/TvArtReview.tsx';
import './App.css'

function App() {
  const [count, setCount] = useState(0)

  return (
    <>
      <BrowserRouter>
        <Routes>
        <Route path="/" element={<MainLayout />}>
          <Route index element={<HomePage />} />
          <Route path="/people" element={<Goats/>} />
          <Route path="/art" element={<ImageGalleryComponent/>} />
          <Route path="/submit" element={<SubmitArt/>} />
          <Route path="/tv-art" element={<TvArtReview/>} />
          <Route path="/:toolSlug" element={<HomePage/>} />
        </Route>
        </Routes>
      </BrowserRouter>
    </>
  )
}

export default App
