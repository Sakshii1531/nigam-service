import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import Sidebar from '../../components/super-admin/Sidebar';
import Topbar from '../../components/super-admin/Topbar';
import { Plus, Trash2, Edit2, RotateCcw, Image, Sparkles, LayoutGrid, Check } from 'lucide-react';

// Default static banners imported in Dashboard.jsx
import acBanner from '../../assets/ac_service_banner.png';
import electricianBanner from '../../assets/electrician_banner.png';
import plumbingBanner from '../../assets/plumbing_banner.png';
import warrantyBanner1 from '../../assets/warranty_banner_1.png';
import warrantyBanner2 from '../../assets/warranty_banner_2.png';

// Brand images
import splitAcImg from '../../assets/categories/split_ac.png';
import mostBookedWm from '../../assets/most_booked_wm.png';
import applianceFridge from '../../assets/appliance_fridge.png';
import mostBookedAc1 from '../../assets/most_booked_ac_1.png';
import mostBookedAc2 from '../../assets/most_booked_ac_2.png';
import mostBookedCleaning from '../../assets/most_booked_cleaning.png';
import mostBookedSalon from '../../assets/most_booked_salon.png';

// Stories assets
import storyGeyser from '../../assets/story_geyser.png';
import storyWinter from '../../assets/story_winter.png';
import storyElectrician from '../../assets/story_electrician.png';
import storySalon from '../../assets/story_salon.png';
import storyGeyser2 from '../../assets/story_geyser_2.png';
import storyGeyser3 from '../../assets/story_geyser_3.png';
import storyWinter2 from '../../assets/story_winter_2.png';
import storyWinter3 from '../../assets/story_winter_3.png';
import storyElectrician2 from '../../assets/story_electrician_2.png';
import storyElectrician3 from '../../assets/story_electrician_3.png';
import storySalon2 from '../../assets/story_salon_2.png';
import storySalon3 from '../../assets/story_salon_3.png';

// Default static service images
import acImgDefault from '../../assets/categories/ac.png';
import washingImgDefault from '../../assets/categories/wasing.png';
import electricianImgDefault from '../../assets/categories/electrician_fixed.png';
import plumberImgDefault from '../../assets/categories/plumber_fixed.png';
import cleaningImgDefault from '../../assets/categories/cleaning.png';
import saloonImgDefault from '../../assets/categories/saloon.png';
import spaImgDefault from '../../assets/categories/spa.png';

const DEFAULT_CATEGORIES = [
  { name: 'For You', icon: 'sparkles', isForYou: true },
  { name: 'AC', icon: 'ac', service: 'AC Repair' },
  { name: 'Washing Machine', icon: 'washing', service: 'Washing Machine' },
  { name: 'Refrigerator', icon: 'fridge', isFridge: true },
  { name: 'TV', icon: 'tv', service: 'Smart TV Service & Repair' },
  { name: 'RO Water Purifier', icon: 'ro', service: 'Water Purifier RO Service' },
  { name: 'Geyser', icon: 'geyser', service: 'Geyser Service & Repair' },
  { name: 'More', icon: 'more', isMore: true }
];

const AVAILABLE_ICONS = [
  { id: 'sparkles', label: 'For You (Sparkles)' },
  { id: 'ac', label: 'AC Unit' },
  { id: 'washing', label: 'Washing Machine' },
  { id: 'fridge', label: 'Refrigerator' },
  { id: 'tv', label: 'Television' },
  { id: 'ro', label: 'Water Purifier' },
  { id: 'geyser', label: 'Geyser' },
  { id: 'more', label: 'More (Grid/Chevron)' }
];

const DEFAULT_NON_WARRANTY = [
  { id: 1, image: acBanner, title: 'AC Service Banner' },
  { id: 2, image: electricianBanner, title: 'Electrician Banner' },
  { id: 3, image: plumbingBanner, title: 'Plumbing Banner' }
];

const DEFAULT_WARRANTY = [
  { id: 1, image: warrantyBanner1, title: 'Warranty Banner 1' },
  { id: 2, image: warrantyBanner2, title: 'Warranty Banner 2' }
];

const DEFAULT_SERVICES = [
  { id: 1, name: 'AC Repair', img: acImgDefault },
  { id: 2, name: 'Washing Machine', img: washingImgDefault },
  { id: 3, name: 'Electrician', img: electricianImgDefault },
  { id: 4, name: 'Plumber', img: plumberImgDefault },
  { id: 5, name: 'Full Home Cleaning', img: cleaningImgDefault },
  { id: 6, name: 'Salon for Women', img: saloonImgDefault },
  { id: 7, name: 'Spa & Massage', img: spaImgDefault }
];

const DEFAULT_SERVICE_CONFIGS = {
  'Electrician': {
    tagline: 'Power Back On',
    subtitle: 'Certified Electricians for\nSafe & Reliable Repairs',
    subServices: 'Book a consultation, Installation Services, Repair & Maintenance, UPS Inverter, Water Motor'
  },
  'Plumber': {
    tagline: 'Leak Fixed Fast',
    subtitle: 'Expert Plumbers at\nYour Doorstep in 60 min',
    subServices: 'Book a consultation, Pipe Leakage, Tap & Fitting, Drainage, Geyser Install'
  },
  'AC Repair': {
    tagline: 'Cool Again Today',
    subtitle: 'Certified AC Technicians\nFor All Brands',
    subServices: 'Book a consultation, AC Installation, Gas Refilling, Deep Cleaning, AMC Plan'
  }
};

const DEFAULT_CATALOG_TEMPLATE = [
  {
    section: 'Book a consultation',
    items: [
      {
        name: 'Standard Consultancy',
        rating: 4.4,
        reviews: 38,
        price: '₹149',
        time: '1 hrs',
        bullets: [
          'Detailed inspection and quote estimation',
          'Fee adjusted in final repair work invoice'
        ]
      }
    ]
  },
  {
    section: 'Repair & Installation Services',
    items: [
      {
        name: 'Standard Repair Service',
        rating: 4.5,
        reviews: 28,
        price: '₹299',
        time: '1 hrs',
        bullets: [
          'Expert installation and functional testing',
          '30 days post-service warranty'
        ]
      }
    ]
  }
];

const DEFAULT_STORIES = [
  {
    id: 1,
    title: 'Cold showers in winter? Hard pass',
    image: storyGeyser,
    slides: [
      {
        image: storyGeyser,
        caption: 'Cold showers in winter? Hard pass',
        subCaption: 'Your geyser deserves a check-up before winter hits.',
      },
      {
        image: storyGeyser2,
        caption: 'Leaking? Tripping? No hot water?',
        subCaption: 'From thermostat failure to heating coil burnout — we\'ve seen it all.',
      },
      {
        image: storyGeyser3,
        caption: 'Back to warm showers in no time',
        subCaption: 'Our certified technicians get your geyser fixed fast.',
      },
    ],
  },
  {
    id: 2,
    title: 'Winter Home Repairs & Maintenance',
    image: storyWinter,
    slides: [
      {
        image: storyWinter,
        caption: 'Winter Home Repairs & Maintenance',
        subCaption: 'Keep your home warm and worry-free this season.',
      },
      {
        image: storyWinter2,
        caption: 'Cracks? Leaks? Chipping walls?',
        subCaption: 'Winter can be tough on your home. Spot the damage early.',
      },
      {
        image: storyWinter3,
        caption: 'Trust the experts. Leave the repairs to us.',
        subCaption: 'Nigam Care technicians — certified, background-checked, on-time.',
      },
    ],
  },
  {
    id: 3,
    title: 'Quick Electrical Fixes',
    image: storyElectrician,
    slides: [
      {
        image: storyElectrician,
        caption: 'Quick Electrical Fixes',
        subCaption: 'Faulty switch? Tripping MCB? Fan not working? We fix it.',
      },
      {
        image: storyElectrician2,
        caption: 'Safe. Certified. Insured.',
        subCaption: 'All our electricians carry ISI-certified tools and follow safety protocols.',
      },
      {
        image: storyElectrician3,
        caption: 'Light up your home again',
        subCaption: 'Hundreds of families trust Nigam Care every month for electrical work.',
      },
    ],
  },
  {
    id: 4,
    title: 'Salon-like pampering at home',
    image: storySalon,
    slides: [
      {
        image: storySalon,
        caption: 'Salon-like pampering at home',
        subCaption: 'Professional beauty experts come right to your doorstep.',
      },
      {
        image: storySalon2,
        caption: 'Nails. Skin. Hair. All at home.',
        subCaption: 'Relax while our experts bring the salon experience to you.',
      },
      {
        image: storySalon3,
        caption: 'Glowing skin. Happy you.',
        subCaption: 'Book a home salon session and feel the difference today.',
      },
    ],
  },
];

const DEFAULT_MOST_BOOKED = [
  { id: 1, title: "Foam-jet AC service", image: mostBookedAc1, rating: 4.76, price: 649, badge: "Instant" },
  { id: 2, title: "AC repair", image: mostBookedAc2, rating: 4.74, price: 299, badge: "Instant" },
  { id: 3, title: "Washing Machine", image: mostBookedWm, rating: 4.85, price: 499, badge: "Instant" },
  { id: 4, title: "Home Cleaning", image: mostBookedCleaning, rating: 4.90, price: 999, badge: "Trending" },
  { id: 5, title: "Women Salon", image: mostBookedSalon, rating: 4.80, price: 799, badge: "Best Seller" }
];

const DEFAULT_APPLIANCE_SERVICES = [
  { id: 1, title: "Foam-jet AC service", image: mostBookedAc1, rating: 4.76, price: 649, badge: "Instant", path: '/booking' },
  { id: 2, title: "AC repair", image: mostBookedAc2, rating: 4.74, price: 299, badge: "Instant", path: '/booking' },
  { id: 3, title: "Washing Machine", image: mostBookedWm, rating: 4.85, price: 499, badge: "Instant", path: '/booking' },
  { id: 4, title: "Refrigerator Repair & Service", image: applianceFridge, rating: 4.80, price: 899, badge: "Instant", path: '/refrigerator-details' },
  { id: 5, title: "Deep Clean AC", image: mostBookedAc1, rating: 4.76, price: 1198, badge: "2 ACs", path: '/booking' },
  { id: 6, title: "WM Checkup", image: mostBookedWm, rating: 4.85, price: 199, badge: "Instant", path: '/booking' }
];

const DEFAULT_BRAND_CARDS = [
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
];

