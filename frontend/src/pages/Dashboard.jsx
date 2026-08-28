import React, { useEffect, useRef, useState } from 'react';
import { Search, Bell, MapPin, Wrench, Zap, Droplet, Thermometer, Shield, Home as HomeIcon, Calendar, MessageSquare, User, Star, X, Wind, WashingMachine, Refrigerator, Droplets, Sparkles, ShoppingCart, Tv, Flame, MousePointerClick, LayoutGrid } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import PushPermissionPrompt from '../components/PushPermissionPrompt';
import { useNotifications } from '../context/NotificationContext';
import { apiRequest } from '../lib/apiClient';
import acBanner from '../assets/ac_service_banner.png';
import electricianBanner from '../assets/electrician_banner.png';
import plumbingBanner from '../assets/plumbing_banner.png';
import warrantyBanner1 from '../assets/warranty_banner_1.png';
import warrantyBanner2 from '../assets/warranty_banner_2.png';
import mostBookedAc1 from '../assets/most_booked_ac_1.png';
import mostBookedAc2 from '../assets/most_booked_ac_2.png';
import mostBookedWm from '../assets/most_booked_wm.png';
import mostBookedCleaning from '../assets/most_booked_cleaning.png';
import mostBookedSalon from '../assets/most_booked_salon.png';
import cleaningBathroom1 from '../assets/cleaning_bathroom_1.png';
import cleaningBathroom2 from '../assets/cleaning_bathroom_2.png';
import cleaningSofa from '../assets/cleaning_sofa.png';
import cleaningCarpet from '../assets/cleaning_carpet.png';
import cleaningKitchen from '../assets/cleaning_kitchen.png';
import applianceFridge from '../assets/appliance_fridge.png';
import acImg from '../assets/categories/ac.png';
import splitAcImg from '../assets/categories/split_ac.png';
import wasingImg from '../assets/categories/wasing.png';
import electricianImg from '../assets/categories/electrician_fixed.png';
import plumberImg from '../assets/categories/plumber_fixed.png';
import cleaningImg from '../assets/categories/cleaning.png';
import saloonImg from '../assets/categories/saloon.png';
import spaImg from '../assets/categories/spa.png';
import logo from '../assets/nigam-care.png';
import clickIcon from '../assets/CLICK.png';
import handshakeIcon from '../assets/HANDSHAKE.png';

// Import realistic spare parts assets
import roPreFilterImg from '../assets/ro_pre_filter_candle.png';
import roMembraneImg from '../assets/ro_membrane.png';
import roSedimentImg from '../assets/ro_sediment_filter.png';
import roCarbonImg from '../assets/ro_carbon_filter.png';
import roPostCarbonImg from '../assets/ro_post_carbon.png';
import Stories from '../components/home/Stories';
import star3d from '../assets/star_3d.png';
import ac3d from '../assets/icon_3d_ac.png';
import wm3d from '../assets/icon_3d_wm.png';
import fridge3d from '../assets/icon_3d_fridge.png';

const renderDashboardCategoryIcon = (iconKey) => {
  const k = (iconKey || '').toLowerCase();
  if (k === 'sparkles') return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7 text-brand-blue"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275Z" /><path d="m5 3 1 2.5L8.5 6 6 7 5 9.5 4 7 1.5 6 4 5Z" opacity="0.5" /><path d="m19 17 1 2.5 2.5.5-2.5 1-1 2.5-1-2.5-2.5-1 2.5-1Z" opacity="0.5" /></svg>;
  if (k === 'ac') return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7 text-brand-blue"><rect x="2" y="6" width="20" height="8" rx="2" /><line x1="6" y1="14" x2="18" y2="14" /><path d="M7 17l1.5 2" /><path d="M12 17v2" /><path d="M17 17l-1.5 2" /><circle cx="18" cy="10" r="1" fill="currentColor" /></svg>;
  if (k === 'washing') return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7 text-brand-blue"><rect x="5" y="3" width="14" height="18" rx="2" /><circle cx="12" cy="13" r="4" /><circle cx="12" cy="7" r="1" /></svg>;
  if (k === 'fridge') return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7 text-brand-blue"><rect x="5" y="2" width="14" height="20" rx="2" /><line x1="5" y1="10" x2="19" y2="10" /><line x1="9" y1="6" x2="9" y2="8" /><line x1="9" y1="13" x2="9" y2="17" /></svg>;
  if (k === 'tv') return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7 text-brand-blue"><rect x="2" y="3" width="20" height="14" rx="2" /><path d="M8 21h8" /><path d="M12 17v4" /></svg>;
  if (k === 'ro' || k === 'water') return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7 text-brand-blue"><path d="M12 22a7 7 0 0 0 7-7c0-4.3-7-13-7-13S5 10.7 5 15a7 7 0 0 0 7 7z" /></svg>;
  if (k === 'geyser') return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7 text-brand-blue"><rect x="6" y="2" width="12" height="16" rx="3" /><path d="M9 22v-4" /><path d="M15 22v-4" /><circle cx="12" cy="10" r="2" /></svg>;
  if (k === 'microwave') return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7 text-brand-blue"><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M15 5v14" /><circle cx="18" cy="9" r="1" fill="currentColor" /><circle cx="18" cy="13" r="1" fill="currentColor" /><path d="M6 12h5" /></svg>;
  if (k === 'chimney') return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7 text-brand-blue"><rect x="5" y="2" width="14" height="6" rx="1"/><path d="M3 8h18l-2 13H5L3 8z"/></svg>;
  if (k === 'laptop') return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7 text-brand-blue"><rect x="4" y="5" width="16" height="10" rx="2" /><path d="M2 19h20" /></svg>;
  if (k === 'mobile') return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7 text-brand-blue"><rect x="6" y="3" width="12" height="18" rx="2" /><line x1="11" y1="18" x2="13" y2="18" /></svg>;
  if (k === 'electric') return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7 text-brand-blue"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" /></svg>;
  if (k === 'plumbing') return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7 text-brand-blue"><path d="M9 5h6v3H9z"/><path d="M9 8a6 6 0 0 0 6 0"/><path d="M12 8v6"/><path d="M10 14h4"/><circle cx="12" cy="17" r="1" fill="currentColor"/></svg>;
  if (k === 'cleaning') return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7 text-brand-blue"><path d="M17 3 7 13"/><path d="M5 21c0-3 2-6 5-8l5-5-3-3-7 7c-2 3-1 9 0 9z"/></svg>;
  if (k === 'painting') return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7 text-brand-blue"><rect x="3" y="5" width="12" height="7" rx="2"/><path d="M15 8h3a2 2 0 0 1 0 4h-3"/><path d="M9 12v7"/><rect x="6" y="18" width="6" height="3" rx="1"/></svg>;
  if (k === 'sofa') return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7 text-brand-blue"><path d="M20 9V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v3" /><path d="M2 11v5a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-5a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z" /><path d="M4 18v2" /><path d="M20 18v2" /></svg>;
  if (k === 'pest') return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7 text-brand-blue"><rect x="8" y="9" width="8" height="10" rx="4" /><path d="M6 13h12" /><path d="M4 9l4 3" /><path d="M20 9l-4 3" /><path d="M4 17l4-2" /><path d="M20 17l-4-2" /></svg>;
  if (k === 'car') return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7 text-brand-blue"><path d="M5 17a2 2 0 1 0 4 0 2 2 0 1 0-4 0Z" /><path d="M15 17a2 2 0 1 0 4 0 2 2 0 1 0-4 0Z" /><path d="M5 9l2-4h10l2 4v8H5V9Z" /></svg>;
  if (k === 'gardening') return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7 text-brand-blue"><path d="M12 22v-9" /><path d="M12 13C7 13 4 8 4 3c5 0 10 3 10 8" /><path d="M12 17c4 0 7-3 7-7-4 0-7 2-7 7" /></svg>;
  if (k === 'carpenter') return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7 text-brand-blue"><path d="m2 22 8-8"/><path d="m13 7 4-4"/><path d="M10 14 4 8l6-6 6 6-6 6z"/><path d="m17 3 4 4-4-4z"/></svg>;
  if (k === 'appliance') return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7 text-brand-blue"><path d="M12 22v-5"/><path d="M9 8V2"/><path d="M15 8V2"/><path d="M18 8H6"/><path d="M6 8a6 6 0 0 0 6 6 6 6 0 0 0 6-6"/></svg>;
  if (k === 'wrench') return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7 text-brand-blue"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" /></svg>;
  if (k === 'shield') return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7 text-brand-blue"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>;
  if (k === 'tag') return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7 text-brand-blue"><path d="M12 2H2v10l11.29 11.29a1 1 0 0 0 1.41 0l7-7a1 1 0 0 0 0-1.41L12 2z" /><circle cx="7" cy="7" r="1.5" /></svg>;
  if (k === 'clock') return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7 text-brand-blue"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>;
  if (k === 'truck') return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7 text-brand-blue"><rect x="1" y="3" width="15" height="13" rx="2" /><polygon points="16 8 20 8 23 11 23 16 16 16 16 8" /><circle cx="5.5" cy="18.5" r="2.5" /><circle cx="18.5" cy="18.5" r="2.5" /></svg>;

  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7 text-brand-blue"><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /></svg>;
};

