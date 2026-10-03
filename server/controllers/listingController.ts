import { Request, Response } from 'express';
import { db } from '../db/index.js';
import { AuthRequest } from '../middleware/auth.js';

export async function getListings(req: Request, res: Response): Promise<void> {
  try {
    const { crop, grade, state, minPrice, maxPrice, search } = req.query;

    let query = `
      SELECT l.*, f.name as farmer_name, f.district as farmer_district, f.state as farmer_state, f.phone as farmer_phone
      FROM crop_listings l
      JOIN farmers f ON l.farmer_id = f.id
      WHERE l.status = 'active'
    `;
    const params: any[] = [];
    let paramIndex = 1;

    if (crop && typeof crop === 'string' && crop.trim() !== '' && crop.toLowerCase() !== 'all') {
      query += ` AND LOWER(l.crop_name) LIKE LOWER($${paramIndex++})`;
      params.push(`%${crop.trim()}%`);
    }

    if (grade && typeof grade === 'string' && grade.trim() !== '' && grade.toLowerCase() !== 'all') {
      query += ` AND LOWER(l.quality_grade) = LOWER($${paramIndex++})`;
      params.push(grade.trim());
    }

    if (state && typeof state === 'string' && state.trim() !== '' && state.toLowerCase() !== 'all') {
      query += ` AND LOWER(f.state) LIKE LOWER($${paramIndex++})`;
      params.push(`%${state.trim()}%`);
    }

    if (minPrice && !isNaN(Number(minPrice))) {
      query += ` AND l.price_per_quintal >= $${paramIndex++}`;
      params.push(Number(minPrice));
    }

    if (maxPrice && !isNaN(Number(maxPrice))) {
      query += ` AND l.price_per_quintal <= $${paramIndex++}`;
      params.push(Number(maxPrice));
    }

    if (search && typeof search === 'string' && search.trim() !== '') {
      query += ` AND (LOWER(l.crop_name) LIKE LOWER($${paramIndex}) OR LOWER(l.variety) LIKE LOWER($${paramIndex}) OR LOWER(l.location) LIKE LOWER($${paramIndex}) OR LOWER(f.name) LIKE LOWER($${paramIndex}))`;
      params.push(`%${search.trim()}%`);
      paramIndex++;
    }

    query += ` ORDER BY l.created_at DESC`;

    const result = await db.query(query, params);

    res.json({
      success: true,
      count: result.rows.length,
      listings: result.rows.map((row: any) => ({
        id: row.id,
        farmerId: row.farmer_id,
        farmerName: row.farmer_name,
        farmerPhone: row.farmer_phone,
        farmerLocation: `${row.farmer_district}, ${row.farmer_state}`,
        cropName: row.crop_name,
        variety: row.variety,
        quantity: Number(row.quantity_quintals),
        pricePerQuintal: Number(row.price_per_quintal),
        qualityGrade: row.quality_grade,
        harvestDate: row.harvest_date,
        availableFrom: row.available_from,
        location: row.location,
        description: row.description,
        status: row.status,
        createdAt: row.created_at,
      })),
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
}

export async function getFarmerListings(req: AuthRequest, res: Response): Promise<void> {
  try {
    const farmerId = req.farmerId || 'farmer_ramesh';

    // 1. Get farmer's crop listings
    const listingsRes = await db.query(
      `SELECT * FROM crop_listings WHERE farmer_id = $1 ORDER BY created_at DESC`,
      [farmerId]
    );

    // 2. Get incoming buyer orders placed on this farmer's listings
    const ordersRes = await db.query(
      `SELECT o.*, u.name as buyer_user_name, bp.company_name as buyer_company, bp.phone as buyer_contact
       FROM marketplace_orders o
       JOIN users u ON o.buyer_id = u.id
       LEFT JOIN buyer_profiles bp ON u.id = bp.user_id
       WHERE o.farmer_id = $1
       ORDER BY o.created_at DESC`,
      [farmerId]
    );

    res.json({
      success: true,
      listings: listingsRes.rows.map((row: any) => ({
        id: row.id,
        cropName: row.crop_name,
        variety: row.variety,
        quantity: Number(row.quantity_quintals),
        pricePerQuintal: Number(row.price_per_quintal),
        qualityGrade: row.quality_grade,
        harvestDate: row.harvest_date,
        location: row.location,
        description: row.description,
        status: row.status,
        createdAt: row.created_at,
      })),
      incomingOrders: ordersRes.rows.map((row: any) => ({
        id: row.id,
        listingId: row.listing_id,
        cropName: row.crop_name,
        quantity: Number(row.quantity_quintals),
        pricePerQuintal: Number(row.price_per_quintal),
        totalAmount: Number(row.total_amount),
        deliveryAddress: row.delivery_address,
        buyerName: row.buyer_company || row.buyer_name || row.buyer_user_name,
        buyerPhone: row.buyer_phone || row.buyer_contact,
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

export async function createListing(req: AuthRequest, res: Response): Promise<void> {
  try {
    const farmerId = req.farmerId || 'farmer_ramesh';
    const {
      cropName,
      variety,
      quantityQuintals,
      pricePerQuintal,
      qualityGrade = 'Grade A',
      harvestDate,
      location,
      description,
    } = req.body;

    if (!cropName || !quantityQuintals || !pricePerQuintal) {
      res.status(400).json({ success: false, error: 'Crop name, quantity, and price per quintal are required' });
      return;
    }

    const listingId = `list_${Date.now()}`;

    // Get farmer location if location not provided
    let loc = location;
    if (!loc) {
      const fRes = await db.query('SELECT village, district, state FROM farmers WHERE id = $1', [farmerId]);
      if (fRes.rows.length > 0) {
        const f = fRes.rows[0];
        loc = `${f.village ? f.village + ', ' : ''}${f.district}, ${f.state}`;
      }
    }

    await db.query(
      `INSERT INTO crop_listings (
        id, farmer_id, crop_name, variety, quantity_quintals, price_per_quintal,
        quality_grade, harvest_date, location, description, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'active')`,
      [
        listingId,
        farmerId,
        cropName,
        variety || 'Standard',
        Number(quantityQuintals),
        Number(pricePerQuintal),
        qualityGrade,
        harvestDate || new Date().toISOString().split('T')[0],
        loc || 'Madhya Pradesh',
        description || '',
      ]
    );

    res.status(201).json({
      success: true,
      message: 'Crop listing published successfully to marketplace',
      listing: {
        id: listingId,
        farmerId,
        cropName,
        variety,
        quantity: Number(quantityQuintals),
        pricePerQuintal: Number(pricePerQuintal),
        qualityGrade,
        location: loc,
        status: 'active',
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
}

export async function updateListing(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const { quantityQuintals, pricePerQuintal, qualityGrade, status, description } = req.body;

    await db.query(
      `UPDATE crop_listings SET
        quantity_quintals = COALESCE($1, quantity_quintals),
        price_per_quintal = COALESCE($2, price_per_quintal),
        quality_grade = COALESCE($3, quality_grade),
        status = COALESCE($4, status),
        description = COALESCE($5, description),
        updated_at = NOW()
       WHERE id = $6`,
      [
        quantityQuintals !== undefined ? Number(quantityQuintals) : null,
        pricePerQuintal !== undefined ? Number(pricePerQuintal) : null,
        qualityGrade || null,
        status || null,
        description || null,
        id,
      ]
    );

    res.json({ success: true, message: 'Listing updated successfully' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
}

export async function deleteListing(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    await db.query(`UPDATE crop_listings SET status = 'cancelled', updated_at = NOW() WHERE id = $1`, [id]);
    res.json({ success: true, message: 'Listing removed from marketplace' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
}
