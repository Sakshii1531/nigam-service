import React from 'react';
import Navbar from '../components/layout/Navbar';
import Footer from '../components/layout/Footer';
import Hero from '../components/home/Hero';
import PopularServices from '../components/home/PopularServices';
import HowItWorks from '../components/home/HowItWorks';
import Features from '../components/home/Features';
import LiveTrackingPreview from '../components/home/LiveTrackingPreview';
import DashboardPreview from '../components/home/DashboardPreview';
import Testimonials from '../components/home/Testimonials';
import MobileApp from '../components/home/MobileApp';
import FAQ from '../components/home/FAQ';
import Stories from '../components/home/Stories';

const Home = () => {
  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <main className="flex-grow">
        <Hero />
        <PopularServices />
        <HowItWorks />
        <Features />
        <LiveTrackingPreview />
        <DashboardPreview />
        <Testimonials />
        <MobileApp />
        <FAQ />
        <Stories />
      </main>
      <Footer />
    </div>
  );
};

export default Home;
