import { City } from '../src/modules/super-admin/city.model.js';
import { ServicePartner } from '../src/modules/super-admin/servicePartner.model.js';
import { Brand } from '../src/modules/super-admin/brand.model.js';
import { Product } from '../src/modules/buy-commerce/product.model.js';
import { SparePartCatalog } from '../src/modules/super-admin/sparePartCatalog.model.js';
import { TechInventoryItem } from '../src/modules/technician/techInventoryItem.model.js';
import { Technician } from '../src/modules/technician/technician.model.js';

export const CITIES_DATA = [
  { name: 'Lucknow', state: 'Uttar Pradesh', district: 'Lucknow', coverageAreaSqkm: 350, status: 'Active' },
  { name: 'New Delhi', state: 'Delhi', district: 'Central Delhi', coverageAreaSqkm: 500, status: 'Active' },
  { name: 'Mumbai', state: 'Maharashtra', district: 'Mumbai Suburban', coverageAreaSqkm: 600, status: 'Active' },
  { name: 'Bengaluru', state: 'Karnataka', district: 'Bengaluru Urban', coverageAreaSqkm: 740, status: 'Active' },
  { name: 'Kanpur', state: 'Uttar Pradesh', district: 'Kanpur Nagar', coverageAreaSqkm: 400, status: 'Active' },
];

export const SERVICE_PARTNERS_DATA = [
  { name: 'NCC Lucknow Service Center', manager: 'Vikram Singh', email: 'lucknow.partner@nigamcare.com', phone: '9810011223', cityName: 'Lucknow', rating: 4.8, status: 'Active' },
  { name: 'NCC Delhi Central Hub', manager: 'Rajesh Sharma', email: 'delhi.partner@nigamcare.com', phone: '9810011224', cityName: 'New Delhi', rating: 4.9, status: 'Active' },
  { name: 'NCC Mumbai West Service Hub', manager: 'Amit Verma', email: 'mumbai.partner@nigamcare.com', phone: '9810011225', cityName: 'Mumbai', rating: 4.7, status: 'Active' },
  { name: 'NCC Bengaluru Tech Care Center', manager: 'Suresh Kumar', email: 'bengaluru.partner@nigamcare.com', phone: '9810011226', cityName: 'Bengaluru', rating: 4.8, status: 'Active' },
  { name: 'NCC Kanpur Service Station', manager: 'Manoj Gupta', email: 'kanpur.partner@nigamcare.com', phone: '9810011227', cityName: 'Kanpur', rating: 4.6, status: 'Active' },
];

export const BRANDS_DATA = [
  {
    name: 'LG Electronics India',
    category: 'Home Appliances',
    status: 'Active',
    warrantyMonths: 12,
    supportEmail: 'care@lg-india.com',
    supportPhone: '+91 1800 180 9999',
    slaResolutionTimeHours: 24,
    slaAdherencePercent: 96,
    csat: 4.8,
    contractTerms: 'Standard OEM SLA with 24-hr resolution guarantee',
  },
  {
    name: 'Samsung India',
    category: 'Electronics & Appliances',
    status: 'Active',
    warrantyMonths: 12,
    supportEmail: 'support@samsung-india.com',
    supportPhone: '+91 1800 40 7267864',
    slaResolutionTimeHours: 24,
    slaAdherencePercent: 95,
    csat: 4.7,
    contractTerms: 'Premium Service Partner contract for Home Appliances',
  },
  {
    name: 'Whirlpool India',
    category: 'Washing Machines & Refrigerators',
    status: 'Active',
    warrantyMonths: 24,
    supportEmail: 'helpdesk@whirlpool.com',
    supportPhone: '+91 1800 208 1800',
    slaResolutionTimeHours: 48,
    slaAdherencePercent: 92,
    csat: 4.6,
    contractTerms: 'Standard OEM parts replacement & service contract',
  },
  {
    name: 'Voltas Limited',
    category: 'Air Conditioners & Cooling',
    status: 'Active',
    warrantyMonths: 12,
    supportEmail: 'customercare@voltas.com',
    supportPhone: '+91 1800 233 4555',
    slaResolutionTimeHours: 24,
    slaAdherencePercent: 97,
    csat: 4.8,
    contractTerms: 'Exclusive cooling appliances service partner SLA',
  },
  {
    name: 'Havells India',
    category: 'Electrical & Home Appliances',
    status: 'Active',
    warrantyMonths: 24,
    supportEmail: 'customercare@havells.com',
    supportPhone: '+91 1800 103 1313',
    slaResolutionTimeHours: 36,
    slaAdherencePercent: 94,
    csat: 4.9,
    contractTerms: 'Small appliances & electricals fast response contract',
  },
  {
    name: 'Godrej Appliances',
    category: 'Refrigerators & Safes',
    status: 'Active',
    warrantyMonths: 12,
    supportEmail: 'smartcare@godrej.com',
    supportPhone: '+91 1800 209 5511',
    slaResolutionTimeHours: 48,
    slaAdherencePercent: 90,
    csat: 4.5,
    contractTerms: 'Regional service fulfillment partner',
  },
  {
    name: 'Blue Star',
    category: 'AC & Commercial Refrigeration',
    status: 'Active',
    warrantyMonths: 12,
    supportEmail: 'servicecare@bluestarindia.com',
    supportPhone: '+91 1800 209 1177',
    slaResolutionTimeHours: 24,
    slaAdherencePercent: 98,
    csat: 4.8,
    contractTerms: 'Commercial & residential AC authorized service agreement',
  },
];

