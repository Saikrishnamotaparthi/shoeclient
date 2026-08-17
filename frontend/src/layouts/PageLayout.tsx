import React from 'react';
import { Outlet } from 'react-router-dom';
import Header from './Header';
import Footer from './Footer';
import CartDrawer from '../features/cart/CartDrawer';

const PageLayout = () => {
  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <CartDrawer />
      {/* pt-16 accounts for the fixed 64px header */}
      <main className="flex-1 pt-16">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
};

export default PageLayout;
