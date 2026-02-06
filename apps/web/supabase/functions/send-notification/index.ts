import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.52.0';

interface NotificationRequest {
  userId?: string;
  userIds?: string[];
  title: string;
  body: string;
  data?: Record<string, any>;
  type?: 'general' | 'todo_reminder' | 'weekly_summary';
}

interface FCMMessage {
  to?: string;
  registration_ids?: string[];
  notification: {
    title: string;
    body: string;
    icon?: string;
    click_action?: string;
  };
  data?: Record<string, string>;
  priority: string;
  content_available: boolean;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
  // CORS preflight 처리
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // 환경 변수 확인
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const fcmServerKey = Deno.env.get('FCM_SERVER_KEY');

    if (!fcmServerKey) {
      throw new Error('FCM_SERVER_KEY environment variable is required');
    }

    // Supabase 클라이언트 생성 (서비스 키 사용)
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 요청 파싱
    const notificationRequest: NotificationRequest = await req.json();
    const { userId, userIds, title, body, data = {}, type = 'general' } = notificationRequest;

    // 사용자 ID 목록 구성
    const targetUserIds = userIds || (userId ? [userId] : []);
    
    if (targetUserIds.length === 0) {
      return new Response(
        JSON.stringify({ error: 'userId or userIds is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log(`Sending notification to ${targetUserIds.length} users`);

    // 각 사용자별로 FCM 토큰 조회 및 알림 전송
    const results = await Promise.allSettled(
      targetUserIds.map(async (currentUserId) => {
        return await sendNotificationToUser(
          supabase,
          fcmServerKey,
          currentUserId,
          title,
          body,
          data,
          type
        );
      })
    );

    // 결과 집계
    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;

    console.log(`Notification results: ${successful} successful, ${failed} failed`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        sent: successful, 
        failed: failed,
        results: results.map(r => r.status === 'rejected' ? r.reason : 'success')
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error in send-notification function:', error);
    
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        message: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

/**
 * 특정 사용자에게 알림 전송
 */
async function sendNotificationToUser(
  supabase: any,
  fcmServerKey: string,
  userId: string,
  title: string,
  body: string,
  data: Record<string, any>,
  type: string
): Promise<void> {
  // 사용자의 FCM 토큰 조회
  const { data: devices, error: devicesError } = await supabase
    .from('user_devices')
    .select('fcm_token, platform')
    .eq('user_id', userId);

  if (devicesError) {
    throw new Error(`Failed to fetch devices for user ${userId}: ${devicesError.message}`);
  }

  if (!devices || devices.length === 0) {
    console.log(`No devices found for user ${userId}`);
    return;
  }

  const fcmTokens = devices.map((device: any) => device.fcm_token);
  console.log(`Found ${fcmTokens.length} devices for user ${userId}`);

  // 알림 로그 생성
  const notificationLogId = crypto.randomUUID();
  const { error: logError } = await supabase
    .from('notification_logs')
    .insert({
      id: notificationLogId,
      user_id: userId,
      title,
      body,
      data,
      type,
      status: 'pending'
    });

  if (logError) {
    console.error('Failed to create notification log:', logError);
  }

  try {
    // FCM 메시지 구성
    const fcmMessage: FCMMessage = {
      registration_ids: fcmTokens,
      notification: {
        title,
        body,
        icon: '/icons/icon-192x192.png',
        click_action: data.route || '/'
      },
      data: {
        notificationId: notificationLogId,
        type,
        ...Object.fromEntries(
          Object.entries(data).map(([key, value]) => [key, String(value)])
        )
      },
      priority: 'high',
      content_available: true
    };

    // FCM API 호출
    const fcmResponse = await fetch('https://fcm.googleapis.com/fcm/send', {
      method: 'POST',
      headers: {
        'Authorization': `key=${fcmServerKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(fcmMessage),
    });

    const fcmResult = await fcmResponse.json();
    
    if (!fcmResponse.ok) {
      throw new Error(`FCM API error: ${fcmResult.error}`);
    }

    console.log('FCM response:', fcmResult);

    // 성공한 토큰과 실패한 토큰 분리
    const { success = 0, failure = 0, results = [] } = fcmResult;
    
    // 알림 로그 상태 업데이트
    await supabase
      .from('notification_logs')
      .update({ 
        status: success > 0 ? 'sent' : 'failed',
        sent_at: success > 0 ? new Date().toISOString() : null
      })
      .eq('id', notificationLogId);

    // 실패한 토큰들 처리 (토큰 만료, 잘못된 토큰 등)
    if (failure > 0 && results) {
      const invalidTokens: string[] = [];
      
      results.forEach((result: any, index: number) => {
        if (result.error) {
          console.error(`Token ${fcmTokens[index]} failed:`, result.error);
          
          // 토큰이 유효하지 않은 경우 DB에서 제거
          if (result.error === 'InvalidRegistration' || 
              result.error === 'NotRegistered' ||
              result.error === 'InvalidToken') {
            invalidTokens.push(fcmTokens[index]);
          }
        }
      });

      // 유효하지 않은 토큰들 DB에서 제거
      if (invalidTokens.length > 0) {
        await supabase
          .from('user_devices')
          .delete()
          .in('fcm_token', invalidTokens);
        
        console.log(`Removed ${invalidTokens.length} invalid tokens`);
      }
    }

    if (success === 0) {
      throw new Error(`All tokens failed for user ${userId}`);
    }

  } catch (error) {
    // 알림 로그 실패 상태로 업데이트
    await supabase
      .from('notification_logs')
      .update({ status: 'failed' })
      .eq('id', notificationLogId);
    
    throw error;
  }
}