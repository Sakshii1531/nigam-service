import { apiRequest } from '../lib/apiClient';
export const defaultCategories = [
  'Mobile', 'Laptop', 'Tablet', 'Smartwatch',
  'Television', 'Refrigerator', 'Washing Machine', 'Air Conditioner', 'Water Purifier', 'Geyser', 'Microwave Oven'
];

export const defaultBrands = {
  Mobile: ['Apple', 'Samsung', 'OnePlus', 'Xiaomi', 'Realme'],
  Laptop: ['HP', 'Dell', 'Lenovo', 'Apple', 'Asus'],
  Tablet: ['Apple', 'Samsung', 'Lenovo'],
  Smartwatch: ['Apple', 'Samsung', 'Noise', 'boAt'],
  'Water Purifier': ['Kent', 'Aquaguard', 'Livpure', 'Pureit'],
  Television: ['Samsung', 'LG', 'Sony', 'OnePlus'],
  Refrigerator: ['Samsung', 'LG', 'Whirlpool', 'Haier'],
  'Washing Machine': ['Samsung', 'LG', 'IFB', 'Bosch'],
  'Air Conditioner': ['Voltas', 'Daikin', 'LG', 'Carrier'],
  Geyser: ['Havells', 'AO Smith', 'Bajaj', 'Racold'],
  'Microwave Oven': ['Samsung', 'IFB', 'LG', 'Panasonic']
};

