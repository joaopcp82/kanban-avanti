import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const { quantidade, empresa_id, empresa_nome } = await request.json();

    const accessToken = process.env.MP_ACCESS_TOKEN;
    if (!accessToken) {
      return NextResponse.json({ error: 'MP_ACCESS_TOKEN não configurado' }, { status: 500 });
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const valorUnit = 1.99;
    const total = (quantidade * valorUnit).toFixed(2);

    const body = {
      items: [
        {
          title: `Kanban Avanti Pro — ${quantidade} usuário(s)`,
          description: `Licença mensal para ${empresa_nome}`,
          quantity: 1,
          unit_price: parseFloat(total),
          currency_id: 'BRL',
        },
      ],
      back_urls: {
        success: `${appUrl}/payment/success?empresa_id=${empresa_id}&qty=${quantidade}`,
        failure: `${appUrl}/pricing?error=pagamento_recusado`,
        pending: `${appUrl}/payment/pending`,
      },
      auto_return: 'approved',
      external_reference: `${empresa_id}_${quantidade}_${Date.now()}`,
      notification_url: `${appUrl}/api/mp-webhook`,
    };

    const response = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json({ error: data.message || 'Erro no Mercado Pago' }, { status: 400 });
    }

    return NextResponse.json({ init_point: data.init_point, preference_id: data.id });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
