'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { useSettingsStore } from '@/state/stores/settingsStore';
import { COMPLETION_BEHAVIOR_OPTIONS } from '@/types/settings';
import { cn } from '@/lib/utils';

export default function TodoCompletionSettings() {
  const { 
    todoCompletion, 
    setCompletionBehavior, 
    setShowCompletedItems, 
    setCompletedItemsOpacity 
  } = useSettingsStore();

  const handleBehaviorChange = (value: string) => {
    setCompletionBehavior(value as any);
  };

  const handleOpacityChange = (value: number[]) => {
    setCompletedItemsOpacity(value[0]);
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          ✅ 할일 완료 동작 설정
        </CardTitle>
        <CardDescription>
          할일을 완료했을 때 어떻게 표시할지 선택하세요
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* 완료 동작 방식 선택 */}
        <div className="space-y-4">
          <Label className="text-sm font-medium">완료 시 동작 방식</Label>
          <RadioGroup
            value={todoCompletion.behavior}
            onValueChange={handleBehaviorChange}
            className="space-y-3"
          >
            {COMPLETION_BEHAVIOR_OPTIONS.map((option) => (
              <div key={option.value} className="flex items-start space-x-3">
                <RadioGroupItem 
                  value={option.value} 
                  id={option.value}
                  className="mt-1"
                />
                <div className="flex-1 space-y-1">
                  <Label 
                    htmlFor={option.value}
                    className="font-medium cursor-pointer flex items-center gap-2"
                  >
                    <span>{option.icon}</span>
                    {option.label}
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    {option.description}
                  </p>
                  
                  {/* 미리보기 예시 */}
                  <div className="mt-2 p-3 bg-muted/50 rounded-md">
                    <div className="text-xs text-muted-foreground mb-1">미리보기:</div>
                    <div 
                      className={cn(
                        "text-sm p-2 bg-background rounded border",
                        option.value === 'strikethrough-inline' && todoCompletion.behavior === 'strikethrough-inline' 
                          ? `line-through opacity-70 text-muted-foreground`
                          : ""
                      )}
                      style={{
                        opacity: option.value === 'strikethrough-inline' 
                          ? todoCompletion.completedItemsOpacity 
                          : 1
                      }}
                    >
                      {option.value === 'move-to-completed' 
                        ? "📋 완료된 할일이 여기로 이동됩니다"
                        : "📝 완료된 할일이 취소선으로 표시됩니다"
                      }
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </RadioGroup>
        </div>

        {/* 취소선 모드 전용 설정 */}
        {todoCompletion.behavior === 'strikethrough-inline' && (
          <div className="space-y-4 p-4 bg-muted/30 rounded-lg border-l-4 border-primary/50">
            <div className="text-sm font-medium text-primary">
              ✏️ 취소선 모드 상세 설정
            </div>
            
            {/* 완료된 할일 표시 여부 */}
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label className="text-sm font-medium">완료된 할일 표시</Label>
                <p className="text-xs text-muted-foreground">
                  완료된 할일을 타임라인에서 숨기거나 표시할 수 있습니다
                </p>
              </div>
              <Switch
                checked={todoCompletion.showCompletedItems}
                onCheckedChange={setShowCompletedItems}
              />
            </div>

            {/* 투명도 설정 */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">완료된 할일 투명도</Label>
                <span className="text-xs text-muted-foreground">
                  {Math.round(todoCompletion.completedItemsOpacity * 100)}%
                </span>
              </div>
              <Slider
                value={[todoCompletion.completedItemsOpacity]}
                onValueChange={handleOpacityChange}
                min={0.3}
                max={1}
                step={0.1}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>희미하게 (30%)</span>
                <span>선명하게 (100%)</span>
              </div>
            </div>
          </div>
        )}

        {/* 설정 요약 */}
        <div className="text-xs text-muted-foreground p-3 bg-muted/30 rounded border">
          <div className="font-medium mb-1">현재 설정:</div>
          <div>
            완료 동작: <span className="font-medium">
              {COMPLETION_BEHAVIOR_OPTIONS.find(opt => opt.value === todoCompletion.behavior)?.label}
            </span>
          </div>
          {todoCompletion.behavior === 'strikethrough-inline' && (
            <>
              <div>완료된 할일 표시: <span className="font-medium">
                {todoCompletion.showCompletedItems ? '표시함' : '숨김'}
              </span></div>
              <div>투명도: <span className="font-medium">
                {Math.round(todoCompletion.completedItemsOpacity * 100)}%
              </span></div>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}