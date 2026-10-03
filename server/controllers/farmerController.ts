import { Response } from 'express';
import { db } from '../db/index.js';
import { AuthRequest } from '../middleware/auth.js';

export async function getFarmerProfile(req: AuthRequest, res: Response): Promise<void> {
  try {
    const farmerId = req.farmerId || 'farmer_ramesh';

    const farmerRes = await db.query('SELECT * FROM farmers WHERE id = $1', [farmerId]);
    if (farmerRes.rows.length === 0) {
      res.status(404).json({ success: false, error: 'Farmer not found' });
      return;
    }
    const farmer = farmerRes.rows[0];

    const farmRes = await db.query('SELECT * FROM farms WHERE farmer_id = $1', [farmerId]);
    const farm = farmRes.rows[0] || { total_area: 5, soil_type: 'alluvial', irrigation_source: 'borewell' };

    const fieldsRes = await db.query('SELECT * FROM fields WHERE farm_id = $1', [farm.id]);
    const cropsRes = await db.query('SELECT id FROM crops WHERE farmer_id = $1', [farmerId]);

    res.json({
      success: true,
      farmer: {
        id: farmer.id,
        name: farmer.name,
        phone: farmer.phone,
        location: {
          village: farmer.village,
          district: farmer.district,
          state: farmer.state,
          pincode: farmer.pincode,
          coordinates: {
            lat: Number(farmer.latitude) || 26.2183,
            lng: Number(farmer.longitude) || 78.1828,
          },
        },
        preferredLanguage: farmer.preferred_language,
        profileComplete: farmer.profile_complete,
        createdAt: farmer.created_at,
      },
      farmProfile: {
        id: farm.id,
        farmerId: farmer.id,
        totalArea: Number(farm.total_area),
        fields: fieldsRes.rows.map((f: any) => ({
          id: f.id,
          name: f.name,
          area: Number(f.area),
          soilType: f.soil_type,
          irrigationType: f.irrigation_type,
        })),
        soilType: farm.soil_type,
        irrigationSource: farm.irrigation_source,
        crops: cropsRes.rows.map((c: any) => c.id),
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
}

export async function updateFarmerProfile(req: AuthRequest, res: Response): Promise<void> {
  try {
    const farmerId = req.farmerId || 'farmer_ramesh';
    const { name, village, district, state, pincode, preferredLanguage, soilType, irrigationSource, totalArea } = req.body;

    if (name || village || district || state || pincode || preferredLanguage) {
      await db.query(
        `UPDATE farmers SET
          name = COALESCE($1, name),
          village = COALESCE($2, village),
          district = COALESCE($3, district),
          state = COALESCE($4, state),
          pincode = COALESCE($5, pincode),
          preferred_language = COALESCE($6, preferred_language),
          updated_at = NOW()
         WHERE id = $7`,
        [name, village, district, state, pincode, preferredLanguage, farmerId]
      );
    }

    if (soilType || irrigationSource || totalArea) {
      await db.query(
        `UPDATE farms SET
          soil_type = COALESCE($1, soil_type),
          irrigation_source = COALESCE($2, irrigation_source),
          total_area = COALESCE($3, total_area)
         WHERE farmer_id = $4`,
        [soilType, irrigationSource, totalArea, farmerId]
      );
    }

    res.json({ success: true, message: 'Profile updated successfully' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
}

export async function updateFarmerLocation(req: AuthRequest, res: Response): Promise<void> {
  try {
    const farmerId = req.farmerId || 'farmer_ramesh';
    const { latitude, longitude, village, district, state, pincode } = req.body;

    if (!district && latitude === undefined && longitude === undefined) {
      res.status(400).json({ success: false, error: 'At least one location field is required' });
      return;
    }

    await db.query(
      `UPDATE farmers SET
        latitude = COALESCE($1, latitude),
        longitude = COALESCE($2, longitude),
        village = COALESCE($3, village),
        district = COALESCE($4, district),
        state = COALESCE($5, state),
        pincode = COALESCE($6, pincode),
        updated_at = NOW()
       WHERE id = $7`,
      [
        latitude !== undefined ? Number(latitude) : null,
        longitude !== undefined ? Number(longitude) : null,
        village || null,
        district || null,
        state || null,
        pincode || null,
        farmerId,
      ]
    );

    res.json({
      success: true,
      message: 'Farmer location updated successfully',
      location: {
        latitude: latitude ? Number(latitude) : undefined,
        longitude: longitude ? Number(longitude) : undefined,
        village,
        district,
        state,
        pincode,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
}

export async function saveOnboarding(req: AuthRequest, res: Response): Promise<void> {
  try {
    const farmerId = req.farmerId || 'farmer_ramesh';
    const { name, location, farmSize, crop, soil, language } = req.body;

    // Update farmer
    await db.query(
      `UPDATE farmers SET
        name = COALESCE($1, name),
        district = COALESCE($2, district),
        preferred_language = COALESCE($3, preferred_language),
        profile_complete = TRUE,
        updated_at = NOW()
       WHERE id = $4`,
      [name, location, language, farmerId]
    );

    // Update farm
    await db.query(
      `UPDATE farms SET
        total_area = COALESCE($1, total_area),
        soil_type = COALESCE($2, soil_type)
       WHERE farmer_id = $3`,
      [Number(farmSize) || 5, soil, farmerId]
    );

    // If a crop was specified, create/update it
    if (crop) {
      const sowingDate = new Date();
      sowingDate.setDate(sowingDate.getDate() - 30);
      const harvestDate = new Date();
      harvestDate.setDate(harvestDate.getDate() + 90);

      await db.query(
        `INSERT INTO crops (
          id, farmer_id, name, name_key, variety, sowing_date, expected_harvest_date,
          current_stage, days_old, area, icon
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, name_key = EXCLUDED.name_key`,
        [
          `crop_${crop}_${farmerId}`,
          farmerId,
          crop.charAt(0).toUpperCase() + crop.slice(1),
          crop.toLowerCase(),
          'High-Yield Variety',
          sowingDate.toISOString().split('T')[0],
          harvestDate.toISOString().split('T')[0],
          'vegetative',
          30,
          Number(farmSize) || 5,
          '🌾',
        ]
      );
    }

    res.json({ success: true, message: 'Onboarding completed and saved to database' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
}
