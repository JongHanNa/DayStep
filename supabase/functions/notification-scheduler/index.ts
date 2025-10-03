import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.52.0';

interface ScheduledNotification {
  id: string;
  user_id: string;
  title: string;
  body: string;
  data: Record<string, any>;
  type: string;
  scheduled_for: string;
  repeat_pattern: string;
  repeat_until?: string;
  is_active: boolean;
  last_sent_at?: string;
}

serve(async (req) => {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    console.log('Starting notification scheduler...');
    
    // 현재 시간 기준으로 전송해야 할 알림 조회
    const now = new Date();
    const { data: scheduledNotifications, error } = await supabase
      .from('scheduled_notifications')
      .select('*')
      .eq('is_active', true)
      .lte('scheduled_for', now.toISOString())
      .order('scheduled_for', { ascending: true })
      .limit(100); // 한 번에 최대 100개 처리

    if (error) {
      throw new Error(`Failed to fetch scheduled notifications: ${error.message}`);
    }

    if (!scheduledNotifications || scheduledNotifications.length === 0) {
      console.log('No scheduled notifications to process');
      return new Response(
        JSON.stringify({ message: 'No notifications to process', processed: 0 }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Processing ${scheduledNotifications.length} scheduled notifications`);

    // 각 알림 처리
    const results = await Promise.allSettled(
      scheduledNotifications.map(async (notification: ScheduledNotification) => {
        return await processScheduledNotification(supabase, notification);
      })
    );

    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;

    console.log(`Scheduler results: ${successful} successful, ${failed} failed`);

    return new Response(
      JSON.stringify({ 
        message: 'Notification scheduler completed',
        processed: scheduledNotifications.length,
        successful,
        failed
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in notification scheduler:', error);
    
    return new Response(
      JSON.stringify({ 
        error: 'Scheduler error',
        message: error.message 
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});

/**
 * 예약된 알림 처리
 */
async function processScheduledNotification(
  supabase: any,
  notification: ScheduledNotification
): Promise<void> {
  const { id, user_id, title, body, data, type, repeat_pattern, repeat_until } = notification;
  
  try {
    // 사용자의 알림 설정 확인
    const { data: settings } = await supabase
      .from('notification_settings')
      .select('*')
      .eq('user_id', user_id)
      .single();

    // 알림 설정에 따른 필터링
    if (settings && !shouldSendNotification(type, settings)) {
      console.log(`Notification ${id} skipped due to user settings`);
      await updateNotificationAfterSend(supabase, notification);
      return;
    }

    // Do Not Disturb 시간 확인
    if (settings && isInQuietHours(settings)) {
      console.log(`Notification ${id} skipped due to quiet hours`);
      // 조용한 시간에는 나중에 다시 시도하도록 일정 조정
      await rescheduleNotification(supabase, notification);
      return;
    }

    // 알림 전송 API 호출
    const sendResponse = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/send-notification`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId: user_id,
        title,
        body,
        data,
        type
      })
    });

    if (!sendResponse.ok) {
      throw new Error(`Failed to send notification: ${sendResponse.statusText}`);
    }

    console.log(`Notification ${id} sent successfully`);

    // 알림 전송 후 처리 (반복 설정, 비활성화 등)
    await updateNotificationAfterSend(supabase, notification);

  } catch (error) {
    console.error(`Error processing notification ${id}:`, error);
    
    // 실패한 알림은 다음 스케줄로 미루거나 비활성화
    await handleNotificationFailure(supabase, notification, error);
    throw error;
  }
}

/**
 * 사용자 설정에 따른 알림 전송 여부 결정
 */
function shouldSendNotification(type: string, settings: any): boolean {
  switch (type) {
    case 'todo_reminder':
      return settings.todo_reminders;
    case 'weekly_summary':
      return settings.weekly_summaries;
    case 'daily_digest':
      return settings.daily_digest;
    default:
      return true;
  }
}

/**
 * 조용한 시간(Do Not Disturb) 확인
 */
