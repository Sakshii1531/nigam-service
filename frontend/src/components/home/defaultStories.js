// Bundled customer stories used when no CMS stories can be displayed.
// Import story thumbnail images
import geyserImg from '../../assets/story_geyser.png';
import winterImg from '../../assets/story_winter.png';
import electricianImg from '../../assets/story_electrician.png';
import salonImg from '../../assets/story_salon.png';

// Import extra slide images
import geyserImg2 from '../../assets/story_geyser_2.png';
import geyserImg3 from '../../assets/story_geyser_3.png';
import winterImg2 from '../../assets/story_winter_2.png';
import winterImg3 from '../../assets/story_winter_3.png';
import electricianImg2 from '../../assets/story_electrician_2.png';
import electricianImg3 from '../../assets/story_electrician_3.png';
import salonImg2 from '../../assets/story_salon_2.png';
import salonImg3 from '../../assets/story_salon_3.png';
export const DEFAULT_STORIES = [
  {
    id: 1,
    title: 'Cold showers in winter? Hard pass',
    image: geyserImg,
    slides: [
      {
        image: geyserImg,
        caption: 'Cold showers in winter? Hard pass',
        subCaption: 'Your geyser deserves a check-up before winter hits.',
      },
      {
        image: geyserImg2,
        caption: 'Leaking? Tripping? No hot water?',
        subCaption: 'From thermostat failure to heating coil burnout — we\'ve seen it all.',
      },
      {
        image: geyserImg3,
        caption: 'Back to warm showers in no time',
        subCaption: 'Our certified serviceProviders get your geyser fixed fast.',
      },
    ],
  },
  {
    id: 2,
    title: 'Winter Home Repairs & Maintenance',
    image: winterImg,
    slides: [
      {
        image: winterImg,
        caption: 'Winter Home Repairs & Maintenance',
        subCaption: 'Keep your home warm and worry-free this season.',
      },
      {
        image: winterImg2,
        caption: 'Cracks? Leaks? Chipping walls?',
        subCaption: 'Winter can be tough on your home. Spot the damage early.',
      },
      {
        image: winterImg3,
        caption: 'Trust the experts. Leave the repairs to us.',
        subCaption: 'Nigam Care serviceProviders — certified, background-checked, on-time.',
      },
    ],
  },
  {
    id: 3,
    title: 'Quick Electrical Fixes',
    image: electricianImg,
    slides: [
      {
        image: electricianImg,
        caption: 'Quick Electrical Fixes',
        subCaption: 'Faulty switch? Tripping MCB? Fan not working? We fix it.',
      },
      {
        image: electricianImg2,
        caption: 'Safe. Certified. Insured.',
        subCaption: 'All our electricians carry ISI-certified tools and follow safety protocols.',
      },
      {
        image: electricianImg3,
        caption: 'Light up your home again',
        subCaption: 'Hundreds of families trust Nigam Care every month for electrical work.',
      },
    ],
  },
  {
    id: 4,
    title: 'Salon-like pampering at home',
    image: salonImg,
    slides: [
      {
        image: salonImg,
        caption: 'Salon-like pampering at home',
        subCaption: 'Professional beauty experts come right to your doorstep.',
      },
      {
        image: salonImg2,
        caption: 'Nails. Skin. Hair. All at home.',
        subCaption: 'Relax while our experts bring the salon experience to you.',
      },
      {
        image: salonImg3,
        caption: 'Glowing skin. Happy you.',
        subCaption: 'Book a home salon session and feel the difference today.',
      },
    ],
  },
];
