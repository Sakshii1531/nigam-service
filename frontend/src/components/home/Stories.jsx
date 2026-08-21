import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import StoryViewer from './StoryViewer';

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
import { apiRequest } from '../../lib/apiClient';

const DEFAULT_STORIES = [
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
        subCaption: 'Our certified technicians get your geyser fixed fast.',
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
        subCaption: 'Nigam Care technicians — certified, background-checked, on-time.',
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

const Stories = () => {
  const [viewerOpen, setViewerOpen] = useState(false);
  const [startStoryIndex, setStartStoryIndex] = useState(0);

  // Published stories come from the CMS (public read). The bundled set is the
  // fallback when nothing has been published yet or the API is unreachable.
  const [stories, setStories] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await apiRequest('/cms/stories');
        if (!cancelled) setStories(data || []);
      } catch {
        if (!cancelled) setStories([]);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const storiesList = stories?.length
    ? stories.map((story) => ({
        id: story.id,
        title: story.title,
        image: story.mediaUrl || story.slides?.[0]?.image,
        // The viewer pages through slides; fall back to a single cover slide so
        // a story published without any still opens.
        slides: story.slides?.length
          ? story.slides
          : [{ image: story.mediaUrl, caption: story.title, subCaption: '' }],
      }))
    : DEFAULT_STORIES;

  const openStory = (index) => {
    setStartStoryIndex(index);
    setViewerOpen(true);
  };

  return (
    <>
      <section className="-mt-4 pt-0 pb-2 bg-bg-light">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold text-text-primary">Stories</h2>
          </div>

          {/* Horizontally scrollable container with snap physics */}
          <div className="flex overflow-x-auto gap-4 pb-4 snap-x snap-mandatory no-scrollbar -mx-4 px-4">
            {storiesList.map((story, index) => (
              <motion.div
                key={story.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: index * 0.08 }}
                className="flex-shrink-0 w-40 h-64 rounded-2xl overflow-hidden relative shadow-sm border border-border-color cursor-pointer snap-start"
                onClick={() => openStory(index)}
              >
                {/* Story Image */}
                <img
                  src={story.image}
                  alt={story.title}
                  className="w-full h-full object-cover"
                />

                {/* Gradient overlay for readability and depth */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-transparent pointer-events-none" />

                {/* Floating Caption Overlay Box */}
                <div className="absolute bottom-6 left-4 right-0 bg-white rounded-l-xl rounded-r-none py-3 pl-3 pr-2 shadow-md">
                  <p className="text-xs font-normal text-text-primary leading-tight line-clamp-1">
                    {story.title}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Full-screen Story Viewer */}
      {viewerOpen && (
        <StoryViewer
          stories={storiesList}
          startIndex={startStoryIndex}
          onClose={() => setViewerOpen(false)}
        />
      )}
    </>
  );
};

export default Stories;
