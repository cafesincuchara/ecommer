import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('=== Función iniciada ===')
    
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
    
    const host = req.headers.get('host') || ''
    const origin = req.headers.get('origin') || ''
    const isLocalhost = 
      host.includes('127.0.0.1') || 
      host.includes('localhost') ||
      origin.includes('localhost') ||
      origin.includes('127.0.0.1')

    console.log('Entorno:', isLocalhost ? 'LOCAL' : 'PRODUCCIÓN')

    const data = await req.json()
    console.log('Datos recibidos:', {
      orderId: data.orderId,
      customerEmail: data.customerEmail,
      customerName: data.customerName,
      itemsCount: data.items?.length,
      totalAmount: data.totalAmount
    })

    // Construir lista de items
    const itemsList = data.items.map((item: any) => 
      `<li style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">
        ${item.name} x${item.quantity} - $${(item.price * item.quantity).toFixed(2)}
      </li>`
    ).join('')

    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
            .container { max-width: 600px; margin: 0 auto; }
            .header { background: #4f46e5; color: white; padding: 30px 20px; text-align: center; }
            .header h1 { margin: 0; font-size: 28px; }
            .content { background: #f9fafb; padding: 30px 20px; }
            .order-details { background: white; padding: 20px; margin: 20px 0; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
            .order-details h2 { margin-top: 0; color: #4f46e5; }
            .order-details p { margin: 8px 0; }
            ul { list-style: none; padding: 0; margin: 15px 0; }
            .total { font-size: 1.3em; font-weight: bold; color: #4f46e5; margin-top: 15px; padding-top: 15px; border-top: 2px solid #e5e7eb; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Nueva Orden Recibida</h1>
            </div>
            <div class="content">
              <div class="order-details">
                <h2>Orden #${data.orderId.slice(0, 8)}</h2>
                <p><strong>Cliente:</strong> ${data.customerName}</p>
                <p><strong>Email:</strong> ${data.customerEmail}</p>
                <p><strong>Dirección:</strong><br>${data.shippingAddress}</p>
                ${data.notes ? `<p><strong>Notas:</strong> ${data.notes}</p>` : ''}
              </div>
              <div class="order-details">
                <h3 style="margin-top: 0;">Productos:</h3>
                <ul>${itemsList}</ul>
                <div class="total">Total: $${data.totalAmount.toFixed(2)}</div>
              </div>
            </div>
          </div>
        </body>
      </html>
    `

    if (!RESEND_API_KEY) {
      console.warn('Modo simulación: falta RESEND_API_KEY')
      return new Response(
        JSON.stringify({ success: true, msg: 'Orden procesada (sin email)', orderId: data.orderId }), 
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Enviando email con Resend...')

    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`
      },
      body: JSON.stringify({
        from: 'Ecommers Puerto Alto <onboarding@resend.dev>',
        to: ['ecommerspuertealto@gmail.com'],
        subject: `Nueva Orden #${data.orderId.slice(0, 8)} - ${data.customerName}`,
        html: emailHtml
      })
    })

    const resendData = await resendResponse.json()

    if (!resendResponse.ok) {
      console.error('Error Resend:', resendData)
      return new Response(
        JSON.stringify({ success: false, msg: 'Error enviando email', error: resendData }), 
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Email enviado:', resendData)

    return new Response(
      JSON.stringify({ success: true, msg: 'Email enviado', orderId: data.orderId }), 
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (err) {
    console.error('Error:', err.message)
    return new Response(
      JSON.stringify({ success: false, msg: err.message }), 
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})