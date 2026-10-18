const Orders = {
  pending: false,
  async submit(customer, items, promo) {
    if (!window.supabaseClient) throw new Error('Ordering is unavailable. Please reconnect and try again. Your cart is saved.');
    const cart=items.map(i=>({id:i.id,qty:i.qty,price:i.price,selectedSize:i.selectedSize || null}));
    const fingerprint=JSON.stringify({customer,cart,promo});
    let attempt;
    try {attempt=JSON.parse(sessionStorage.getItem('checkout_attempt'));} catch {}
    if(!attempt || attempt.fingerprint!==fingerprint) {
      attempt={id:crypto.randomUUID(),fingerprint};
      sessionStorage.setItem('checkout_attempt',JSON.stringify(attempt));
    }
    const {data,error}=await window.supabaseClient.rpc('place_marketplace_order',{request_id:attempt.id,customer,cart,promo});
    if(error) throw new Error(error.message || 'Your order could not be saved. Please try again.');
    if(!Array.isArray(data) || !data.length) throw new Error('No order confirmation was received. Your cart is saved.');
    return data;
  },
  whatsappURL(order,customer) {
    const number=String(order.whatsapp || WHATSAPP_NUMBER).replace(/\D/g,'');
    const message=buildWhatsAppOrderMessage(order.items,order.total,customer);
    return `https://wa.me/${number}?text=${encodeURIComponent('Order reference: '+order.id+'\n')}${message}`;
  }
};