export const defaultModels = {
  // Mobile
  'Mobile_Apple': ['iPhone 12', 'iPhone 13', 'iPhone 14', 'iPhone 15 Pro'],
  'Mobile_Samsung': ['Galaxy S21', 'Galaxy S22', 'Galaxy S23 Ultra', 'Galaxy A54'],
  'Mobile_OnePlus': ['OnePlus 10 Pro', 'OnePlus 11', 'Nord CE 3'],
  'Mobile_Xiaomi': ['Redmi Note 12', 'Xiaomi 13 Pro'],
  'Mobile_Realme': ['Realme GT Neo 3', 'Realme 11 Pro+'],

  // Laptop
  'Laptop_HP': ['Pavilion 15', 'Envy x360', 'Spectre x360'],
  'Laptop_Dell': ['Inspiron 15', 'XPS 13', 'Latitude 3520'],
  'Laptop_Lenovo': ['ThinkPad L14', 'IdeaPad Slim 3', 'Yoga Slim 7'],
  'Laptop_Apple': ['MacBook Air M1', 'MacBook Air M2', 'MacBook Pro M3'],
  'Laptop_Asus': ['ZenBook 14', 'ROG Zephyrus G14', 'VivoBook 15'],

  // Tablet
  'Tablet_Apple': ['iPad Air', 'iPad Pro', 'iPad Mini'],
  'Tablet_Samsung': ['Galaxy Tab S8', 'Galaxy Tab A8'],
  'Tablet_Lenovo': ['Tab P11 Pro', 'Tab M10 Plus'],

  // Smartwatch
  'Smartwatch_Apple': ['Apple Watch Series 7', 'Apple Watch Series 8', 'Apple Watch SE'],
  'Smartwatch_Samsung': ['Galaxy Watch 5', 'Galaxy Watch 6'],
  'Smartwatch_Noise': ['Noise ColorFit Pro 4', 'Noise Halo Plus'],
  'Smartwatch_boAt': ['boAt Wave Sigma', 'boAt Storm Call'],

  // Water Purifier
  'Water Purifier_Kent': ['Kent Grand Plus', 'Kent Pearl', 'Kent Supreme'],
  'Water Purifier_Aquaguard': ['Aquaguard Aura', 'Aquaguard Ritz', 'Aquaguard Crystal'],
  'Water Purifier_Livpure': ['Livpure GLO Pro++', 'Livpure Bolt'],
  'Water Purifier_Pureit': ['Pureit Copper+ UV', 'Pureit Eco Water Saver'],

  // Television
  'Television_Samsung': ['Crystal 4K 43"', 'QLED 55"'],
  'Television_LG': ['NanoCell 43"', 'OLED C3 55"'],
  'Television_Sony': ['Bravia 50"', 'Bravia XR 65"'],
  'Television_OnePlus': ['OnePlus Y Series 32"', 'OnePlus U Series 55"'],

  // Refrigerator
  'Refrigerator_Samsung': ['Double Door 253L', 'Side-by-Side 531L'],
  'Refrigerator_LG': ['Single Door 190L', 'Double Door 360L'],
  'Refrigerator_Whirlpool': ['Triple Door 340L', 'NeoFresh 292L'],
  'Refrigerator_Haier': ['Side-by-Side 531L', 'Single Door 195L'],

  // Washing Machine
  'Washing Machine_Samsung': ['Top Load 7kg', 'Front Load 8kg'],
  'Washing Machine_LG': ['Front Load 8kg', 'Top Load 6.5kg'],
  'Washing Machine_IFB': ['Front Load 6.5kg', 'Senator 8kg'],
  'Washing Machine_Bosch': ['Top Load 7.5kg', 'Front Load 7kg'],

  // Air Conditioner
  'Air Conditioner_Voltas': ['Split 1.5 Ton', 'Window 1.5 Ton'],
  'Air Conditioner_Daikin': ['Inverter 1.5 Ton', 'Inverter 1 Ton'],
  'Air Conditioner_LG': ['Dual Inverter 1 Ton', 'Dual Inverter 1.5 Ton'],
  'Air Conditioner_Carrier': ['Split 2 Ton', 'Inverter 1.5 Ton'],

  // Geyser
  'Geyser_Havells': ['Adonia Spin 25L', 'Instanio 3L'],
  'Geyser_AO Smith': ['SGS 15L', 'HSE-SDS 25L'],
  'Geyser_Bajaj': ['New Shakti 25L', 'Calenta 15L'],
  'Geyser_Racold': ['CDR Swift 15L', 'Omnis 25L'],

  // Microwave Oven
  'Microwave Oven_Samsung': ['Convection 28L', 'Solo 20L'],
  'Microwave Oven_IFB': ['Convection 30L', 'Solo 17L'],
  'Microwave Oven_LG': ['Solo 20L', 'Convection 32L'],
  'Microwave Oven_Panasonic': ['Convection 23L', 'Solo 20L']
};

