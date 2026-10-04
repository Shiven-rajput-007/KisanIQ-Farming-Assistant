import { db } from '../db/index.js';
import { soilRulesEngine, SoilHealthReportSummary } from './soilRules.js';

export interface Laboratory {
  id: string;
  name: string;
  address: string;
  city: string;
  district: string;
  state: string;
  pincode?: string;
  phone?: string;
  email?: string;
  accreditation?: string;
  operatingStatus: string;
  turnaroundDays: number;
  supportedTests: string[];
  isDemo: boolean;
}

export type SoilRequestStatus =
  | 'REQUESTED'
  | 'SAMPLE_COLLECTED'
  | 'IN_TRANSIT'
  | 'RECEIVED_AT_LAB'
  | 'TESTING_IN_PROGRESS'
  | 'REPORT_GENERATED'
  | 'DELIVERED';

export interface SoilTestRequest {
  id: string;
  farmerId: string;
  farmId?: string;
  fieldId?: string;
  cropName: string;
  labId: string;
  labName?: string;
  sampleId: string;
  sampleCollectionDate: string;
  testTypes: string[];
  testingMode: 'LAB_TEST' | 'MANUAL_KIT' | 'IOT_SENSOR';
  status: SoilRequestStatus;
  trackingNotes?: string;
  isDemo: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SoilReport {
  id: string;
  requestId?: string;
  farmerId: string;
  fieldId?: string;
  labId?: string;
  labName?: string;
  testDate: string;
  cropName: string;
  ph: number;
  ec: number;
  organicCarbon: number;
  nitrogenKgHa: number;
  phosphorusKgHa: number;
  potassiumKgHa: number;
  moisturePct?: number;
  overallHealth: string;
  deficiencies?: string[];
  recommendations?: string;
  pdfUrl?: string;
  isDemo: boolean;
  evaluation?: SoilHealthReportSummary;
  createdAt: string;
}

export class SoilService {
  /**
   * Fetch list of accredited soil testing laboratories
   */
  async getLaboratories(): Promise<Laboratory[]> {
    const res = await db.query(
      `SELECT * FROM laboratories ORDER BY state = 'Maharashtra' DESC, name ASC`
    );
    return res.rows.map((r: any) => ({
      id: r.id,
      name: r.name,
      address: r.address,
      city: r.city,
      district: r.district,
      state: r.state,
      pincode: r.pincode,
      phone: r.phone,
      email: r.email,
      accreditation: r.accreditation,
      operatingStatus: r.operating_status,
      turnaroundDays: r.turnaround_days,
      supportedTests: typeof r.supported_tests === 'string' ? JSON.parse(r.supported_tests) : r.supported_tests,
      isDemo: r.is_demo,
    }));
  }

  /**
   * Get single lab by ID
   */
  async getLabById(id: string): Promise<Laboratory | null> {
    const res = await db.query(`SELECT * FROM laboratories WHERE id = $1`, [id]);
    if (res.rows.length === 0) return null;
    const r = res.rows[0];
    return {
      id: r.id,
      name: r.name,
      address: r.address,
      city: r.city,
      district: r.district,
      state: r.state,
      pincode: r.pincode,
      phone: r.phone,
      email: r.email,
      accreditation: r.accreditation,
      operatingStatus: r.operating_status,
      turnaroundDays: r.turnaround_days,
      supportedTests: typeof r.supported_tests === 'string' ? JSON.parse(r.supported_tests) : r.supported_tests,
      isDemo: r.is_demo,
    };
  }

