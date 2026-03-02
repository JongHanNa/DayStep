import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/admin/auth';

export async function GET(req: NextRequest) {
  try {
    const auth = await verifyAdmin(req);
    if (!auth.authorized) return auth.response;

    const { serviceClient } = auth;
    const { data, error } = await (serviceClient as any)
      .from('plan_limits')
      .select('*')
      .order('entity_type')
      .order('tier');

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ data });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const auth = await verifyAdmin(req);
    if (!auth.authorized) return auth.response;

    const { serviceClient } = auth;
    const body = await req.json();
    const { entity_type, tier, max_count, display_text, display_label } = body;

    if (!entity_type || !tier || max_count === undefined || !display_text || !display_label) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const { data, error } = await (serviceClient as any)
      .from('plan_limits')
      .upsert(
        {
          entity_type,
          tier,
          max_count,
          display_text,
          display_label,
          updated_at: new Date().toISOString(),
          updated_by: auth.userId,
        },
        { onConflict: 'entity_type,tier' },
      )
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ data });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