const detectIconFromName = (name) => {
  if (!name) return null;
  const norm = name.trim().toLowerCase();
  if (norm.includes('micro') || norm.includes('oven')) return 'microwave';
  if (norm.includes('chimney') || norm.includes('hood')) return 'chimney';
  if (norm.includes('laptop') || norm.includes('pc') || norm.includes('computer')) return 'laptop';
  if (norm.includes('mobile') || norm.includes('phone')) return 'mobile';
  if (norm.includes('electr') || norm.includes('wire') || norm.includes('switch')) return 'electric';
  if (norm.includes('plumb') || norm.includes('pipe') || norm.includes('leak') || norm.includes('tap') || norm.includes('faucet')) return 'plumbing';
  if (norm.includes('clean') || norm.includes('sweep') || norm.includes('broom')) return 'cleaning';
  if (norm.includes('paint') || norm.includes('wall')) return 'painting';
  if (norm.includes('sofa') || norm.includes('couch')) return 'sofa';
  if (norm.includes('pest') || norm.includes('termite') || norm.includes('insect')) return 'pest';
  if (norm.includes('car') || norm.includes('auto')) return 'car';
  if (norm.includes('garden') || norm.includes('plant')) return 'gardening';
  if (norm.includes('carpent') || norm.includes('wood') || norm.includes('furniture repair')) return 'carpenter';
  if (norm.includes('appliance') || norm.includes('plug')) return 'appliance';
  if (norm.includes('ac') || norm.includes('air condition') || norm.includes('cool')) return 'ac';
  if (norm.includes('wash') || norm.includes('machine') || norm.includes('laundry')) return 'washing';
  if (norm.includes('fridge') || norm.includes('refriger')) return 'fridge';
  if (norm.includes('tv') || norm.includes('televis') || norm.includes('screen')) return 'tv';
  if (norm.includes('ro') || norm.includes('purif') || norm.includes('water')) return 'ro';
  if (norm.includes('geyser') || norm.includes('heater') || norm.includes('boiler')) return 'geyser';
  if (norm.includes('sparkle') || norm.includes('for you')) return 'sparkles';
  if (norm.includes('repair') || norm.includes('fix')) return 'wrench';
  if (norm.includes('warrant') || norm.includes('shield')) return 'shield';
  if (norm.includes('offer') || norm.includes('discount') || norm.includes('tag')) return 'tag';
  if (norm.includes('fast') || norm.includes('express') || norm.includes('clock')) return 'clock';
  if (norm.includes('deliver') || norm.includes('truck')) return 'truck';
  if (norm.includes('more')) return 'more';
  return null;
};

const getCategoryIconKey = (cat) => {
  if (!cat) return 'more';
  if (cat.icon && (cat.icon.startsWith('data:image/') || cat.icon.startsWith('http'))) {
    return cat.icon;
  }
  const detected = detectIconFromName(cat.name);
  if (detected) return detected;
  return cat.icon || 'more';
};
import tv3d from '../assets/icon_3d_tv.png';
import geyser3d from '../assets/icon_3d_geyser.png';
import ro3d from '../assets/icon_3d_ro.png';
import oven3d from '../assets/icon_3d_oven.png';
import chimney3d from '../assets/icon_3d_chimney.png';
import cooler3d from '../assets/icon_3d_cooler.png';

