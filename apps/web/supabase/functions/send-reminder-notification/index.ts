import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface NotificationRequest {
  userId: string;
  type: 'todo_reminder' | 'encouragement' | 'system';
  title: string;
  body: string;
  data?: Record<string, any>;
  scheduledTime?: string;
}

interface FCMMessage {
  message: {
    token?: string;
    tokens?: string[];
    notification: {
      title: string;
      body: string;
    };
    data?: Record<string, string>;
    android?: {
      priority: 'high' | 'normal';
      notification: {
        sound: 'default';
        click_action: 'FLUTTER_NOTIFICATION_CLICK';
      };
    };
    apns?: {
      payload: {
        aps: {
          sound: 'default';
          badge?: number;
        };
      };
    };
  };
}

serve(async (req) => {
  // CORS 처리
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Supabase 클라이언트 초기화
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { userId, type, title, body, data, scheduledTime }: NotificationRequest = await req.json();

    // Processing notification request

    // 사용자의 FCM 토큰 조회
    const { data: devices, error: devicesError } = await supabase
      .from('user_devices')
      .select('fcm_token, platform')
      .eq('user_id', userId);

    if (devicesError) {
      console.error('Error fetching user devices:', devicesError);
      throw devicesError;
    }

    if (!devices || devices.length === 0) {
      // No devices found
      return new Response(
        JSON.stringify({ success: false, message: 'No devices found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const fcmTokens = devices.map(device => device.fcm_token).filter(Boolean);
    
    if (fcmTokens.length === 0) {
      console.log(`No valid FCM tokens for user ${userId}`);
      return new Response(
        JSON.stringify({ success: false, message: 'No valid FCM tokens' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // FCM 메시지 구성
    const fcmMessage: FCMMessage = {
      message: {
        notification: {
          title,
          body
        },
        data: {
          type,
          userId,
          ...(data || {}),
          ...(scheduledTime && { scheduledTime })
        },
        android: {
          priority: 'high',
          notification: {
            sound: 'default',
            click_action: 'FLUTTER_NOTIFICATION_CLICK'
          }
        },
        apns: {
          payload: {
            aps: {
              sound: 'default'
            }
          }
        }
      }
    };

    // FCM 서버 키 가져오기
    const fcmServerKey = Deno.env.get('FCM_SERVER_KEY');
    if (!fcmServerKey) {
      throw new Error('FCM_SERVER_KEY not configured');
    }

    // 각 토큰에 대해 알림 전송
    const sendPromises = fcmTokens.map(async (token) => {
      const messageWithToken = {
        ...fcmMessage,
        message: {
          ...fcmMessage.message,
          token
        }
      };

      try {
        const response = await fetch('https://fcm.googleapis.com/fcm/send', {
          method: 'POST',
          headers: {
            'Authorization': `key=${fcmServerKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            to: token,
            notification: messageWithToken.message.notification,
            data: messageWithToken.message.data,
            priority: 'high',
            content_available: true
          })
        });

        const result = await response.json();
        
        if (response.ok && result.success === 1) {
          console.log(`Notification sent successfully to token: ${token.substring(0, 20)}...`);
          return { success: true, token, result };
        } else {
          console.error(`Failed to send notification to token: ${token.substring(0, 20)}...`, result);
          return { success: false, token, error: result };
        }
      } catch (error) {
        console.error(`Error sending notification to token: ${token.substring(0, 20)}...`, error);
        return { success: false, token, error: error.message };
      }
    });

    const results = await Promise.all(sendPromises);
    const successCount = results.filter(r => r.success).length;
    const failureCount = results.length - successCount;

    // 알림 로그 저장
    const { error: logError } = await supabase
      .from('notification_logs')
      .insert({
        user_id: userId,
        notification_type: type,
        title,
        body,
        data: data || {},
        sent_at: new Date().toISOString()
      });

    if (logError) {
      console.error('Error saving notification log:', logError);
    }

    console.log(`Notification sending complete. Success: ${successCount}, Failed: ${failureCount}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Notifications sent to ${successCount} devices`,
        results: {
          total: results.length,
          success: successCount,
          failed: failureCount
        }
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error) {
    console.error('Error in send-reminder-notification function:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});