const CustomerAppCustomization = () => {
  const location = useLocation();
  const [activeSubSection, setActiveSubSection] = useState('categories'); // 'categories' | 'banners' | 'services' | 'brands' | 'mostbooked' | 'applianceservices'
  const [successMessage, setSuccessMessage] = useState('');

  // Stories State
  const [storiesList, setStoriesList] = useState([]);
  const [showStoryModal, setShowStoryModal] = useState(false);
  const [isEditingStory, setIsEditingStory] = useState(false);
  const [editStoryIndex, setEditStoryIndex] = useState(-1);
  const [storyForm, setStoryForm] = useState({
    title: '',
    image: ''
  });
  const [storySlides, setStorySlides] = useState([]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tab = params.get('tab');
    if (tab === 'banners') {
      setActiveSubSection('banners');
    } else if (tab === 'services') {
      setActiveSubSection('services');
    } else if (tab === 'brands') {
      setActiveSubSection('brands');
    } else if (tab === 'mostbooked') {
      setActiveSubSection('mostbooked');
    } else if (tab === 'applianceservices') {
      setActiveSubSection('applianceservices');
    } else if (tab === 'stories') {
      setActiveSubSection('stories');
    } else {
      setActiveSubSection('categories');
    }
  }, [location.search]);

  // Category State
  const [categories, setCategories] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editIndex, setEditIndex] = useState(-1);
  const [categoryForm, setCategoryForm] = useState({
    name: '',
    icon: 'ac',
    service: '',
    isForYou: false,
    isMore: false,
    isFridge: false,
    productTypes: '',
    servicesJson: '',
    brands: '',
    categoryNote: ''
  });

  // Banner State
  const [bannerType, setBannerType] = useState('non-warranty'); // 'non-warranty' or 'warranty'
  const [nonWarrantyBanners, setNonWarrantyBanners] = useState([]);
  const [warrantyBanners, setWarrantyBanners] = useState([]);
  const [newBannerTitle, setNewBannerTitle] = useState('');
  const [newBannerFile, setNewBannerFile] = useState('');

  // Services State
  const [services, setServices] = useState([]);
  const [showServiceModal, setShowServiceModal] = useState(false);
  const [isEditingService, setIsEditingService] = useState(false);
  const [editServiceIndex, setEditServiceIndex] = useState(-1);
  const [serviceForm, setServiceForm] = useState({
    name: '',
    img: '',
    tagline: '',
    subtitle: '',
    bannerImg: ''
  });
  const [serviceTypes, setServiceTypes] = useState([]);
  const [servicePackages, setServicePackages] = useState([]);

  // Brands & Offers State
  const [brandCards, setBrandCards] = useState([]);
  const [showBrandModal, setShowBrandModal] = useState(false);
  const [isEditingBrand, setIsEditingBrand] = useState(false);
  const [editBrandIndex, setEditBrandIndex] = useState(-1);
  const [brandForm, setBrandForm] = useState({
    brandName: '',
    title: '',
    subtitle: '',
    image: '',
    buttonText: 'Explore on NCC',
    actionUrl: '',
    badgeText: '',
    gradient: 'from-[#E3F2FD] via-[#F4F9FF] to-[#D5E6FF]',
    textColor: '#014694'
  });

  // Most Booked State
  const [mostBookedList, setMostBookedList] = useState([]);
  const [showMostBookedModal, setShowMostBookedModal] = useState(false);
  const [isEditingMostBooked, setIsEditingMostBooked] = useState(false);
  const [editMostBookedIndex, setEditMostBookedIndex] = useState(-1);
  const [mostBookedForm, setMostBookedForm] = useState({
    title: '',
    rating: '4.8',
    price: '499',
    badge: 'Instant',
    image: ''
  });
  const [mostBookedTypes, setMostBookedTypes] = useState([]);
  const [mostBookedPackages, setMostBookedPackages] = useState([]);

  // Appliance Services State
  const [applianceServicesList, setApplianceServicesList] = useState([]);
  const [showApplianceModal, setShowApplianceModal] = useState(false);
  const [isEditingAppliance, setIsEditingAppliance] = useState(false);
  const [editApplianceIndex, setEditApplianceIndex] = useState(-1);
  const [applianceForm, setApplianceForm] = useState({
    title: '',
    rating: '4.8',
    price: '499',
    badge: 'Instant',
    image: '',
    path: '/booking'
  });
  const [applianceTypes, setApplianceTypes] = useState([]);
  const [appliancePackages, setAppliancePackages] = useState([]);

  useEffect(() => {
    // Load Categories
    const savedCats = localStorage.getItem('custom_categories');
    if (savedCats) {
      setCategories(JSON.parse(savedCats));
    } else {
      setCategories(DEFAULT_CATEGORIES);
      localStorage.setItem('custom_categories', JSON.stringify(DEFAULT_CATEGORIES));
    }

    // Load Banners
    const savedNon = localStorage.getItem('custom_banners_non_warranty');
    if (savedNon) {
      setNonWarrantyBanners(JSON.parse(savedNon));
    } else {
      setNonWarrantyBanners(DEFAULT_NON_WARRANTY);
      localStorage.setItem('custom_banners_non_warranty', JSON.stringify(DEFAULT_NON_WARRANTY));
    }

    const savedWar = localStorage.getItem('custom_banners_warranty');
    if (savedWar) {
      setWarrantyBanners(JSON.parse(savedWar));
    } else {
      setWarrantyBanners(DEFAULT_WARRANTY);
      localStorage.setItem('custom_banners_warranty', JSON.stringify(DEFAULT_WARRANTY));
    }

    // Load Services
    const savedServices = localStorage.getItem('custom_dashboard_services');
    if (savedServices) {
      setServices(JSON.parse(savedServices));
    } else {
      setServices(DEFAULT_SERVICES);
      localStorage.setItem('custom_dashboard_services', JSON.stringify(DEFAULT_SERVICES));
    }

    // Load Brands & Offers
    const savedBrands = localStorage.getItem('custom_brand_cards');
    if (savedBrands) {
      setBrandCards(JSON.parse(savedBrands));
    } else {
      setBrandCards(DEFAULT_BRAND_CARDS);
      localStorage.setItem('custom_brand_cards', JSON.stringify(DEFAULT_BRAND_CARDS));
    }

    // Load Most Booked
    const savedMost = localStorage.getItem('custom_most_booked_services');
    if (savedMost) {
      setMostBookedList(JSON.parse(savedMost));
    } else {
      setMostBookedList(DEFAULT_MOST_BOOKED);
      localStorage.setItem('custom_most_booked_services', JSON.stringify(DEFAULT_MOST_BOOKED));
    }

    // Load Appliance Services
    const savedAppliance = localStorage.getItem('custom_appliance_services');
    if (savedAppliance) {
      setApplianceServicesList(JSON.parse(savedAppliance));
    } else {
      setApplianceServicesList(DEFAULT_APPLIANCE_SERVICES);
      localStorage.setItem('custom_appliance_services', JSON.stringify(DEFAULT_APPLIANCE_SERVICES));
    }

    // Load Stories
    const savedStories = localStorage.getItem('custom_stories');
    if (savedStories) {
      setStoriesList(JSON.parse(savedStories));
    } else {
      setStoriesList(DEFAULT_STORIES);
      localStorage.setItem('custom_stories', JSON.stringify(DEFAULT_STORIES));
    }

    // Pre-populate default catalogs and configs if not exists
    const savedCatalogs = localStorage.getItem('custom_service_catalogs');
    const catalogs = savedCatalogs ? JSON.parse(savedCatalogs) : {};
    
    const savedConfigs = localStorage.getItem('custom_service_details_configs');
    const configs = savedConfigs ? JSON.parse(savedConfigs) : {};

    const defaultServiceNames = [
      'Foam-jet AC service',
      'AC repair',
      'Washing Machine',
      'Home Cleaning',
      'Women Salon',
      'Refrigerator Repair & Service',
      'Deep Clean AC',
      'WM Checkup'
    ];

    let changed = false;
    defaultServiceNames.forEach(name => {
      if (!catalogs[name]) {
        catalogs[name] = [
          {
            section: 'General Services',
            items: [
              {
                name: name + ' Standard Work',
                rating: 4.5,
                reviews: 28,
                price: '₹299',
                time: '1 hrs',
                bullets: ['Professional execution by certified technician', '30 days service warranty included'],
                icon: '🔧',
                desc: 'Standard professional service',
                unit: 'per job'
              }
            ]
          }
        ];
        changed = true;
      }
      if (!configs[name]) {
        configs[name] = {
          tagline: 'Expert Help at Your Door',
          subtitle: 'Verified Professionals\nFor Every Home Need',
          bannerImg: '',
          productTypes: name.toLowerCase().includes('ac') ? ['Split AC', 'Window AC'] : (name.toLowerCase().includes('washing') || name.toLowerCase().includes('wm') ? ['Top Load', 'Front Load'] : []),
          brands: ['LG', 'Samsung', 'Whirlpool', 'Panasonic'],
          categoryNote: 'Prices shown are indicative.'
        };
        changed = true;
      }
    });

    if (changed) {
      localStorage.setItem('custom_service_catalogs', JSON.stringify(catalogs));
      localStorage.setItem('custom_service_details_configs', JSON.stringify(configs));
    }
  }, []);

  const showToast = (msg) => {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(''), 3000);
  };

  // --- Category Handlers ---
  const handleCategoryFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setCategoryForm(prev => ({ ...prev, icon: reader.result }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleOpenAddCategory = () => {
    setIsEditing(false);
    setCategoryForm({
      name: '',
      icon: 'ac',
      service: '',
      isForYou: false,
      isMore: false,
      isFridge: false,
      productTypes: '',
      servicesJson: '[\n  { "id": "repair", "name": "Repair", "icon": "🔧", "desc": "Fix breakdowns & issues", "price": 299 },\n  { "id": "installation", "name": "Installation", "icon": "🔩", "desc": "Standard installation", "price": 399 }\n]',
      brands: 'Voltas, LG, Samsung, Whirlpool',
      categoryNote: 'Prices shown are indicative. The technician will confirm exact charges after inspection.'
    });
    setShowAddModal(true);
  };

  const handleOpenEditCategory = (index) => {
    setIsEditing(true);
    setEditIndex(index);
    const cat = categories[index];
    
    const savedCatalogs = localStorage.getItem('custom_booking_catalog');
    const customCatalogs = savedCatalogs ? JSON.parse(savedCatalogs) : {};
    
    let config = customCatalogs[cat.name] || {};
    if (!customCatalogs[cat.name]) {
      const norm = cat.name.toLowerCase();
      if (norm.includes('ac')) {
        config = {
          productTypes: 'Split AC, Window AC, Cassette AC, Tower AC, Portable AC',
          services: [
            { id: 'installation',  name: 'Installation',  icon: '🔩', desc: 'New AC fitting & setup',          price: 499 },
            { id: 'repair',        name: 'Repair',         icon: '🔧', desc: 'Fix breakdowns & issues',         price: 299 },
            { id: 'gas_refilling', name: 'Gas Refilling',  icon: '💨', desc: 'Refrigerant top-up',             price: 799 },
            { id: 'maintenance',   name: 'Maintenance',    icon: '🛠️', desc: 'Preventive check & tune-up',     price: 349 },
            { id: 'deep_cleaning', name: 'Deep Cleaning',  icon: '✨', desc: 'Foam-jet wash & coil clean',     price: 649 }
          ],
          brands: 'Voltas, LG, Samsung, Daikin, Whirlpool, Lloyd, Panasonic, Blue Star, Hitachi',
          categoryNote: 'Prices shown are indicative. The technician will confirm exact charges after inspection.'
        };
      } else if (norm.includes('wash') || norm.includes('machine')) {
        config = {
          productTypes: 'Front Load, Top Load, Semi Automatic',
          services: [
            { id: 'repair',        name: 'Repair',        icon: '🔧', desc: 'Fix spin, drain & motor issues', price: 399 },
            { id: 'installation',  name: 'Installation',  icon: '🔩', desc: 'New machine setup & demo',       price: 299 },
            { id: 'drum_cleaning', name: 'Drum Cleaning', icon: '✨', desc: 'Deep drum & tub sanitisation',   price: 499 }
          ],
          brands: 'LG, Samsung, Whirlpool, IFB, Bosch, Haier, Godrej, Panasonic',
          categoryNote: 'Prices are indicative. Exact charges are confirmed after inspection.'
        };
      } else if (norm.includes('fridge') || norm.includes('refriger')) {
        config = {
          productTypes: 'Single Door, Double Door, Side By Side, Convertible, French Door',
          services: [
            { id: 'cooling_issue', name: 'Cooling Issue',  icon: '🌡️', desc: 'Not cooling / over-freezing fix', price: 449 },
            { id: 'installation',  name: 'Installation',   icon: '🔩', desc: 'Setup, levelling & demo',         price: 299 },
            { id: 'repair',        name: 'Repair',          icon: '🔧', desc: 'General repairs & part fix',     price: 499 }
          ],
          brands: 'LG, Samsung, Whirlpool, Godrej, Haier, Panasonic, Bosch, Voltas, Hitachi',
          categoryNote: 'Cooling issues may need gas refilling — exact diagnosis done by the technician on-site.'
        };
      } else if (norm.includes('tv') || norm.includes('television')) {
        config = {
          productTypes: 'LED TV, OLED TV, QLED TV, Smart TV',
          services: [
            { id: 'wall_mount',    name: 'Wall Mount Installation', icon: '🔩', desc: 'TV mounting & cable management',    price: 299 },
            { id: 'repair',        name: 'Repair',                  icon: '🔧', desc: 'No display, flickering, no sound', price: 349 },
            { id: 'display_issue', name: 'Display Issue',           icon: '🖥️', desc: 'Screen lines, colour fix',         price: 599 }
          ],
          brands: 'LG, Samsung, Sony, Panasonic, Mi, OnePlus, TCL, Haier, VU',
          categoryNote: 'Panel repairs depend on part availability. Technician will confirm before proceeding.'
        };
      } else if (norm.includes('ro') || norm.includes('purif') || norm.includes('water')) {
        config = {
          productTypes: 'RO, UV, UF, RO + UV',
          services: [
            { id: 'installation',       name: 'Installation',       icon: '🔩', desc: 'New purifier setup & fitting', price: 399 },
            { id: 'filter_replacement', name: 'Filter Replacement', icon: '🔄', desc: 'Replace complete filter set',  price: 799 },
            { id: 'repair',             name: 'Repair',             icon: '🔧', desc: 'No water / leakage fix',      price: 349 }
          ],
          brands: 'Kent, Aquaguard, Pureit, Livpure, Blue Star, Havells',
          categoryNote: 'Filters are replaced with genuine parts. Membrane is checked separately.'
        };
      } else {
        config = {
          productTypes: '',
          services: [
            { id: 'repair', name: 'Repair', icon: '🔧', desc: 'General repair services', price: 299 },
            { id: 'installation', name: 'Installation', icon: '🔩', desc: 'Setup & fitting', price: 399 }
          ],
          brands: 'Other',
          categoryNote: 'Prices shown are indicative.'
        };
      }
    }

    setCategoryForm({
      name: cat.name,
      icon: cat.icon || 'ac',
      service: cat.service || '',
      isForYou: !!cat.isForYou,
      isMore: !!cat.isMore,
      isFridge: !!cat.isFridge,
      productTypes: typeof config.productTypes === 'string' ? config.productTypes : (config.productTypes || []).map(p => typeof p === 'string' ? p : p.name).join(', '),
      servicesJson: JSON.stringify(config.services?.default || config.services || [], null, 2),
      brands: Array.isArray(config.brands) ? config.brands.join(', ') : config.brands || '',
      categoryNote: config.categoryNote || ''
    });
    setShowAddModal(true);
  };

  const handleDeleteCategory = (index) => {
    const catName = categories[index].name;
    if (window.confirm(`Are you sure you want to delete "${catName}"?`)) {
      const updated = categories.filter((_, i) => i !== index);
      setCategories(updated);
      localStorage.setItem('custom_categories', JSON.stringify(updated));

      const savedCatalogs = localStorage.getItem('custom_booking_catalog');
      if (savedCatalogs) {
        const customCatalogs = JSON.parse(savedCatalogs);
        delete customCatalogs[catName];
        localStorage.setItem('custom_booking_catalog', JSON.stringify(customCatalogs));
      }

      showToast('Category deleted successfully.');
    }
  };

  const handleSaveCategory = (e) => {
    e.preventDefault();
    if (!categoryForm.name.trim()) return;

    let parsedServices = [];
    try {
      parsedServices = JSON.parse(categoryForm.servicesJson);
      if (!Array.isArray(parsedServices)) {
        alert('Services must be a valid JSON array.');
        return;
      }
    } catch (err) {
      alert('Invalid JSON in Booking Services. Details:\n' + err.message);
      return;
    }

    let updated = [...categories];
    const newCat = {
      name: categoryForm.name,
      icon: categoryForm.icon,
      service: categoryForm.service || undefined,
      isForYou: categoryForm.isForYou || undefined,
      isMore: categoryForm.isMore || undefined,
      isFridge: categoryForm.isFridge || undefined
    };

    if (isEditing) {
      updated[editIndex] = newCat;
    } else {
      updated.push(newCat);
    }

    setCategories(updated);
    localStorage.setItem('custom_categories', JSON.stringify(updated));

    const savedCatalogs = localStorage.getItem('custom_booking_catalog');
    const customCatalogs = savedCatalogs ? JSON.parse(savedCatalogs) : {};

    const typesArray = categoryForm.productTypes.trim()
      ? categoryForm.productTypes.split(',').map((p, idx) => ({
          id: p.trim().toLowerCase().replace(/ /g, '_'),
          name: p.trim(),
          icon: '⚡',
          desc: ''
        }))
      : [];

    customCatalogs[categoryForm.name] = {
      productTypes: typesArray,
      services: {
        default: parsedServices
      },
      brands: categoryForm.brands.split(',').map(b => b.trim()).filter(Boolean),
      whyBrandPoints: ['Brand certified expert technicians', 'Correct parts calibration', 'Genuine brand replacement parts'],
      categoryNote: categoryForm.categoryNote
    };
    localStorage.setItem('custom_booking_catalog', JSON.stringify(customCatalogs));

    setShowAddModal(false);
    showToast('Category and booking settings saved successfully.');
  };

  const handleResetCategories = () => {
    if (window.confirm('Reset categories to default customer app dashboard options?')) {
      setCategories(DEFAULT_CATEGORIES);
      localStorage.setItem('custom_categories', JSON.stringify(DEFAULT_CATEGORIES));
      localStorage.removeItem('custom_booking_catalog');
      showToast('Restored default categories.');
    }
  };

  // --- Services Handlers ---
  const handleServiceFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setServiceForm(prev => ({ ...prev, img: reader.result }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handlePackageIconChange = (pkgId, e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setServicePackages(prev => prev.map(p => p.id === pkgId ? { ...p, icon: reader.result } : p));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleServiceBannerFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setServiceForm(prev => ({ ...prev, bannerImg: reader.result }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleOpenAddService = () => {
    setIsEditingService(false);
    setServiceForm({
      name: '',
      img: '',
      tagline: 'Expert Help at Your Door',
      subtitle: 'Verified Professionals\nFor Every Home Need',
      bannerImg: ''
    });
    setServiceTypes([]);
    setServicePackages([
      { id: Date.now() + 1, section: 'Book a consultation', name: 'Standard Consultancy', price: '149', bullets: 'Inspection and quote estimation, Fee adjusted in final invoice', icon: '🔩', desc: 'Standard inspection & quote', unit: 'per visit' }
    ]);
    setShowServiceModal(true);
  };

  const handleOpenEditService = (index) => {
    setIsEditingService(true);
    setEditServiceIndex(index);
    const srv = services[index];
    
    const savedConfigs = localStorage.getItem('custom_service_details_configs');
    const configs = savedConfigs ? JSON.parse(savedConfigs) : {};
    const config = configs[srv.name] || DEFAULT_SERVICE_CONFIGS[srv.name] || {
      tagline: 'Expert Help at Your Door',
      subtitle: 'Verified Professionals\nFor Every Home Need',
      bannerImg: '',
      productTypes: []
    };

    const savedCatalogs = localStorage.getItem('custom_service_catalogs');
    const catalogs = savedCatalogs ? JSON.parse(savedCatalogs) : {};
    const catalog = catalogs[srv.name] || DEFAULT_CATALOG_TEMPLATE;

    setServiceForm({
      name: srv.name,
      img: srv.img || '',
      tagline: config.tagline || 'Expert Help at Your Door',
      subtitle: config.subtitle || 'Verified Professionals\nFor Every Home Need',
      bannerImg: config.bannerImg || ''
    });

    const rawTypes = config.productTypes || [];
    setServiceTypes(rawTypes);

    const pkgs = [];
    catalog.forEach(group => {
      if (group && group.items) {
        group.items.forEach(item => {
          pkgs.push({
            id: Math.random() + Math.random(),
            section: group.section || 'General Services',
            name: item.name || '',
            price: (item.price || '').replace('₹', ''),
            bullets: Array.isArray(item.bullets) ? item.bullets.join(', ') : item.bullets || '',
            icon: item.icon || '🔧',
            desc: item.desc || '',
            unit: item.unit || 'per unit'
          });
        });
      }
    });
    setServicePackages(pkgs);

    setShowServiceModal(true);
  };

  const handleDeleteService = (index) => {
    const srvName = services[index].name;
    if (window.confirm(`Are you sure you want to delete "${srvName}"?`)) {
      const updated = services.filter((_, i) => i !== index);
      setServices(updated);
      localStorage.setItem('custom_dashboard_services', JSON.stringify(updated));

      const savedConfigs = localStorage.getItem('custom_service_details_configs');
      if (savedConfigs) {
        const configs = JSON.parse(savedConfigs);
        delete configs[srvName];
        localStorage.setItem('custom_service_details_configs', JSON.stringify(configs));
      }

      const savedCatalogs = localStorage.getItem('custom_service_catalogs');
      if (savedCatalogs) {
        const catalogs = JSON.parse(savedCatalogs);
        delete catalogs[srvName];
        localStorage.setItem('custom_service_catalogs', JSON.stringify(catalogs));
      }

      showToast('Service deleted successfully.');
    }
  };

  const handleSaveService = (e) => {
    e.preventDefault();
    if (!serviceForm.name.trim()) return;

    const sectionsMap = {};
    servicePackages.forEach(pkg => {
      const secName = pkg.section.trim() || 'General Services';
      if (!sectionsMap[secName]) {
        sectionsMap[secName] = { section: secName, items: [] };
      }
      sectionsMap[secName].items.push({
        name: pkg.name.trim(),
        rating: 4.5,
        reviews: 25,
        price: pkg.price.startsWith('₹') ? pkg.price : `₹${pkg.price}`,
        bullets: pkg.bullets.split(',').map(b => b.trim()).filter(Boolean),
        icon: pkg.icon || '🔧',
        desc: pkg.desc || '',
        unit: pkg.unit || 'per unit',
        img: ''
      });
    });
    const parsedCatalog = Object.values(sectionsMap);

    let updated = [...services];
    const newSrv = {
      id: isEditingService ? services[editServiceIndex].id : Date.now(),
      name: serviceForm.name,
      img: serviceForm.img
    };

    if (isEditingService) {
      updated[editServiceIndex] = newSrv;
    } else {
      updated.push(newSrv);
    }

    setServices(updated);
    localStorage.setItem('custom_dashboard_services', JSON.stringify(updated));

    const savedConfigs = localStorage.getItem('custom_service_details_configs');
    const configs = savedConfigs ? JSON.parse(savedConfigs) : {};
    configs[serviceForm.name] = {
      tagline: serviceForm.tagline,
      subtitle: serviceForm.subtitle,
      bannerImg: serviceForm.bannerImg,
      subServices: Array.from(new Set(servicePackages.map(p => p.section.trim()).filter(Boolean))),
      productTypes: serviceTypes.map(t => t.trim()).filter(Boolean)
    };
    localStorage.setItem('custom_service_details_configs', JSON.stringify(configs));

    const savedCatalogs = localStorage.getItem('custom_service_catalogs');
    const catalogs = savedCatalogs ? JSON.parse(savedCatalogs) : {};
    catalogs[serviceForm.name] = parsedCatalog;
    localStorage.setItem('custom_service_catalogs', JSON.stringify(catalogs));

    setShowServiceModal(false);
    showToast('Service details saved successfully!');
  };

  const handleResetServices = () => {
    if (window.confirm('Reset dashboard services and all customized details pages to original defaults?')) {
      setServices(DEFAULT_SERVICES);
      localStorage.setItem('custom_dashboard_services', JSON.stringify(DEFAULT_SERVICES));
      localStorage.removeItem('custom_service_details_configs');
      localStorage.removeItem('custom_service_catalogs');
      showToast('Restored original defaults.');
    }
  };

  // --- Banner Handlers ---
  const handleBannerFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewBannerFile(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddBanner = (e) => {
    e.preventDefault();
    if (!newBannerFile) return;

    const title = newBannerTitle.trim() || `Banner ${Date.now()}`;
    const newBanner = {
      id: Date.now(),
      image: newBannerFile,
      title: title
    };

    if (bannerType === 'non-warranty') {
      const updated = [...nonWarrantyBanners, newBanner];
      setNonWarrantyBanners(updated);
      localStorage.setItem('custom_banners_non_warranty', JSON.stringify(updated));
    } else {
      const updated = [...warrantyBanners, newBanner];
      setWarrantyBanners(updated);
      localStorage.setItem('custom_banners_warranty', JSON.stringify(updated));
    }

    setNewBannerTitle('');
    setNewBannerFile('');
    const fileInput = document.getElementById('banner-file-input-sub');
    if (fileInput) fileInput.value = '';

    showToast('New dashboard banner uploaded successfully!');
  };

  const handleDeleteBanner = (id) => {
    if (window.confirm('Are you sure you want to delete this banner?')) {
      if (bannerType === 'non-warranty') {
        const updated = nonWarrantyBanners.filter(b => b.id !== id);
        setNonWarrantyBanners(updated);
        localStorage.setItem('custom_banners_non_warranty', JSON.stringify(updated));
      } else {
        const updated = warrantyBanners.filter(b => b.id !== id);
        setWarrantyBanners(updated);
        localStorage.setItem('custom_banners_warranty', JSON.stringify(updated));
      }
      showToast('Banner deleted successfully.');
    }
  };

  const handleResetBanners = () => {
    if (window.confirm('Reset all banners of the current type to original defaults?')) {
      if (bannerType === 'non-warranty') {
        setNonWarrantyBanners(DEFAULT_NON_WARRANTY);
        localStorage.setItem('custom_banners_non_warranty', JSON.stringify(DEFAULT_NON_WARRANTY));
      } else {
        setWarrantyBanners(DEFAULT_WARRANTY);
        localStorage.setItem('custom_banners_warranty', JSON.stringify(DEFAULT_WARRANTY));
      }
      showToast('Restored default banners.');
    }
  };

  const currentBanners = bannerType === 'non-warranty' ? nonWarrantyBanners : warrantyBanners;

  // --- Brands Handlers ---
  const handleBrandFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setBrandForm(prev => ({ ...prev, image: reader.result }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleOpenAddBrand = () => {
    setIsEditingBrand(false);
    setBrandForm({
      brandName: '',
      title: '',
      subtitle: '',
      image: '',
      buttonText: 'Explore on NCC',
      actionUrl: '',
      badgeText: '',
      gradient: 'from-[#E3F2FD] via-[#F4F9FF] to-[#D5E6FF]',
      textColor: '#014694'
    });
    setShowBrandModal(true);
  };

  const handleOpenEditBrand = (index) => {
    setIsEditingBrand(true);
    setEditBrandIndex(index);
    const card = brandCards[index];
    setBrandForm({
      brandName: card.brandName || '',
      title: card.title || '',
      subtitle: card.subtitle || '',
      image: card.image || '',
      buttonText: card.buttonText || 'Explore on NCC',
      actionUrl: card.actionUrl || '',
      badgeText: card.badgeText || '',
      gradient: card.gradient || 'from-[#E3F2FD] via-[#F4F9FF] to-[#D5E6FF]',
      textColor: card.textColor || '#014694'
    });
    setShowBrandModal(true);
  };

  const handleDeleteBrand = (index) => {
    if (window.confirm(`Are you sure you want to delete this brand card?`)) {
      const updated = brandCards.filter((_, i) => i !== index);
      setBrandCards(updated);
      localStorage.setItem('custom_brand_cards', JSON.stringify(updated));
      showToast('Brand offer card deleted successfully.');
    }
  };

  const handleSaveBrand = (e) => {
    e.preventDefault();
    if (!brandForm.brandName.trim()) return;

    let updated = [...brandCards];
    const newCard = {
      id: isEditingBrand ? brandCards[editBrandIndex].id : Date.now(),
      brandName: brandForm.brandName,
      title: brandForm.title,
      subtitle: brandForm.subtitle,
      image: brandForm.image,
      buttonText: brandForm.buttonText,
      actionUrl: brandForm.actionUrl,
      badgeText: brandForm.badgeText,
      gradient: brandForm.gradient,
      textColor: brandForm.textColor
    };

    if (isEditingBrand) {
      updated[editBrandIndex] = newCard;
    } else {
      updated.push(newCard);
    }

    setBrandCards(updated);
    localStorage.setItem('custom_brand_cards', JSON.stringify(updated));
    setShowBrandModal(false);
    showToast('Brand offer card saved successfully!');
  };

  const handleResetBrands = () => {
    if (window.confirm('Reset Brands & Offers to original defaults?')) {
      setBrandCards(DEFAULT_BRAND_CARDS);
      localStorage.setItem('custom_brand_cards', JSON.stringify(DEFAULT_BRAND_CARDS));
      showToast('Restored brand offers defaults.');
    }
  };

  // --- Most Booked Handlers ---
  const handleMostBookedFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setMostBookedForm(prev => ({ ...prev, image: reader.result }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleOpenAddMostBooked = () => {
    setIsEditingMostBooked(false);
    setMostBookedForm({
      title: '',
      rating: '4.8',
      price: '499',
      badge: 'Instant',
      image: ''
    });
    setMostBookedTypes([]);
    setMostBookedPackages([
      { id: Date.now() + 1, section: 'Book a consultation', name: 'Standard Consultancy', price: '149', bullets: 'Inspection and quote estimation, Fee adjusted in final invoice', icon: '🔩', desc: 'Standard inspection & quote', unit: 'per visit' }
    ]);
    setShowMostBookedModal(true);
  };

  const handleOpenEditMostBooked = (index) => {
    setIsEditingMostBooked(true);
    setEditMostBookedIndex(index);
    const mb = mostBookedList[index];

    // Load custom service details configs & catalogs under this service title
    const savedConfigs = localStorage.getItem('custom_service_details_configs');
    const configs = savedConfigs ? JSON.parse(savedConfigs) : {};
    const config = configs[mb.title] || {
      tagline: 'Expert Help at Your Door',
      subtitle: 'Verified Professionals\nFor Every Home Need',
      bannerImg: '',
      productTypes: []
    };

    const savedCatalogs = localStorage.getItem('custom_service_catalogs');
    const catalogs = savedCatalogs ? JSON.parse(savedCatalogs) : {};
    const catalog = catalogs[mb.title] || DEFAULT_CATALOG_TEMPLATE;

    setMostBookedForm({
      title: mb.title,
      rating: mb.rating || '4.8',
      price: mb.price || '499',
      badge: mb.badge || 'Instant',
      image: mb.image || ''
    });

    const rawTypes = config.productTypes || [];
    setMostBookedTypes(rawTypes);

    const pkgs = [];
    catalog.forEach(group => {
      if (group && group.items) {
        group.items.forEach(item => {
          pkgs.push({
            id: Math.random() + Math.random(),
            section: group.section || 'General Services',
            name: item.name || '',
            price: (item.price || '').replace('₹', ''),
            bullets: Array.isArray(item.bullets) ? item.bullets.join(', ') : item.bullets || '',
            icon: item.icon || '🔧',
            desc: item.desc || '',
            unit: item.unit || 'per unit'
          });
        });
      }
    });
    setMostBookedPackages(pkgs);

    setShowMostBookedModal(true);
  };

  const handleDeleteMostBooked = (index) => {
    const title = mostBookedList[index].title;
    if (window.confirm(`Are you sure you want to delete "${title}" from most booked list?`)) {
      const updated = mostBookedList.filter((_, i) => i !== index);
      setMostBookedList(updated);
      localStorage.setItem('custom_most_booked_services', JSON.stringify(updated));

      // delete configs & catalogs too
      const savedConfigs = localStorage.getItem('custom_service_details_configs');
      if (savedConfigs) {
        const configs = JSON.parse(savedConfigs);
        delete configs[title];
        localStorage.setItem('custom_service_details_configs', JSON.stringify(configs));
      }

      const savedCatalogs = localStorage.getItem('custom_service_catalogs');
      if (savedCatalogs) {
        const catalogs = JSON.parse(savedCatalogs);
        delete catalogs[title];
        localStorage.setItem('custom_service_catalogs', JSON.stringify(catalogs));
      }

      showToast('Most booked service deleted successfully.');
    }
  };

  const handleSaveMostBooked = (e) => {
    e.preventDefault();
    if (!mostBookedForm.title.trim()) return;

    // Parse sub-sections
    const sectionsMap = {};
    mostBookedPackages.forEach(pkg => {
      const secName = pkg.section.trim() || 'General Services';
      if (!sectionsMap[secName]) {
        sectionsMap[secName] = { section: secName, items: [] };
      }
      sectionsMap[secName].items.push({
        name: pkg.name.trim(),
        rating: 4.5,
        reviews: 25,
        price: pkg.price.startsWith('₹') ? pkg.price : `₹${pkg.price}`,
        bullets: pkg.bullets.split(',').map(b => b.trim()).filter(Boolean),
        icon: pkg.icon || '🔧',
        desc: pkg.desc || '',
        unit: pkg.unit || 'per unit',
        img: ''
      });
    });
    const parsedCatalog = Object.values(sectionsMap);

    let updated = [...mostBookedList];
    const newMb = {
      id: isEditingMostBooked ? mostBookedList[editMostBookedIndex].id : Date.now(),
      title: mostBookedForm.title,
      rating: parseFloat(mostBookedForm.rating) || 4.8,
      price: parseInt(mostBookedForm.price) || 499,
      badge: mostBookedForm.badge,
      image: mostBookedForm.image
    };

    if (isEditingMostBooked) {
      updated[editMostBookedIndex] = newMb;
    } else {
      updated.push(newMb);
    }

    setMostBookedList(updated);
    localStorage.setItem('custom_most_booked_services', JSON.stringify(updated));

    // Save configurations
    const savedConfigs = localStorage.getItem('custom_service_details_configs');
    const configs = savedConfigs ? JSON.parse(savedConfigs) : {};
    configs[mostBookedForm.title] = {
      tagline: 'Expert Help at Your Door',
      subtitle: 'Verified Professionals\nFor Every Home Need',
      bannerImg: '',
      productTypes: mostBookedTypes,
      brands: ['LG', 'Samsung', 'Whirlpool', 'Panasonic'],
      categoryNote: 'Prices shown are indicative.'
    };
    localStorage.setItem('custom_service_details_configs', JSON.stringify(configs));

    const savedCatalogs = localStorage.getItem('custom_service_catalogs');
    const catalogs = savedCatalogs ? JSON.parse(savedCatalogs) : {};
    catalogs[mostBookedForm.title] = parsedCatalog;
    localStorage.setItem('custom_service_catalogs', JSON.stringify(catalogs));

    setShowMostBookedModal(false);
    showToast('Most booked service saved successfully!');
  };

  const handleResetMostBooked = () => {
    if (window.confirm('Reset Most Booked Services list to original defaults?')) {
      setMostBookedList(DEFAULT_MOST_BOOKED);
      localStorage.setItem('custom_most_booked_services', JSON.stringify(DEFAULT_MOST_BOOKED));
      showToast('Restored most booked defaults.');
    }
  };

  // --- Appliance Services Handlers ---
  const handleApplianceFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setApplianceForm(prev => ({ ...prev, image: reader.result }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleOpenAddAppliance = () => {
    setIsEditingAppliance(false);
    setApplianceForm({
      title: '',
      rating: '4.8',
      price: '499',
      badge: 'Instant',
      image: '',
      path: '/booking'
    });
    setApplianceTypes([]);
    setAppliancePackages([
      { id: Date.now() + 1, section: 'Book a consultation', name: 'Standard Consultancy', price: '149', bullets: 'Inspection and quote estimation, Fee adjusted in final invoice', icon: '🔩', desc: 'Standard inspection & quote', unit: 'per visit' }
    ]);
    setShowApplianceModal(true);
  };

  const handleOpenEditAppliance = (index) => {
    setIsEditingAppliance(true);
    setEditApplianceIndex(index);
    const app = applianceServicesList[index];

    // Load custom service details configs & catalogs under this service title
    const savedConfigs = localStorage.getItem('custom_service_details_configs');
    const configs = savedConfigs ? JSON.parse(savedConfigs) : {};
    const config = configs[app.title] || {
      tagline: 'Expert Help at Your Door',
      subtitle: 'Verified Professionals\nFor Every Home Need',
      bannerImg: '',
      productTypes: []
    };

    const savedCatalogs = localStorage.getItem('custom_service_catalogs');
    const catalogs = savedCatalogs ? JSON.parse(savedCatalogs) : {};
    const catalog = catalogs[app.title] || DEFAULT_CATALOG_TEMPLATE;

    setApplianceForm({
      title: app.title || '',
      rating: app.rating || '4.8',
      price: app.price || '499',
      badge: app.badge || 'Instant',
      image: app.image || '',
      path: app.path || '/booking'
    });

    const rawTypes = config.productTypes || [];
    setApplianceTypes(rawTypes);

    const pkgs = [];
    catalog.forEach(group => {
      if (group && group.items) {
        group.items.forEach(item => {
          pkgs.push({
            id: Math.random() + Math.random(),
            section: group.section || 'General Services',
            name: item.name || '',
            price: (item.price || '').replace('₹', ''),
            bullets: Array.isArray(item.bullets) ? item.bullets.join(', ') : item.bullets || '',
            icon: item.icon || '🔧',
            desc: item.desc || '',
            unit: item.unit || 'per unit'
          });
        });
      }
    });
    setAppliancePackages(pkgs);

    setShowApplianceModal(true);
  };

  const handleDeleteAppliance = (index) => {
    const title = applianceServicesList[index].title;
    if (window.confirm(`Are you sure you want to delete "${title}" from appliance services list?`)) {
      const updated = applianceServicesList.filter((_, i) => i !== index);
      setApplianceServicesList(updated);
      localStorage.setItem('custom_appliance_services', JSON.stringify(updated));

      // delete configs & catalogs too
      const savedConfigs = localStorage.getItem('custom_service_details_configs');
      if (savedConfigs) {
        const configs = JSON.parse(savedConfigs);
        delete configs[title];
        localStorage.setItem('custom_service_details_configs', JSON.stringify(configs));
      }

      const savedCatalogs = localStorage.getItem('custom_service_catalogs');
      if (savedCatalogs) {
        const catalogs = JSON.parse(savedCatalogs);
        delete catalogs[title];
        localStorage.setItem('custom_service_catalogs', JSON.stringify(catalogs));
      }

      showToast('Appliance service card deleted successfully.');
    }
  };

  const handleSaveAppliance = (e) => {
    e.preventDefault();
    if (!applianceForm.title.trim()) return;

    // Parse sub-sections
    const sectionsMap = {};
    appliancePackages.forEach(pkg => {
      const secName = pkg.section.trim() || 'General Services';
      if (!sectionsMap[secName]) {
        sectionsMap[secName] = { section: secName, items: [] };
      }
      sectionsMap[secName].items.push({
        name: pkg.name.trim(),
        rating: 4.5,
        reviews: 25,
        price: pkg.price.startsWith('₹') ? pkg.price : `₹${pkg.price}`,
        bullets: pkg.bullets.split(',').map(b => b.trim()).filter(Boolean),
        icon: pkg.icon || '🔧',
        desc: pkg.desc || '',
        unit: pkg.unit || 'per unit',
        img: ''
      });
    });
    const parsedCatalog = Object.values(sectionsMap);

    let updated = [...applianceServicesList];
    const newApp = {
      id: isEditingAppliance ? applianceServicesList[editApplianceIndex].id : Date.now(),
      title: applianceForm.title,
      rating: parseFloat(applianceForm.rating) || 4.8,
      price: parseInt(applianceForm.price) || 499,
      badge: applianceForm.badge,
      image: applianceForm.image,
      path: applianceForm.path
    };

    if (isEditingAppliance) {
      updated[editApplianceIndex] = newApp;
    } else {
      updated.push(newApp);
    }

    setApplianceServicesList(updated);
    localStorage.setItem('custom_appliance_services', JSON.stringify(updated));

    // Save configurations
    const savedConfigs = localStorage.getItem('custom_service_details_configs');
    const configs = savedConfigs ? JSON.parse(savedConfigs) : {};
    configs[applianceForm.title] = {
      tagline: 'Expert Help at Your Door',
      subtitle: 'Verified Professionals\nFor Every Home Need',
      bannerImg: '',
      productTypes: applianceTypes,
      brands: ['LG', 'Samsung', 'Whirlpool', 'Panasonic'],
      categoryNote: 'Prices shown are indicative.'
    };
    localStorage.setItem('custom_service_details_configs', JSON.stringify(configs));

    const savedCatalogs = localStorage.getItem('custom_service_catalogs');
    const catalogs = savedCatalogs ? JSON.parse(savedCatalogs) : {};
    catalogs[applianceForm.title] = parsedCatalog;
    localStorage.setItem('custom_service_catalogs', JSON.stringify(catalogs));

    setShowApplianceModal(false);
    showToast('Appliance service saved successfully!');
  };

  const handleResetAppliance = () => {
    if (window.confirm('Reset Appliance Repair & Services list to original defaults?')) {
      setApplianceServicesList(DEFAULT_APPLIANCE_SERVICES);
      localStorage.setItem('custom_appliance_services', JSON.stringify(DEFAULT_APPLIANCE_SERVICES));
      showToast('Restored appliance services defaults.');
    }
  };

  // --- Stories Handlers ---
  const handleStoryFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setStoryForm(prev => ({ ...prev, image: reader.result }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleOpenAddStory = () => {
    setIsEditingStory(false);
    setStoryForm({
      title: '',
      image: ''
    });
    setStorySlides([
      { id: Date.now() + 1, image: '', caption: '', subCaption: '' }
    ]);
    setShowStoryModal(true);
  };

  const handleOpenEditStory = (index) => {
    setIsEditingStory(true);
    setEditStoryIndex(index);
    const story = storiesList[index];
    setStoryForm({
      title: story.title || '',
      image: story.image || ''
    });
    
    const slides = (story.slides || []).map((slide) => ({
      id: slide.id || Math.random() + Math.random(),
      image: slide.image || '',
      caption: slide.caption || '',
      subCaption: slide.subCaption || ''
    }));
    setStorySlides(slides);
    
    setShowStoryModal(true);
  };

  const handleDeleteStory = (index) => {
    const title = storiesList[index].title;
    if (window.confirm(`Are you sure you want to delete story "${title}"?`)) {
      const updated = storiesList.filter((_, i) => i !== index);
      setStoriesList(updated);
      localStorage.setItem('custom_stories', JSON.stringify(updated));
      showToast('Story deleted successfully.');
    }
  };

  const handleSaveStory = (e) => {
    e.preventDefault();
    if (!storyForm.title.trim()) return;

    const parsedSlides = storySlides.map((slide, idx) => ({
      id: idx + 1,
      image: slide.image || storyForm.image,
      caption: slide.caption || storyForm.title,
      subCaption: slide.subCaption || ''
    }));

    let updated = [...storiesList];
    const newStory = {
      id: isEditingStory ? storiesList[editStoryIndex].id : Date.now(),
      title: storyForm.title,
      image: storyForm.image || parsedSlides[0]?.image || '',
      slides: parsedSlides
    };

    if (isEditingStory) {
      updated[editStoryIndex] = newStory;
    } else {
      updated.push(newStory);
    }

    setStoriesList(updated);
    localStorage.setItem('custom_stories', JSON.stringify(updated));
    setShowStoryModal(false);
    showToast('Story saved successfully!');
  };

  const handleResetStories = () => {
    if (window.confirm('Reset Stories list to original defaults?')) {
      setStoriesList(DEFAULT_STORIES);
      localStorage.setItem('custom_stories', JSON.stringify(DEFAULT_STORIES));
      showToast('Restored stories defaults.');
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex relative">
      <Sidebar />

      <div className="flex-1 ml-64 min-h-screen flex flex-col">
        <Topbar title="Customer App Customization" />

        <div className="p-6 space-y-6 flex-1">
          {successMessage && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-xl flex items-center gap-2 shadow-xs text-sm">
              <Sparkles size={16} />
              <span>{successMessage}</span>
            </div>
          )}



          {/* ---------------- SUBSECTION 1: CATEGORY CUSTOMIZATION ---------------- */}
          {activeSubSection === 'categories' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-[#E2E8F0] shadow-xs">
                <div>
                  <h2 className="text-sm font-bold text-[#1E293B]">Dashboard Categories</h2>
                  <p className="text-xs text-slate-500 mt-1">Manage the top category bar icons that are displayed on the user dashboard.</p>
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={handleResetCategories}
                    className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
                  >
                    <RotateCcw size={14} /> Reset Defaults
                  </button>
                  <button 
                    onClick={handleOpenAddCategory}
                    className="bg-[#0D47A1] hover:bg-blue-800 text-white px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs"
                  >
                    <Plus size={14} /> Add Category
                  </button>
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs overflow-hidden">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 text-[#64748B] font-semibold border-b border-[#E2E8F0]">
                      <th className="px-6 py-4">Position</th>
                      <th className="px-6 py-4">Category Name</th>
                      <th className="px-6 py-4">Icon Preview</th>
                      <th className="px-6 py-4">Action Target / Route</th>
                      <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E2E8F0]">
                    {categories.map((cat, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4 font-bold text-slate-500">{idx + 1}</td>
                        <td className="px-6 py-4 font-bold text-[#1E293B]">{cat.name}</td>
                        <td className="px-6 py-4">
                          {cat.icon && cat.icon.startsWith('data:image/') ? (
                            <img src={cat.icon} alt={cat.name} className="w-8 h-8 object-contain border border-slate-200 rounded-md p-0.5 bg-slate-50" />
                          ) : (
                            <span className="bg-blue-50 text-[#0D47A1] px-2 py-1 rounded-md font-semibold text-[10px]">
                              {cat.icon || 'ac'}
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-[#64748B] font-medium">
                          {cat.isForYou ? 'For You Feed' : cat.isMore ? 'More Category Page' : cat.isFridge ? 'Refrigerator Booking' : cat.service ? `Service Details: ${cat.service}` : `Booking: /book/${cat.name}`}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex gap-2 justify-end">
                            <button 
                              onClick={() => handleOpenEditCategory(idx)}
                              className="p-1.5 text-slate-500 hover:text-[#0D47A1] hover:bg-slate-100 rounded-lg transition-colors"
                            >
                              <Edit2 size={14} />
                            </button>
                            <button 
                              onClick={() => handleDeleteCategory(idx)}
                              className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ---------------- SUBSECTION 4: BRANDS & OFFERS CUSTOMIZATION ---------------- */}
          {activeSubSection === 'brands' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-[#E2E8F0] shadow-xs">
                <div>
                  <h2 className="text-sm font-bold text-[#1E293B]">Brands & Offers Customization</h2>
                  <p className="text-xs text-slate-500 mt-1">Manage the brand promotion cards and offers shown in the carousel on the user dashboard.</p>
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={handleResetBrands}
                    className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
                  >
                    <RotateCcw size={14} /> Reset Defaults
                  </button>
                  <button 
                    onClick={handleOpenAddBrand}
                    className="bg-[#0D47A1] hover:bg-blue-800 text-white px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs"
                  >
                    <Plus size={14} /> Add Brand/Offer Card
                  </button>
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs overflow-hidden">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 text-[#64748B] font-semibold border-b border-[#E2E8F0]">
                      <th className="px-6 py-4">Position</th>
                      <th className="px-6 py-4">Brand name</th>
                      <th className="px-6 py-4">Offer Title</th>
                      <th className="px-6 py-4">Image Preview</th>
                      <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E2E8F0]">
                    {brandCards.map((bc, idx) => (
                      <tr key={bc.id || idx} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4 font-bold text-slate-500">{idx + 1}</td>
                        <td className="px-6 py-4 font-bold text-[#1E293B]">{bc.brandName}</td>
                        <td className="px-6 py-4 font-medium text-slate-600">{bc.title}</td>
                        <td className="px-6 py-4">
                          {bc.image && (
                            <img src={bc.image} alt={bc.brandName} className="w-10 h-10 object-contain border border-slate-200 rounded-lg p-0.5 bg-slate-50" />
                          )}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex gap-2 justify-end">
                            <button 
                              onClick={() => handleOpenEditBrand(idx)}
                              className="p-1.5 text-slate-500 hover:text-[#0D47A1] hover:bg-slate-100 rounded-lg transition-colors"
                            >
                              <Edit2 size={14} />
                            </button>
                            <button 
                              onClick={() => handleDeleteBrand(idx)}
                              className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ---------------- SUBSECTION 5: MOST BOOKED SERVICES CUSTOMIZATION ---------------- */}
          {activeSubSection === 'mostbooked' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-[#E2E8F0] shadow-xs">
                <div>
                  <h2 className="text-sm font-bold text-[#1E293B]">Most Booked Services Customization</h2>
                  <p className="text-xs text-slate-500 mt-1">Manage the services displayed under the 'Most Booked Services' section of the dashboard.</p>
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={handleResetMostBooked}
                    className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
                  >
                    <RotateCcw size={14} /> Reset Defaults
                  </button>
                  <button 
                    onClick={handleOpenAddMostBooked}
                    className="bg-[#0D47A1] hover:bg-blue-800 text-white px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs"
                  >
                    <Plus size={14} /> Add Service Card
                  </button>
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs overflow-hidden">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 text-[#64748B] font-semibold border-b border-[#E2E8F0]">
                      <th className="px-6 py-4">Position</th>
                      <th className="px-6 py-4">Service Title</th>
                      <th className="px-6 py-4">Badge</th>
                      <th className="px-6 py-4">Start Price</th>
                      <th className="px-6 py-4">Image Preview</th>
                      <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E2E8F0]">
                    {mostBookedList.map((mb, idx) => (
                      <tr key={mb.id || idx} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4 font-bold text-slate-500">{idx + 1}</td>
                        <td className="px-6 py-4 font-bold text-[#1E293B]">{mb.title}</td>
                        <td className="px-6 py-4"><span className="bg-[#E3F2FD] text-[#0D47A1] px-2 py-0.5 rounded-full font-bold text-[10px]">{mb.badge || 'Instant'}</span></td>
                        <td className="px-6 py-4 font-bold text-slate-800">₹{mb.price}</td>
                        <td className="px-6 py-4">
                          {mb.image && (
                            <img src={mb.image} alt={mb.title} className="w-10 h-10 object-cover border border-slate-200 rounded-lg p-0.5 bg-slate-50" />
                          )}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex gap-2 justify-end">
                            <button 
                              onClick={() => handleOpenEditMostBooked(idx)}
                              className="p-1.5 text-slate-500 hover:text-[#0D47A1] hover:bg-slate-100 rounded-lg transition-colors"
                            >
                              <Edit2 size={14} />
                            </button>
                            <button 
                              onClick={() => handleDeleteMostBooked(idx)}
                              className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ---------------- SUBSECTION 6: APPLIANCE REPAIR & SERVICE CUSTOMIZATION ---------------- */}
          {activeSubSection === 'applianceservices' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-[#E2E8F0] shadow-xs">
                <div>
                  <h2 className="text-sm font-bold text-[#1E293B]">Appliance Repair & Service Customization</h2>
                  <p className="text-xs text-slate-500 mt-1">Manage the services displayed under the 'Appliance Repair & Service' section of the dashboard.</p>
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={handleResetAppliance}
                    className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
                  >
                    <RotateCcw size={14} /> Reset Defaults
                  </button>
                  <button 
                    onClick={handleOpenAddAppliance}
                    className="bg-[#0D47A1] hover:bg-blue-800 text-white px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs"
                  >
                    <Plus size={14} /> Add Appliance Card
                  </button>
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs overflow-hidden">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 text-[#64748B] font-semibold border-b border-[#E2E8F0]">
                      <th className="px-6 py-4">Position</th>
                      <th className="px-6 py-4">Appliance Title</th>
                      <th className="px-6 py-4">Badge</th>
                      <th className="px-6 py-4">Start Price</th>
                      <th className="px-6 py-4">Action Path</th>
                      <th className="px-6 py-4">Image Preview</th>
                      <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E2E8F0]">
                    {applianceServicesList.map((app, idx) => (
                      <tr key={app.id || idx} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4 font-bold text-slate-500">{idx + 1}</td>
                        <td className="px-6 py-4 font-bold text-[#1E293B]">{app.title}</td>
                        <td className="px-6 py-4"><span className="bg-[#E3F2FD] text-[#0D47A1] px-2 py-0.5 rounded-full font-bold text-[10px]">{app.badge || 'Instant'}</span></td>
                        <td className="px-6 py-4 font-bold text-slate-800">₹{app.price}</td>
                        <td className="px-6 py-4 font-medium text-slate-500">{app.path}</td>
                        <td className="px-6 py-4">
                          {app.image && (
                            <img src={app.image} alt={app.title} className="w-10 h-10 object-cover border border-slate-200 rounded-lg p-0.5 bg-slate-50" />
                          )}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex gap-2 justify-end">
                            <button 
                              onClick={() => handleOpenEditAppliance(idx)}
                              className="p-1.5 text-slate-500 hover:text-[#0D47A1] hover:bg-slate-100 rounded-lg transition-colors"
                            >
                              <Edit2 size={14} />
                            </button>
                            <button 
                              onClick={() => handleDeleteAppliance(idx)}
                              className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ---------------- SUBSECTION 7: STORIES CUSTOMIZATION ---------------- */}
          {activeSubSection === 'stories' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-[#E2E8F0] shadow-xs">
                <div>
                  <h2 className="text-sm font-bold text-[#1E293B]">Stories Customization</h2>
                  <p className="text-xs text-slate-500 mt-1">Manage the Instagram-style story cards and sub-slides shown on the user dashboard.</p>
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={handleResetStories}
                    className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
                  >
                    <RotateCcw size={14} /> Reset Defaults
                  </button>
                  <button 
                    onClick={handleOpenAddStory}
                    className="bg-[#0D47A1] hover:bg-blue-800 text-white px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs"
                  >
                    <Plus size={14} /> Add Story Card
                  </button>
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs overflow-hidden">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 text-[#64748B] font-semibold border-b border-[#E2E8F0]">
                      <th className="px-6 py-4">Position</th>
                      <th className="px-6 py-4">Story Cover Title</th>
                      <th className="px-6 py-4">Total Slides</th>
                      <th className="px-6 py-4">Cover Image Preview</th>
                      <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E2E8F0]">
                    {storiesList.map((story, idx) => (
                      <tr key={story.id || idx} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4 font-bold text-slate-500">{idx + 1}</td>
                        <td className="px-6 py-4 font-bold text-[#1E293B]">{story.title}</td>
                        <td className="px-6 py-4 font-bold text-slate-600">🎥 {story.slides?.length || 0} Slides</td>
                        <td className="px-6 py-4">
                          {story.image && (
                            <img src={story.image} alt={story.title} className="w-10 h-10 object-cover border border-slate-200 rounded-lg p-0.5 bg-slate-50" />
                          )}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex gap-2 justify-end">
                            <button 
                              onClick={() => handleOpenEditStory(idx)}
                              className="p-1.5 text-slate-500 hover:text-[#0D47A1] hover:bg-slate-100 rounded-lg transition-colors"
                            >
                              <Edit2 size={14} />
                            </button>
                            <button 
                              onClick={() => handleDeleteStory(idx)}
                              className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ---------------- SUBSECTION 2: BANNER CUSTOMIZATION ---------------- */}
          {activeSubSection === 'banners' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-[#E2E8F0] shadow-xs">
                <div>
                  <h2 className="text-sm font-bold text-[#1E293B]">Dashboard sliding Banners</h2>
                  <p className="text-xs text-slate-500 mt-1">Manage the sliding offer banners displayed right under the category bar on the user dashboard.</p>
                </div>
                <button 
                  onClick={handleResetBanners}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
                >
                  <RotateCcw size={14} /> Reset Current Defaults
                </button>
              </div>

              {/* Sub-toggle for regular vs warranty banners */}
              <div className="flex gap-2 bg-slate-100 p-1 rounded-xl self-start w-fit">
                <button
                  onClick={() => setBannerType('non-warranty')}
                  className={`px-4 py-1.5 text-[10.5px] font-bold rounded-lg transition-all ${
                    bannerType === 'non-warranty' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Regular Banners (Non-Warranty)
                </button>
                <button
                  onClick={() => setBannerType('warranty')}
                  className={`px-4 py-1.5 text-[10.5px] font-bold rounded-lg transition-all ${
                    bannerType === 'warranty' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Partner brand Banners (In-Warranty)
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                {/* Upload form */}
                <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5 shadow-xs flex flex-col gap-4">
                  <h3 className="text-xs font-bold text-[#1E293B] uppercase tracking-wider flex items-center gap-1.5">
                    <Image size={15} className="text-[#0D47A1]" />
                    <span>Upload New Banner</span>
                  </h3>

                  <form onSubmit={handleAddBanner} className="space-y-4">
                    <div>
                      <label className="text-xs font-semibold text-[#64748B] mb-1 block">Banner Title</label>
                      <input
                        type="text"
                        value={newBannerTitle}
                        onChange={(e) => setNewBannerTitle(e.target.value)}
                        placeholder="e.g. Festive discount offer"
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs outline-none focus:border-[#0D47A1] transition-all"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-[#64748B] mb-1 block">Choose Image *</label>
                      <div className="border-2 border-dashed border-slate-200 rounded-lg p-3 bg-slate-50 flex flex-col items-center text-center gap-2">
                        <input 
                          id="banner-file-input-sub"
                          type="file" 
                          accept="image/*"
                          onChange={handleBannerFileChange}
                          className="hidden"
                          required
                        />
                        <label 
                          htmlFor="banner-file-input-sub"
                          className="bg-white border border-slate-200 px-3.5 py-1.5 rounded-lg text-[10px] font-bold text-[#0D47A1] cursor-pointer hover:bg-slate-50 transition-colors shadow-2xs"
                        >
                          Browse Image
                        </label>
                        <span className="text-[9px] text-slate-400 font-medium">Supports PNG, JPG, JPEG</span>
                      </div>
                    </div>

                    {newBannerFile && (
                      <div>
                        <span className="text-[10px] font-semibold text-[#64748B] mb-1 block">Selected Preview:</span>
                        <img 
                          src={newBannerFile} 
                          alt="Preview" 
                          className="w-full h-24 object-cover border border-slate-200 rounded-xl"
                        />
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={!newBannerFile}
                      className="w-full bg-[#0D47A1] hover:bg-blue-800 text-white font-semibold py-2.5 rounded-lg text-xs transition-all shadow-sm cursor-pointer disabled:opacity-50"
                    >
                      Publish Banner
                    </button>
                  </form>
                </div>

                {/* Banners List */}
                <div className="lg:col-span-2 space-y-4">
                  <h3 className="text-xs font-bold text-[#1E293B] uppercase tracking-wider">
                    Current Active Banners ({currentBanners.length})
                  </h3>

                  {currentBanners.length === 0 ? (
                    <div className="bg-white border border-[#E2E8F0] rounded-2xl p-8 text-center text-slate-400 font-medium text-xs">
                      No banners uploaded for this category tab yet. Upload one on the left panel!
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {currentBanners.map((banner, index) => (
                        <div 
                          key={banner.id} 
                          className="bg-white border border-[#E2E8F0] rounded-2xl overflow-hidden shadow-2xs flex flex-col group"
                        >
                          <div className="h-32 w-full relative">
                            <img 
                              src={banner.image} 
                              alt={banner.title} 
                              className="w-full h-full object-cover"
                            />
                            <div className="absolute top-2 left-2 bg-slate-900/60 text-white px-2 py-0.5 rounded-full text-[9px] font-bold">
                              Position {index + 1}
                            </div>
                          </div>
                          <div className="p-3.5 flex justify-between items-center bg-slate-50/50">
                            <div className="min-w-0 flex-1">
                              <span className="text-[10px] text-slate-400 font-bold block">Title</span>
                              <span className="text-xs font-bold text-slate-800 truncate block mt-0.5">{banner.title || 'Untitled Banner'}</span>
                            </div>
                            <button
                              onClick={() => handleDeleteBanner(banner.id)}
                              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors ml-2"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ---------------- SUBSECTION 3: SERVICES CUSTOMIZATION ---------------- */}
          {activeSubSection === 'services' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-[#E2E8F0] shadow-xs">
                <div>
                  <h2 className="text-sm font-bold text-[#1E293B]">Dashboard Services Listing</h2>
                  <p className="text-xs text-slate-500 mt-1">Manage the list of services shown under the 'Our Services' header on the user dashboard.</p>
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={handleResetServices}
                    className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
                  >
                    <RotateCcw size={14} /> Reset Defaults
                  </button>
                  <button 
                    onClick={handleOpenAddService}
                    className="bg-[#0D47A1] hover:bg-blue-800 text-white px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs"
                  >
                    <Plus size={14} /> Add Service
                  </button>
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs overflow-hidden">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 text-[#64748B] font-semibold border-b border-[#E2E8F0]">
                      <th className="px-6 py-4">Position</th>
                      <th className="px-6 py-4">Service Name</th>
                      <th className="px-6 py-4">Image Preview</th>
                      <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E2E8F0]">
                    {services.map((srv, idx) => (
                      <tr key={srv.id || idx} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4 font-bold text-slate-500">{idx + 1}</td>
                        <td className="px-6 py-4 font-bold text-[#1E293B]">{srv.name}</td>
                        <td className="px-6 py-4">
                          {srv.img && (
                            <img src={srv.img} alt={srv.name} className="w-10 h-10 object-contain border border-slate-200 rounded-lg p-0.5 bg-slate-50" />
                          )}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex gap-2 justify-end">
                            <button 
                              onClick={() => handleOpenEditService(idx)}
                              className="p-1.5 text-slate-500 hover:text-[#0D47A1] hover:bg-slate-100 rounded-lg transition-colors"
                            >
                              <Edit2 size={14} />
                            </button>
                            <button 
                              onClick={() => handleDeleteService(idx)}
                              className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* Edit/Add Service Modal Overlay */}
      {showServiceModal && (
        <div className="fixed inset-0 bg-[#052355]/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg p-6 shadow-2xl border border-slate-100 flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-200 max-h-[90vh]">
            <div className="flex justify-between items-center flex-shrink-0">
              <h3 className="text-base font-bold text-[#1E293B]">{isEditingService ? 'Edit Service & Details Page' : 'Add New Service & Details Page'}</h3>
              <button onClick={() => setShowServiceModal(false)} className="text-slate-400 hover:text-slate-600 font-bold">✕</button>
            </div>
            
            <form onSubmit={handleSaveService} className="space-y-4 overflow-y-auto pr-1 flex-1 max-h-[75vh] no-scrollbar">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-150 space-y-3">
                <span className="text-[10px] font-bold text-[#0D47A1] uppercase tracking-wider block">1. Dashboard Listing Details</span>
                <div>
                  <label className="text-xs font-semibold text-[#64748B] mb-1 block">Service Name *</label>
                  <input 
                    type="text" 
                    value={serviceForm.name}
                    onChange={(e) => setServiceForm({ ...serviceForm, name: e.target.value })}
                    placeholder="e.g. Chimney Cleaning"
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs outline-none focus:border-[#0D47A1] transition-all"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-[#64748B] mb-1 block">Dashboard Grid Image *</label>
                  <div className="flex items-center gap-3 bg-white border border-dashed border-slate-200 rounded-lg p-2">
                    <input 
                      type="file" 
                      accept="image/*"
                      onChange={handleServiceFileChange}
                      className="w-full text-xs text-slate-500 file:mr-3 file:py-1 file:px-2.5 file:rounded-md file:border-0 file:text-[10px] file:font-semibold file:bg-blue-50 file:text-[#0D47A1] hover:file:bg-blue-100 cursor-pointer"
                      required={!isEditingService}
                    />
                    {serviceForm.img && (
                      <img src={serviceForm.img} alt="Preview" className="w-10 h-10 object-contain border border-slate-200 rounded-md p-0.5 bg-white flex-shrink-0" />
                    )}
                  </div>
                </div>
              </div>

              <div className="bg-blue-50/50 p-3 rounded-xl border border-blue-100 space-y-3">
                <span className="text-[10px] font-bold text-[#0D47A1] uppercase tracking-wider block">2. Details Page Hero Header</span>
                
                <div>
                  <label className="text-xs font-semibold text-[#64748B] mb-1 block">Hero Tagline</label>
                  <input 
                    type="text" 
                    value={serviceForm.tagline}
                    onChange={(e) => setServiceForm({ ...serviceForm, tagline: e.target.value })}
                    placeholder="e.g. Cool Again Today"
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs outline-none focus:border-[#0D47A1] transition-all"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-[#64748B] mb-1 block">Hero Subtitle</label>
                  <input 
                    type="text" 
                    value={serviceForm.subtitle}
                    onChange={(e) => setServiceForm({ ...serviceForm, subtitle: e.target.value })}
                    placeholder="e.g. Certified AC Technicians For All Brands"
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs outline-none focus:border-[#0D47A1] transition-all"
                  />
                </div>

              </div>

              <div className="bg-slate-50 p-3 rounded-xl border border-slate-150 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-bold text-[#0D47A1] uppercase tracking-wider">3. Device Types / Options (Optional)</span>
                  <button
                    type="button"
                    onClick={() => setServiceTypes([...serviceTypes, ''])}
                    className="bg-white border border-slate-200 text-[#0D47A1] px-2.5 py-1 rounded-md text-[10px] font-extrabold shadow-2xs hover:bg-slate-50 transition-all"
                  >
                    + Add Type
                  </button>
                </div>
                <span className="text-[9px] text-slate-400 font-medium block">Add options if this device has selection types (e.g. Split AC, Window AC). Otherwise leave empty.</span>
                
                {serviceTypes.length > 0 ? (
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {serviceTypes.map((type, idx) => (
                      <div key={idx} className="flex gap-2 items-center">
                        <input
                          type="text"
                          value={type}
                          onChange={(e) => setServiceTypes(serviceTypes.map((t, tIdx) => tIdx === idx ? e.target.value : t))}
                          placeholder="e.g. Split AC"
                          className="flex-1 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs outline-none focus:border-[#0D47A1] transition-all"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setServiceTypes(serviceTypes.filter((_, tIdx) => tIdx !== idx))}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-[10px] text-slate-400 italic bg-white border border-slate-100 rounded-lg p-2 text-center">
                    No custom types defined (field is optional).
                  </div>
                )}
              </div>

              <div className="bg-blue-50/50 p-3 rounded-xl border border-blue-100 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-bold text-[#0D47A1] uppercase tracking-wider font-sans">4. Services & Packages List *</span>
                  <button
                    type="button"
                    onClick={() => setServicePackages([...servicePackages, { id: Date.now() + Math.random(), section: 'General Repair', name: '', price: '', bullets: '' }])}
                    className="bg-white border border-blue-200 text-[#0D47A1] px-2.5 py-1 rounded-md text-[10px] font-extrabold shadow-2xs hover:bg-slate-50 transition-all"
                  >
                    + Add Package
                  </button>
                </div>
                <span className="text-[9px] text-slate-400 font-medium block">Add pricing packages. Bullets should be comma-separated.</span>
                
                {servicePackages.length > 0 ? (
                  <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                    {servicePackages.map((pkg, idx) => (
                      <div key={pkg.id || idx} className="bg-white border border-slate-200 rounded-xl p-3 space-y-2.5 relative group shadow-2xs">
                        <button
                          type="button"
                          onClick={() => setServicePackages(servicePackages.filter(p => p.id !== pkg.id))}
                          className="absolute top-2 right-2 p-1 text-slate-400 hover:text-red-600 rounded-lg transition-colors"
                        >
                          <Trash2 size={13} />
                        </button>
                        
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-[9px] font-bold text-slate-400 block mb-0.5">Section Name *</label>
                            <input
                              type="text"
                              value={pkg.section}
                              onChange={(e) => setServicePackages(servicePackages.map(p => p.id === pkg.id ? { ...p, section: e.target.value } : p))}
                              placeholder="e.g. Installation Services"
                              className="w-full px-2 py-1 bg-slate-50 border border-slate-200 rounded-md text-xs outline-none focus:border-[#0D47A1] transition-all"
                              required
                            />
                          </div>
                          <div>
                            <label className="text-[9px] font-bold text-slate-400 block mb-0.5">Package/Service Name *</label>
                            <input
                              type="text"
                              value={pkg.name}
                              onChange={(e) => setServicePackages(servicePackages.map(p => p.id === pkg.id ? { ...p, name: e.target.value } : p))}
                              placeholder="e.g. Split AC Installation"
                              className="w-full px-2 py-1 bg-slate-50 border border-slate-200 rounded-md text-xs outline-none focus:border-[#0D47A1] transition-all"
                              required
                            />
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-3 gap-2">
                          <div>
                            <label className="text-[9px] font-bold text-slate-400 block mb-0.5">Price (₹) *</label>
                            <input
                              type="text"
                              value={pkg.price}
                              onChange={(e) => setServicePackages(servicePackages.map(p => p.id === pkg.id ? { ...p, price: e.target.value } : p))}
                              placeholder="e.g. 299"
                              className="w-full px-2 py-1 bg-slate-50 border border-slate-200 rounded-md text-xs outline-none focus:border-[#0D47A1] transition-all"
                              required
                            />
                          </div>
                          <div>
                            <label className="text-[9px] font-bold text-slate-400 block mb-0.5">Price Unit *</label>
                            <input
                              type="text"
                              value={pkg.unit || 'per unit'}
                              onChange={(e) => setServicePackages(servicePackages.map(p => p.id === pkg.id ? { ...p, unit: e.target.value } : p))}
                              placeholder="e.g. per AC, per visit"
                              className="w-full px-2 py-1 bg-slate-50 border border-slate-200 rounded-md text-xs outline-none focus:border-[#0D47A1] transition-all"
                              required
                            />
                          </div>
                          <div>
                            <label className="text-[9px] font-bold text-slate-400 block mb-0.5">Upload Icon Image *</label>
                            <div className="flex items-center gap-1.5 bg-slate-50 border border-dashed border-slate-200 rounded-md p-1">
                              <input 
                                type="file" 
                                accept="image/*"
                                onChange={(e) => handlePackageIconChange(pkg.id, e)}
                                className="w-full text-[10px] text-slate-500 file:mr-2 file:py-0.5 file:px-1.5 file:rounded file:border-0 file:text-[9px] file:font-semibold file:bg-blue-50 file:text-[#0D47A1] hover:file:bg-blue-100 cursor-pointer"
                              />
                              {pkg.icon && (
                                <div className="w-6 h-6 flex-shrink-0 bg-white border border-slate-200 rounded-md flex items-center justify-center overflow-hidden">
                                  {pkg.icon.startsWith('data:image/') ? (
                                    <img src={pkg.icon} alt="" className="w-full h-full object-contain" />
                                  ) : (
                                    <span className="text-[11px]">{pkg.icon}</span>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-2">
                          <div className="col-span-1">
                            <label className="text-[9px] font-bold text-slate-400 block mb-0.5">Short Description</label>
                            <input
                              type="text"
                              value={pkg.desc || ''}
                              onChange={(e) => setServicePackages(servicePackages.map(p => p.id === pkg.id ? { ...p, desc: e.target.value } : p))}
                              placeholder="e.g. New AC fitting & setup"
                              className="w-full px-2 py-1 bg-slate-50 border border-slate-200 rounded-md text-xs outline-none focus:border-[#0D47A1] transition-all"
                            />
                          </div>
                          <div className="col-span-2">
                            <label className="text-[9px] font-bold text-slate-400 block mb-0.5">Description Bullets (Comma-separated)</label>
                            <input
                              type="text"
                              value={pkg.bullets}
                              onChange={(e) => setServicePackages(servicePackages.map(p => p.id === pkg.id ? { ...p, bullets: e.target.value } : p))}
                              placeholder="e.g. 30 days warranty, gas leak check"
                              className="w-full px-2 py-1 bg-slate-50 border border-slate-200 rounded-md text-xs outline-none focus:border-[#0D47A1] transition-all"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-[10px] text-red-500 italic bg-red-50 border border-red-100 rounded-lg p-3 text-center font-semibold">
                    Please add at least one service package.
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-2 bg-white sticky bottom-0 z-10">
                <button 
                  type="button"
                  onClick={() => setShowServiceModal(false)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-2.5 rounded-lg text-xs transition-all"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={servicePackages.length === 0}
                  className="flex-1 bg-[#0D47A1] hover:bg-blue-800 text-white font-semibold py-2.5 rounded-lg text-xs transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Save Service Details
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit/Add Category Modal Overlay */}
      {showAddModal && (
        <div className="fixed inset-0 bg-[#052355]/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg p-6 shadow-2xl border border-slate-100 flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-200 max-h-[90vh]">
            <div className="flex justify-between items-center flex-shrink-0">
              <h3 className="text-base font-bold text-[#1E293B]">{isEditing ? 'Edit Category & Booking Flow' : 'Add New Category & Booking Flow'}</h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600 font-bold">✕</button>
            </div>
            
            <form onSubmit={handleSaveCategory} className="space-y-4 overflow-y-auto pr-1 flex-1 max-h-[75vh] no-scrollbar">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-150 space-y-3">
                <span className="text-[10px] font-bold text-[#0D47A1] uppercase tracking-wider block">1. Dashboard Category Details</span>
                <div>
                  <label className="text-xs font-semibold text-[#64748B] mb-1 block">Category Name *</label>
                  <input 
                    type="text" 
                    value={categoryForm.name}
                    onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                    placeholder="e.g. Microwave, Chimney"
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs outline-none focus:border-[#0D47A1] transition-all"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-[#64748B] mb-2 block">Icon Type *</label>
                  <div className="flex gap-4 mb-2">
                    <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 cursor-pointer">
                      <input 
                        type="radio" 
                        name="iconSource" 
                        checked={!categoryForm.icon.startsWith('data:image/')} 
                        onChange={() => setCategoryForm(prev => ({ ...prev, icon: 'ac' }))}
                      />
                      <span>Preset Icon</span>
                    </label>
                    <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 cursor-pointer">
                      <input 
                        type="radio" 
                        name="iconSource" 
                        checked={categoryForm.icon.startsWith('data:image/')} 
                        onChange={() => setCategoryForm(prev => ({ ...prev, icon: '' }))}
                      />
                      <span>Upload Custom Image</span>
                    </label>
                  </div>

                  {!categoryForm.icon.startsWith('data:image/') ? (
                    <select
                      value={categoryForm.icon}
                      onChange={(e) => setCategoryForm({ ...categoryForm, icon: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs outline-none focus:border-[#0D47A1] bg-white transition-all"
                    >
                      {AVAILABLE_ICONS.map((ico) => (
                        <option key={ico.id} value={ico.id}>{ico.label}</option>
                      ))}
                    </select>
                  ) : (
                    <div className="flex items-center gap-3 bg-white border border-dashed border-slate-200 rounded-lg p-2">
                      <input 
                        type="file" 
                        accept="image/*"
                        onChange={handleCategoryFileChange}
                        className="w-full text-xs text-slate-500 file:mr-3 file:py-1 file:px-2.5 file:rounded-md file:border-0 file:text-[10px] file:font-semibold file:bg-blue-50 file:text-[#0D47A1] hover:file:bg-blue-100 cursor-pointer"
                      />
                      {categoryForm.icon && (
                        <img src={categoryForm.icon} alt="Preview" className="w-8 h-8 object-contain border border-slate-200 rounded-md p-0.5 bg-white flex-shrink-0" />
                      )}
                    </div>
                  )}
                </div>

                <div>
                  <label className="text-xs font-semibold text-[#64748B] mb-1 block">Service Name (Optional - For Direct Details Page)</label>
                  <input 
                    type="text" 
                    value={categoryForm.service}
                    onChange={(e) => setCategoryForm({ ...categoryForm, service: e.target.value })}
                    placeholder="e.g. Smart TV Service & Repair"
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs outline-none focus:border-[#0D47A1] transition-all"
                  />
                </div>

                <div className="space-y-2 border-t border-slate-200 pt-3">
                  <label className="text-xs font-semibold text-[#64748B] block mb-1">Configuration Flags</label>
                  <div className="flex flex-col gap-2">
                    <label className="flex items-center gap-2 text-xs text-slate-700 font-semibold cursor-pointer">
                      <input 
                        type="checkbox"
                        checked={categoryForm.isForYou}
                        onChange={(e) => setCategoryForm({ ...categoryForm, isForYou: e.target.checked })}
                      />
                      <span>Is "For You" Feed?</span>
                    </label>
                    <label className="flex items-center gap-2 text-xs text-slate-700 font-semibold cursor-pointer">
                      <input 
                        type="checkbox"
                        checked={categoryForm.isMore}
                        onChange={(e) => setCategoryForm({ ...categoryForm, isMore: e.target.checked })}
                      />
                      <span>Is "More" Category Link?</span>
                    </label>
                    <label className="flex items-center gap-2 text-xs text-slate-700 font-semibold cursor-pointer">
                      <input 
                        type="checkbox"
                        checked={categoryForm.isFridge}
                        onChange={(e) => setCategoryForm({ ...categoryForm, isFridge: e.target.checked })}
                      />
                      <span>Is Refrigerator specific?</span>
                    </label>
                  </div>
                </div>
              </div>

              <div className="bg-blue-50/50 p-3 rounded-xl border border-blue-100 space-y-3">
                <span className="text-[10px] font-bold text-[#0D47A1] uppercase tracking-wider block font-sans">2. Checkout Booking Flow Settings</span>
                
                <div>
                  <label className="text-xs font-semibold text-[#64748B] mb-1 block">Device Types (Optional - Comma separated)</label>
                  <input 
                    type="text" 
                    value={categoryForm.productTypes}
                    onChange={(e) => setCategoryForm({ ...categoryForm, productTypes: e.target.value })}
                    placeholder="e.g. Split AC, Window AC, Cassette AC (Leave empty if no type selection needed)"
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs outline-none focus:border-[#0D47A1] transition-all"
                  />
                  <span className="text-[9px] text-slate-400 font-medium block mt-0.5">Note: If left empty, step 1's product type selector grid will be hidden and optional.</span>
                </div>

                <div>
                  <label className="text-xs font-semibold text-[#64748B] mb-1 block">Booking Flow Services (JSON Array) *</label>
                  <textarea 
                    value={categoryForm.servicesJson}
                    onChange={(e) => setCategoryForm({ ...categoryForm, servicesJson: e.target.value })}
                    placeholder="Enter valid JSON array of services"
                    rows={5}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-mono outline-none focus:border-[#0D47A1] transition-all"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-[#64748B] mb-1 block">Supported Brands (Comma separated)</label>
                  <input 
                    type="text" 
                    value={categoryForm.brands}
                    onChange={(e) => setCategoryForm({ ...categoryForm, brands: e.target.value })}
                    placeholder="e.g. Voltas, LG, Samsung, Whirlpool"
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs outline-none focus:border-[#0D47A1] transition-all"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-[#64748B] mb-1 block">Category Note</label>
                  <input 
                    type="text" 
                    value={categoryForm.categoryNote}
                    onChange={(e) => setCategoryForm({ ...categoryForm, categoryNote: e.target.value })}
                    placeholder="e.g. Prices shown are indicative. The technician will confirm exact charges."
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs outline-none focus:border-[#0D47A1] transition-all"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-2 bg-white sticky bottom-0 z-10">
                <button 
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-2.5 rounded-lg text-xs transition-all"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="flex-1 bg-[#0D47A1] hover:bg-blue-800 text-white font-semibold py-2.5 rounded-lg text-xs transition-all shadow-sm"
                >
                  Save Category & Settings
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit/Add Brand Offer Modal Overlay */}
      {showBrandModal && (
        <div className="fixed inset-0 bg-[#052355]/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg p-6 shadow-2xl border border-slate-100 flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-200 max-h-[90vh]">
            <div className="flex justify-between items-center flex-shrink-0">
              <h3 className="text-base font-bold text-[#1E293B]">{isEditingBrand ? 'Edit Brand Offer Card' : 'Add New Brand Offer Card'}</h3>
              <button onClick={() => setShowBrandModal(false)} className="text-slate-400 hover:text-slate-600 font-bold">✕</button>
            </div>
            
            <form onSubmit={handleSaveBrand} className="space-y-4 overflow-y-auto pr-1 flex-1 max-h-[75vh] no-scrollbar">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-[#64748B] mb-1 block">Brand Name *</label>
                  <input 
                    type="text" 
                    value={brandForm.brandName}
                    onChange={(e) => setBrandForm({ ...brandForm, brandName: e.target.value })}
                    placeholder="e.g. LLOYD, SAMSUNG"
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs outline-none focus:border-[#0D47A1] transition-all"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-[#64748B] mb-1 block">Badge Text (Optional)</label>
                  <input 
                    type="text" 
                    value={brandForm.badgeText}
                    onChange={(e) => setBrandForm({ ...brandForm, badgeText: e.target.value })}
                    placeholder="e.g. Official Partner, New Launch"
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs outline-none focus:border-[#0D47A1] transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-[#64748B] mb-1 block">Tagline / Title *</label>
                <input 
                  type="text" 
                  value={brandForm.title}
                  onChange={(e) => setBrandForm({ ...brandForm, title: e.target.value })}
                  placeholder="e.g. New Launch Glacier Series AC"
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs outline-none focus:border-[#0D47A1] transition-all"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-[#64748B] mb-1 block">Subtitle *</label>
                <input 
                  type="text" 
                  value={brandForm.subtitle}
                  onChange={(e) => setBrandForm({ ...brandForm, subtitle: e.target.value })}
                  placeholder="e.g. Experience Superior Cooling & Comfort"
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs outline-none focus:border-[#0D47A1] transition-all"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-[#64748B] mb-1 block">Button Text *</label>
                  <input 
                    type="text" 
                    value={brandForm.buttonText}
                    onChange={(e) => setBrandForm({ ...brandForm, buttonText: e.target.value })}
                    placeholder="e.g. Explore on NCC, Visit Official Site"
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs outline-none focus:border-[#0D47A1] transition-all"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-[#64748B] mb-1 block">Action URL / Path *</label>
                  <input 
                    type="text" 
                    value={brandForm.actionUrl}
                    onChange={(e) => setBrandForm({ ...brandForm, actionUrl: e.target.value })}
                    placeholder="e.g. /service-details?service=AC%20Repair"
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs outline-none focus:border-[#0D47A1] transition-all"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-[#64748B] mb-1 block">Background Gradient Theme</label>
                  <select
                    value={brandForm.gradient}
                    onChange={(e) => {
                      const val = e.target.value;
                      let txt = '#0D47A1';
                      if (val.includes('E8F5E9')) txt = '#1B5E20';
                      if (val.includes('FCE4EC')) txt = '#C30F42';
                      setBrandForm({ ...brandForm, gradient: val, textColor: txt });
                    }}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs outline-none focus:border-[#0D47A1] bg-white transition-all"
                  >
                    <option value="from-[#E3F2FD] via-[#F4F9FF] to-[#D5E6FF]">Blue (Lloyd Style)</option>
                    <option value="from-[#E8F5E9] via-[#F6FAF6] to-[#D2E8D4]">Green (Samsung Style)</option>
                    <option value="from-[#F0F4FF] via-[#F7F9FF] to-[#E1E8FF]">Indigo (Daikin Style)</option>
                    <option value="from-[#FCE4EC] via-[#FFF1F3] to-[#F8BBD0]">Pink/Red (LG Style)</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-[#64748B] mb-1 block">Upload Appliance Image *</label>
                  <div className="flex items-center gap-3 bg-white border border-dashed border-slate-200 rounded-lg p-1.5">
                    <input 
                      type="file" 
                      accept="image/*"
                      onChange={handleBrandFileChange}
                      className="w-full text-xs text-slate-500 file:mr-2 file:py-1 file:px-2 file:rounded-md file:border-0 file:text-[9.5px] file:font-semibold file:bg-blue-50 file:text-[#0D47A1] hover:file:bg-blue-100 cursor-pointer"
                    />
                    {brandForm.image && (
                      <img src={brandForm.image} alt="Preview" className="w-10 h-8 object-contain border border-slate-200 rounded-md bg-white flex-shrink-0" />
                    )}
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-2 bg-white sticky bottom-0 z-10">
                <button 
                  type="button"
                  onClick={() => setShowBrandModal(false)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-2.5 rounded-lg text-xs transition-all"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="flex-1 bg-[#0D47A1] hover:bg-blue-800 text-white font-semibold py-2.5 rounded-lg text-xs transition-all shadow-sm"
                >
                  Save Brand Card
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit/Add Most Booked Modal Overlay */}
      {showMostBookedModal && (
        <div className="fixed inset-0 bg-[#052355]/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg p-6 shadow-2xl border border-slate-100 flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-200 max-h-[90vh]">
            <div className="flex justify-between items-center flex-shrink-0">
              <h3 className="text-base font-bold text-[#1E293B]">{isEditingMostBooked ? 'Edit Most Booked Service' : 'Add Most Booked Service'}</h3>
              <button onClick={() => setShowMostBookedModal(false)} className="text-slate-400 hover:text-slate-600 font-bold">✕</button>
            </div>
            
            <form onSubmit={handleSaveMostBooked} className="space-y-4 overflow-y-auto pr-1 flex-1 max-h-[75vh] no-scrollbar">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-150 space-y-3">
                <span className="text-[10px] font-bold text-[#0D47A1] uppercase tracking-wider block font-sans">1. Card View Customization</span>
                
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-[#64748B] mb-1 block">Service Title *</label>
                    <input 
                      type="text" 
                      value={mostBookedForm.title}
                      onChange={(e) => setMostBookedForm({ ...mostBookedForm, title: e.target.value })}
                      placeholder="e.g. Foam-jet AC service"
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs outline-none focus:border-[#0D47A1] transition-all"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-[#64748B] mb-1 block">Badge (e.g. Instant, 2 ACs)</label>
                    <input 
                      type="text" 
                      value={mostBookedForm.badge}
                      onChange={(e) => setMostBookedForm({ ...mostBookedForm, badge: e.target.value })}
                      placeholder="e.g. Instant"
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs outline-none focus:border-[#0D47A1] transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-[#64748B] mb-1 block">Start Price (₹) *</label>
                  <input 
                    type="text" 
                    value={mostBookedForm.price}
                    onChange={(e) => setMostBookedForm({ ...mostBookedForm, price: e.target.value })}
                    placeholder="e.g. 649"
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs outline-none focus:border-[#0D47A1] transition-all"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-[#64748B] mb-1 block">Upload Card Image *</label>
                  <div className="flex items-center gap-3 bg-white border border-dashed border-slate-200 rounded-lg p-1.5">
                    <input 
                      type="file" 
                      accept="image/*"
                      onChange={handleMostBookedFileChange}
                      className="w-full text-xs text-slate-500 file:mr-2 file:py-1 file:px-2 file:rounded-md file:border-0 file:text-[9.5px] file:font-semibold file:bg-blue-50 file:text-[#0D47A1] hover:file:bg-blue-100 cursor-pointer"
                    />
                    {mostBookedForm.image && (
                      <img src={mostBookedForm.image} alt="Preview" className="w-10 h-8 object-cover border border-slate-200 rounded-md bg-white flex-shrink-0" />
                    )}
                  </div>
                </div>
              </div>

              <div className="bg-blue-50/50 p-3 rounded-xl border border-blue-100 space-y-3">
                <span className="text-[10px] font-bold text-[#0D47A1] uppercase tracking-wider block font-sans">2. Checkout Booking Flow Settings</span>
                
                <div>
                  <label className="text-xs font-semibold text-[#64748B] mb-1 block">Device Types (Optional - Comma separated)</label>
                  <input 
                    type="text" 
                    value={mostBookedTypes.join(', ')}
                    onChange={(e) => setMostBookedTypes(e.target.value.split(',').map(t => t.trim()).filter(Boolean))}
                    placeholder="e.g. Split AC, Window AC, Cassette AC"
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs outline-none focus:border-[#0D47A1] transition-all"
                  />
                  <p className="text-[10px] text-slate-400 mt-0.5">Leave blank if this device does not have sub-types (e.g. Full Home Cleaning).</p>
                </div>
              </div>

              <div className="bg-slate-50 p-3 rounded-xl border border-slate-150 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-bold text-[#0D47A1] uppercase tracking-wider">3. Services & Packages List *</span>
                  <button
                    type="button"
                    onClick={() => setMostBookedPackages([...mostBookedPackages, { id: Date.now(), section: 'General Services', name: '', price: '', bullets: '', icon: '🔧', desc: '', unit: 'per unit' }])}
                    className="bg-white hover:bg-slate-50 text-[#0D47A1] border border-slate-200 px-2.5 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-all"
                  >
                    + Add Package
                  </button>
                </div>

                {mostBookedPackages.length > 0 ? (
                  <div className="space-y-4 max-h-[30vh] overflow-y-auto pr-1">
                    {mostBookedPackages.map((pkg) => (
                      <div key={pkg.id} className="bg-white border border-slate-200 rounded-xl p-3 space-y-2.5 relative shadow-2xs">
                        <button
                          type="button"
                          onClick={() => setMostBookedPackages(mostBookedPackages.filter(p => p.id !== pkg.id))}
                          className="absolute top-2 right-2 p-1 text-slate-400 hover:text-red-600 rounded-lg transition-colors"
                        >
                          <Trash2 size={13} />
                        </button>
                        
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-[9px] font-bold text-slate-400 block mb-0.5">Section Name *</label>
                            <input
                              type="text"
                              value={pkg.section}
                              onChange={(e) => setMostBookedPackages(mostBookedPackages.map(p => p.id === pkg.id ? { ...p, section: e.target.value } : p))}
                              placeholder="e.g. Installation Services"
                              className="w-full px-2 py-1 bg-slate-50 border border-slate-200 rounded-md text-xs outline-none focus:border-[#0D47A1] transition-all"
                              required
                            />
                          </div>
                          <div>
                            <label className="text-[9px] font-bold text-slate-400 block mb-0.5">Package/Service Name *</label>
                            <input
                              type="text"
                              value={pkg.name}
                              onChange={(e) => setMostBookedPackages(mostBookedPackages.map(p => p.id === pkg.id ? { ...p, name: e.target.value } : p))}
                              placeholder="e.g. Split AC Installation"
                              className="w-full px-2 py-1 bg-slate-50 border border-slate-200 rounded-md text-xs outline-none focus:border-[#0D47A1] transition-all"
                              required
                            />
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-3 gap-2">
                          <div>
                            <label className="text-[9px] font-bold text-slate-400 block mb-0.5">Price (₹) *</label>
                            <input
                              type="text"
                              value={pkg.price}
                              onChange={(e) => setMostBookedPackages(mostBookedPackages.map(p => p.id === pkg.id ? { ...p, price: e.target.value } : p))}
                              placeholder="e.g. 299"
                              className="w-full px-2 py-1 bg-slate-50 border border-slate-200 rounded-md text-xs outline-none focus:border-[#0D47A1] transition-all"
                              required
                            />
                          </div>
                          <div>
                            <label className="text-[9px] font-bold text-slate-400 block mb-0.5">Price Unit *</label>
                            <input
                              type="text"
                              value={pkg.unit || 'per unit'}
                              onChange={(e) => setMostBookedPackages(mostBookedPackages.map(p => p.id === pkg.id ? { ...p, unit: e.target.value } : p))}
                              placeholder="e.g. per AC, per visit"
                              className="w-full px-2 py-1 bg-slate-50 border border-slate-200 rounded-md text-xs outline-none focus:border-[#0D47A1] transition-all"
                              required
                            />
                          </div>
                          <div>
                            <label className="text-[9px] font-bold text-slate-400 block mb-0.5">Upload Icon Image *</label>
                            <div className="flex items-center gap-1.5 bg-slate-50 border border-dashed border-slate-200 rounded-md p-1">
                              <input 
                                type="file" 
                                accept="image/*"
                                onChange={(e) => {
                                  const file = e.target.files[0];
                                  if (file) {
                                    const reader = new FileReader();
                                    reader.onloadend = () => {
                                      setMostBookedPackages(prev => prev.map(p => p.id === pkg.id ? { ...p, icon: reader.result } : p));
                                    };
                                    reader.readAsDataURL(file);
                                  }
                                }}
                                className="w-full text-[10px] text-slate-500 file:mr-2 file:py-0.5 file:px-1.5 file:rounded file:border-0 file:text-[9px] file:font-semibold file:bg-blue-50 file:text-[#0D47A1] hover:file:bg-blue-100 cursor-pointer"
                              />
                              {pkg.icon && (
                                <div className="w-6 h-6 flex-shrink-0 bg-white border border-slate-200 rounded-md flex items-center justify-center overflow-hidden">
                                  {pkg.icon.startsWith('data:image/') ? (
                                    <img src={pkg.icon} alt="" className="w-full h-full object-contain" />
                                  ) : (
                                    <span className="text-[11px]">{pkg.icon}</span>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-2">
                          <div className="col-span-1">
                            <label className="text-[9px] font-bold text-slate-400 block mb-0.5">Short Description</label>
                            <input
                              type="text"
                              value={pkg.desc || ''}
                              onChange={(e) => setMostBookedPackages(mostBookedPackages.map(p => p.id === pkg.id ? { ...p, desc: e.target.value } : p))}
                              placeholder="e.g. New AC fitting & setup"
                              className="w-full px-2 py-1 bg-slate-50 border border-slate-200 rounded-md text-xs outline-none focus:border-[#0D47A1] transition-all"
                            />
                          </div>
                          <div className="col-span-2">
                            <label className="text-[9px] font-bold text-slate-400 block mb-0.5">Description Bullets (Comma-separated)</label>
                            <input
                              type="text"
                              value={pkg.bullets}
                              onChange={(e) => setMostBookedPackages(mostBookedPackages.map(p => p.id === pkg.id ? { ...p, bullets: e.target.value } : p))}
                              placeholder="e.g. 30 days warranty, gas leak check"
                              className="w-full px-2 py-1 bg-slate-50 border border-slate-200 rounded-md text-xs outline-none focus:border-[#0D47A1] transition-all"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-[10px] text-red-500 italic bg-red-50 border border-red-100 rounded-lg p-3 text-center font-semibold">
                    Please add at least one service package.
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-2 bg-white sticky bottom-0 z-10">
                <button 
                  type="button"
                  onClick={() => setShowMostBookedModal(false)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-2.5 rounded-lg text-xs transition-all"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={mostBookedPackages.length === 0}
                  className="flex-1 bg-[#0D47A1] hover:bg-blue-800 text-white font-semibold py-2.5 rounded-lg text-xs transition-all shadow-sm disabled:opacity-50"
                >
                  Save Service Card
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit/Add Appliance Service Modal Overlay */}
      {showApplianceModal && (
        <div className="fixed inset-0 bg-[#052355]/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg p-6 shadow-2xl border border-slate-100 flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-200 max-h-[90vh]">
            <div className="flex justify-between items-center flex-shrink-0">
              <h3 className="text-base font-bold text-[#1E293B]">{isEditingAppliance ? 'Edit Appliance Service Card' : 'Add Appliance Service Card'}</h3>
              <button onClick={() => setShowApplianceModal(false)} className="text-slate-400 hover:text-slate-600 font-bold">✕</button>
            </div>
            
            <form onSubmit={handleSaveAppliance} className="space-y-4 overflow-y-auto pr-1 flex-1 max-h-[75vh] no-scrollbar">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-150 space-y-3">
                <span className="text-[10px] font-bold text-[#0D47A1] uppercase tracking-wider block font-sans">Card Details</span>
                
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-[#64748B] mb-1 block">Appliance Title *</label>
                    <input 
                      type="text" 
                      value={applianceForm.title}
                      onChange={(e) => setApplianceForm({ ...applianceForm, title: e.target.value })}
                      placeholder="e.g. Refrigerator Repair & Service"
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs outline-none focus:border-[#0D47A1] transition-all"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-[#64748B] mb-1 block">Badge (e.g. Instant, 2 ACs)</label>
                    <input 
                      type="text" 
                      value={applianceForm.badge}
                      onChange={(e) => setApplianceForm({ ...applianceForm, badge: e.target.value })}
                      placeholder="e.g. Instant"
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs outline-none focus:border-[#0D47A1] transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-[#64748B] mb-1 block">Start Price (₹) *</label>
                  <input 
                    type="text" 
                    value={applianceForm.price}
                    onChange={(e) => setApplianceForm({ ...applianceForm, price: e.target.value })}
                    placeholder="e.g. 499"
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs outline-none focus:border-[#0D47A1] transition-all"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-[#64748B] mb-1 block">Action Path / Category Link *</label>
                  <input 
                    type="text" 
                    value={applianceForm.path}
                    onChange={(e) => setApplianceForm({ ...applianceForm, path: e.target.value })}
                    placeholder="e.g. /refrigerator-details or /book/Refrigerator"
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs outline-none focus:border-[#0D47A1] transition-all"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-[#64748B] mb-1 block">Upload Card Image *</label>
                  <div className="flex items-center gap-3 bg-white border border-dashed border-slate-200 rounded-lg p-1.5">
                    <input 
                      type="file" 
                      accept="image/*"
                      onChange={handleApplianceFileChange}
                      className="w-full text-xs text-slate-500 file:mr-2 file:py-1 file:px-2 file:rounded-md file:border-0 file:text-[9.5px] file:font-semibold file:bg-blue-50 file:text-[#0D47A1] hover:file:bg-blue-100 cursor-pointer"
                    />
                    {applianceForm.image && (
                      <img src={applianceForm.image} alt="Preview" className="w-10 h-8 object-contain border border-slate-200 rounded-md bg-white flex-shrink-0" />
                    )}
                  </div>
                </div>
              </div>

              <div className="bg-blue-50/50 p-3 rounded-xl border border-blue-100 space-y-3">
                <span className="text-[10px] font-bold text-[#0D47A1] uppercase tracking-wider block font-sans">2. Checkout Booking Flow Settings</span>
                
                <div>
                  <label className="text-xs font-semibold text-[#64748B] mb-1 block">Device Types (Optional - Comma separated)</label>
                  <input 
                    type="text" 
                    value={applianceTypes.join(', ')}
                    onChange={(e) => setApplianceTypes(e.target.value.split(',').map(t => t.trim()).filter(Boolean))}
                    placeholder="e.g. Split AC, Window AC, Cassette AC"
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs outline-none focus:border-[#0D47A1] transition-all"
                  />
                  <p className="text-[10px] text-slate-400 mt-0.5">Leave blank if this device does not have sub-types (e.g. Full Home Cleaning).</p>
                </div>
              </div>

              <div className="bg-slate-50 p-3 rounded-xl border border-slate-150 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-bold text-[#0D47A1] uppercase tracking-wider">3. Services & Packages List *</span>
                  <button
                    type="button"
                    onClick={() => setAppliancePackages([...appliancePackages, { id: Date.now(), section: 'General Services', name: '', price: '', bullets: '', icon: '🔧', desc: '', unit: 'per unit' }])}
                    className="bg-white hover:bg-slate-50 text-[#0D47A1] border border-slate-200 px-2.5 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-all"
                  >
                    + Add Package
                  </button>
                </div>

                {appliancePackages.length > 0 ? (
                  <div className="space-y-4 max-h-[30vh] overflow-y-auto pr-1">
                    {appliancePackages.map((pkg) => (
                      <div key={pkg.id} className="bg-white border border-slate-200 rounded-xl p-3 space-y-2.5 relative shadow-2xs">
                        <button
                          type="button"
                          onClick={() => setAppliancePackages(appliancePackages.filter(p => p.id !== pkg.id))}
                          className="absolute top-2 right-2 p-1 text-slate-400 hover:text-red-600 rounded-lg transition-colors"
                        >
                          <Trash2 size={13} />
                        </button>
                        
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-[9px] font-bold text-slate-400 block mb-0.5">Section Name *</label>
                            <input
                              type="text"
                              value={pkg.section}
                              onChange={(e) => setAppliancePackages(appliancePackages.map(p => p.id === pkg.id ? { ...p, section: e.target.value } : p))}
                              placeholder="e.g. Installation Services"
                              className="w-full px-2 py-1 bg-slate-50 border border-slate-200 rounded-md text-xs outline-none focus:border-[#0D47A1] transition-all"
                              required
                            />
                          </div>
                          <div>
                            <label className="text-[9px] font-bold text-slate-400 block mb-0.5">Package/Service Name *</label>
                            <input
                              type="text"
                              value={pkg.name}
                              onChange={(e) => setAppliancePackages(appliancePackages.map(p => p.id === pkg.id ? { ...p, name: e.target.value } : p))}
                              placeholder="e.g. Split AC Installation"
                              className="w-full px-2 py-1 bg-slate-50 border border-slate-200 rounded-md text-xs outline-none focus:border-[#0D47A1] transition-all"
                              required
                            />
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-3 gap-2">
                          <div>
                            <label className="text-[9px] font-bold text-slate-400 block mb-0.5">Price (₹) *</label>
                            <input
                              type="text"
                              value={pkg.price}
                              onChange={(e) => setAppliancePackages(appliancePackages.map(p => p.id === pkg.id ? { ...p, price: e.target.value } : p))}
                              placeholder="e.g. 299"
                              className="w-full px-2 py-1 bg-slate-50 border border-slate-200 rounded-md text-xs outline-none focus:border-[#0D47A1] transition-all"
                              required
                            />
                          </div>
                          <div>
                            <label className="text-[9px] font-bold text-slate-400 block mb-0.5">Price Unit *</label>
                            <input
                              type="text"
                              value={pkg.unit || 'per unit'}
                              onChange={(e) => setAppliancePackages(appliancePackages.map(p => p.id === pkg.id ? { ...p, unit: e.target.value } : p))}
                              placeholder="e.g. per AC, per visit"
                              className="w-full px-2 py-1 bg-slate-50 border border-slate-200 rounded-md text-xs outline-none focus:border-[#0D47A1] transition-all"
                              required
                            />
                          </div>
                          <div>
                            <label className="text-[9px] font-bold text-slate-400 block mb-0.5">Upload Icon Image *</label>
                            <div className="flex items-center gap-1.5 bg-slate-50 border border-dashed border-slate-200 rounded-md p-1">
                              <input 
                                type="file" 
                                accept="image/*"
                                onChange={(e) => {
                                  const file = e.target.files[0];
                                  if (file) {
                                    const reader = new FileReader();
                                    reader.onloadend = () => {
                                      setAppliancePackages(prev => prev.map(p => p.id === pkg.id ? { ...p, icon: reader.result } : p));
                                    };
                                    reader.readAsDataURL(file);
                                  }
                                }}
                                className="w-full text-[10px] text-slate-500 file:mr-2 file:py-0.5 file:px-1.5 file:rounded file:border-0 file:text-[9px] file:font-semibold file:bg-blue-50 file:text-[#0D47A1] hover:file:bg-blue-100 cursor-pointer"
                              />
                              {pkg.icon && (
                                <div className="w-6 h-6 flex-shrink-0 bg-white border border-slate-200 rounded-md flex items-center justify-center overflow-hidden">
                                  {pkg.icon.startsWith('data:image/') ? (
                                    <img src={pkg.icon} alt="" className="w-full h-full object-contain" />
                                  ) : (
                                    <span className="text-[11px]">{pkg.icon}</span>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-2">
                          <div className="col-span-1">
                            <label className="text-[9px] font-bold text-slate-400 block mb-0.5">Short Description</label>
                            <input
                              type="text"
                              value={pkg.desc || ''}
                              onChange={(e) => setAppliancePackages(appliancePackages.map(p => p.id === pkg.id ? { ...p, desc: e.target.value } : p))}
                              placeholder="e.g. New AC fitting & setup"
                              className="w-full px-2 py-1 bg-slate-50 border border-slate-200 rounded-md text-xs outline-none focus:border-[#0D47A1] transition-all"
                            />
                          </div>
                          <div className="col-span-2">
                            <label className="text-[9px] font-bold text-slate-400 block mb-0.5">Description Bullets (Comma-separated)</label>
                            <input
                              type="text"
                              value={pkg.bullets}
                              onChange={(e) => setAppliancePackages(appliancePackages.map(p => p.id === pkg.id ? { ...p, bullets: e.target.value } : p))}
                              placeholder="e.g. 30 days warranty, gas leak check"
                              className="w-full px-2 py-1 bg-slate-50 border border-slate-200 rounded-md text-xs outline-none focus:border-[#0D47A1] transition-all"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-[10px] text-red-500 italic bg-red-50 border border-red-100 rounded-lg p-3 text-center font-semibold">
                    Please add at least one service package.
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-2 bg-white sticky bottom-0 z-10">
                <button 
                  type="button"
                  onClick={() => setShowApplianceModal(false)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-2.5 rounded-lg text-xs transition-all"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={appliancePackages.length === 0}
                  className="flex-1 bg-[#0D47A1] hover:bg-blue-800 text-white font-semibold py-2.5 rounded-lg text-xs transition-all shadow-sm disabled:opacity-50"
                >
                  Save Appliance Card
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Edit/Add Story Modal Overlay */}
      {showStoryModal && (
        <div className="fixed inset-0 bg-[#052355]/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg p-6 shadow-2xl border border-slate-100 flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-200 max-h-[90vh]">
            <div className="flex justify-between items-center flex-shrink-0">
              <h3 className="text-base font-bold text-[#1E293B]">{isEditingStory ? 'Edit Story Card' : 'Add Story Card'}</h3>
              <button onClick={() => setShowStoryModal(false)} className="text-slate-400 hover:text-slate-600 font-bold">✕</button>
            </div>
            
            <form onSubmit={handleSaveStory} className="space-y-4 overflow-y-auto pr-1 flex-1 max-h-[75vh] no-scrollbar">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-150 space-y-3">
                <span className="text-[10px] font-bold text-[#0D47A1] uppercase tracking-wider block font-sans">1. Story Cover Customization</span>
                
                <div>
                  <label className="text-xs font-semibold text-[#64748B] mb-1 block">Story Title *</label>
                  <input 
                    type="text" 
                    value={storyForm.title}
                    onChange={(e) => setStoryForm({ ...storyForm, title: e.target.value })}
                    placeholder="e.g. Cold showers in winter? Hard pass"
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs outline-none focus:border-[#0D47A1] transition-all"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-[#64748B] mb-1 block">Upload Cover Image *</label>
                  <div className="flex items-center gap-3 bg-white border border-dashed border-slate-200 rounded-lg p-1.5">
                    <input 
                      type="file" 
                      accept="image/*"
                      onChange={handleStoryFileChange}
                      className="w-full text-xs text-slate-500 file:mr-2 file:py-1 file:px-2 file:rounded-md file:border-0 file:text-[9.5px] file:font-semibold file:bg-blue-50 file:text-[#0D47A1] hover:file:bg-blue-100 cursor-pointer"
                    />
                    {storyForm.image && (
                      <img src={storyForm.image} alt="Preview" className="w-10 h-8 object-contain border border-slate-200 rounded-md bg-white flex-shrink-0" />
                    )}
                  </div>
                </div>
              </div>

              <div className="bg-slate-50 p-3 rounded-xl border border-slate-150 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-bold text-[#0D47A1] uppercase tracking-wider">2. Slides / Frames List *</span>
                  <button
                    type="button"
                    onClick={() => setStorySlides([...storySlides, { id: Date.now(), image: '', caption: '', subCaption: '' }])}
                    className="bg-white hover:bg-slate-50 text-[#0D47A1] border border-slate-200 px-2.5 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-all"
                  >
                    + Add Slide
                  </button>
                </div>

                {storySlides.length > 0 ? (
                  <div className="space-y-4 max-h-[35vh] overflow-y-auto pr-1">
                    {storySlides.map((slide, sIdx) => (
                      <div key={slide.id} className="bg-white border border-slate-200 rounded-xl p-3 space-y-2.5 relative shadow-2xs">
                        <div className="flex justify-between items-center border-b border-slate-100 pb-1.5">
                          <span className="text-[10px] font-bold text-slate-500">Slide #{sIdx + 1}</span>
                          <button
                            type="button"
                            onClick={() => setStorySlides(storySlides.filter(s => s.id !== slide.id))}
                            className="p-1 text-slate-400 hover:text-red-600 rounded-lg transition-colors"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>

                        <div>
                          <label className="text-[9px] font-bold text-slate-400 block mb-0.5">Upload Slide Image *</label>
                          <div className="flex items-center gap-2 bg-slate-50 border border-dashed border-slate-200 rounded-md p-1">
                            <input 
                              type="file" 
                              accept="image/*"
                              onChange={(e) => {
                                const file = e.target.files[0];
                                if (file) {
                                  const reader = new FileReader();
                                  reader.onloadend = () => {
                                    setStorySlides(prev => prev.map(s => s.id === slide.id ? { ...s, image: reader.result } : s));
                                  };
                                  reader.readAsDataURL(file);
                                }
                              }}
                              className="w-full text-[10px] text-slate-500 file:mr-2 file:py-0.5 file:px-1.5 file:rounded file:border-0 file:text-[9px] file:font-semibold file:bg-blue-50 file:text-[#0D47A1] hover:file:bg-blue-100 cursor-pointer"
                            />
                            {slide.image && (
                              <img src={slide.image} alt="" className="w-10 h-8 object-contain border border-slate-200 rounded bg-white flex-shrink-0" />
                            )}
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-[9px] font-bold text-slate-400 block mb-0.5">Slide Caption *</label>
                            <input
                              type="text"
                              value={slide.caption}
                              onChange={(e) => setStorySlides(storySlides.map(s => s.id === slide.id ? { ...s, caption: e.target.value } : s))}
                              placeholder="e.g. Cold showers in winter?"
                              className="w-full px-2 py-1 bg-slate-50 border border-slate-200 rounded-md text-xs outline-none focus:border-[#0D47A1] transition-all"
                              required
                            />
                          </div>
                          <div>
                            <label className="text-[9px] font-bold text-slate-400 block mb-0.5">Slide Sub-caption</label>
                            <input
                              type="text"
                              value={slide.subCaption}
                              onChange={(e) => setStorySlides(storySlides.map(s => s.id === slide.id ? { ...s, subCaption: e.target.value } : s))}
                              placeholder="e.g. Your geyser deserves a check-up."
                              className="w-full px-2 py-1 bg-slate-50 border border-slate-200 rounded-md text-xs outline-none focus:border-[#0D47A1] transition-all"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-[10px] text-red-500 italic bg-red-50 border border-red-100 rounded-lg p-3 text-center font-semibold">
                    Please add at least one story slide.
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-2 bg-white sticky bottom-0 z-10">
                <button 
                  type="button"
                  onClick={() => setShowStoryModal(false)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-2.5 rounded-lg text-xs transition-all"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={storySlides.length === 0}
                  className="flex-1 bg-[#0D47A1] hover:bg-blue-800 text-white font-semibold py-2.5 rounded-lg text-xs transition-all shadow-sm disabled:opacity-50"
                >
                  Save Story Card
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default CustomerAppCustomization;
