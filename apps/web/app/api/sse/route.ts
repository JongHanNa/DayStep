// app/api/sse/route.ts - Server-Sent Events 엔드포인트
import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// SSE는 웹 환경에서만 사용
export const dynamic = 'force-dynamic';

// CORS preflight 요청 처리
export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Cache-Control, Accept, Authorization',
      'Access-Control-Max-Age': '86400', // 24시간
    },
  });
}

export async function GET(request: NextRequest) {
  console.log('🌊 SSE 연결 요청 시작');

  // SSE 응답 헤더 설정 (CORS 포함)
  const responseHeaders = new Headers({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Cache-Control, Accept, Authorization',
    'Access-Control-Allow-Credentials': 'false',
  });

  // ReadableStream으로 SSE 구현
  const stream = new ReadableStream({
    start(controller) {
      console.log('🌊 SSE 스트림 시작');

      // SSE 연결 확인 메시지
      const send = (data: any) => {
        const message = `data: ${JSON.stringify(data)}\n\n`;
        controller.enqueue(new TextEncoder().encode(message));
      };

      // 초기 연결 확인 메시지
      send({
        type: 'connection',
        message: 'SSE 연결 성공',
        timestamp: new Date().toISOString()
      });

      // Supabase 클라이언트 생성 (서버 사이드)
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );

      // 할일 변경 감지를 위한 PostgreSQL Changes 구독
      const subscription = supabase
        .channel('sse-todos-changes')
        .on(
          'postgres_changes',
          {
            event: '*', // INSERT, UPDATE, DELETE 모두 감지
            schema: 'public',
            table: 'todos'
          },
          (payload) => {
            console.log('🌊 SSE - 할일 변경 감지:', payload);
            
            // SSE로 변경사항 전송
            send({
              type: 'todos_change',
              event: payload.eventType,
              table: payload.table,
              data: payload.new || payload.old,
              timestamp: new Date().toISOString()
            });
          }
        )
        .subscribe((status) => {
          console.log('🌊 SSE - PostgreSQL Changes 구독 상태:', status);
          
          if (status === 'SUBSCRIBED') {
            send({
              type: 'subscription',
              message: 'PostgreSQL Changes 구독 성공',
              status: 'SUBSCRIBED',
              timestamp: new Date().toISOString()
            });
          } else if (status === 'CLOSED') {
            console.log('🌊 SSE - PostgreSQL Changes 구독 종료');
          }
        });

      // 주기적 연결 확인 (30초마다)
      const heartbeat = setInterval(() => {
        try {
          send({
            type: 'heartbeat',
            message: 'SSE 연결 유지',
            timestamp: new Date().toISOString()
          });
        } catch (error) {
          console.error('🌊 SSE - Heartbeat 오류:', error);
          clearInterval(heartbeat);
        }
      }, 30000);

      // 클라이언트 연결 해제 감지
      request.signal.addEventListener('abort', () => {
        console.log('🌊 SSE - 클라이언트 연결 해제');
        clearInterval(heartbeat);
        supabase.removeChannel(subscription);
        controller.close();
      });

      // 5분 후 자동 연결 해제 (리소스 보호)
      setTimeout(() => {
        console.log('🌊 SSE - 5분 타임아웃으로 연결 해제');
        clearInterval(heartbeat);
        supabase.removeChannel(subscription);
        
        send({
          type: 'timeout',
          message: 'SSE 연결 타임아웃 (5분)',
          timestamp: new Date().toISOString()
        });
        
        controller.close();
      }, 5 * 60 * 1000);
    },
  });

  return new Response(stream, {
    headers: responseHeaders,
  });
}

// 다른 HTTP 메서드는 지원하지 않음
export async function POST() {
  return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: { 'Content-Type': 'application/json' } });
}

export async function PUT() {
  return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: { 'Content-Type': 'application/json' } });
}

export async function DELETE() {
  return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: { 'Content-Type': 'application/json' } });
}