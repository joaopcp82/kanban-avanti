import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export async function POST(request) {
  try {
    const { cardTitulo, novoStatus, responsavelId, movidoPor } = await request.json();

    const resendKey = process.env.RESEND_API_KEY;
    if (!resendKey || !responsavelId) {
      return NextResponse.json({ ok: true, skipped: true });
    }

    // Busca email do responsável
    const { data: usuario } = await supabase
      .from('usuarios')
      .select('nome, email')
      .eq('id', responsavelId)
      .single();

    if (!usuario?.email) return NextResponse.json({ ok: true, skipped: true });

    const html = `
      <div style="font-family:'JetBrains Mono',monospace;background:#0d0d0d;color:#e8e8e8;padding:32px;border-radius:8px;max-width:520px;">
        <div style="font-size:18px;font-weight:700;color:#3b82f6;margin-bottom:4px;">KanbanAvanti_</div>
        <div style="font-size:12px;color:#888;margin-bottom:24px;">// notificação de movimentação</div>
        <div style="background:#141414;border:1px solid #2a2a2a;border-radius:6px;padding:16px;margin-bottom:16px;">
          <div style="font-size:11px;color:#3b82f6;margin-bottom:4px;">$ card</div>
          <div style="font-size:14px;font-weight:600;color:#e8e8e8;">${cardTitulo}</div>
        </div>
        <div style="font-size:12px;color:#888;margin-bottom:8px;">movido para:</div>
        <div style="font-size:15px;font-weight:700;color:#22c55e;margin-bottom:16px;">${novoStatus}</div>
        <div style="font-size:11px;color:#555;">movido por: ${movidoPor || 'sistema'}</div>
      </div>
    `;

    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${resendKey}`,
      },
      body: JSON.stringify({
        from: 'Kanban Avanti <noreply@kanbanavanti.com.br>',
        to: [usuario.email],
        subject: `[Kanban Avanti] "${cardTitulo}" → ${novoStatus}`,
        html,
      }),
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('Notify error:', err);
    return NextResponse.json({ ok: false, error: err.message });
  }
}
