/**
 * SlidesViewer Component
 * Renders slides with keyboard navigation and fade transitions
 * 
 * Props: { slides: { title: string, content: string }[] }
 * Features:
 * - Render one slide at a time
 * - Show: title (large, bold), content (body text), slide counter
 * - Keyboard navigation: left/right arrow keys
 * - Click left/right side of screen to navigate
 * - Fade transition between slides
 * - Export PNG button
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Button, Card } from 'antd';

interface Slide {
  title: string;
  content: string;
}

interface SlidesViewerProps {
  slides: Slide[];
}

export default function SlidesViewer({ slides }: SlidesViewerProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [direction, setDirection] = useState<'left' | 'right'>('right');
  const slideRef = useRef<HTMLDivElement>(null);

  const totalSlides = slides.length;

  const goToSlide = useCallback((index: number, dir: 'left' | 'right') => {
    if (isTransitioning || index < 0 || index >= totalSlides) return;
    
    setIsTransitioning(true);
    setDirection(dir);
    
    setTimeout(() => {
      setCurrentIndex(index);
      setIsTransitioning(false);
    }, 300);
  }, [isTransitioning, totalSlides]);

  const goNext = useCallback(() => {
    if (currentIndex < totalSlides - 1) {
      goToSlide(currentIndex + 1, 'right');
    }
  }, [currentIndex, totalSlides, goToSlide]);

  const goPrev = useCallback(() => {
    if (currentIndex > 0) {
      goToSlide(currentIndex - 1, 'left');
    }
  }, [currentIndex, goToSlide]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault();
        goNext();
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault();
        goPrev();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [goNext, goPrev]);

  // Export PNG
  const exportPNG = useCallback(() => {
    if (!slideRef.current) return;

    const slide = slideRef.current;
    const serializer = new XMLSerializer();
    const svgStr = serializer.serializeToString(slide);
    
    // For HTML slides, use html2canvas approach with DOM
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    // Create a simple canvas render of the slide
    canvas.width = 960;
    canvas.height = 540;
    
    if (ctx) {
      // White background
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Title
      ctx.fillStyle = '#1890ff';
      ctx.font = 'bold 36px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(slides[currentIndex].title, canvas.width / 2, 150);
      
      // Content
      ctx.fillStyle = '#333333';
      ctx.font = '20px Arial';
      const lines = slides[currentIndex].content.split('\n');
      let y = 220;
      lines.forEach(line => {
        // Word wrap
        const maxWidth = canvas.width - 100;
        const words = line.split('');
        let currentLine = '';
        
        words.forEach(char => {
          const testLine = currentLine + char;
          const metrics = ctx.measureText(testLine);
          if (metrics.width > maxWidth && currentLine !== '') {
            ctx.fillText(currentLine, canvas.width / 2, y);
            y += 30;
            currentLine = char;
          } else {
            currentLine = testLine;
          }
        });
        if (currentLine) {
          ctx.fillText(currentLine, canvas.width / 2, y);
          y += 30;
        }
      });
      
      // Slide number
      ctx.fillStyle = '#888888';
      ctx.font = '16px Arial';
      ctx.fillText(`${currentIndex + 1} / ${totalSlides}`, canvas.width / 2, canvas.height - 40);
      
      canvas.toBlob(blob => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `slide-${currentIndex + 1}.png`;
        a.click();
        URL.revokeObjectURL(url);
      });
    }
  }, [currentIndex, slides, totalSlides]);

  // Click handlers for left/right navigation
  const handleSlideClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const halfWidth = rect.width / 2;
    
    if (clickX < halfWidth) {
      goPrev();
    } else {
      goNext();
    }
  }, [goNext, goPrev]);

  if (!slides || slides.length === 0) {
    return (
      <Card size="small" style={{ marginTop: 16 }}>
        <div style={{ textAlign: 'center', padding: 40, color: '#888' }}>
          暂无幻灯片内容
        </div>
      </Card>
    );
  }

  const currentSlide = slides[currentIndex];

  return (
    <Card 
      size="small" 
      style={{ marginTop: 16 }} 
      title="幻灯片"
      extra={
        <Button size="small" onClick={exportPNG}>
          导出 PNG
        </Button>
      }
    >
      <div
        ref={slideRef}
        onClick={handleSlideClick}
        style={{
          position: 'relative',
          width: '100%',
          height: 400,
          background: '#ffffff',
          borderRadius: 8,
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          overflow: 'hidden',
          cursor: 'pointer',
          userSelect: 'none'
        }}
      >
        {/* Transition overlay */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            opacity: isTransitioning ? 0 : 1,
            transition: 'opacity 300ms ease-in-out',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 40
          }}
        >
          {/* Slide number indicator */}
          <div
            style={{
              position: 'absolute',
              top: 16,
              right: 20,
              fontSize: 14,
              color: '#888'
            }}
          >
            {currentIndex + 1} / {totalSlides}
          </div>

          {/* Title */}
          <h2
            style={{
              fontSize: 28,
              fontWeight: 'bold',
              color: '#1890ff',
              marginBottom: 24,
              textAlign: 'center'
            }}
          >
            {currentSlide.title}
          </h2>

          {/* Content */}
          <div
            style={{
              fontSize: 16,
              color: '#333',
              lineHeight: 1.8,
              textAlign: 'center',
              maxWidth: 700,
              whiteSpace: 'pre-wrap'
            }}
          >
            {currentSlide.content}
          </div>

          {/* Navigation hint */}
          <div
            style={{
              position: 'absolute',
              bottom: 16,
              fontSize: 12,
              color: '#aaa'
            }}
          >
            点击左右侧或使用 ← → 键翻页
          </div>
        </div>

        {/* Left navigation area indicator */}
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            bottom: 0,
            width: '30%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-start',
            paddingLeft: 20,
            opacity: 0
          }}
          className="nav-hint"
        >
          <span style={{ fontSize: 24, color: '#ccc' }}>‹</span>
        </div>

        {/* Right navigation area indicator */}
        <div
          style={{
            position: 'absolute',
            right: 0,
            top: 0,
            bottom: 0,
            width: '30%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            paddingRight: 20,
            opacity: 0
          }}
          className="nav-hint"
        >
          <span style={{ fontSize: 24, color: '#ccc' }}>›</span>
        </div>
      </div>

      {/* Navigation buttons */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: 16,
          marginTop: 16
        }}
      >
        <Button
          onClick={goPrev}
          disabled={currentIndex === 0}
        >
          上一页
        </Button>
        <span style={{ color: '#666', minWidth: 60, textAlign: 'center' }}>
          {currentIndex + 1} / {totalSlides}
        </span>
        <Button
          onClick={goNext}
          disabled={currentIndex === totalSlides - 1}
        >
          下一页
        </Button>
      </div>
    </Card>
  );
}
