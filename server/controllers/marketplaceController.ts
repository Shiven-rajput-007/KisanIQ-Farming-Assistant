import { Response } from 'express';
import { db } from '../db/index.js';
import { AuthRequest } from '../middleware/auth.js';

export async function placeMarketplaceOrder(req: AuthRequest, res: Response): Promise<void> {
  try {
    if (!req.userId) {
      res.status(401).json({ success: false, error: 'Unauthorized: Authentication required to place order' });
      return;
    }
    const buyerId = req.userId;
    const {
      listingId,
      quantityQuintals,
      deliveryAddress,
      buyerName,
      buyerPhone,
      notes,
    } = req.body;

    if (!listingId || !quantityQuintals || !deliveryAddress) {
      res.status(400).json({ success: false, error: 'listingId, quantityQuintals, and deliveryAddress are required' });
      return;
    }

    // 1. Fetch listing
    const listingRes = await db.query('SELECT * FROM crop_listings WHERE id = $1', [listingId]);
    if (listingRes.rows.length === 0) {
      res.status(404).json({ success: false, error: 'Listing not found' });
      return;
    }

    const listing = listingRes.rows[0];
    if (listing.status !== 'active') {
      res.status(400).json({ success: false, error: 'This listing is no longer active' });
      return;
    }

    const orderQty = Number(quantityQuintals);
    const availableQty = Number(listing.quantity_quintals);
    if (orderQty > availableQty) {
      res.status(400).json({
        success: false,
        error: `Requested quantity (${orderQty}q) exceeds available quantity (${availableQty}q)`,
      });
      return;
    }

    const pricePerQ = Number(listing.price_per_quintal);
    const totalAmount = orderQty * pricePerQ;
    const orderId = `mord_${Date.now()}`;
    const trackingCode = `KISAN-DIR-${Math.floor(1000 + Math.random() * 9000)}`;

    // 2. Create Order
    await db.query(
      `INSERT INTO marketplace_orders (
        id, listing_id, buyer_id, farmer_id, crop_name, quantity_quintals,
        price_per_quintal, total_amount, delivery_address, buyer_name,
        buyer_phone, status, tracking_code, notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
      [
        orderId,
        listingId,
        buyerId,
        listing.farmer_id,
        listing.crop_name,
        orderQty,
        pricePerQ,
        totalAmount,
        deliveryAddress,
        buyerName || 'Verified Buyer',
        buyerPhone || '',
        'placed',
        trackingCode,
        notes || '',
      ]
    );

    // 3. Update listing available quantity
    const newQty = availableQty - orderQty;
    const newStatus = newQty <= 0 ? 'sold' : 'active';
    await db.query(
      `UPDATE crop_listings SET quantity_quintals = $1, status = $2, updated_at = NOW() WHERE id = $3`,
      [newQty, newStatus, listingId]
    );

    // 4. Send notification to farmer
    await db.query(
      `INSERT INTO notifications (id, farmer_id, type, severity, title_key, description_key, icon, read)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        `notif_${Date.now()}`,
        listing.farmer_id,
        'market',
        'info',
        'New Direct Buyer Order',
        `Order received for ${orderQty}q of ${listing.crop_name} (₹${totalAmount.toLocaleString('en-IN')}). Tracking: ${trackingCode}`,
        '💰',
        false,
      ]
    );

    res.status(201).json({
      success: true,
      message: 'Marketplace order placed successfully',
      order: {
        id: orderId,
        listingId,
        cropName: listing.crop_name,
        quantity: orderQty,
        pricePerQuintal: pricePerQ,
        totalAmount,
        deliveryAddress,
        status: 'placed',
        trackingCode,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
}

export async function getBuyerOrders(req: AuthRequest, res: Response): Promise<void> {
  try {
    if (!req.userId) {
      res.status(401).json({ success: false, error: 'Unauthorized: Authentication required' });
      return;
    }
    const buyerId = req.userId;

    const ordersRes = await db.query(
      `SELECT o.*, f.name as farmer_name, f.district as farmer_district, f.state as farmer_state, f.phone as farmer_phone
       FROM marketplace_orders o
       JOIN farmers f ON o.farmer_id = f.id
       WHERE o.buyer_id = $1
       ORDER BY o.created_at DESC`,
      [buyerId]
    );

    res.json({
      success: true,
      orders: ordersRes.rows.map((row: any) => ({
        id: row.id,
        listingId: row.listing_id,
        cropName: row.crop_name,
        quantity: Number(row.quantity_quintals),
        pricePerQuintal: Number(row.price_per_quintal),
        totalAmount: Number(row.total_amount),
        deliveryAddress: row.delivery_address,
        farmerName: row.farmer_name,
        farmerPhone: row.farmer_phone,
        farmerLocation: `${row.farmer_district}, ${row.farmer_state}`,
        status: row.status,
        paymentStatus: row.payment_status,
        trackingCode: row.tracking_code,
        notes: row.notes,
        createdAt: row.created_at,
      })),
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
}

export async function updateMarketplaceOrderStatus(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ['placed', 'confirmed', 'in_transit', 'delivered', 'cancelled'];
    if (!validStatuses.includes(status)) {
      res.status(400).json({ success: false, error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
      return;
    }

    await db.query(
      `UPDATE marketplace_orders SET status = $1, updated_at = NOW() WHERE id = $2`,
      [status, id]
    );

    res.json({ success: true, message: `Order status updated to ${status}` });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
}

export async function getBuyerProfile(req: AuthRequest, res: Response): Promise<void> {
  try {
    if (!req.userId) {
      res.status(401).json({ success: false, error: 'Unauthorized: Authentication required' });
      return;
    }
    const userId = req.userId;

    const userRes = await db.query('SELECT id, name, phone, role FROM users WHERE id = $1', [userId]);
    const bpRes = await db.query('SELECT * FROM buyer_profiles WHERE user_id = $1', [userId]);

    if (userRes.rows.length === 0) {
      res.status(404).json({ success: false, error: 'User not found' });
      return;
    }

    const user = userRes.rows[0];
    const profile = bpRes.rows[0] || {};

    res.json({
      success: true,
      buyer: {
        userId: user.id,
        name: user.name,
        phone: user.phone,
        role: user.role,
        companyName: profile.company_name || user.name,
        buyerType: profile.buyer_type || 'Trader',
        gstin: profile.gstin || '',
        address: profile.address || '',
        city: profile.city || '',
        district: profile.district || null,
        state: profile.state || null,
        pincode: profile.pincode || '',
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
}