  /**
   * Create a new soil test request
   */
  async createRequest(data: {
    farmerId: string;
    farmId?: string;
    fieldId?: string;
    cropName: string;
    labId: string;
    sampleCollectionDate?: string;
    testTypes: string[];
    testingMode?: 'LAB_TEST' | 'MANUAL_KIT' | 'IOT_SENSOR';
    trackingNotes?: string;
  }): Promise<SoilTestRequest> {
    const id = `str_${Date.now()}`;
    const year = new Date().getFullYear();
    const rand = Math.floor(1000 + Math.random() * 9000);
    const sampleId = `MH-SOIL-${year}-${rand}`;
    const date = data.sampleCollectionDate || new Date().toISOString().split('T')[0];
    const mode = data.testingMode || 'LAB_TEST';

    let farmId = data.farmId || null;
    let fieldId = data.fieldId || null;

    if (!farmId && data.farmerId) {
      try {
        const farmRes = await db.query('SELECT id FROM farms WHERE farmer_id = $1 LIMIT 1', [data.farmerId]);
        if (farmRes.rows.length > 0) {
          farmId = farmRes.rows[0].id;
        }
      } catch (err) {
        console.warn('[SoilService] Error fetching farmer farm:', err);
      }
    }

    await db.query(
      `INSERT INTO soil_test_requests (
        id, farmer_id, farm_id, field_id, crop_name, lab_id, sample_id,
        sample_collection_date, test_types, testing_mode, status, tracking_notes, is_demo
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'REQUESTED', $11, false)`,
      [
        id,
        data.farmerId,
        farmId,
        fieldId,
        data.cropName,
        data.labId,
        sampleId,
        date,
        JSON.stringify(data.testTypes),
        mode,
        data.trackingNotes || 'Sample collection planned by farmer',
      ]
    );

    const created = await this.getRequestById(id);
    return created!;
  }

  /**
   * Get all test requests for a farmer
   */
  async getFarmerRequests(farmerId: string): Promise<SoilTestRequest[]> {
    const res = await db.query(
      `SELECT r.*, l.name as lab_name
       FROM soil_test_requests r
       LEFT JOIN laboratories l ON r.lab_id = l.id
       WHERE r.farmer_id = $1
       ORDER BY r.created_at DESC`,
      [farmerId]
    );

    return res.rows.map((r: any) => ({
      id: r.id,
      farmerId: r.farmer_id,
      farmId: r.farm_id,
      fieldId: r.field_id,
      cropName: r.crop_name,
      labId: r.lab_id,
      labName: r.lab_name,
      sampleId: r.sample_id,
      sampleCollectionDate: r.sample_collection_date,
      testTypes: typeof r.test_types === 'string' ? JSON.parse(r.test_types) : r.test_types,
      testingMode: r.testing_mode,
      status: r.status,
      trackingNotes: r.tracking_notes,
      isDemo: r.is_demo,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    }));
  }

  /**
   * Get request detail
   */
  async getRequestById(id: string): Promise<SoilTestRequest | null> {
    const res = await db.query(
      `SELECT r.*, l.name as lab_name
       FROM soil_test_requests r
       LEFT JOIN laboratories l ON r.lab_id = l.id
       WHERE r.id = $1`,
      [id]
    );
    if (res.rows.length === 0) return null;
    const r = res.rows[0];
    return {
      id: r.id,
      farmerId: r.farmer_id,
      farmId: r.farm_id,
      fieldId: r.field_id,
      cropName: r.crop_name,
      labId: r.lab_id,
      labName: r.lab_name,
      sampleId: r.sample_id,
      sampleCollectionDate: r.sample_collection_date,
      testTypes: typeof r.test_types === 'string' ? JSON.parse(r.test_types) : r.test_types,
      testingMode: r.testing_mode,
      status: r.status,
      trackingNotes: r.tracking_notes,
      isDemo: r.is_demo,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    };
  }

  /**
   * Update request status
   */
  async updateStatus(
    id: string,
    status: SoilTestRequest['status'],
    notes?: string
  ): Promise<SoilTestRequest | null> {
    await db.query(
      `UPDATE soil_test_requests
       SET status = $1, tracking_notes = COALESCE($2, tracking_notes), updated_at = NOW()
       WHERE id = $3`,
      [status, notes, id]
    );
    return this.getRequestById(id);
  }

