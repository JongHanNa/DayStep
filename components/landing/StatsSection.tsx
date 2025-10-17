'use client';

import { Users, CheckCircle, Star, Calendar } from 'lucide-react';

const stats = [
  {
    icon: Users,
    value: '1,000+',
    label: '활성 사용자',
  },
  {
    icon: CheckCircle,
    value: '10,000+',
    label: '완료된 할일',
  },
  {
    icon: Star,
    value: '4.8',
    label: '평균 평점',
  },
  {
    icon: Calendar,
    value: '50,000+',
    label: '생성된 일정',
  },
];

export default function StatsSection() {
  return (
    <section className="py-16 px-4 bg-base-200">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold text-base-content mb-4">
            많은 사람들이 선택한 플래너
          </h2>
          <p className="text-lg text-base-content/70">
            DayStep과 함께 생산성을 높이고 있습니다
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {stats.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <div
                key={index}
                className="flex flex-col items-center justify-center p-6 bg-base-100 rounded-2xl hover:shadow-lg transition-shadow"
              >
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                  <Icon className="w-6 h-6 text-primary" />
                </div>
                <div className="text-3xl font-bold text-primary mb-2">
                  {stat.value}
                </div>
                <p className="text-sm text-base-content/70 text-center">
                  {stat.label}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