// Base values for models to compute exchange values
export const modelBaseValues = {
  // Mobile
  'iPhone 12': 14000,
  'iPhone 13': 19000,
  'iPhone 14': 25000,
  'iPhone 15 Pro': 45000,
  'Galaxy S21': 12000,
  'Galaxy S22': 18000,
  'Galaxy S23 Ultra': 35000,
  'Galaxy A54': 9000,
  'OnePlus 10 Pro': 16000,
  'OnePlus 11': 22000,
  'Nord CE 3': 8000,
  'Redmi Note 12': 6000,
  'Xiaomi 13 Pro': 20000,
  'Realme GT Neo 3': 11000,
  'Realme 11 Pro+': 9500,

  // Laptop
  'Pavilion 15': 15000,
  'Envy x360': 24000,
  'Spectre x360': 35000,
  'Inspiron 15': 14000,
  'XPS 13': 28000,
  'Latitude 3520': 18000,
  'ThinkPad L14': 20000,
  'IdeaPad Slim 3': 12000,
  'Yoga Slim 7': 22000,
  'MacBook Air M1': 30000,
  'MacBook Air M2': 42000,
  'MacBook Pro M3': 65000,
  'ZenBook 14': 19000,
  'ROG Zephyrus G14': 32000,
  'VivoBook 15': 13000,

  // Tablet
  'iPad Air': 18000,
  'iPad Pro': 32000,
  'iPad Mini': 12000,
  'Galaxy Tab S8': 15000,
  'Galaxy Tab A8': 6000,
  'Tab P11 Pro': 8500,
  'Tab M10 Plus': 4500,

  // Smartwatch
  'Apple Watch Series 7': 9000,
  'Apple Watch Series 8': 13000,
  'Apple Watch SE': 7000,
  'Galaxy Watch 5': 4000,
  'Galaxy Watch 6': 7500,
  'Noise ColorFit Pro 4': 1200,
  'Noise Halo Plus': 1500,
  'boAt Wave Sigma': 1000,
  'boAt Storm Call': 1200,

  // Water Purifier
  'Kent Grand Plus': 5000,
  'Kent Pearl': 4000,
  'Kent Supreme': 4500,
  'Aquaguard Aura': 4000,
  'Aquaguard Ritz': 5000,
  'Aquaguard Crystal': 3500,
  'Livpure GLO Pro++': 3000,
  'Livpure Bolt': 3500,
  'Pureit Copper+ UV': 4500,
  'Pureit Eco Water Saver': 4000,

  // Television
  'Crystal 4K 43"': 9000,
  'QLED 55"': 18000,
  'NanoCell 43"': 11000,
  'OLED C3 55"': 25000,
  'Bravia 50"': 16000,
  'Bravia XR 65"': 30000,
  'OnePlus Y Series 32"': 4000,
  'OnePlus U Series 55"': 12000,

  // Refrigerator
  'Double Door 253L': 8000,
  'Side-by-Side 531L': 18000,
  'Single Door 190L': 4500,
  'Double Door 360L': 12000,
  'Triple Door 340L': 11000,
  'NeoFresh 292L': 7500,
  'Single Door 195L': 4800,

  // Washing Machine
  'Top Load 7kg': 5000,
  'Front Load 8kg': 12000,
  'Top Load 6.5kg': 4500,
  'Front Load 6.5kg': 8500,
  'Senator 8kg': 14000,
  'Top Load 7.5kg': 5500,
  'Front Load 7kg': 9500,

  // Air Conditioner
  'Split 1.5 Ton': 10000,
  'Window 1.5 Ton': 6500,
  'Inverter 1.5 Ton': 13000,
  'Inverter 1 Ton': 9000,
  'Dual Inverter 1 Ton': 9500,
  'Dual Inverter 1.5 Ton': 12500,
  'Split 2 Ton': 14000,

  // Geyser
  'Adonia Spin 25L': 3500,
  'Instanio 3L': 1200,
  'SGS 15L': 2800,
  'HSE-SDS 25L': 3800,
  'New Shakti 25L': 2000,
  'Calenta 15L': 2500,
  'CDR Swift 15L': 2200,
  'Omnis 25L': 3200,

  // Microwave Oven
  'Convection 28L': 3500,
  'Solo 20L': 1800,
  'Convection 30L': 4500,
  'Solo 17L': 1500,
  'Convection 32L': 5500,
  'Convection 23L': 3000
};

