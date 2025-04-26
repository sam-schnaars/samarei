import { Outlet } from 'react-router-dom';
import { Link } from 'react-router-dom';
import React from 'react';
import AnimatedFooter from './AnimatedFooter.tsx';

const MainLayout = () => {
    return (
        <div>
            <header className="ml-[5vw] mr-[5vw] flex justify-between items-center bg-white p-4 border-b border-gray-200">
                <Link to="/" className="text-2xl font-serif text-black">home</Link>
                <nav className="space-x-4">
                    <Link to="/people" className="text-lg font-serif text-black">cool people</Link>
                    <Link to="/art" className="text-lg font-serif text-black">art</Link>
                </nav>
            </header>
            <Outlet />
            <AnimatedFooter/>
        </div>
    )

}

export default MainLayout;