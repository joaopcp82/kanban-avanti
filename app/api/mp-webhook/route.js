import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function POST(request) {
  try {
    const body = await request.json();
    const { type, data } = body;

    if (type === 'payment') {
      const paymentId = data?.id;
      const response = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
        headers: { Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}` },
      });
      const payment = await response.json();

      if (payment.status === 'approved') {
        const [empresa_id, quantidade] = (payment.external_reference || '').split('_');
        const validade = new Date();
        validade.setMonth(validade.getMonth() + 1);

        await supabase.from('licencas').insert({
          empresa_id,
          status: 'ativo',
          mp_payment_id: String(paymentId),
          valor: payment.transaction_amount,
          validade_ate: validade.toISOString(),
        });
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('Webhook error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