  /**
   * Fetch the latest verified soil report for a farmer with agronomic evaluation
   */
  async getLatestReport(farmerId?: string): Promise<SoilReport | null> {
    if (!farmerId) return null;
    const res = await db.query(
      `SELECT r.*, l.name as lab_name
       FROM soil_reports r
       LEFT JOIN laboratories l ON r.lab_id = l.id
       WHERE r.farmer_id = $1
       ORDER BY r.test_date DESC, r.created_at DESC
       LIMIT 1`,
      [farmerId]
    );

    if (res.rows.length === 0) return null;
    const r = res.rows[0];

    // Evaluate with agronomic rules engine
    const evaluation = soilRulesEngine.evaluate(
      {
        ph: Number(r.ph),
        ec: Number(r.ec),
        organicCarbon: Number(r.organic_carbon),
        nitrogen: Number(r.nitrogen_kg_ha),
        phosphorus: Number(r.phosphorus_kg_ha),
        potassium: Number(r.potassium_kg_ha),
        moisture: r.moisture_pct ? Number(r.moisture_pct) : undefined,
      },
      r.crop_name || 'Wheat'
    );

    return {
      id: r.id,
      requestId: r.request_id,
      farmerId: r.farmer_id,
      fieldId: r.field_id,
      labId: r.lab_id,
      labName: r.lab_name,
      testDate: r.test_date,
      cropName: r.crop_name,
      ph: Number(r.ph),
      ec: Number(r.ec),
      organicCarbon: Number(r.organic_carbon),
      nitrogenKgHa: Number(r.nitrogen_kg_ha),
      phosphorusKgHa: Number(r.phosphorus_kg_ha),
      potassiumKgHa: Number(r.potassium_kg_ha),
      moisturePct: r.moisture_pct ? Number(r.moisture_pct) : undefined,
      overallHealth: r.overall_health,
      deficiencies: evaluation.deficienciesMr,
      recommendations: evaluation.recommendationsMr.join(' '),
      pdfUrl: r.pdf_url,
      isDemo: r.is_demo,
      evaluation,
      createdAt: r.created_at,
    };
  }

  /**
   * Fetch historical reports for trend charting
   */
  async getReportsHistory(farmerId?: string): Promise<SoilReport[]> {
    if (!farmerId) return [];
    const res = await db.query(
      `SELECT r.*, l.name as lab_name
       FROM soil_reports r
       LEFT JOIN laboratories l ON r.lab_id = l.id
       WHERE r.farmer_id = $1
       ORDER BY r.test_date ASC`,
      [farmerId]
    );

    return res.rows.map((r: any) => ({
      id: r.id,
      requestId: r.request_id,
      farmerId: r.farmer_id,
      fieldId: r.field_id,
      labId: r.lab_id,
      labName: r.lab_name,
      testDate: r.test_date,
      cropName: r.crop_name,
      ph: Number(r.ph),
      ec: Number(r.ec),
      organicCarbon: Number(r.organic_carbon),
      nitrogenKgHa: Number(r.nitrogen_kg_ha),
      phosphorusKgHa: Number(r.phosphorus_kg_ha),
      potassiumKgHa: Number(r.potassium_kg_ha),
      moisturePct: r.moisture_pct ? Number(r.moisture_pct) : undefined,
      overallHealth: r.overall_health,
      pdfUrl: r.pdf_url,
      isDemo: r.is_demo,
      createdAt: r.created_at,
    }));
  }

  /**
   * Simulated / Connected IoT soil sensors (Prepped for real sensors)
   */
  async getSensorReading(fieldId: string = 'field_1') {
    const res = await db.query(
      `SELECT * FROM soil_sensor_readings WHERE field_id = $1 ORDER BY recorded_at DESC LIMIT 1`,
      [fieldId]
    );

    if (res.rows.length > 0) {
      const r = res.rows[0];
      return {
        fieldId: r.field_id,
        sensorId: r.sensor_id,
        moisturePct: Number(r.moisture_pct),
        temperatureCelsius: Number(r.temperature_celsius),
        ph: r.ph ? Number(r.ph) : 6.8,
        ec: r.ec ? Number(r.ec) : 0.45,
        nitrogenPpm: r.nitrogen_ppm ? Number(r.nitrogen_ppm) : 48.0,
        recordedAt: r.recorded_at,
        isDemo: true,
        sourceLabel: 'DEMO SENSOR DATA',
      };
    }

    // Default simulated IoT reading
    return {
      fieldId,
      sensorId: 'IOT-SOIL-NODE-01',
      moisturePct: 24.5,
      temperatureCelsius: 23.8,
      ph: 6.8,
      ec: 0.42,
      nitrogenPpm: 52.0,
      recordedAt: new Date().toISOString(),
      isDemo: true,
      sourceLabel: 'DEMO SENSOR DATA',
    };
  }
}

export const soilService = new SoilService();
