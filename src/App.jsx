import { useState } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import reactLogo from './assets/react.svg'
import HomePage from './Pages/HomePage.tsx'
import viteLogo from '/vite.svg'
import MainLayout from './Layout/MainLayout.tsx'
import Goats from './Pages/goats.jsx';
import ImageGalleryComponent from './Pages/DesignGallery.tsx';
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
        </Route>
        </Routes>
      </BrowserRouter>
    </>
  )
}

export default App
