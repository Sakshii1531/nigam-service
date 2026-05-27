import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X } from 'lucide-react';

// Duration each slide is shown (ms)
const SLIDE_DURATION = 4000;

// Single story panel (one full-screen view with slides & progress bars)
const StoryPanel = ({ story, isActive, onFinished, onClose }) => {
  const slides = story.slides || [];
  const [slideIndex, setSlideIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [paused, setPaused] = useState(false);
  const intervalRef = useRef(null);
  const startTimeRef = useRef(null);
  const pausedAtRef = useRef(0);
  const pointerDownTime = useRef(0);

  const totalSlides = slides.length;

  // Reset when this panel becomes active
  useEffect(() => {
    if (isActive) {
      setSlideIndex(0);
      setProgress(0);
      pausedAtRef.current = 0;
    }
  }, [isActive]);

  const goNext = useCallback(() => {
    if (slideIndex < totalSlides - 1) {
      setSlideIndex(prev => prev + 1);
      setProgress(0);
      pausedAtRef.current = 0;
    } else {
      onFinished(); // tell parent to scroll to next story
    }
  }, [slideIndex, totalSlides, onFinished]);

  const goPrev = useCallback(() => {
    if (slideIndex > 0) {
      setSlideIndex(prev => prev - 1);
      setProgress(0);
      pausedAtRef.current = 0;
    }
  }, [slideIndex]);

  // Auto-progress timer — only runs when this panel is active
  useEffect(() => {
    if (!isActive || paused) return;

    startTimeRef.current = Date.now() - (pausedAtRef.current / 100) * SLIDE_DURATION;

    intervalRef.current = setInterval(() => {
      const elapsed = Date.now() - startTimeRef.current;
      const pct = Math.min((elapsed / SLIDE_DURATION) * 100, 100);
      setProgress(pct);
      if (pct >= 100) {
        clearInterval(intervalRef.current);
        goNext();
      }
    }, 50);

    return () => clearInterval(intervalRef.current);
  }, [slideIndex, isActive, paused, goNext]);

  const handlePointerDown = () => {
    pointerDownTime.current = Date.now();
    setPaused(true);
    pausedAtRef.current = progress;
  };

  const handlePointerUp = (e) => {
    const held = Date.now() - pointerDownTime.current;
    setPaused(false);
    // Only treat as tap if held < 250ms (not a hold/pause)
    if (held < 250) {
      const { clientX, currentTarget } = e;
      const mid = currentTarget.getBoundingClientRect().width / 2;
      if (clientX > mid) goNext();
      else goPrev();
    }
  };

  const currentSlide = slides[slideIndex];

  return (
    <div
      className="relative w-full flex-shrink-0 select-none"
      style={{ height: '100dvh' }}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerLeave={() => setPaused(false)}
    >
      {/* Background image */}
      <img
        src={currentSlide?.image}
        alt={currentSlide?.caption}
        className="absolute inset-0 w-full h-full object-cover"
        style={{ userSelect: 'none', pointerEvents: 'none' }}
        draggable={false}
      />

      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/45 via-transparent to-black/65 pointer-events-none" />

      {/* Progress bars */}
      <div className="absolute top-0 left-0 right-0 flex gap-1 px-3 pt-3 z-10">
        {slides.map((_, i) => (
          <div key={i} className="flex-1 h-[2.5px] bg-white/30 rounded-full overflow-hidden">
            <div
              className="h-full bg-white rounded-full"
              style={{
                width:
                  !isActive
                    ? '0%'
                    : i < slideIndex
                    ? '100%'
                    : i === slideIndex
                    ? `${progress}%`
                    : '0%',
                transition: 'none',
              }}
            />
          </div>
        ))}
      </div>

      {/* Header */}
      <div className="absolute top-7 left-0 right-0 flex items-center justify-between px-4 pt-1 z-10">
        <div className="flex items-center gap-2 pointer-events-none">
          <div className="w-9 h-9 rounded-full overflow-hidden border-2 border-white shadow-md flex-shrink-0">
            <img
              src={story.image}
              alt={story.title}
              className="w-full h-full object-cover"
            />
          </div>
          <div className="flex flex-col">
            <span className="text-white text-[13px] font-semibold leading-tight drop-shadow">
              {story.title}
            </span>
            <span className="text-white/70 text-[10px] leading-tight">NCC</span>
          </div>
        </div>
        <button
          className="w-8 h-8 flex items-center justify-center rounded-full bg-black/30 text-white"
          onPointerDown={(e) => e.stopPropagation()}
          onPointerUp={(e) => { e.stopPropagation(); onClose(); }}
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Bottom caption */}
      {currentSlide?.caption && (
        <div className="absolute bottom-10 left-0 right-0 px-5 z-10 pointer-events-none">
          <p className="text-white text-[15px] font-medium leading-snug drop-shadow-lg">
            {currentSlide.caption}
          </p>
          {currentSlide.subCaption && (
            <p className="text-white/70 text-[12px] mt-1 leading-snug drop-shadow">
              {currentSlide.subCaption}
            </p>
          )}
        </div>
      )}
    </div>
  );
};

// Main viewer — vertical scroll container, one panel per story
const StoryViewer = ({ stories, startIndex = 0, onClose }) => {
  const [activeIndex, setActiveIndex] = useState(startIndex);
  const scrollRef = useRef(null);
  const scrollingProgrammatically = useRef(false);

  // Scroll to the correct story panel on mount / index change
  const scrollToStory = useCallback((idx) => {
    if (!scrollRef.current) return;
    scrollingProgrammatically.current = true;
    scrollRef.current.scrollTo({
      top: idx * window.innerHeight,
      behavior: 'smooth',
    });
    setTimeout(() => { scrollingProgrammatically.current = false; }, 600);
  }, []);

  // On mount: jump immediately to startIndex without animation
  useEffect(() => {
    if (scrollRef.current && startIndex > 0) {
      scrollRef.current.scrollTop = startIndex * window.innerHeight;
    }
  }, [startIndex]);

  // Track which story is visible via scroll position
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const handleScroll = () => {
      if (scrollingProgrammatically.current) return;
      const idx = Math.round(el.scrollTop / window.innerHeight);
      if (idx !== activeIndex) setActiveIndex(idx);
    };
    el.addEventListener('scroll', handleScroll, { passive: true });
    return () => el.removeEventListener('scroll', handleScroll);
  }, [activeIndex]);

  // When a story finishes all its slides → scroll to next story
  const handleStoryFinished = useCallback((idx) => {
    if (idx < stories.length - 1) {
      const next = idx + 1;
      setActiveIndex(next);
      scrollToStory(next);
    } else {
      onClose();
    }
  }, [stories.length, scrollToStory, onClose]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[100] bg-black">
      {/* Vertically scrollable snap container */}
      <div
        ref={scrollRef}
        className="w-full h-full overflow-y-scroll no-scrollbar"
        style={{ scrollSnapType: 'y mandatory' }}
      >
        {stories.map((story, idx) => (
          <div
            key={story.id}
            style={{ scrollSnapAlign: 'start', height: '100dvh' }}
          >
            <StoryPanel
              story={story}
              isActive={idx === activeIndex}
              onFinished={() => handleStoryFinished(idx)}
              onClose={onClose}
            />
          </div>
        ))}
      </div>
    </div>
  );
};

export default StoryViewer;