export const defaultQuestionSets = [
  {
    id: 'q_mobile',
    name: 'Mobile Questions',
    category: 'Mobile',
    questions: [
      {
        id: 'mq1',
        text: 'Does the phone turn on and function properly?',
        type: 'Yes/No',
        options: ['Yes', 'No'],
        deductions: { 'No': 0.8 }
      },
      {
        id: 'mq2',
        text: 'Is the screen cracked, scratched, or showing line issues?',
        type: 'Radio',
        options: ['Flawless (No scratches)', 'Minor Scratches', 'Cracked Screen / Lines'],
        deductions: {
          'Flawless (No scratches)': 0,
          'Minor Scratches': 0.1,
          'Cracked Screen / Lines': 0.4
        }
      },
      {
        id: 'mq3',
        text: 'Are original accessories (charger, box) available?',
        type: 'Toggle',
        options: ['Yes', 'No'],
        deductions: { 'No': 0.05 }
      }
    ]
  },
  {
    id: 'q_laptop',
    name: 'Laptop Questions',
    category: 'Laptop',
    questions: [
      {
        id: 'lq1',
        text: 'Does the laptop boot up and display OS screen?',
        type: 'Yes/No',
        options: ['Yes', 'No'],
        deductions: { 'No': 0.85 }
      },
      {
        id: 'lq2',
        text: 'Screen condition assessment:',
        type: 'Radio',
        options: ['No defects', 'Keypad marks or minor scratches', 'Screen cracked or color spots'],
        deductions: {
          'No defects': 0,
          'Keypad marks or minor scratches': 0.12,
          'Screen cracked or color spots': 0.45
        }
      }
    ]
  },
  {
    id: 'q_tablet',
    name: 'Tablet Questions',
    category: 'Tablet',
    questions: [
      {
        id: 'tq1',
        text: 'Does the tablet turn on properly?',
        type: 'Yes/No',
        options: ['Yes', 'No'],
        deductions: { 'No': 0.75 }
      }
    ]
  },
  {
    id: 'q_smartwatch',
    name: 'Smartwatch Questions',
    category: 'Smartwatch',
    questions: [
      {
        id: 'sq1',
        text: 'Is the watch charging and displaying screen?',
        type: 'Yes/No',
        options: ['Yes', 'No'],
        deductions: { 'No': 0.8 }
      }
    ]
  },
  {
    id: 'q_tv',
    name: 'TV Questions',
    category: 'Television',
    questions: [
      {
        id: 'tvq1',
        text: 'Does the TV turn on and display picture/sound?',
        type: 'Yes/No',
        options: ['Yes', 'No'],
        deductions: { 'No': 0.8 }
      },
      {
        id: 'tvq2',
        text: 'Select screen glass state:',
        type: 'Radio',
        options: ['Flawless', 'Scratches or key marks', 'Cracked screen glass'],
        deductions: {
          'Flawless': 0,
          'Scratches or key marks': 0.15,
          'Cracked screen glass': 0.5
        }
      },
      {
        id: 'tvq3',
        text: 'Original TV remote available and working?',
        type: 'Toggle',
        options: ['Yes', 'No'],
        deductions: { 'No': 0.08 }
      }
    ]
  },
  {
    id: 'q_fridge',
    name: 'Refrigerator Questions',
    category: 'Refrigerator',
    questions: [
      {
        id: 'refq1',
        text: 'Is the refrigerator cooling properly?',
        type: 'Yes/No',
        options: ['Yes', 'No'],
        deductions: { 'No': 0.75 }
      },
      {
        id: 'refq2',
        text: 'Condition of refrigerator body:',
        type: 'Radio',
        options: ['Clean (No rust/dents)', 'Minor rust or scratches', 'Heavy rust or deep dents'],
        deductions: {
          'Clean (No rust/dents)': 0,
          'Minor rust or scratches': 0.1,
          'Heavy rust or deep dents': 0.3
        }
      }
    ]
  },
  {
    id: 'q_wm',
    name: 'Washing Machine Questions',
    category: 'Washing Machine',
    questions: [
      {
        id: 'wmq1',
        text: 'Does the washer spin and drain water successfully?',
        type: 'Yes/No',
        options: ['Yes', 'No'],
        deductions: { 'No': 0.75 }
      },
      {
        id: 'wmq2',
        text: 'Is there any heavy rusting on the body panels?',
        type: 'Toggle',
        options: ['Yes', 'No'],
        deductions: { 'Yes': 0.2 }
      }
    ]
  },
  {
    id: 'q_ac',
    name: 'Air Conditioner Questions',
    category: 'Air Conditioner',
    questions: [
      {
        id: 'acq1',
        text: 'Is the AC cooling correctly?',
        type: 'Yes/No',
        options: ['Yes', 'No'],
        deductions: { 'No': 0.8 }
      },
      {
        id: 'acq2',
        text: 'Are there original working remote and indoor unit mounting plates?',
        type: 'Toggle',
        options: ['Yes', 'No'],
        deductions: { 'No': 0.07 }
      }
    ]
  },
  {
    id: 'q_wp',
    name: 'Water Purifier Questions',
    category: 'Water Purifier',
    questions: [
      {
        id: 'wpq1',
        text: 'Does the water purifier turn on and dispense water?',
        type: 'Yes/No',
        options: ['Yes', 'No'],
        deductions: { 'No': 0.7 }
      },
      {
        id: 'wpq2',
        text: 'Is there any leakage from the purifier body/filters?',
        type: 'Toggle',
        options: ['Yes', 'No'],
        deductions: { 'Yes': 0.15 }
      }
    ]
  },
  {
    id: 'q_geyser',
    name: 'Geyser Questions',
    category: 'Geyser',
    questions: [
      {
        id: 'gyq1',
        text: 'Is the geyser heating water properly?',
        type: 'Yes/No',
        options: ['Yes', 'No'],
        deductions: { 'No': 0.7 }
      },
      {
        id: 'gyq2',
        text: 'Is there any water leakage from the geyser tank?',
        type: 'Yes/No',
        options: ['Yes', 'No'],
        deductions: { 'Yes': 0.25 }
      }
    ]
  },
  {
    id: 'q_oven',
    name: 'Microwave Oven Questions',
    category: 'Microwave Oven',
    questions: [
      {
        id: 'ovq1',
        text: 'Does the microwave heat food correctly?',
        type: 'Yes/No',
        options: ['Yes', 'No'],
        deductions: { 'No': 0.75 }
      },
      {
        id: 'ovq2',
        text: 'Are all control buttons/keypad fully responsive?',
        type: 'Toggle',
        options: ['Yes', 'No'],
        deductions: { 'No': 0.15 }
      }
    ]
  }
];

