import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // CORS 처리
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Processing scheduled reminders

    // Supabase 클라이언트 초기화
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 현재 시간 기준으로 전송해야 할 리마인더 조회
    const { data: pendingReminders, error: remindersError } = await supabase
      .rpc('get_pending_reminders');

    if (remindersError) {
      console.error('Error fetching pending reminders:', remindersError);
      throw remindersError;
    }

    if (!pendingReminders || pendingReminders.length === 0) {
      // No pending reminders found
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No pending reminders', 
          processed: 0 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Processing reminders

    // 각 리마인더에 대해 알림 전송
    const processPromises = pendingReminders.map(async (reminder: any) => {
      try {
        // 알림 전송 API 호출
        const notificationResponse = await fetch(`${supabaseUrl}/functions/v1/send-reminder-notification`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${supabaseServiceKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            userId: reminder.user_id,
            type: 'todo_reminder',
            title: '할일 알림 🔔',
            body: `"${reminder.todo_title}" 할 시간이에요!`,
            data: {
              todoId: reminder.todo_id,
              reminderId: reminder.reminder_id,
              action: 'todo_reminder'
            },
            scheduledTime: reminder.reminder_time
          })
        });

        const notificationResult = await notificationResponse.json();

        if (notificationResult.success) {
          // 성공한 리마인더는 DB에서 삭제
          const { error: deleteError } = await supabase
            .from('scheduled_reminders')
            .delete()
            .eq('id', reminder.reminder_id);

          if (deleteError) {
            console.error(`Error deleting processed reminder ${reminder.reminder_id}:`, deleteError);
          } else {
            console.log(`Processed and deleted reminder ${reminder.reminder_id}`);
          }

          return { success: true, reminderId: reminder.reminder_id };
        } else {
          console.error(`Failed to send notification for reminder ${reminder.reminder_id}:`, notificationResult);
          return { success: false, reminderId: reminder.reminder_id, error: notificationResult };
        }
      } catch (error) {
        console.error(`Error processing reminder ${reminder.reminder_id}:`, error);
        return { success: false, reminderId: reminder.reminder_id, error: error.message };
      }
    });

    const results = await Promise.all(processPromises);
    const successCount = results.filter(r => r.success).length;
    const failureCount = results.length - successCount;

    // 만료된 리마인더 정리 (1일 이상 지난 것들)
    const { data: cleanupResult } = await supabase.rpc('cleanup_expired_reminders');
    const cleanedCount = cleanupResult || 0;

    console.log(`Reminder processing complete. Success: ${successCount}, Failed: ${failureCount}, Cleaned: ${cleanedCount}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Scheduled reminders processed',
        results: {
          total: results.length,
          success: successCount,
          failed: failureCount,
          cleaned: cleanedCount
        }
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error) {
    console.error('Error in process-scheduled-reminders function:', error);
    
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