import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { db } from '../db/index.js';
import { generateToken } from '../utils/jwt.js';
import { AuthRequest } from '../middleware/auth.js';

export async function register(req: Request, res: Response): Promise<void> {
  try {
    const {
      phone,
      email,
      password,
      confirmPassword,
      name,
      role = 'farmer',
      // Location / Address
      address,
      city,
      village,
      district = 'Gwalior',
      state = 'Madhya Pradesh',
      pincode = '474001',
      latitude,
      longitude,
      language = 'hi',
      // Farmer specific fields
      farmSize,
      soilType = 'alluvial',
      irrigationSource = 'borewell',
      mainCrop,
      // Buyer specific fields
      companyName,
      buyerType = 'Trader',
      gstin,
      purchaseInterests,
    } = req.body;

    if (!phone || !password || !name) {
      res.status(400).json({ success: false, error: 'Phone, password, and name are required' });
      return;
    }

    if (confirmPassword && password !== confirmPassword) {
      res.status(400).json({ success: false, error: 'Password and Confirm Password do not match' });
      return;
    }

    if (password.length < 6) {
      res.status(400).json({ success: false, error: 'Password must be at least 6 characters long' });
      return;
    }

    // Check if phone or email already registered
    const existing = await db.query(
      'SELECT id FROM users WHERE phone = $1 OR (email IS NOT NULL AND email = $2)',
      [phone.trim(), email ? email.trim() : '']
    );
    if (existing.rows.length > 0) {
      res.status(409).json({ success: false, error: 'A user with this phone or email already exists' });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const userId = `usr_${Date.now()}`;
    const userRole = role === 'buyer' ? 'buyer' : 'farmer';

    // 1. Create User
    await db.query(
      `INSERT INTO users (id, phone, email, password_hash, name, role, address, city)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        userId,
        phone.trim(),
        email ? email.trim() : null,
        passwordHash,
        name.trim(),
        userRole,
        address || '',
        city || village || district,
      ]
    );

    if (userRole === 'buyer') {
      // 2. Create Buyer Profile
      const buyerId = `bp_${Date.now()}`;
      const buyerLat = (latitude !== undefined && latitude !== null && !isNaN(Number(latitude))) ? Number(latitude) : null;
      const buyerLng = (longitude !== undefined && longitude !== null && !isNaN(Number(longitude))) ? Number(longitude) : null;

      await db.query(
        `INSERT INTO buyer_profiles (id, user_id, company_name, buyer_type, gstin, address, city, district, state, pincode, phone, email, purchase_interests, latitude, longitude)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`,
        [
          buyerId,
          userId,
          companyName ? companyName.trim() : name.trim(),
          buyerType,
          gstin || '',
          address || '',
          city || district,
          district,
          state,
          pincode,
          phone.trim(),
          email ? email.trim() : '',
          purchaseInterests || null,
          buyerLat,
          buyerLng,
        ]
      );

      const token = generateToken({
        userId,
        phone: phone.trim(),
        role: 'buyer',
      });

      res.status(201).json({
        success: true,
        token,
        role: 'buyer',
        user: { id: userId, name: name.trim(), phone: phone.trim(), email, role: 'buyer' },
        buyer: {
          id: buyerId,
          userId,
          name: name.trim(),
          companyName: companyName ? companyName.trim() : name.trim(),
          buyerType,
          phone: phone.trim(),
          email,
          gstin,
          purchaseInterests: purchaseInterests || null,
          location: {
            address: address || '',
            city: city || district,
            district,
            state,
            pincode,
            coordinates: { lat: buyerLat, lng: buyerLng },
          },
        },
      });
      return;
    }

    // Farmer Registration
    const farmerId = `frm_${Date.now()}`;
    const farmerLat = (latitude !== undefined && latitude !== null && !isNaN(Number(latitude))) ? Number(latitude) : null;
    const farmerLng = (longitude !== undefined && longitude !== null && !isNaN(Number(longitude))) ? Number(longitude) : null;

    // 2. Create Farmer Profile
    await db.query(
      `INSERT INTO farmers (id, user_id, name, phone, email, village, district, state, pincode, address, latitude, longitude, preferred_language, profile_complete)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
      [
        farmerId,
        userId,
        name.trim(),
        phone.trim(),
        email ? email.trim() : null,
        village || '',
        district,
        state,
        pincode,
        address || '',
        farmerLat,
        farmerLng,
        language,
        true,
      ]
    );

    // 3. Create Farm Profile ONLY if farm size or soil/irrigation is specified
    if (farmSize || soilType || irrigationSource) {
      const area = Number(farmSize) > 0 ? Number(farmSize) : null;
      await db.query(
        `INSERT INTO farms (id, farmer_id, total_area, soil_type, irrigation_source)
         VALUES ($1, $2, $3, $4, $5)`,
        [`farm_${Date.now()}`, farmerId, area, soilType || null, irrigationSource || null]
      );
    }

    // 4. Create Crop ONLY if mainCrop was specified by the user
    if (mainCrop && mainCrop.trim()) {
      const cropTitle = mainCrop.trim();
      const cropKey = cropTitle.toLowerCase();
      const cropId = `crop_${cropKey}_${Date.now()}`;
      const areaVal = Number(farmSize) > 0 ? Number(farmSize) : null;

      await db.query(
        `INSERT INTO crops (id, farmer_id, name, name_key, variety, current_stage, area, expected_yield, icon)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          cropId,
          farmerId,
          cropTitle,
          cropKey,
          'Standard',
          'vegetative',
          areaVal,
          areaVal ? areaVal * 20.0 : null,
          cropKey.includes('rice') ? '🌾' : cropKey.includes('mustard') ? '🌻' : '🌾',
        ]
      );
    }

    const token = generateToken({
      userId,
      farmerId,
      phone: phone.trim(),
      role: 'farmer',
    });

    res.status(201).json({
      success: true,
      token,
      role: 'farmer',
      user: { id: userId, name: name.trim(), phone: phone.trim(), email, role: 'farmer' },
      farmer: {
        id: farmerId,
        name: name.trim(),
        phone: phone.trim(),
        email,
        location: {
          village: village || '',
          city: city || village || district,
          district,
          state,
          pincode,
          coordinates: { lat: farmerLat, lng: farmerLng },
        },
        preferredLanguage: language,
        profileComplete: true,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
}

export async function login(req: Request, res: Response): Promise<void> {
  try {
    const { phone, password } = req.body;

    if (!phone || !password) {
      res.status(400).json({ success: false, error: 'Phone/email and password are required' });
      return;
    }

    const trimmedIdentifier = phone.trim();
    const userRes = await db.query(
      'SELECT * FROM users WHERE phone = $1 OR (email IS NOT NULL AND email = $1)',
      [trimmedIdentifier]
    );

    if (userRes.rows.length === 0) {
      res.status(401).json({ success: false, error: 'Invalid phone or password' });
      return;
    }

    const user = userRes.rows[0];
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      res.status(401).json({ success: false, error: 'Invalid phone or password' });
      return;
    }

    if (user.role === 'buyer') {
      const bpRes = await db.query('SELECT * FROM buyer_profiles WHERE user_id = $1', [user.id]);
      const bp = bpRes.rows[0] || {};

      const token = generateToken({
        userId: user.id,
        phone: user.phone,
        role: 'buyer',
      });

      res.json({
        success: true,
        token,
        role: 'buyer',
        user: { id: user.id, name: user.name, phone: user.phone, email: user.email, role: 'buyer' },
        buyer: {
          id: bp.id,
          userId: user.id,
          name: user.name,
          companyName: bp.company_name || user.name,
          buyerType: bp.buyer_type || 'Trader',
          phone: user.phone,
          email: bp.email || user.email,
          gstin: bp.gstin,
          purchaseInterests: bp.purchase_interests,
          location: {
            address: bp.address,
            city: bp.city,
            district: bp.district,
            state: bp.state,
            pincode: bp.pincode,
            coordinates: {
              lat: (bp.latitude !== null && bp.latitude !== undefined && !isNaN(Number(bp.latitude))) ? Number(bp.latitude) : null,
              lng: (bp.longitude !== null && bp.longitude !== undefined && !isNaN(Number(bp.longitude))) ? Number(bp.longitude) : null,
            },
          },
        },
      });
      return;
    }

    // Farmer Login
    const farmerRes = await db.query('SELECT * FROM farmers WHERE user_id = $1', [user.id]);
    let farmer = farmerRes.rows[0];

    // If this was seeded user or legacy record, retrieve or assign
    if (!farmer) {
      const fallbackRes = await db.query('SELECT * FROM farmers WHERE phone = $1', [user.phone]);
      farmer = fallbackRes.rows[0] || {
        id: `frm_${user.id}`,
        name: user.name,
        phone: user.phone,
        district: '',
        state: '',
        latitude: null,
        longitude: null,
        preferred_language: 'hi',
        profile_complete: true,
      };
    }

    const token = generateToken({
      userId: user.id,
      farmerId: farmer.id,
      phone: user.phone,
      role: 'farmer',
    });

    res.json({
      success: true,
      token,
      role: 'farmer',
      user: { id: user.id, name: user.name, phone: user.phone, email: user.email, role: 'farmer' },
      farmer: {
        id: farmer.id,
        name: farmer.name,
        phone: farmer.phone,
        email: farmer.email || user.email,
        location: {
          village: farmer.village,
          district: farmer.district,
          state: farmer.state,
          pincode: farmer.pincode,
          coordinates: {
            lat: (farmer.latitude !== null && farmer.latitude !== undefined && !isNaN(Number(farmer.latitude))) ? Number(farmer.latitude) : null,
            lng: (farmer.longitude !== null && farmer.longitude !== undefined && !isNaN(Number(farmer.longitude))) ? Number(farmer.longitude) : null,
          },
        },
        preferredLanguage: farmer.preferred_language,
        profileComplete: farmer.profile_complete,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
}

export async function getMe(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.userId;
    if (userId) {
      const userRes = await db.query('SELECT * FROM users WHERE id = $1', [userId]);
      if (userRes.rows.length > 0) {
        const user = userRes.rows[0];
        if (user.role === 'buyer') {
          const bpRes = await db.query('SELECT * FROM buyer_profiles WHERE user_id = $1', [userId]);
          const bp = bpRes.rows[0] || {};
          res.json({
            success: true,
            role: 'buyer',
            user: { id: user.id, name: user.name, phone: user.phone, email: user.email, role: 'buyer' },
            buyer: {
              id: bp.id,
              userId: user.id,
              name: user.name,
              companyName: bp.company_name || user.name,
              buyerType: bp.buyer_type || 'Trader',
              phone: user.phone,
              email: bp.email || user.email,
              gstin: bp.gstin,
              purchaseInterests: bp.purchase_interests,
              location: {
                address: bp.address,
                city: bp.city,
                district: bp.district,
                state: bp.state,
                pincode: bp.pincode,
                coordinates: {
                  lat: Number(bp.latitude) || 22.7196,
                  lng: Number(bp.longitude) || 75.8577,
                },
              },
            },
          });
          return;
        }

        // Farmer check by user_id
        const farmerRes = await db.query('SELECT * FROM farmers WHERE user_id = $1', [userId]);
        if (farmerRes.rows.length > 0) {
          const farmer = farmerRes.rows[0];
          res.json({
            success: true,
            role: 'farmer',
            user: { id: user.id, name: user.name, phone: user.phone, email: user.email, role: 'farmer' },
            farmer: {
              id: farmer.id,
              name: farmer.name,
              phone: farmer.phone,
              email: farmer.email || user.email,
              location: {
                village: farmer.village,
                district: farmer.district,
                state: farmer.state,
                pincode: farmer.pincode,
                coordinates: {
                  lat: (farmer.latitude !== null && farmer.latitude !== undefined && !isNaN(Number(farmer.latitude))) ? Number(farmer.latitude) : null,
                  lng: (farmer.longitude !== null && farmer.longitude !== undefined && !isNaN(Number(farmer.longitude))) ? Number(farmer.longitude) : null,
                },
              },
              preferredLanguage: farmer.preferred_language,
              profileComplete: farmer.profile_complete,
              createdAt: farmer.created_at,
            },
          });
          return;
        }
      }
    }

    if (req.farmerId) {
      const farmerRes = await db.query('SELECT * FROM farmers WHERE id = $1', [req.farmerId]);
      if (farmerRes.rows.length > 0) {
        const farmer = farmerRes.rows[0];
        res.json({
          success: true,
          role: 'farmer',
          user: { id: farmer.user_id, name: farmer.name, phone: farmer.phone, role: 'farmer' },
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
                lat: (farmer.latitude !== null && farmer.latitude !== undefined && !isNaN(Number(farmer.latitude))) ? Number(farmer.latitude) : null,
                lng: (farmer.longitude !== null && farmer.longitude !== undefined && !isNaN(Number(farmer.longitude))) ? Number(farmer.longitude) : null,
              },
            },
            preferredLanguage: farmer.preferred_language,
            profileComplete: farmer.profile_complete,
            createdAt: farmer.created_at,
          },
        });
        return;
      }
    }

    res.status(401).json({ success: false, error: 'Authentication required' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
}