export const NCC_PRODUCTS_DATA = [
  {
    category: 'Refrigerator',
    name: 'LG Double Door 260L Frost Free',
    brand: 'LG Electronics India',
    condition: 'Refurbished',
    conditionGrade: 'Excellent',
    originalPrice: 25000,
    price: 14999,
    rating: 4.8,
    stock: 8,
    sku: 'NCC-PROD-REF-LG260',
    warrantyMonths: 6,
    specs: ['260L Capacity', 'Double Door', 'Smart Inverter Compressor', 'Frost Free'],
    benefits: ['6-Month Seller Warranty', 'Free Delivery & Installation', 'NCC Assured Quality'],
    imageUrl: 'https://images.unsplash.com/photo-1571175443880-49e1d25b2bc5?w=500',
    isActive: true,
  },
  {
    category: 'Refrigerator',
    name: 'Samsung 198L Single Door 5 Star',
    brand: 'Samsung India',
    condition: 'New',
    conditionGrade: 'New',
    originalPrice: 19990,
    price: 16490,
    rating: 4.7,
    stock: 15,
    sku: 'NCC-PROD-REF-SAM198',
    warrantyMonths: 12,
    specs: ['198L Capacity', 'Single Door', '5 Star Energy Rating', 'Digital Inverter'],
    benefits: ['1-Year Brand Warranty', 'Free Delivery', '10-Year Compressor Warranty'],
    imageUrl: 'https://images.unsplash.com/photo-1584992236310-6edddc08acff?w=500',
    isActive: true,
  },
  {
    category: 'Refrigerator',
    name: 'Whirlpool 240L Multi-Door Frost Free',
    brand: 'Whirlpool India',
    condition: 'Refurbished',
    conditionGrade: 'Good',
    originalPrice: 28990,
    price: 17999,
    rating: 4.5,
    stock: 5,
    sku: 'NCC-PROD-REF-WHP240',
    warrantyMonths: 6,
    specs: ['240L Capacity', '3 Door Design', 'Microblock Technology', 'Zeolite Technology'],
    benefits: ['6-Month Seller Warranty', 'Free Express Delivery'],
    imageUrl: 'https://images.unsplash.com/photo-1571175443880-49e1d25b2bc5?w=500',
    isActive: true,
  },
  {
    category: 'AC',
    name: 'Voltas 1.5 Ton 3 Star Inverter Split AC',
    brand: 'Voltas Limited',
    condition: 'New',
    conditionGrade: 'New',
    originalPrice: 45990,
    price: 32990,
    rating: 4.8,
    stock: 12,
    sku: 'NCC-PROD-AC-VOL15T',
    warrantyMonths: 12,
    specs: ['1.5 Ton', '3 Star Inverter', 'Copper Condenser', 'Anti-Dust Filter', 'R32 Refrigerant'],
    benefits: ['1-Year Brand Warranty', '10-Year Compressor Warranty', 'NCC Standard Installation @ ₹999'],
    imageUrl: 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=500',
    isActive: true,
  },
  {
    category: 'AC',
    name: 'Blue Star 1 Ton 5 Star Inverter Split AC',
    brand: 'Blue Star',
    condition: 'Refurbished',
    conditionGrade: 'Excellent',
    originalPrice: 38000,
    price: 22499,
    rating: 4.6,
    stock: 6,
    sku: 'NCC-PROD-AC-BS10T',
    warrantyMonths: 6,
    specs: ['1.0 Ton', '5 Star Inverter', '100% Copper Coil', 'Turbo Cool', 'Acoustic Jacket Compressor'],
    benefits: ['6-Month Seller Warranty', 'NCC Certified Refurbished', 'Gas Leak Tested'],
    imageUrl: 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=500',
    isActive: true,
  },
  {
    category: 'AC',
    name: 'Daikin 1.5 Ton 5 Star Inverter Split AC',
    brand: 'Daikin',
    condition: 'New',
    conditionGrade: 'New',
    originalPrice: 58400,
    price: 44990,
    rating: 4.9,
    stock: 10,
    sku: 'NCC-PROD-AC-DAI15T',
    warrantyMonths: 12,
    specs: ['1.5 Ton', '5 Star Inverter', 'PM 2.5 Filter', '3D Airflow', 'Dew Clean Technology'],
    benefits: ['1-Year Comprehensive Warranty', '10-Year Compressor Warranty', 'Free Express Delivery'],
    imageUrl: 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=500',
    isActive: true,
  },
  {
    category: 'Washing Machine',
    name: 'IFB Front Load 6.5kg Fully Automatic',
    brand: 'IFB',
    condition: 'Refurbished',
    conditionGrade: 'Good',
    originalPrice: 23000,
    price: 13499,
    rating: 4.6,
    stock: 4,
    sku: 'NCC-PROD-WM-IFB65',
    warrantyMonths: 6,
    specs: ['6.5 kg Capacity', 'Front Load', 'Aqua Energie Filter', '3D Wash System', 'Cradle Wash'],
    benefits: ['6-Month Warranty', 'Free Installation & Demo'],
    imageUrl: 'https://images.unsplash.com/photo-1610557892470-55d9e80c0bce?w=500',
    isActive: true,
  },
  {
    category: 'Washing Machine',
    name: 'LG 7.0 kg Smart Inverter Top Load',
    brand: 'LG Electronics India',
    condition: 'New',
    conditionGrade: 'New',
    originalPrice: 22990,
    price: 17990,
    rating: 4.7,
    stock: 9,
    sku: 'NCC-PROD-WM-LG70',
    warrantyMonths: 24,
    specs: ['7.0 kg Capacity', 'Top Load', 'Smart Inverter Motor', 'TurboDrum', 'Punch+3 Pulsator'],
    benefits: ['2-Year Product Warranty', '10-Year Motor Warranty', 'Free Installation'],
    imageUrl: 'https://images.unsplash.com/photo-1610557892470-55d9e80c0bce?w=500',
    isActive: true,
  },
  {
    category: 'Television',
    name: 'Samsung Crystal 4K 43" UHD Smart TV',
    brand: 'Samsung India',
    condition: 'New',
    conditionGrade: 'New',
    originalPrice: 38990,
    price: 29999,
    rating: 4.8,
    stock: 14,
    sku: 'NCC-PROD-TV-SAM43',
    warrantyMonths: 12,
    specs: ['43 Inch Screen', '4K Ultra HD', 'Crystal Processor 4K', 'HDR 10+', 'Motion Xcelerator'],
    benefits: ['1-Year Brand Warranty', 'Free Wall Mount Kit & Installation'],
    imageUrl: 'https://images.unsplash.com/photo-1593784991095-a205069470b6?w=500',
    isActive: true,
  },
  {
    category: 'Television',
    name: 'Sony Bravia 55" 4K Ultra HD Smart TV',
    brand: 'Sony',
    condition: 'Refurbished',
    conditionGrade: 'Excellent',
    originalPrice: 74900,
    price: 42999,
    rating: 4.9,
    stock: 3,
    sku: 'NCC-PROD-TV-SNY55',
    warrantyMonths: 6,
    specs: ['55 Inch Display', '4K Ultra HD', 'X1 4K Processor', 'Google TV OS', 'Dolby Audio'],
    benefits: ['6-Month Warranty', 'Free Delivery & Wall Mount Setup'],
    imageUrl: 'https://images.unsplash.com/photo-1593784991095-a205069470b6?w=500',
    isActive: true,
  },
  {
    category: 'RO Water Purifier',
    name: 'Kent Grand Plus 8L RO+UV+UF Water Purifier',
    brand: 'Kent',
    condition: 'New',
    conditionGrade: 'New',
    originalPrice: 20000,
    price: 15490,
    rating: 4.8,
    stock: 18,
    sku: 'NCC-PROD-RO-KNT01',
    warrantyMonths: 12,
    specs: ['8L Tank Capacity', 'RO+UV+UF Purification', 'Mineral ROTM Technology', 'TDS Controller', 'In-Tank UV LED'],
    benefits: ['1-Year Free Service Contract', 'Free Installation', 'NCC Pure Water Shield'],
    imageUrl: 'https://images.unsplash.com/photo-1527515637462-cff94eecc1ac?w=500',
    isActive: true,
  },
  {
    category: 'RO Water Purifier',
    name: 'Aquaguard Ritz Stainless Steel RO+UV Purifier',
    brand: 'Aquaguard',
    condition: 'Refurbished',
    conditionGrade: 'Excellent',
    originalPrice: 22000,
    price: 11999,
    rating: 4.6,
    stock: 7,
    sku: 'NCC-PROD-RO-AQG01',
    warrantyMonths: 6,
    specs: ['Stainless Steel Storage Tank', 'Active Copper Tech', '7 Stage Advanced Purification'],
    benefits: ['6-Month Warranty', 'Free Standard Installation'],
    imageUrl: 'https://images.unsplash.com/photo-1527515637462-cff94eecc1ac?w=500',
    isActive: true,
  },
];

