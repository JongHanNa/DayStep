import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Volume2, VolumeX, Play } from 'lucide-react';
import { useAudio } from '@/hooks/useAudio';
import { SoundType } from '@/lib/audioManager';
import { cn } from '@/lib/utils';

interface AudioSettingsProps {
  className?: string;
}

const SOUND_OPTIONS: { type: SoundType; label: string; description: string }[] = [
  { type: 'notification', label: '알림음', description: '기본 알림' },
  { type: 'success', label: '완료음', description: '포모도로 완료 시' },
  { type: 'warning', label: '경고음', description: '중요한 알림' },
  { type: 'break', label: '휴식음', description: '휴식 시작 시' },
  { type: 'focus', label: '집중음', description: '집중 시작 시' },
];

export const AudioSettings = React.memo<AudioSettingsProps>(({ className }) => {
  const {
    settings,
    isPlaying,
    setVolume,
    setEnabled,
    testSound,
    getState,
  } = useAudio();

  const handleVolumeChange = (values: number[]) => {
    setVolume(values[0]);
  };

  const handleTestSound = async (soundType: SoundType) => {
    const result = await testSound(soundType);
    if (!result) {
      console.warn(`Failed to play test sound: ${soundType}`);
    }
  };

  if (!settings.isSupported) {
    return (
      <Card className={cn('w-full', className)}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <VolumeX className="h-5 w-5" />
            오디오 설정
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">
            이 브라우저에서는 오디오가 지원되지 않습니다.
          </div>
        </CardContent>
      </Card>
    );
  }

  const debugState = getState();

  return (
    <Card className={cn('w-full', className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {settings.enabled ? (
            <Volume2 className="h-5 w-5" />
          ) : (
            <VolumeX className="h-5 w-5" />
          )}
          오디오 설정
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Audio Enable/Disable */}
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="audio-enabled">사운드 활성화</Label>
            <div className="text-sm text-muted-foreground">
              포모도로 알림음을 재생합니다
            </div>
          </div>
          <Switch
            id="audio-enabled"
            checked={settings.enabled}
            onCheckedChange={setEnabled}
          />
        </div>

        {/* Volume Control */}
        {settings.enabled && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="volume-slider">볼륨</Label>
              <span className="text-sm text-muted-foreground">
                {settings.volume}%
              </span>
            </div>
            <Slider
              id="volume-slider"
              min={0}
              max={100}
              step={5}
              value={[settings.volume]}
              onValueChange={handleVolumeChange}
              className="w-full"
            />
          </div>
        )}

        {/* Sound Testing */}
        {settings.enabled && settings.isInitialized && (
          <div className="space-y-3">
            <Label>사운드 테스트</Label>
            <div className="grid gap-2">
              {SOUND_OPTIONS.map(({ type, label, description }) => (
                <div
                  key={type}
                  className="flex items-center justify-between p-2 rounded-lg border bg-muted/50"
                >
                  <div className="flex-1">
                    <div className="text-sm font-medium">{label}</div>
                    <div className="text-xs text-muted-foreground">
                      {description}
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleTestSound(type)}
                    disabled={isPlaying}
                    className="ml-2"
                  >
                    <Play className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Debug Information (Development Only) */}
        {process.env.NODE_ENV === 'development' && (
          <div className="space-y-2 p-3 rounded-lg bg-muted/50 text-xs">
            <div className="font-medium">디버그 정보</div>
            <div>초기화됨: {debugState.isInitialized ? '예' : '아니오'}</div>
            <div>컨텍스트 상태: {debugState.contextState}</div>
            <div>
              로드된 사운드: {debugState.soundsLoaded}/{debugState.totalSounds}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
});

AudioSettings.displayName = 'AudioSettings';

export default AudioSettings;