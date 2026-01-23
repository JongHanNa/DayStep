'use client';

import { useState } from 'react';
import {
  Key,
  Copy,
  Check,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Sparkles,
  MessageSquare,
  Laptop,
  Rocket
} from 'lucide-react';
import { Capacitor } from '@capacitor/core';

/**
 * MCP 연결 가이드 - Claude Desktop에서 DayStep MCP를 연결하는 방법 안내
 *
 * 사용자가 자신의 Claude API를 통해 DayStep과 연동하도록 안내합니다.
 */
export default function MCPGuideContent() {
  const [copiedConfig, setCopiedConfig] = useState(false);
  const [expandedStep, setExpandedStep] = useState<number | null>(1);

  // Supabase URL 기반 MCP 서버 URL
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const mcpAuthUrl = `${supabaseUrl}/functions/v1/mcp-server/auth/init`;
  const mcpServerUrl = `${supabaseUrl}/functions/v1/mcp-server`;

  // MCP 설정 JSON
  const mcpConfig = {
    mcpServers: {
      daystep: {
        command: "npx",
        args: [
          "-y",
          "@anthropic-ai/mcp-remote@latest",
          mcpServerUrl,
          "--header",
          "Authorization: Bearer ${MCP_AUTH_TOKEN}"
        ]
      }
    }
  };

  // 설정 JSON 복사
  const handleCopyConfig = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(mcpConfig, null, 2));
      setCopiedConfig(true);
      setTimeout(() => setCopiedConfig(false), 2000);
    } catch (err) {
      console.error('Failed to copy config:', err);
    }
  };

  // 토큰 발급 페이지 열기
  const handleOpenAuth = async () => {
    const isNative = Capacitor.isNativePlatform();

    if (isNative) {
      try {
        // Capacitor Browser 동적 임포트
        const { Browser } = await import('@capacitor/browser');
        await Browser.open({ url: mcpAuthUrl });
      } catch (err) {
        console.error('Failed to open browser:', err);
        window.open(mcpAuthUrl, '_blank');
      }
    } else {
      window.open(mcpAuthUrl, '_blank');
    }
  };

  // 스텝 토글
  const toggleStep = (step: number) => {
    setExpandedStep(expandedStep === step ? null : step);
  };

  // 스텝 카드 컴포넌트
  const StepCard = ({
    step,
    title,
    icon: Icon,
    children
  }: {
    step: number;
    title: string;
    icon: React.ElementType;
    children: React.ReactNode;
  }) => {
    const isExpanded = expandedStep === step;

    return (
      <div className="card bg-base-200 overflow-hidden">
        <button
          onClick={() => toggleStep(step)}
          className="w-full flex items-center gap-3 p-4 text-left hover:bg-base-300/50 transition-colors"
        >
          <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
            <span className="text-sm font-semibold text-primary">{step}</span>
          </div>
          <Icon className="w-5 h-5 text-base-content/60 flex-shrink-0" />
          <span className="flex-1 font-medium">{title}</span>
          {isExpanded ? (
            <ChevronUp className="w-5 h-5 text-base-content/40" />
          ) : (
            <ChevronDown className="w-5 h-5 text-base-content/40" />
          )}
        </button>

        {isExpanded && (
          <div className="px-4 pb-4 pt-0">
            <div className="pl-11">
              {children}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* 소개 섹션 */}
      <div className="card bg-gradient-to-br from-primary/10 to-secondary/10 border border-primary/20">
        <div className="card-body p-4">
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h2 className="font-semibold text-lg">AI와 함께 계획 세우기</h2>
              <p className="text-sm text-base-content/70 mt-1">
                Claude Desktop에서 DayStep을 연결하면 AI가 할일을 자동으로 생성해줍니다.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Step 1: 토큰 발급 */}
      <StepCard step={1} title="MCP 토큰 발급" icon={Key}>
        <p className="text-sm text-base-content/70 mb-3">
          DayStep 계정을 Claude Desktop에 연결하기 위한 인증 토큰을 발급받습니다.
        </p>
        <button
          onClick={handleOpenAuth}
          className="btn btn-primary btn-sm gap-2 rounded-full"
        >
          <Key className="w-4 h-4" />
          토큰 발급받기
          <ExternalLink className="w-3 h-3" />
        </button>
        <p className="text-xs text-base-content/50 mt-2">
          로그인 후 표시되는 토큰을 복사해주세요
        </p>
      </StepCard>

      {/* Step 2: Claude Desktop 설정 */}
      <StepCard step={2} title="Claude Desktop 설정" icon={Laptop}>
        <div className="space-y-3">
          <div>
            <p className="text-sm text-base-content/70 mb-2">설정 파일 위치:</p>
            <div className="text-xs font-mono bg-base-300 p-2 rounded-lg space-y-1">
              <p><span className="text-primary">macOS:</span> ~/.config/Claude/claude_desktop_config.json</p>
              <p><span className="text-primary">Windows:</span> %APPDATA%\Claude\claude_desktop_config.json</p>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-base-content/70">설정 파일에 추가:</p>
              <button
                onClick={handleCopyConfig}
                className="btn btn-ghost btn-xs gap-1"
              >
                {copiedConfig ? (
                  <>
                    <Check className="w-3 h-3 text-success" />
                    복사됨
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    복사
                  </>
                )}
              </button>
            </div>
            <pre className="text-xs font-mono bg-base-300 p-3 rounded-lg overflow-x-auto">
              {JSON.stringify(mcpConfig, null, 2)}
            </pre>
          </div>

          <div className="alert alert-info text-xs p-2">
            <span>
              <strong>MCP_AUTH_TOKEN</strong>을 Step 1에서 발급받은 토큰으로 교체하세요
            </span>
          </div>
        </div>
      </StepCard>

      {/* Step 3: 테스트 */}
      <StepCard step={3} title="연결 테스트" icon={MessageSquare}>
        <div className="space-y-3">
          <p className="text-sm text-base-content/70">
            Claude Desktop을 재시작한 후 다음과 같이 말해보세요:
          </p>

          <div className="space-y-2">
            <div className="bg-base-300 p-3 rounded-lg">
              <p className="text-sm font-medium">&quot;송도 IT 취업 계획 세워줘&quot;</p>
            </div>
            <div className="bg-base-300 p-3 rounded-lg">
              <p className="text-sm font-medium">&quot;TOEIC 900점 목표 공부 계획 만들어줘&quot;</p>
            </div>
            <div className="bg-base-300 p-3 rounded-lg">
              <p className="text-sm font-medium">&quot;오늘 할 일 보여줘&quot;</p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-sm text-base-content/70 mt-2">
            <Rocket className="w-4 h-4 text-primary" />
            <span>AI가 질문하고 → 답변하면 → 프로젝트+할일 자동 생성!</span>
          </div>
        </div>
      </StepCard>

      {/* 도움말 */}
      <div className="text-center text-xs text-base-content/50 pt-2">
        <p>문제가 있으신가요? 설정 파일이 없다면 새로 생성하세요.</p>
      </div>
    </div>
  );
}