const Dashboard = ({ defaultType }) => {
  const { unreadCount } = useNotifications();
  const navigate = useNavigate();
  const bannerRef = useRef(null);
  const [activeType, setActiveType] = useState(defaultType || 'non-warranty'); // 'non-warranty' or 'in-warranty'
  const [cmsBanners, setCmsBanners] = useState(null);
  const [cmsTiles, setCmsTiles] = useState(null);
  const [configuredServices, setConfiguredServices] = useState([]);

  // Banners come from the CMS (public read, no auth) so what super-admin
  // publishes actually reaches customers. The bundled images remain the
  // fallback for a first run with nothing configured yet.
  const FALLBACK_REGULAR = [
    { id: 1, image: acBanner },
    { id: 2, image: electricianBanner },
    { id: 3, image: plumbingBanner }
  ];
  const FALLBACK_WARRANTY = [
    { id: 1, image: warrantyBanner1 },
    { id: 2, image: warrantyBanner2 }
  ];

  // Falls back to the bundled set when a placement has nothing published, so
  // the home screen is never empty on a fresh install.
  function tilesFor(placement, fallback, map) {
    if (!cmsTiles) return fallback;
    const rows = cmsTiles.filter((t) => t.placement === placement);
    return rows.length ? rows.map(map) : fallback;
  }

  function fromCms(segment, fallback) {
    if (!cmsBanners) return fallback;
    const rows = cmsBanners.filter((b) => (segment === 'warranty' ? b.segment === 'warranty' : b.segment !== 'warranty'));
    return rows.length ? rows.map((b) => ({ id: b.id, image: b.imageUrl })) : fallback;
  }

  const dashboardCategories = (() => {
    const raw = tilesFor('category', [
      { name: 'For You', icon: 'sparkles', isForYou: true },
      { name: 'AC', icon: 'ac', service: 'AC Repair' },
      { name: 'Washing Machine', icon: 'washing', service: 'Washing Machine' },
      { name: 'Refrigerator', icon: 'fridge', isFridge: true },
      { name: 'TV', icon: 'tv', service: 'Smart TV Service & Repair' },
      { name: 'RO Water Purifier', icon: 'ro', service: 'Water Purifier RO Service' },
      { name: 'Geyser', icon: 'geyser', service: 'Geyser Service & Repair' },
      { name: 'More', icon: 'more', isMore: true }
    ], (t) => ({
      name: t.title,
      icon: t.icon || (t.title === 'For You' ? 'sparkles' : 'more'),
      service: t.service,
      isForYou: t.title === 'For You' || t.isForYou,
      isMore: t.title === 'More' || t.isMore,
      isFridge: t.title === 'Refrigerator' || t.isFridge
    }));

    const unique = [];
    const seen = new Set();
    for (const cat of raw) {
      const norm = (cat.name || '').trim().toLowerCase();
      if (norm && !seen.has(norm)) {
        seen.add(norm);
        unique.push(cat);
      }
    }
    return unique.length ? unique : raw;
  })();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await apiRequest('/cms/service-pages');
        if (!cancelled) setConfiguredServices((data || []).map((c) => c.serviceKey));
      } catch {
        if (!cancelled) setConfiguredServices([]);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await apiRequest('/cms/home-tiles');
        if (!cancelled) setCmsTiles(data || []);
      } catch {
        if (!cancelled) setCmsTiles([]);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const hasServicePage = (title) => configuredServices.includes(title);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await apiRequest('/cms/banners?app=customer');
        if (!cancelled) setCmsBanners(data || []);
      } catch {
        // Offline or unreachable — fall back to the bundled artwork rather than
        // rendering an empty carousel.
        if (!cancelled) setCmsBanners([]);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const regularBanners = fromCms('non-warranty', FALLBACK_REGULAR);
  const warrantyBannersList = fromCms('warranty', FALLBACK_WARRANTY);

  const mostBookedServices = tilesFor('most-booked', [
    { id: 1, title: "Foam-jet AC service", image: mostBookedAc1, price: 649, badge: "Instant" },
    { id: 2, title: "AC repair", image: mostBookedAc2, price: 299, badge: "Instant" },
    { id: 3, title: "Washing Machine", image: mostBookedWm, price: 499, badge: "Instant" },
    { id: 4, title: "Home Cleaning", image: mostBookedCleaning, price: 999, badge: "Trending" },
    { id: 5, title: "Women Salon", image: mostBookedSalon, price: 799, badge: "Best Seller" }
  ], (t) => ({ id: t.id, title: t.title, image: t.imageUrl, rating: t.rating, price: t.price, badge: t.badge }));

  const applianceServices = tilesFor('appliance-service', [
    { id: 1, title: "Foam-jet AC service", image: mostBookedAc1, price: 649, badge: "Instant", path: '/booking' },
    { id: 2, title: "AC repair", image: mostBookedAc2, price: 299, badge: "Instant", path: '/booking' },
    { id: 3, title: "Washing Machine", image: mostBookedWm, price: 499, badge: "Instant", path: '/booking' },
    { id: 4, title: "Refrigerator Repair & Service", image: applianceFridge, price: 899, badge: "Instant", path: '/refrigerator-details' },
    { id: 5, title: "Deep Clean AC", image: mostBookedAc1, price: 1198, badge: "2 ACs", path: '/booking' },
    { id: 6, title: "WM Checkup", image: mostBookedWm, price: 199, badge: "Instant", path: '/booking' }
  ], (t) => ({ id: t.id, title: t.title, image: t.imageUrl, rating: t.rating, price: t.price, badge: t.badge, path: t.link || '/booking' }));

  useEffect(() => {
    if (defaultType === 'in-warranty') {
      navigate('/partner-warranty');
    } else if (defaultType) {
      setActiveType(defaultType);
    }
  }, [defaultType, navigate]);
  const [showWarrantyModal, setShowWarrantyModal] = useState(false);
  const [isUnderWarranty, setIsUnderWarranty] = useState(null);
  const [billNo, setBillNo] = useState('');
  const [billFile, setBillFile] = useState(null);
  const [selectedServiceForWarranty, setSelectedServiceForWarranty] = useState(null);

  useEffect(() => {
    const interval = setInterval(() => {
      if (bannerRef.current) {
        const { scrollLeft, scrollWidth, clientWidth } = bannerRef.current;
        if (scrollLeft + clientWidth >= scrollWidth - 10) {
          bannerRef.current.scrollTo({ left: 0, behavior: 'smooth' });
        } else {
          bannerRef.current.scrollBy({ left: clientWidth, behavior: 'smooth' });
        }
      }
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const services = tilesFor('dashboard-service', [
    { id: 1, name: 'AC Repair', img: acImg },
    { id: 2, name: 'Washing Machine', img: wasingImg },
    { id: 3, name: 'Electrician', img: electricianImg },
    { id: 4, name: 'Plumber', img: plumberImg },
    { id: 5, name: 'Full Home Cleaning', img: cleaningImg },
    { id: 6, name: 'Salon for Women', img: saloonImg },
    { id: 7, name: 'Spa & Massage', img: spaImg },
  ], (t) => ({ id: t.id, name: t.title, img: t.imageUrl }));

  const brandCards = tilesFor('brand-card', [
    {
      id: 1,
      brandName: 'LLOYD',
      title: 'New Launch Glacier Series AC',
      subtitle: 'Experience Superior Cooling & Comfort',
      image: splitAcImg,
      buttonText: 'Explore on NCC',
      actionUrl: '/service-details?service=AC%20Repair&brand=Lloyd',
      badgeText: '',
      gradient: 'from-[#E3F2FD] via-[#F4F9FF] to-[#D5E6FF]',
      textColor: '#014694'
    },
    {
      id: 2,
      brandName: 'SAMSUNG',
      title: 'Bespoke AI Laundry Range',
      subtitle: 'Smart. Gentle. Intelligent.',
      image: mostBookedWm,
      buttonText: 'Visit Official Site',
      actionUrl: 'https://www.samsung.com',
      badgeText: 'Official Partner',
      gradient: 'from-[#E8F5E9] via-[#F6FAF6] to-[#D2E8D4]',
      textColor: '#1B5E20'
    },
    {
      id: 3,
      brandName: 'DAIKIN',
      title: 'Air Specialist Inverter Series',
      subtitle: 'Perfect Comfort. Every Season.',
      image: splitAcImg,
      buttonText: 'Explore on NCC',
      actionUrl: '/service-details?service=AC%20Repair&brand=Daikin',
      badgeText: 'Air Specialist',
      gradient: 'from-[#F0F4FF] via-[#F7F9FF] to-[#E1E8FF]',
      textColor: '#00529C'
    },
    {
      id: 4,
      brandName: 'LG',
      title: 'Double Door Frost Free Refrigerator',
      subtitle: 'Premium cooling. Maximum savings.',
      image: applianceFridge,
      buttonText: 'Explore on NCC',
      actionUrl: '/refrigerator-details',
      badgeText: '',
      gradient: 'from-[#FCE4EC] via-[#FFF1F3] to-[#F8BBD0]',
      textColor: '#C30F42'
    }
  ], (t) => ({
    id: t.id,
    brandName: t.brandName,
    title: t.title,
    subtitle: t.subtitle,
    image: t.imageUrl,
    buttonText: t.buttonText,
    actionUrl: t.link,
    badgeText: t.badgeText,
    gradient: t.gradient,
    textColor: t.textColor,
  }));

  const getBrandsForCategory = (cat) => {
    const norm = cat?.toLowerCase() || '';
    if (norm.includes('ac')) {
      return ['Voltas', 'LG', 'Samsung', 'Daikin', 'Whirlpool', 'Lloyd', 'Panasonic', 'Blue Star', 'Hitachi'];
    }
    if (norm.includes('wm') || norm.includes('washing')) {
      return ['LG', 'Samsung', 'Whirlpool', 'IFB', 'Bosch', 'Haier', 'Godrej', 'Panasonic'];
    }
    if (norm.includes('fridge') || norm.includes('refrigerator')) {
      return ['LG', 'Samsung', 'Whirlpool', 'Godrej', 'Haier', 'Panasonic', 'Bosch'];
    }
    if (norm.includes('tv') || norm.includes('television')) {
      return ['LG', 'Samsung', 'Sony', 'Panasonic', 'Mi', 'OnePlus', 'TCL', 'Haier', 'VU'];
    }
    if (norm.includes('geyser') || norm.includes('heater')) {
      return ['Havells', 'AO Smith', 'Racold', 'Bajaj', 'V-Guard', 'Venus', 'Kenstar'];
    }
    if (norm.includes('ro') || norm.includes('purifier')) {
      return ['Kent', 'Eureka Forbes', 'Aquaguard', 'Pureit', 'Blue Star', 'AO Smith', 'Livpure'];
    }
    if (norm.includes('oven') || norm.includes('microwave')) {
      return ['LG', 'Samsung', 'IFB', 'Morphy Richards', 'Bajaj', 'Panasonic', 'Godrej'];
    }
    if (norm.includes('chimney')) {
      return ['Faber', 'Elica', 'Glen', 'Hindware', 'Kaff', 'Sunflame'];
    }
    if (norm.includes('cooler')) {
      return ['Symphony', 'Bajaj', 'Orient', 'Kenstar', 'Crompton', 'Hindware', 'Usha'];
    }
    return ['LG', 'Samsung', 'Whirlpool', 'Panasonic'];
  };

  return (
    <div className="min-h-screen bg-bg-light flex flex-col pb-16 lg:pb-0">

      {/* First-run push notification permission prompt */}
      <PushPermissionPrompt />

      {/* Warranty Modal */}
      {showWarrantyModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md p-6 shadow-2xl flex flex-col gap-5">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-bold text-[#0D47A1]">Warranty Verification</h2>
              <button 
                onClick={() => setShowWarrantyModal(false)}
                className="p-1 hover:bg-slate-100 rounded-full transition-colors"
              >
                <X className="h-5 w-5 text-text-secondary" />
              </button>
            </div>
            
            <p className="text-sm text-text-primary">Please provide your bill details to claim free service under warranty.</p>
            
            <div className="flex flex-col gap-3">
              <div>
                <label className="text-xs font-medium text-gray-700 mb-1 block">Bill Number</label>
                <input 
                  type="text" 
                  value={billNo}
                  onChange={(e) => setBillNo(e.target.value)}
                  placeholder="e.g. WAR123"
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-[#0D47A1]"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-700 mb-1 block">Upload Bill (Optional)</label>
                <input 
                  type="file" 
                  onChange={(e) => setBillFile(e.target.files[0])}
                  className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-[#E3ECF9] file:text-[#0D47A1] hover:file:bg-blue-100"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-2">
              <button 
                onClick={() => {
                  if (!billNo && !billFile) {
                    alert('Please provide Bill No or Upload Bill to claim warranty.');
                    return;
                  }
                  setShowWarrantyModal(false);
                  navigate(`/booking?service=${encodeURIComponent(selectedServiceForWarranty.title)}&price=0&warranty=true`);
                }}
                className="flex-1 bg-[#FFD600] text-[#0D47A1] font-bold py-2 rounded-xl hover:bg-yellow-400 transition-colors text-sm"
              >
                Verify & Proceed
              </button>
              <button 
                onClick={() => {
                  setShowWarrantyModal(false);
                  navigate(`/booking?service=${encodeURIComponent(selectedServiceForWarranty.title)}&price=${selectedServiceForWarranty.price}`);
                }}
                className="flex-1 bg-slate-100 text-text-primary font-semibold py-2 rounded-xl hover:bg-slate-200 transition-colors text-sm"
              >
                Skip / No Warranty
              </button>
            </div>
          </div>
        </div>
      )}


      {/* Header — hidden on desktop where top nav takes over */}
      <div className="bg-section-bg px-6 md:px-8 pt-3 pb-0 rounded-b-[30px] shadow-sm lg:hidden">
        <div className="max-w-screen-md md:max-w-screen-lg mx-auto w-full">

        {/* Quick Access Toggle */}
        <div className="flex bg-brand-navy p-1 rounded-full border border-brand-blue/10 mb-5 shadow-inner items-center -mx-3">
          <button 
            onClick={() => {
              setActiveType('non-warranty');
              navigate('/dashboard/non-warranty');
            }}
            className={`flex-1 py-1.5 px-2.5 rounded-full transition-all duration-300 flex items-center gap-2.5 text-left cursor-pointer ${
              activeType === 'non-warranty' 
                ? 'bg-brand-yellow text-[#212121] shadow-md transform scale-[1.01]' 
                : 'text-white hover:text-slate-100'
            }`}
          >
            <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
              activeType === 'non-warranty' ? 'bg-white text-black shadow-sm' : 'bg-white/10 text-white'
            }`}>
              <img 
                src={clickIcon} 
                alt="Book Service" 
                className={`w-8 h-8 object-contain ${
                  activeType === 'non-warranty' ? 'mix-blend-multiply' : 'invert mix-blend-screen'
                }`} 
              />
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] font-black leading-tight">Book Service</span>
              <span className={`text-[8px] font-bold mt-0.5 leading-none ${
                activeType === 'non-warranty' ? 'text-slate-700' : 'text-slate-300'
              }`}>Any Brand. Any Product.</span>
            </div>
          </button>
          
          <button 
            onClick={() => {
              navigate('/partner-warranty');
            }}
            className={`flex-1 py-1.5 px-2.5 rounded-full transition-all duration-300 flex items-center gap-2.5 text-left cursor-pointer ${
              activeType === 'in-warranty' 
                ? 'bg-brand-yellow text-[#212121] shadow-md transform scale-[1.01]' 
                : 'text-white hover:text-slate-100'
            }`}
          >
            <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
              activeType === 'in-warranty' ? 'bg-brand-navy text-white shadow-sm' : 'bg-white/10 text-white'
            }`}>
              <img 
                src={handshakeIcon} 
                alt="Partner Warranty" 
                className="w-8 h-8 object-contain" 
              />
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] font-black leading-tight">Partner Warranty</span>
              <span className={`text-[8px] font-bold mt-0.5 leading-none whitespace-nowrap ${
                activeType === 'in-warranty' ? 'text-slate-700' : 'text-slate-300'
              }`}>Only for NCC Partner Brands</span>
            </div>
          </button>
        </div>

        <div className="flex justify-between items-center mb-2">
          <div className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-brand-blue" />
            <div>
              <span className="text-xs text-text-secondary block">Location</span>
              <span className="text-sm font-bold text-text-primary">Civil Lines, Delhi</span>
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => navigate('/notifications')}
              className="w-9 h-9 bg-slate-100 rounded-full relative flex items-center justify-center"
            >
              <Bell className="h-5 w-5 text-text-primary" />
              {/* The dot used to be unconditional — permanently "you have
                  something", which is the same as saying nothing. */}
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full"></span>
              )}
            </button>
            <div 
              onClick={() => navigate('/profile')}
              className="w-9 h-9 bg-brand-blue rounded-full flex items-center justify-center text-white text-sm font-bold cursor-pointer"
            >
              U
            </div>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-text-secondary" />
          <input
            type="text"
            placeholder="Search for services (AC, Geyser...)"
            className="w-full pl-12 pr-4 py-1.5 bg-slate-50 border border-border-color rounded-2xl focus:border-brand-blue focus:ring-1 focus:ring-brand-blue outline-none transition-all text-sm"
          />
        </div>
        {/* Horizontal Categories — scroll on mobile, grid on desktop */}
        <div className="flex overflow-x-auto gap-3 mt-2 pb-1.5 snap-x no-scrollbar md:grid md:grid-cols-8 xl:grid-cols-10 md:overflow-visible md:pb-0">
          {dashboardCategories.map((cat, index) => (
            <div 
              key={index}
              className="flex flex-col items-center gap-1 cursor-pointer flex-shrink-0 snap-start group w-[58px]"
              onClick={() => {
                if (cat.isForYou) {
                  navigate('/dashboard');
                } else if (cat.isMore) {
                  navigate('/services');
                } else if (cat.isFridge) {
                  navigate('/book/Refrigerator');
                } else if (cat.name === 'AC') {
                  navigate('/book/AC');
                } else if (cat.name === 'Washing Machine') {
                  navigate('/book/Washing Machine');
                } else if (cat.name === 'TV') {
                  navigate('/book/TV');
                } else if (cat.name === 'RO Water Purifier') {
                  navigate('/book/RO Water Purifier');
                } else if (cat.name === 'Geyser') {
                  navigate('/book/Geyser');
                } else if (cat.service) {
                  navigate(`/service-details?service=${encodeURIComponent(cat.service)}`);
                } else {
                  navigate(`/book/${encodeURIComponent(cat.name)}`);
                }
              }}
            >
              <div className="w-7 h-7 flex items-center justify-center">
                {(() => {
                  const iconKey = getCategoryIconKey(cat);
                  if (iconKey && (iconKey.startsWith('data:image/') || iconKey.startsWith('http'))) {
                    return <img src={iconKey} alt={cat.name} className="w-7 h-7 object-contain" />;
                  }
                  return renderDashboardCategoryIcon(iconKey);
                })()}
              </div>
              <span className="text-[9px] font-black text-brand-blue uppercase tracking-tighter text-center w-full leading-tight">
                {cat.name}
              </span>
            </div>
          ))}
        </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-4 md:px-6 md:py-6 lg:p-6 xl:p-8 flex flex-col gap-6 md:gap-8 max-w-screen-xl mx-auto w-full">
        {/* Service Banners — scroll on mobile, grid on desktop */}
        <div ref={bannerRef} className="flex gap-4 overflow-x-auto pb-2 -mx-2 px-2 snap-x no-scrollbar md:grid md:grid-cols-2 xl:grid-cols-3 md:overflow-visible md:mx-0 md:px-0 md:pb-0">
          {(activeType === 'non-warranty' ? regularBanners : warrantyBannersList).map((banner) => (
            <div 
              key={banner.id}
              className="bg-white rounded-2xl shadow-sm border border-border-color overflow-hidden min-w-[300px] md:min-w-0 snap-center"
            >
              <div className="relative h-36 md:h-auto md:aspect-[25/12] w-full">
                <img 
                  src={banner.image} 
                  alt="Service Banner" 
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          ))}
        </div>



        {/* Categories */}
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold text-text-primary">Our Services</h2>
            <button 
              onClick={() => navigate('/services')}
              className="text-sm font-semibold text-[#0B4EA2] hover:text-blue-800 transition-colors"
            >
              See All
            </button>
          </div>
          <div className="flex overflow-x-auto gap-4 pb-4 -mx-2 px-2 snap-x no-scrollbar md:grid md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 md:gap-3 md:overflow-visible md:mx-0 md:px-0 md:pb-0">
            {services.map((service) => (
              <div 
                key={service.id}
                onClick={() => {
                  if (activeType === 'in-warranty') {
                    setSelectedServiceForWarranty({ title: service.name, price: 499 });
                    setShowWarrantyModal(true);
                    return;
                  }
                  // Appliance categories → BookingFlow wizard
                  const APPLIANCE_ROUTES = {
                    'ac repair': 'AC',
                    'washing machine': 'Washing Machine',
                    'refrigerator': 'Refrigerator',
                    'tv': 'TV',
                    'television': 'TV',
                    'geyser': 'Geyser',
                    'water heater': 'Geyser',
                    'ro water purifier': 'RO Water Purifier',
                    'water purifier': 'RO Water Purifier',
                    'microwave': 'Microwave',
                    'chimney': 'Chimney',
                    'air cooler': 'Air Cooler',
                  };
                  const nameNorm = service.name.toLowerCase();
                  const bookCat = Object.keys(APPLIANCE_ROUTES).find(k => nameNorm.includes(k));
                  if (bookCat) {
                    navigate(`/book/${encodeURIComponent(APPLIANCE_ROUTES[bookCat])}`);
                  } else {
                    navigate(`/service-details?service=${encodeURIComponent(service.name)}`);
                  }
                }}
                className="flex flex-col items-center gap-2 cursor-pointer flex-shrink-0 w-24 snap-start md:w-auto md:flex-shrink md:bg-white md:border md:border-border-color md:rounded-2xl md:p-3 md:hover:border-brand-blue md:hover:shadow-sm md:transition-all"
              >
                <div className="w-24 h-24 md:w-full md:h-20 lg:h-24 bg-transparent rounded-2xl flex items-center justify-center transition-all overflow-hidden">
                  <img src={service.img} alt={service.name} className="w-full h-full object-contain mix-blend-multiply p-2" />
                </div>
                <span className="text-xs font-semibold text-text-primary text-center truncate md:whitespace-normal md:leading-tight w-full">
                  {service.name}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Warranty Offers / Smart Detection */}
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold text-text-primary">
              {activeType === 'in-warranty' ? 'Covered Benefits' : ''}
            </h2>
          </div>
          <div className="flex gap-4 overflow-x-auto pb-2 -mx-2 px-2 snap-x no-scrollbar md:grid md:grid-cols-2 md:overflow-visible md:mx-0 md:px-0 md:pb-0">
            {[
              { id: 1, image: warrantyBanner1 },
              { id: 2, image: warrantyBanner2 }
            ].map((banner) => (
              <div 
                key={banner.id}
                className="bg-white rounded-2xl shadow-sm border border-border-color overflow-hidden min-w-[300px] md:min-w-0 snap-center"
              >
                <div className="relative h-36 md:h-auto md:aspect-[25/12] w-full">
                  <img 
                    src={banner.image} 
                    alt="Warranty Banner" 
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Brands & Offers */}
        <div>
          <div className="flex items-center mb-4">
            <h2 className="text-lg font-bold text-text-primary">Brands & Offers</h2>
          </div>

          {/* Brand Cards — scroll on mobile, grid on desktop */}
          <div className="flex overflow-x-auto gap-4 pt-1.5 pb-4 -mx-2 px-2 snap-x no-scrollbar md:grid md:grid-cols-2 xl:grid-cols-3 md:overflow-visible md:mx-0 md:px-0 md:pb-0">
            {brandCards.map((bc) => (
              <div 
                key={bc.id}
                onClick={() => {
                  if (bc.actionUrl.startsWith('http')) {
                    window.open(bc.actionUrl, '_blank');
                  } else {
                    navigate(bc.actionUrl);
                  }
                }}
                className={`w-full sm:max-w-[340px] md:max-w-none md:flex-shrink flex-shrink-0 h-[200px] md:h-[220px] rounded-[24px] bg-gradient-to-br ${bc.gradient} p-4 md:p-5 flex flex-col justify-between relative overflow-hidden shadow-[0_4px_12px_rgba(0,0,0,0.03)] border border-slate-100/50 cursor-pointer snap-start`}
              >
                <div className="flex flex-col items-start z-10 max-w-[65%]">
                  {bc.badgeText && (
                    <span 
                      className="text-[9px] font-bold px-2 py-0.5 rounded-md tracking-wide mb-1"
                      style={{ 
                        backgroundColor: bc.textColor === '#014694' ? '#E3F2FD' : (bc.textColor === '#1B5E20' ? '#E8F5E9' : '#FCE4EC'),
                        color: bc.textColor 
                      }}
                    >
                      {bc.badgeText}
                    </span>
                  )}
                  <span className="font-sans font-black text-xl tracking-tight" style={{ color: bc.textColor }}>
                    {bc.brandName}
                  </span>
                  <h3 className="text-xs font-black text-slate-800 mt-1.5 leading-tight">
                    {bc.title}
                  </h3>
                  <p className="text-[10px] font-semibold text-slate-600 mt-0.5 leading-tight">
                    {bc.subtitle}
                  </p>
                </div>

                {/* Absolute Appliance Image */}
                {bc.image && (
                  <img 
                    src={bc.image} 
                    alt={bc.brandName} 
                    className="absolute -right-3 top-8 w-[140px] md:w-[160px] h-[100px] md:h-[115px] object-contain z-0 mix-blend-multiply" 
                  />
                )}

                {/* CTA Button */}
                <div className="z-10 mt-auto flex items-center">
                  <div className="bg-white text-[#0D47A1] text-[11px] font-black py-2 px-4 rounded-full flex items-center gap-2 shadow-[0_2px_8px_rgba(0,0,0,0.05)] border border-slate-100/80 hover:bg-slate-50 transition-colors">
                    <span>{bc.buttonText || 'Explore on NCC'}</span>
                    {bc.buttonText?.toLowerCase().includes('site') ? (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5 text-[#0D47A1]">
                        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                        <polyline points="15 3 21 3 21 9" />
                        <line x1="10" y1="14" x2="21" y2="3" />
                      </svg>
                    ) : (
                      <ShoppingCart className="w-3.5 h-3.5 text-[#0D47A1]" />
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Description Legend */}
          <div className="mt-1 pt-0 text-[9.5px] font-bold text-slate-500">
            <div className="flex flex-col items-start gap-1.5 w-max mx-auto px-4">
              <div className="flex items-center gap-2">
                <ShoppingCart className="w-3.5 h-3.5 text-[#0D47A1] flex-shrink-0" />
                <span>Click on 'Explore on NCC' to buy from our store</span>
              </div>
              <div className="flex items-center gap-2">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5 text-[#0D47A1] flex-shrink-0">
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                  <polyline points="15 3 21 3 21 9" />
                  <line x1="10" y1="14" x2="21" y2="3" />
                </svg>
                <span>Click on 'Visit Official Site' to go to brand website</span>
              </div>
            </div>
          </div>
        </div>

        {/* Most Booked Services */}
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold text-text-primary">Most Booked Services</h2>
          </div>
          <div className="flex gap-4 overflow-x-auto pb-4 -mx-2 px-2 snap-x no-scrollbar md:grid md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 md:overflow-visible md:mx-0 md:px-0 md:pb-0">
            {mostBookedServices.map((service) => (
              <div 
                key={service.id}
                onClick={() => {
                  if (activeType === 'in-warranty') {
                    setSelectedServiceForWarranty(service);
                    setShowWarrantyModal(true);
                  } else {
                    // Check if there is a custom catalog config saved for this exact title
                    if (hasServicePage(service.title)) {
                      navigate(`/book/${encodeURIComponent(service.title)}`);
                    } else {
                      navigate(`/booking?service=${encodeURIComponent(service.title)}&price=${service.price}`);
                    }
                  }
                }}
                className="flex flex-col gap-2 cursor-pointer flex-shrink-0 w-40 snap-start md:w-auto md:flex-shrink border border-border-color rounded-2xl p-2 bg-white hover:border-brand-blue transition-all"
              >
                <div className="w-full h-32 bg-white rounded-xl flex items-center justify-center overflow-hidden relative">
                  <img src={service.image} alt={service.title} className="w-full h-full object-cover" />
                  <span className={`absolute top-2 right-2 text-xs font-bold px-2 py-0.5 rounded-full ${activeType === 'in-warranty' ? 'bg-[#E8F5E9] text-[#2E7D32]' : 'bg-[#E3F2FD] text-[#0D47A1]'}`}>
                    {service.badge}
                  </span>
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-sm font-semibold text-text-primary truncate">
                    {service.title}
                  </span>
                  {service.rating ? (
                    <div className="flex items-center gap-1">
                      <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
                      <span className="text-xs text-text-secondary">{service.rating}</span>
                    </div>
                  ) : null}
                  <span className={`text-sm font-bold ${activeType === 'in-warranty' ? 'text-green-600' : 'text-[#0B4EA2]'}`}>
                    {activeType === 'in-warranty' ? '₹0 (Warranty)' : `₹${service.price}`}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Appliance repair & service */}
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold text-text-primary">Appliance repair & service</h2>
            <button 
              onClick={() => navigate('/appliance-services')}
              className="text-sm font-semibold text-[#0B4EA2] hover:text-blue-800 transition-colors"
            >
              See all
            </button>
          </div>
          <div className="flex gap-4 overflow-x-auto pb-4 -mx-2 px-2 snap-x no-scrollbar md:grid md:grid-cols-3 xl:grid-cols-4 md:overflow-visible md:mx-0 md:px-0 md:pb-0">
            {applianceServices.map((service) => (
              <div 
                key={service.id}
                onClick={() => {
                  const titleNorm = service.title.toLowerCase();
                  const isAC = titleNorm.includes('ac');
                  const isWM = titleNorm.includes('washing') || titleNorm.includes('wm');
                  const isFridge = titleNorm.includes('refrigerator') || titleNorm.includes('fridge');
                  
                  // Check if there is a custom catalog config saved for this exact title
                  if (hasServicePage(service.title)) {
                    navigate(`/book/${encodeURIComponent(service.title)}`);
                  } else if (service.path && service.path !== '/booking' && service.path !== '/book/AC' && service.path !== '/book/Washing Machine' && service.path !== '/book/Refrigerator') {
                    navigate(service.path);
                  } else if (isAC) {
                    navigate('/book/AC');
                  } else if (isWM) {
                    navigate('/book/Washing Machine');
                  } else if (isFridge) {
                    navigate('/book/Refrigerator');
                  } else if (activeType === 'in-warranty') {
                    setSelectedServiceForWarranty(service);
                    setShowWarrantyModal(true);
                  } else {
                    navigate(service.path || `/booking?service=${encodeURIComponent(service.title)}&price=${service.price}`);
                  }
                }}
                className="flex flex-col gap-2 cursor-pointer flex-shrink-0 w-40 snap-start md:w-auto md:flex-shrink border border-border-color rounded-2xl p-2 bg-white hover:border-brand-blue transition-all h-[230px] md:h-auto md:min-h-[230px]"
              >
                <div className="w-full h-32 bg-white rounded-xl flex items-center justify-center overflow-hidden relative">
                  <img src={service.image} alt={service.title} className="w-full h-full object-cover" />
                  <span className={`absolute top-2 right-2 text-xs font-bold px-2 py-0.5 rounded-full ${service.badge === "2 ACs" ? "bg-[#5C0632] text-white" : (activeType === 'in-warranty' ? "bg-[#E8F5E9] text-green-600" : "bg-[#E3F2FD] text-[#0D47A1]")}`}>
                    {service.badge}
                  </span>
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-sm font-semibold text-text-primary truncate">
                    {service.title}
                  </span>
                  {service.rating ? (
                    <div className="flex items-center gap-1">
                      <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
                      <span className="text-xs text-text-secondary">{service.rating}</span>
                    </div>
                  ) : null}
                  <span className={`text-sm font-bold ${activeType === 'in-warranty' ? 'text-green-600' : 'text-[#0B4EA2]'}`}>
                    {activeType === 'in-warranty' ? '₹0 (Warranty)' : `₹${service.price}`}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Spare Parts & Accessories */}
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold text-text-primary">Spare Parts & Accessories</h2>
            <button 
            onClick={() => navigate('/buy-product')}
              className="text-sm font-semibold text-[#0B4EA2] hover:text-blue-800 transition-colors cursor-pointer"
            >
              See all
            </button>
          </div>
          <div className="flex gap-4 overflow-x-auto pb-4 -mx-2 px-2 snap-x no-scrollbar md:grid md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 md:overflow-visible md:mx-0 md:px-0 md:pb-0">
            {[
              { id: 1, title: 'Pre-Filter Candle', desc: 'RO Outer Candle', price: 199, image: roPreFilterImg, badge: 'Genuine' },
              { id: 2, title: 'RO Membrane', desc: 'High TDS Membrane', price: 899, image: roMembraneImg, badge: 'Best Seller' },
              { id: 3, title: 'Sediment Filter', desc: 'RO Inner Filter', price: 249, image: roSedimentImg, badge: 'Genuine' },
              { id: 4, title: 'Carbon Filter', desc: 'Active Carbon', price: 299, image: roCarbonImg, badge: 'Trending' },
              { id: 5, title: 'Post Carbon', desc: 'Taste Enhancer', price: 249, image: roPostCarbonImg, badge: 'Genuine' }
            ].map((item) => (
              <div 
                key={item.id}
                onClick={() => navigate('/buy-product')}
                className="flex flex-col gap-2 cursor-pointer flex-shrink-0 w-40 snap-start md:w-auto md:flex-shrink border border-border-color rounded-2xl p-2 bg-white hover:border-brand-blue transition-all h-[230px] md:h-auto md:min-h-[230px]"
              >
                <div className="w-full h-32 bg-slate-50/50 rounded-xl flex items-center justify-center overflow-hidden relative">
                  <img src={item.image} alt={item.title} className="w-full h-full object-contain p-2 mix-blend-multiply" />
                  <span className="absolute top-2 right-2 text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#E3F2FD] text-[#0D47A1]">
                    {item.badge}
                  </span>
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-sm font-semibold text-text-primary truncate">
                    {item.title}
                  </span>
                  <span className="text-[10px] text-text-secondary truncate">
                    {item.desc}
                  </span>
                  <div className="flex items-center gap-1">
                    <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
                    <span className="text-xs text-text-secondary">{item.rating}</span>
                  </div>
                  <span className="text-sm font-bold text-[#0B4EA2]">
                    ₹{item.price}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
        <Stories />
      </div>

      {/* Bottom Navigation — hidden on desktop */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-md border-t border-border-color p-4 flex justify-around items-center z-40 overflow-visible lg:hidden">
        <button className="flex flex-col items-center text-brand-blue">
          <HomeIcon className="h-6 w-6" />
          <span className="text-xs font-medium">Home</span>
        </button>
        <button 
          onClick={() => navigate('/categories')}
          className="flex flex-col items-center text-text-secondary hover:text-brand-blue"
        >
          <LayoutGrid className="h-6 w-6" />
          <span className="text-xs font-medium">Categories</span>
        </button>
        
        <button 
          onClick={() => {
            if (activeType === 'in-warranty') {
              navigate('/extend-warranty');
            } else {
              navigate('/buy');
            }
          }}
          className="flex flex-col items-center text-text-secondary hover:text-brand-blue"
        >
          <ShoppingCart className="h-6 w-6" />
          <span className="text-xs font-medium">Buy</span>
        </button>

        <button 
          onClick={() => navigate('/bookings')}
          className="flex flex-col items-center text-text-secondary hover:text-brand-blue"
        >
          <Calendar className="h-6 w-6" />
          <span className="text-xs font-medium">Bookings</span>
        </button>
        <button 
          onClick={() => navigate('/profile')}
          className="flex flex-col items-center text-text-secondary hover:text-brand-blue"
        >
          <User className="h-6 w-6" />
          <span className="text-xs font-medium">Account</span>
        </button>
      </div>

      {/* Brand Selection Modal */}

    </div>
  );
};

export default Dashboard;