export const SPARE_PARTS_DATA = [
  {
    name: 'AC Compressor 1.5T R32 Inverter',
    brand: 'Voltas Limited',
    code: 'SP-AC-COMP-01',
    category: 'AC',
    costPrice: 3500,
    markupPercent: 20,
    stock: 25,
    reorderThreshold: 5,
    supplier: 'Nigam Spares Ltd',
    leadTimeDays: 2,
  },
  {
    name: 'Inverter AC Main PCB Board',
    brand: 'LG Electronics India',
    code: 'SP-AC-PCB-01',
    category: 'AC',
    costPrice: 1800,
    markupPercent: 25,
    stock: 40,
    reorderThreshold: 10,
    supplier: 'TechParts India',
    leadTimeDays: 1,
  },
  {
    name: 'AC Gas R32 Canister (3kg)',
    brand: 'Universal',
    code: 'SP-AC-GAS-R32',
    category: 'AC',
    costPrice: 1200,
    markupPercent: 15,
    stock: 60,
    reorderThreshold: 15,
    supplier: 'Cooling Solutions',
    leadTimeDays: 1,
  },
  {
    name: 'AC Outdoor Fan Motor 40W',
    brand: 'Daikin',
    code: 'SP-AC-FAN-01',
    category: 'AC',
    costPrice: 950,
    markupPercent: 20,
    stock: 30,
    reorderThreshold: 8,
    supplier: 'Cooling Solutions',
    leadTimeDays: 2,
  },
  {
    name: 'Washing Machine Direct Drive Motor',
    brand: 'IFB',
    code: 'SP-WM-MTR-01',
    category: 'Washing Machine',
    costPrice: 2200,
    markupPercent: 20,
    stock: 15,
    reorderThreshold: 5,
    supplier: 'Nigam Spares Ltd',
    leadTimeDays: 3,
  },
  {
    name: 'Washing Machine Drain Pump Assembly',
    brand: 'Samsung India',
    code: 'SP-WM-PMP-01',
    category: 'Washing Machine',
    costPrice: 450,
    markupPercent: 30,
    stock: 50,
    reorderThreshold: 10,
    supplier: 'TechParts India',
    leadTimeDays: 1,
  },
  {
    name: 'Washing Machine Inlet Valve Dual Port',
    brand: 'LG Electronics India',
    code: 'SP-WM-VALVE-01',
    category: 'Washing Machine',
    costPrice: 320,
    markupPercent: 25,
    stock: 65,
    reorderThreshold: 12,
    supplier: 'TechParts India',
    leadTimeDays: 1,
  },
  {
    name: 'Refrigerator Inverter Compressor',
    brand: 'LG Electronics India',
    code: 'SP-REF-COMP-01',
    category: 'Refrigerator',
    costPrice: 2800,
    markupPercent: 20,
    stock: 18,
    reorderThreshold: 5,
    supplier: 'Nigam Spares Ltd',
    leadTimeDays: 2,
  },
  {
    name: 'Refrigerator Defrost Thermostat & Sensor',
    brand: 'Whirlpool India',
    code: 'SP-REF-SEN-01',
    category: 'Refrigerator',
    costPrice: 320,
    markupPercent: 35,
    stock: 80,
    reorderThreshold: 15,
    supplier: 'TechParts India',
    leadTimeDays: 1,
  },
  {
    name: 'Refrigerator Cooling Fan Motor',
    brand: 'Godrej Appliances',
    code: 'SP-REF-FAN-01',
    category: 'Refrigerator',
    costPrice: 550,
    markupPercent: 20,
    stock: 40,
    reorderThreshold: 8,
    supplier: 'Nigam Spares Ltd',
    leadTimeDays: 2,
  },
  {
    name: 'RO Membrane 75 GPD High Flow',
    brand: 'Kent',
    code: 'SP-RO-MEM-75',
    category: 'RO Water Purifier',
    costPrice: 650,
    markupPercent: 25,
    stock: 100,
    reorderThreshold: 20,
    supplier: 'WaterPure Components',
    leadTimeDays: 1,
  },
  {
    name: 'RO Booster Pump 100 GPD 24V',
    brand: 'Aquaguard',
    code: 'SP-RO-PMP-100',
    category: 'RO Water Purifier',
    costPrice: 950,
    markupPercent: 20,
    stock: 35,
    reorderThreshold: 8,
    supplier: 'WaterPure Components',
    leadTimeDays: 2,
  },
  {
    name: 'Geyser Heavy Duty Heating Element 2000W',
    brand: 'Havells India',
    code: 'SP-GEY-ELM-2K',
    category: 'Geyser',
    costPrice: 380,
    markupPercent: 30,
    stock: 45,
    reorderThreshold: 10,
    supplier: 'Nigam Spares Ltd',
    leadTimeDays: 1,
  },
  {
    name: 'Geyser Thermostat Auto Cut-off 16A',
    brand: 'Havells India',
    code: 'SP-GEY-THM-16',
    category: 'Geyser',
    costPrice: 260,
    markupPercent: 30,
    stock: 60,
    reorderThreshold: 15,
    supplier: 'TechParts India',
    leadTimeDays: 1,
  },
  {
    name: 'Microwave High Voltage Transformer',
    brand: 'Samsung India',
    code: 'SP-MW-TRF-01',
    category: 'Microwave',
    costPrice: 850,
    markupPercent: 25,
    stock: 12,
    reorderThreshold: 4,
    supplier: 'TechParts India',
    leadTimeDays: 2,
  },
  {
    name: 'Microwave Magnetron 900W',
    brand: 'LG Electronics India',
    code: 'SP-MW-MAG-900',
    category: 'Microwave',
    costPrice: 1450,
    markupPercent: 20,
    stock: 15,
    reorderThreshold: 5,
    supplier: 'TechParts India',
    leadTimeDays: 2,
  },
  {
    name: 'Universal Copper Pipe Coil (1/4" + 1/2" 5m)',
    brand: 'Universal',
    code: 'SP-AC-COPPER-5M',
    category: 'AC',
    costPrice: 1100,
    markupPercent: 18,
    stock: 30,
    reorderThreshold: 8,
    supplier: 'Cooling Solutions',
    leadTimeDays: 1,
  },
];

