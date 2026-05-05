import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export async function POST(request) {
  try {
    const { cardTitulo, cardNumero, novoStatus, responsavelId, relatorId, movidoPor } = await request.json();

    const resendKey = process.env.RESEND_API_KEY;
    const fromEmail = process.env.RESEND_FROM_EMAIL || 'noreply@resend.dev';

    if (!resendKey) return NextResponse.json({ ok: true, skipped: 'no key' });

    // Busca emails do responsável e relator
    const ids = [...new Set([responsavelId, relatorId].filter(Boolean))];
    if (!ids.length) return NextResponse.json({ ok: true, skipped: 'no recipients' });

    const { data: usuarios } = await supabase
      .from('usuarios')
      .select('id, nome, email')
      .in('id', ids);

    if (!usuarios?.length) return NextResponse.json({ ok: true, skipped: 'users not found' });

    const emails = [...new Set(usuarios.map(u => u.email).filter(Boolean))];
    if (!emails.length) return NextResponse.json({ ok: true, skipped: 'no emails' });

    const html = `
      <div style="font-family:'JetBrains Mono',monospace;background:#0d0d0d;color:#e8e8e8;padding:32px;border-radius:8px;max-width:520px;margin:0 auto;">
        <div style="font-size:18px;font-weight:700;color:#3b82f6;margin-bottom:2px;">KanbanAvanti_</div>
        <div style="font-size:11px;color:#555;margin-bottom:24px;">// notificação de movimentação</div>

        <div style="background:#141414;border:1px solid #2a2a2a;border-radius:6px;padding:14px;margin-bottom:16px;">
          <div style="font-size:10px;color:#3b82f6;margin-bottom:4px;">${cardNumero || ''}</div>
          <div style="font-size:15px;font-weight:600;color:#e8e8e8;">${cardTitulo}</div>
        </div>

        <div style="margin-bottom:8px;">
          <div style="font-size:11px;color:#888;margin-bottom:4px;">movido para</div>
          <div style="font-size:16px;font-weight:700;color:#22c55e;">${novoStatus}</div>
        </div>

        <div style="border-top:1px solid #1a1a1a;margin-top:16px;padding-top:12px;font-size:11px;color:#555;">
          movido por: <span style="color:#888;">${movidoPor || 'sistema'}</span>
        </div>
      </div>
    `;

    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${resendKey}` },
      body: JSON.stringify({
        from: `Kanban Avanti <${fromEmail}>`,
        to: emails,
        subject: `[${cardNumero || 'Card'}] ${cardTitulo} → ${novoStatus}`,
        html,
      }),
    });

    return NextResponse.json({ ok: true, sent_to: emails.length });
  } catch (err) {
    console.error('Notify error:', err);
    return NextResponse.json({ ok: false, error: err.message });
  }
}
