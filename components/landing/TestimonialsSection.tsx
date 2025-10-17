'use client';

import { useState } from 'react';
import { ChevronLeft, ChevronRight, Star } from 'lucide-react';

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
    text: '반복 일정 기능으로 매일 아침 루틴을 자동으로 생성할 수 있어요. 더 이상 매번 일정을 만들 필요가 없어서 너무 편해요.',
    author: '정수진',
    role: '요가 강사',
  },
];

export default function TestimonialsSection() {
  const [currentIndex, setCurrentIndex] = useState(0);

  const nextSlide = () => {
    setCurrentIndex((prev) => (prev + 1) % testimonials.length);
  };

  const prevSlide = () => {
    setCurrentIndex((prev) => (prev - 1 + testimonials.length) % testimonials.length);
  };

  const currentTestimonial = testimonials[currentIndex];

  return (
    <section className="py-20 px-4 bg-base-100">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold text-base-content mb-4">
            사용자들의 이야기
          </h2>
          <p className="text-lg text-base-content/70">
            실제 사용자들이 DayStep으로 변화를 경험했습니다
          </p>
        </div>

        {/* 슬라이더 */}
        <div className="relative">
          {/* 메인 카드 */}
          <div className="bg-base-200 rounded-3xl p-8 md:p-12 min-h-[280px] flex flex-col justify-between">
            {/* 별점 */}
            <div className="flex gap-1 mb-6">
              {[...Array(currentTestimonial.rating)].map((_, i) => (
                <Star key={i} className="w-5 h-5 fill-warning text-warning" />
              ))}
            </div>

            {/* 리뷰 텍스트 */}
            <p className="text-lg md:text-xl text-base-content leading-relaxed mb-8">
              "{currentTestimonial.text}"
            </p>

            {/* 작성자 정보 */}
            <div>
              <p className="font-semibold text-base-content">{currentTestimonial.author}</p>
              <p className="text-sm text-base-content/60">{currentTestimonial.role}</p>
            </div>
          </div>

          {/* 네비게이션 버튼 */}
          <div className="flex items-center justify-center gap-4 mt-8">
            <button
              onClick={prevSlide}
              className="btn btn-circle btn-ghost"
              aria-label="이전 후기"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>

            {/* 인디케이터 */}
            <div className="flex gap-2">
              {testimonials.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentIndex(index)}
                  className={`h-2 rounded-full transition-all ${
                    index === currentIndex
                      ? 'w-8 bg-primary'
                      : 'w-2 bg-base-content/20'
                  }`}
                  aria-label={`${index + 1}번째 후기로 이동`}
                />
              ))}
            </div>

            <button
              onClick={nextSlide}
              className="btn btn-circle btn-ghost"
              aria-label="다음 후기"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