export async function seedDemoEntities() {
  console.log('[demo-seed] Starting demo entities seeding...');

  // 1. Seed Cities
  const citiesMap = {};
  for (const cData of CITIES_DATA) {
    const city = await City.findOneAndUpdate(
      { name: cData.name, state: cData.state },
      cData,
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
    citiesMap[cData.name] = city;
  }
  console.log(`[demo-seed] ${CITIES_DATA.length} Cities seeded`);

  // 2. Seed Service Partners
  const servicePartnersMap = {};
  for (const spData of SERVICE_PARTNERS_DATA) {
    const { cityName, ...rest } = spData;
    const city = citiesMap[cityName];
    if (!city) continue;

    const sp = await ServicePartner.findOneAndUpdate(
      { name: rest.name },
      { ...rest, city: city._id },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
    servicePartnersMap[rest.name] = sp;
  }
  console.log(`[demo-seed] ${SERVICE_PARTNERS_DATA.length} Service Partners seeded`);

  // 3. Seed Brand Partners
  const brandsMap = {};
  for (const bData of BRANDS_DATA) {
    const brand = await Brand.findOneAndUpdate(
      { name: bData.name },
      bData,
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
    brandsMap[bData.name] = brand;
  }
  console.log(`[demo-seed] ${BRANDS_DATA.length} Brand Partners seeded`);

  // 4. Seed NCC Products
  for (const pData of NCC_PRODUCTS_DATA) {
    await Product.findOneAndUpdate(
      { sku: pData.sku },
      pData,
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
  }
  console.log(`[demo-seed] ${NCC_PRODUCTS_DATA.length} NCC Commerce Products seeded`);

  // 5. Seed Spare Parts Catalog (Inventory Management)
  for (const spcData of SPARE_PARTS_DATA) {
    await SparePartCatalog.findOneAndUpdate(
      { code: spcData.code },
      spcData,
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
  }
  console.log(`[demo-seed] ${SPARE_PARTS_DATA.length} Platform Spare Parts Catalog items seeded`);

  // 6. Seed Technician Inventory Items (Technician Stock)
  const technicians = await Technician.find({ status: 'Active' });
  if (technicians.length > 0) {
    const sampleTech = technicians[0];
    const techInventoryData = [
      { technician: sampleTech._id, name: 'AC Gas R32 Canister (3kg)', sku: 'SP-AC-GAS-R32', qty: 4, price: 1380 },
      { technician: sampleTech._id, name: 'Inverter AC Main PCB Board', sku: 'SP-AC-PCB-01', qty: 2, price: 2250 },
      { technician: sampleTech._id, name: 'Universal Copper Pipe Coil (5m)', sku: 'SP-AC-COPPER-5M', qty: 3, price: 1298 },
      { technician: sampleTech._id, name: 'Washing Machine Drain Pump', sku: 'SP-WM-PMP-01', qty: 1, price: 585 },
      { technician: sampleTech._id, name: 'RO Membrane 75 GPD', sku: 'SP-RO-MEM-75', qty: 5, price: 812 },
      { technician: sampleTech._id, name: 'Defrost Sensor', sku: 'SP-REF-SEN-01', qty: 0, price: 432 }, // Out of stock example
    ];

    for (const item of techInventoryData) {
      await TechInventoryItem.findOneAndUpdate(
        { technician: sampleTech._id, sku: item.sku },
        item,
        { upsert: true, new: true, setDefaultsOnInsert: true },
      );
    }
    console.log(`[demo-seed] ${techInventoryData.length} Technician Inventory Items seeded for tech: ${sampleTech.name}`);
  }

  console.log('[demo-seed] All demo data successfully seeded!');
}
