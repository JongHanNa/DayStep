'use client';

import { memo } from 'react';
import { motion } from 'framer-motion';
import { Bot, User, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import type { ChatMessage as ChatMessageType } from '@/state/stores/aiPlanningStore';
import ReactMarkdown from 'react-markdown';

interface ChatMessageProps {
  message: ChatMessageType;
}

/**
 * 채팅 메시지 컴포넌트
 */
function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === 'user';
  const isStreaming = message.isStreaming;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex gap-3 ${isUser ? 'flex-row-reverse' : ''}`}
    >
      {/* 아바타 */}
      <div
        className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
          isUser ? 'bg-primary' : 'bg-secondary'
        }`}
      >
        {isUser ? (
          <User className="w-4 h-4 text-primary-content" />
        ) : (
          <Bot className="w-4 h-4 text-secondary-content" />
        )}
      </div>

      {/* 메시지 내용 */}
      <div
        className={`flex-1 max-w-[80%] ${isUser ? 'text-right' : ''}`}
      >
        <div
          className={`inline-block p-3 rounded-2xl ${
            isUser
              ? 'bg-primary text-primary-content rounded-br-sm'
              : 'bg-base-200 rounded-bl-sm'
          }`}
        >
          {/* 텍스트 내용 */}
          {message.content ? (
            <div className="prose prose-sm max-w-none">
              <ReactMarkdown
                components={{
                  // 코드 블록 스타일링
                  code: ({ className, children, ...props }) => {
                    const isInline = !className;
                    return isInline ? (
                      <code
                        className="bg-base-300 px-1 py-0.5 rounded text-xs"
                        {...props}
                      >
                        {children}
                      </code>
                    ) : (
                      <code
                        className="block bg-base-300 p-2 rounded text-xs overflow-x-auto"
                        {...props}
                      >
                        {children}
                      </code>
                    );
                  },
                  // 리스트 스타일링
                  ul: ({ children }) => (
                    <ul className="list-disc list-inside space-y-1 my-2">
                      {children}
                    </ul>
                  ),
                  ol: ({ children }) => (
                    <ol className="list-decimal list-inside space-y-1 my-2">
                      {children}
                    </ol>
                  ),
                  // 단락 스타일링
                  p: ({ children }) => (
                    <p className="mb-2 last:mb-0">{children}</p>
                  ),
                }}
              >
                {message.content}
              </ReactMarkdown>
            </div>
          ) : isStreaming ? (
            <div className="flex items-center gap-2 text-sm text-base-content/60">
              <Loader2 className="w-4 h-4 animate-spin" />
              생각 중...
            </div>
          ) : null}

          {/* 스트리밍 인디케이터 */}
          {isStreaming && message.content && (
            <span className="inline-block w-2 h-4 bg-current animate-pulse ml-1" />
          )}
        </div>

        {/* Tool 결과 */}
        {message.toolResults && message.toolResults.length > 0 && (
          <div className="mt-2 space-y-2">
            {message.toolResults.map((result, index) => (
              <ToolResultCard
                key={index}
                toolName={result.tool}
                result={result.result}
                isError={result.isError}
              />
            ))}
          </div>
        )}

        {/* 타임스탬프 */}
        <div
          className={`text-xs text-base-content/40 mt-1 ${
            isUser ? 'text-right' : ''
          }`}
        >
          {message.timestamp.toLocaleTimeString('ko-KR', {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </div>
      </div>
    </motion.div>
  );
}

/**
 * Tool 결과 카드
 */
function ToolResultCard({
  toolName,
  result,
  isError,
}: {
  toolName: string;
  result: unknown;
  isError?: boolean;
}) {
  const resultData = result as Record<string, unknown>;
  const isSuccess = resultData?.success === true;

  // 도구 이름 한글 변환
  const toolNameKorean: Record<string, string> = {
    create_project_with_todos: '프로젝트 생성',
    list_projects: '프로젝트 목록',
    get_today_summary: '오늘 요약',
    create_todo: '할일 생성',
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`p-3 rounded-lg text-sm ${
        isError ? 'bg-error/10 border border-error/20' : 'bg-success/10 border border-success/20'
      }`}
    >
      <div className="flex items-center gap-2 mb-2">
        {isError ? (
          <AlertCircle className="w-4 h-4 text-error" />
        ) : (
          <CheckCircle className="w-4 h-4 text-success" />
        )}
        <span className="font-medium">
          {toolNameKorean[toolName] || toolName}
        </span>
      </div>

      {/* 결과 메시지 */}
      {Boolean(resultData?.message) && (
        <p className="text-base-content/80">{String(resultData.message)}</p>
      )}

      {/* 생성된 항목 정보 */}
      {Boolean(resultData?.project) && (
        <div className="mt-2 p-2 bg-base-100 rounded text-xs">
          <p className="font-medium">
            📁 {(resultData.project as Record<string, string>).title}
          </p>
          {resultData.todos_count !== null && resultData.todos_count !== undefined && (
            <p className="text-base-content/60 mt-1">
              {String(resultData.todos_count)}개 할일 생성됨
              {resultData.subtasks_count !== null && resultData.subtasks_count !== undefined && (
                <> ({String(resultData.subtasks_count)}개 서브태스크)</>
              )}
            </p>
          )}
        </div>
      )}
    </motion.div>
  );
}

export default memo(ChatMessage);