function isInQuietHours(settings: any): boolean {
  if (!settings.quiet_hours_start || !settings.quiet_hours_end) {
    return false;
  }

  const now = new Date();
  const currentTime = now.toTimeString().substring(0, 5); // HH:MM 형식
  
  const quietStart = settings.quiet_hours_start;
  const quietEnd = settings.quiet_hours_end;

  // 시간대 고려한 정확한 구현이 필요하지만, 간단한 버전으로 구현
  if (quietStart <= quietEnd) {
    // 예: 22:00 - 08:00
    return currentTime >= quietStart && currentTime <= quietEnd;
  } else {
    // 예: 23:00 - 07:00 (자정을 넘나드는 경우)
    return currentTime >= quietStart || currentTime <= quietEnd;
  }
}

/**
 * 조용한 시간 때문에 연기된 알림 재스케줄링
 */
async function rescheduleNotification(
  supabase: any,
  notification: ScheduledNotification
): Promise<void> {
  // 다음 가능한 시간으로 재스케줄 (조용한 시간 종료 후)
  const nextSchedule = new Date();
  nextSchedule.setHours(8, 0, 0, 0); // 기본적으로 오전 8시로 설정
  
  if (nextSchedule <= new Date()) {
    nextSchedule.setDate(nextSchedule.getDate() + 1);
  }

  await supabase
    .from('scheduled_notifications')
    .update({ scheduled_for: nextSchedule.toISOString() })
    .eq('id', notification.id);
}

/**
 * 알림 전송 후 처리 (반복 설정, 다음 스케줄 등)
 */
async function updateNotificationAfterSend(
  supabase: any,
  notification: ScheduledNotification
): Promise<void> {
  const { id, repeat_pattern, repeat_until, scheduled_for } = notification;
  const currentSchedule = new Date(scheduled_for);
  const now = new Date();

  // 반복 알림이 아니거나 반복 종료 시간이 지난 경우
  if (repeat_pattern === 'none' || 
      (repeat_until && new Date(repeat_until) <= now)) {
    // 알림 비활성화
    await supabase
      .from('scheduled_notifications')
      .update({ 
        is_active: false,
        last_sent_at: now.toISOString()
      })
      .eq('id', id);
    return;
  }

  // 다음 반복 일정 계산
  const nextSchedule = calculateNextSchedule(currentSchedule, repeat_pattern);
  
  if (nextSchedule && (!repeat_until || nextSchedule <= new Date(repeat_until))) {
    // 다음 스케줄로 업데이트
    await supabase
      .from('scheduled_notifications')
      .update({ 
        scheduled_for: nextSchedule.toISOString(),
        last_sent_at: now.toISOString()
      })
      .eq('id', id);
  } else {
    // 반복 종료
    await supabase
      .from('scheduled_notifications')
      .update({ 
        is_active: false,
        last_sent_at: now.toISOString()
      })
      .eq('id', id);
  }
}

/**
 * 다음 반복 일정 계산
 */
function calculateNextSchedule(currentSchedule: Date, repeatPattern: string): Date | null {
  const nextSchedule = new Date(currentSchedule);

  switch (repeatPattern) {
    case 'daily':
      nextSchedule.setDate(nextSchedule.getDate() + 1);
      break;
    case 'weekly':
      nextSchedule.setDate(nextSchedule.getDate() + 7);
      break;
    case 'monthly':
      nextSchedule.setMonth(nextSchedule.getMonth() + 1);
      break;
    case 'yearly':
      nextSchedule.setFullYear(nextSchedule.getFullYear() + 1);
      break;
    default:
      return null;
  }

  return nextSchedule;
}

/**
 * 알림 전송 실패 처리
 */
async function handleNotificationFailure(
  supabase: any,
  notification: ScheduledNotification,
  error: any
): Promise<void> {
  console.error(`Handling failure for notification ${notification.id}:`, error);
  
  // 실패한 알림은 30분 후 재시도
  const retryTime = new Date();
  retryTime.setMinutes(retryTime.getMinutes() + 30);

  await supabase
    .from('scheduled_notifications')
    .update({ 
      scheduled_for: retryTime.toISOString()
    })
    .eq('id', notification.id);
}