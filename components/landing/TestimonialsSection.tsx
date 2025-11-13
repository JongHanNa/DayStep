'use client';

import { useState } from 'react';
import { ChevronLeft, ChevronRight, Star } from 'lucide-react';
import { motion } from 'framer-motion';
import { fadeInUpVariants, getViewportOptions } from '@/lib/animations/scrollAnimations';

const testimonials = [
  {
    rating: 5,
    text: '계획을 세우고 습관을 만드는 데 어려움이 있었는데, DayStep이 완전히 바꿔놓았어요. 시각적으로 일정을 관리할 수 있어서 훨씬 편해요.',
    author: '김민지',
    role: '프리랜서 디자이너',
  },
  {
    rating: 5,
    text: '타임라인 뷰가 정말 직관적이에요. 하루 일정을 한눈에 볼 수 있어서 시간 관리가 훨씬 쉬워졌습니다. 강력 추천합니다!',
    author: '이준호',
    role: '스타트업 개발자',
  },
  {
    rating: 5,
    text: 'Second Brain 기능 덕분에 생각을 체계적으로 정리할 수 있게 되었어요. 프로젝트 관리와 개인 일정을 한 곳에서 관리할 수 있어 정말 편리해요.',
    author: '박서연',
    role: '마케터',
  },
  {
    rating: 5,
    text: 'AI 추천 기능이 생각보다 유용해요. 바쁜 아침에 해야 할 일을 자동으로 제안해주니 결정 피로가 줄어들었습니다.',
    author: '최동욱',
    role: '대학원생',
  },
  {
    rating: 5,
    text: '모바일과 웹에서 동기화가 완벽해요. 어디서든 일정을 확인하고 수정할 수 있어서 정말 편리합니다.',
    author: '정수빈',
    role: '회사원',
  },
];

export default function TestimonialsSection() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const fadeInVariants = fadeInUpVariants(80);
  const viewportOptions = getViewportOptions(true, 0.3);

  const nextSlide = () => {
    setCurrentIndex((prev) => (prev + 1) % testimonials.length);
  };

  const prevSlide = () => {
    setCurrentIndex((prev) => (prev - 1 + testimonials.length) % testimonials.length);
  };

  const currentTestimonial = testimonials[currentIndex];

  return (
    <motion.section
      id="testimonials"
      className="py-20 px-4 bg-base-100"
      variants={fadeInVariants}
      initial="hidden"
      whileInView="visible"
      viewport={viewportOptions}
    >
      <div className="max-w-4xl mx-auto">
        {/* Section Header */}
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold text-base-content mb-4">
            사용자 후기
          </h2>
          <p className="text-lg text-base-content/70">
            실제 사용자들의 생생한 이야기
          </p>
        </div>

        {/* Testimonial Slider */}
        <div className="relative">
          <div className="bg-base-200 rounded-2xl p-8 sm:p-12 shadow-lg">
            {/* Stars */}
            <div className="flex justify-center gap-1 mb-6">
              {Array.from({ length: currentTestimonial.rating }).map((_, i) => (
                <Star key={i} className="w-6 h-6 fill-warning text-warning" />
              ))}
            </div>

            {/* Quote */}
            <p className="text-lg sm:text-xl text-base-content text-center mb-8 leading-relaxed">
              "{currentTestimonial.text}"
            </p>

            {/* Author */}
            <div className="text-center">
              <p className="font-semibold text-base-content">
                {currentTestimonial.author}
              </p>
              <p className="text-sm text-base-content/60">
                {currentTestimonial.role}
              </p>
            </div>
          </div>

          {/* Navigation Buttons */}
          <div className="flex justify-center gap-4 mt-8">
            <button
              onClick={prevSlide}
              className="btn btn-circle btn-outline"
              aria-label="Previous testimonial"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={nextSlide}
              className="btn btn-circle btn-outline"
              aria-label="Next testimonial"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          {/* Dots */}
          <div className="flex justify-center gap-2 mt-6">
            {testimonials.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentIndex(index)}
                className={`w-2 h-2 rounded-full transition-all ${
                  index === currentIndex
                    ? 'bg-primary w-8'
                    : 'bg-base-content/30'
                }`}
                aria-label={`Go to testimonial ${index + 1}`}
              />
            ))}
          </div>
        </div>
      </div>
    </motion.section>
  );
}
