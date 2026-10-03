import { Response } from 'express';
import { db } from '../db/index.js';
import { AuthRequest } from '../middleware/auth.js';

export async function getOrders(req: AuthRequest, res: Response): Promise<void> {
  try {
    const farmerId = req.farmerId || 'farmer_ramesh';

    const ordersRes = await db.query(
      `SELECT o.*, m.name as market_name, m.distance_km, s.id as shipment_id, s.status as shipment_status, s.tracking_code,
              v.vehicle_number, v.driver_name, v.driver_phone
       FROM orders o
       JOIN markets m ON o.market_id = m.id
       LEFT JOIN shipments s ON o.id = s.order_id
       LEFT JOIN vehicles v ON s.vehicle_id = v.id
       WHERE o.farmer_id = $1
       ORDER BY o.created_at DESC`,
      [farmerId]
    );

    res.json({
      success: true,
      orders: ordersRes.rows.map((r: any) => ({
        id: r.id,
        marketId: r.market_id,
        marketName: r.market_name,
        cropName: r.crop_name,
        quantity: Number(r.quantity_quintals),
        agreedPrice: Number(r.agreed_price_per_quintal),
        totalReturn: Number(r.total_expected_return),
        status: r.status,
        createdAt: r.created_at,
        shipment: r.shipment_id ? {
          id: r.shipment_id,
          status: r.shipment_status,
          trackingCode: r.tracking_code,
          vehicleNumber: r.vehicle_number,
          driverName: r.driver_name,
          driverPhone: r.driver_phone,
        } : null,
      })),
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
}

export async function updateShipmentStatus(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const { status } = req.body;

    await db.query(
      `UPDATE shipments SET status = $1, actual_delivery = CASE WHEN $1 = 'delivered' THEN NOW() ELSE actual_delivery END WHERE id = $2`,
      [status, id]
    );

    res.json({ success: true, message: 'Shipment status updated' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
}