export const defaultCampaigns = [
  {
    id: 'c1',
    name: 'Independence Day Offer',
    badgeText: 'Extra ₹1,500 Exchange Off',
    highlightColor: '#10B981',
    status: 'Active',
    bonusAmount: 1500
  },
  {
    id: 'c2',
    name: 'Upgrade Offer',
    badgeText: 'Up to ₹3,000 Upgrade Bonus',
    highlightColor: '#F59E0B',
    status: 'Active',
    bonusAmount: 3000
  },
  {
    id: 'c3',
    name: 'Exchange Carnival',
    badgeText: 'Special Exchange Bonus',
    highlightColor: '#3B82F6',
    status: 'Inactive',
    bonusAmount: 1000
  }
];

export const initializeExchangeConfigs = async () => {
  // Configs, question sets and campaigns are authored in the super-admin
  // ExchangeOffers console and stored server-side — the customer's ExchangeModal
  // and the console must see the same data, which per-browser localStorage never
  // did. The bundled defaults above remain only as a seed for a fresh install.
  const res = await apiRequest('/exchange/product-configs', { auth: true });
  return Object.fromEntries((res.data || []).map((c) => [
    c.product,
    {
      id: c.id,
      productId: c.product,
      exchangeEnabled: c.exchangeEnabled,
      supportedCategories: c.supportedCategories || [],
      questionSetId: c.questionSet?.id || c.questionSet || null,
      badgeText: c.badgeText || '',
      campaignId: c.campaign?.id || c.campaign || null,
      maxVal: c.maxValue || 0,
    },
  ]));
};

export const initializeQuestionSets = async () => {
  const res = await apiRequest('/exchange/question-sets', { auth: true });
  return res.data || [];
};

export const initializeCampaigns = async () => {
  const res = await apiRequest('/exchange/campaigns', { auth: true });
  return res.data || [];
};
