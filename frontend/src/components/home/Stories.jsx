import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import StoryViewer from './StoryViewer';

import { apiRequest } from '../../lib/apiClient';
import { LoadingSection, Skeleton, SkeletonHeading } from '../common/Skeleton';

const Stories = () => {
  const [viewerOpen, setViewerOpen] = useState(false);
  const [startStoryIndex, setStartStoryIndex] = useState(0);

  // Published (Active) stories from Super Admin → Stories. Nothing published
  // means no Stories row — the app used to show a bundled set instead
  // (docs/master-catalogue Phase 22).
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

  const storiesList = (stories || [])
    .map((story) => ({
        id: story.id,
        title: story.title,
        image: story.mediaUrl || story.slides?.[0]?.image,
        bookLink: story.bookLink || null,
        bookTitle: story.bookTitle || null,
        // The viewer pages through slides; fall back to a single cover slide so
        // a story published without any still opens.
        slides: story.slides?.length
          ? story.slides
          : [{ image: story.mediaUrl, caption: story.title, subCaption: '' }],
      }))
    .filter((story) => story.image);

  const openStory = (index) => {
    setStartStoryIndex(index);
    setViewerOpen(true);
  };

  if (stories === null) {
    return (
      <LoadingSection
        loading
        label="stories"
        className="mt-6 md:mt-12 lg:mt-16 xl:mt-20 max-w-7xl mx-auto w-full"
        skeleton={
          <>
            <SkeletonHeading withAction={false} />
            <div className="flex gap-2.5 sm:gap-4 overflow-hidden md:grid md:grid-cols-4 md:gap-6">
              {Array.from({ length: 4 }, (_, i) => (
                <Skeleton key={i} className="shrink-0 w-34.5 min-[360px]:w-37 sm:w-44 h-56 sm:h-64 md:w-auto md:h-112.5" rounded="rounded-2xl" />
              ))}
            </div>
          </>
        }
      />
    );
  }
  if (!storiesList.length) return null;

  return (
    <>
      <section className="mt-6 md:mt-12 lg:mt-16 xl:mt-20 pt-0 pb-2 bg-bg-light">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-center mb-6 md:mb-8 lg:mb-10 md:relative md:justify-center">
            <h2 className="text-lg font-bold md:text-2xl lg:text-3xl xl:text-4xl md:font-black text-text-primary md:text-center">Stories</h2>
          </div>

          {/* Horizontally scrollable on mobile, 4-column grid on desktop */}
          <div className="flex overflow-x-auto gap-2.5 sm:gap-4 pb-3 sm:pb-4 snap-x snap-mandatory no-scrollbar -mx-1 px-1 sm:-mx-2 sm:px-2 md:grid md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-4 md:gap-6 md:overflow-visible md:mx-0 md:px-0 md:pb-0">
            {storiesList.map((story, index) => (
              <motion.div
                key={story.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: index * 0.08 }}
                className="shrink-0 w-34.5 min-[360px]:w-37 sm:w-44 h-56 sm:h-64 md:w-auto md:h-112.5 lg:h-125 md:flex-shrink rounded-2xl overflow-hidden relative shadow-sm border border-border-color cursor-pointer snap-start hover:shadow-md transition-all"
                onClick={() => openStory(index)}
              >
                {/* Story Image */}
                <img
                  src={story.image}
                  alt={story.title}
                  className="w-full h-full object-cover"
                />

                {/* Gradient overlay for readability and depth */}
                <div className="absolute inset-0 bg-linear-to-t from-black/45 via-transparent to-transparent pointer-events-none" />

                {/* Floating Caption Overlay Box */}
                <div className="absolute bottom-4 sm:bottom-6 left-2.5 sm:left-4 right-0 bg-white rounded-l-xl rounded-r-none py-2 px-2.5 sm:py-3 sm:pl-3 sm:pr-2 shadow-md">
                  <p className="text-[11px] sm:text-xs md:text-sm font-semibold text-text-primary leading-tight line-clamp-2 md:line-clamp-2">
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
