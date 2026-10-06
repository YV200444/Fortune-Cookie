const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const BOXES = {
  b5:  { name: 'Box 5', price: 2000 },
  b14: { name: 'Office Box', price: 5000 },
  b30: { name: 'Party Box', price: 10000 },
  b1:  { name: 'Cookie sur mesure', price: 500 }
};
exports.handler = async (event) => {
  try {
    const { qty = {}, don = 0, site } = JSON.parse(event.body || '{}');
    const line_items = []; let sub = 0;
    for (const [id, q] of Object.entries(qty)) {
      const b = BOXES[id], n = Math.max(0, Math.min(200, parseInt(q, 10) || 0));
      if (!b || !n) continue;
      sub += b.price * n;
      line_items.push({ quantity: n, price_data: { currency: 'chf', unit_amount: b.price, product_data: { name: b.name } } });
    }
    if (sub > 0 && sub < 5000) line_items.push({ quantity: 1, price_data: { currency: 'chf', unit_amount: 500, product_data: { name: 'Livraison' } } });
    const d = Math.max(0, Math.min(5000, parseInt(don, 10) || 0));
    if (d) line_items.push({ quantity: 1, price_data: { currency: 'chf', unit_amount: d * 100, product_data: { name: 'Coup de pouce' } } });
    if (!line_items.length) return { statusCode: 400, body: 'Panier vide (v3)' };
    const base = (site || '').replace(/\/$/, '');
    const session = await stripe.checkout.sessions.create({
    ui_mode: 'embedded_page',
      mode: 'payment',
      line_items,
      locale: 'fr',
      redirect_on_completion: 'if_required',
      return_url: `${base}/?paid=1`
    });
    return { statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ clientSecret: session.client_secret }) };
  } catch (e) {
    return { statusCode: 500, body: 'Erreur paiement (v3): ' + (e && e.message ? e.message : '') };
  }
};
