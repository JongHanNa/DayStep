/**
 * 알림 권한 요청 모달 컴포넌트
 * 사용자에게 알림 권한의 필요성을 설명하고 권한 요청을 유도
 */

"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bell, Clock, Target, TrendingUp, X } from "lucide-react";

interface NotificationPermissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRequestPermission: () => Promise<boolean>;
  onSkip?: () => void;
}

export const NotificationPermissionModal: React.FC<
  NotificationPermissionModalProps
> = ({ isOpen, onClose, onRequestPermission, onSkip }) => {
  const [isRequesting, setIsRequesting] = useState(false);
  const [hasError, setHasError] = useState(false);

  const handleRequestPermission = async () => {
    setIsRequesting(true);
    setHasError(false);

    try {
      const success = await onRequestPermission();
      if (success) {
        onClose();
      } else {
        setHasError(true);
      }
    } catch (error) {
      console.error("Permission request failed:", error);
      setHasError(true);
    } finally {
      setIsRequesting(false);
    }
  };

  const handleSkip = () => {
    onSkip?.();
    onClose();
  };

  const benefits = [
    {
      icon: Clock,
      title: "할일 리마인더",
      description: "마감일이 다가온 할일을 놓치지 않도록 알려드려요",
      color: "bg-blue-100 text-blue-600",
    },
    {
      icon: Target,
      title: "목표 알림",
      description: "새해 다짐 진행률과 달성을 도와드려요",
      color: "bg-green-100 text-green-600",
    },
    {
      icon: TrendingUp,
      title: "주간 요약",
      description: "이번 주 성과와 다음 주 계획을 정리해드려요",
      color: "bg-purple-100 text-purple-600",
    },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-blue-100 rounded-full">
                <Bell className="h-5 w-5 text-blue-600" />
              </div>
              <DialogTitle>알림 설정</DialogTitle>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          <DialogDescription>
            DayStep에서 제공하는 스마트 알림을 받으시겠어요?
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-3">
            {benefits.map((benefit, index) => (
              <div
                key={index}
                className="flex items-start gap-3 p-3 rounded-lg bg-gray-50"
              >
                <div className={`p-2 rounded-full ${benefit.color}`}>
                  <benefit.icon className="h-4 w-4" />
                </div>
                <div className="flex-1">
                  <h4 className="font-medium text-sm">{benefit.title}</h4>
                  <p className="text-xs text-gray-600 mt-1">
                    {benefit.description}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {hasError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-600 text-sm">
                알림 권한 설정에 실패했습니다. 기기 설정에서 직접 알림을
                허용해주세요.
              </p>
            </div>
          )}

          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-start gap-2">
              <Bell className="h-4 w-4 text-blue-600 mt-0.5" />
              <div>
                <h4 className="font-medium text-blue-900 text-sm">
                  개인정보 보호
                </h4>
                <p className="text-blue-700 text-xs mt-1">
                  알림은 선택적이며, 언제든지 설정에서 끄실 수 있어요. 개인
                  정보는 안전하게 보호됩니다.
                </p>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={handleSkip}
            disabled={isRequesting}
            className="w-full sm:w-auto"
          >
            나중에 하기
          </Button>
          <Button
            onClick={handleRequestPermission}
            disabled={isRequesting}
            className="w-full sm:w-auto"
          >
            {isRequesting ? "설정 중..." : "알림 허용하기"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
