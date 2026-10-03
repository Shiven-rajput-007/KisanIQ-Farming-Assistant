import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 [Prisma Seed] Starting KisanIQ Development Database Seeder...');

  const passwordHash = await bcrypt.hash('kisan123', 10);

  // 1. Seed User & Farmer (Ramesh)
  const user = await prisma.user.upsert({
    where: { phone: '9876543210' },
    update: {},
    create: {
      id: 'user_ramesh',
      phone: '9876543210',
      passwordHash,
      name: 'Ramesh Kumar',
      role: 'farmer',
      city: 'Gwalior',
    },
  });

  const farmer = await prisma.farmer.upsert({
    where: { id: 'farmer_ramesh' },
    update: {},
    create: {
      id: 'farmer_ramesh',
      userId: user.id,
      name: 'Ramesh',
      phone: '9876543210',
      village: 'Morar',
      district: 'Gwalior',
      state: 'Madhya Pradesh',
      pincode: '474006',
      latitude: 26.2183,
      longitude: 78.1828,
      preferredLanguage: 'hi',
      profileComplete: true,
    },
  });

  // 2. Seed Farm & Fields
  const farm = await prisma.farm.upsert({
    where: { id: 'farm_ramesh_1' },
    update: {},
    create: {
      id: 'farm_ramesh_1',
      farmerId: farmer.id,
      totalArea: 5.0,
      soilType: 'alluvial',
      irrigationSource: 'borewell',
    },
  });

  const field1 = await prisma.field.upsert({
    where: { id: 'field_1' },
    update: {},
    create: {
      id: 'field_1',
      farmId: farm.id,
      name: 'Main Field (North)',
      area: 3.0,
      soilType: 'alluvial',
      irrigationType: 'borewell',
    },
  });

  // 3. Seed Crop (Wheat)
  const sowingDate = new Date();
  sowingDate.setDate(sowingDate.getDate() - 85);
  const harvestDate = new Date();
  harvestDate.setDate(harvestDate.getDate() + 35);

  const crop = await prisma.crop.upsert({
    where: { id: 'crop_wheat_1' },
    update: {},
    create: {
      id: 'crop_wheat_1',
      farmerId: farmer.id,
      fieldId: field1.id,
      name: 'Wheat',
      nameKey: 'wheat',
      variety: 'HD-2967',
      sowingDate,
      expectedHarvestDate: harvestDate,
      currentStage: 'flowering',
      daysOld: 85,
      healthOverall: 'low',
      healthWeatherRisk: 'low',
      healthDiseaseRisk: 'medium',
      healthWaterStatus: 'low',
      area: 5.0,
      expectedYield: 100.0,
      icon: '🌾',
    },
  });

  // 4. Seed Verified APMC Markets
  const marketsData = [
    {
      id: 'mkt_morar',
      name: 'Krishi Upaj Mandi Samiti, Morar',
      location: 'Morar, Gwalior',
      district: 'Gwalior',
      state: 'Madhya Pradesh',
      latitude: 26.2241,
      longitude: 78.2269,
      distanceKm: 4.5,
      commissionRate: 1.5,
      loadingCost: 400.0,
      storageCost: 0.0,
      expectedWastage: 0.8,
      isRecommended: true,
      recommendationRank: 1,
    },
    {
      id: 'mkt_lashkar',
      name: 'Krishi Upaj Mandi Samiti, Lashkar',
      location: 'Mela Ground, Lashkar, Gwalior',
      district: 'Gwalior',
      state: 'Madhya Pradesh',
      latitude: 26.2023,
      longitude: 78.1634,
      distanceKm: 7.2,
      commissionRate: 2.0,
      loadingCost: 450.0,
      storageCost: 0.0,
      expectedWastage: 1.0,
      isRecommended: false,
      recommendationRank: 2,
    },
    {
      id: 'mkt_pune',
      name: 'Pune APMC Market Yard (Market Yard Gultekdi)',
      location: 'Gultekdi, Pune',
      district: 'Pune',
      state: 'Maharashtra',
      latitude: 18.4965,
      longitude: 73.8647,
      distanceKm: 6.5,
      commissionRate: 1.8,
      loadingCost: 500.0,
      storageCost: 0.0,
      expectedWastage: 1.0,
      isRecommended: true,
      recommendationRank: 1,
    },
  ];

  for (const mkt of marketsData) {
    await prisma.market.upsert({
      where: { id: mkt.id },
      update: {},
      create: mkt,
    });
  }

  // 5. Seed Accredited Laboratories
  const labsData = [
    {
      id: 'lab_rahuri',
      name: 'MPKV Rahuri Krishi Vigyan Kendra Soil Testing Centre',
      address: 'Mahatma Phule Krishi Vidyapeeth, Rahuri',
      city: 'Rahuri',
      district: 'Ahmednagar',
      state: 'Maharashtra',
      pincode: '413722',
      phone: '02426-243210',
      email: 'kvkrahuri@mpkv.ac.in',
      accreditation: 'State Agriculture Dept / ICAR Approved Centre',
      operatingStatus: 'active',
      turnaroundDays: 5,
      supportedTests: ['pH', 'EC', 'OC', 'N', 'P', 'K', 'Moisture'],
      isDemo: false,
    },
    {
      id: 'lab_pune',
      name: 'Mahadhan Agricultural Soil Testing Laboratory',
      address: 'Plot 14, Agriculture College Campus, Shivaji Nagar',
      city: 'Pune',
      district: 'Pune',
      state: 'Maharashtra',
      pincode: '411005',
      phone: '020-25531234',
      email: 'pune.soillab@mahadhan.co.in',
      accreditation: 'NABL ISO/IEC 17025:2017 & ICAR Certified',
      operatingStatus: 'active',
      turnaroundDays: 4,
      supportedTests: ['pH', 'EC', 'OC', 'N', 'P', 'K', 'Moisture', 'Zinc', 'Boron', 'Iron'],
      isDemo: false,
    },
  ];

  for (const lab of labsData) {
    await prisma.laboratory.upsert({
      where: { id: lab.id },
      update: {},
      create: lab,
    });
  }

  // 6. Seed Soil Report for Ramesh
  await prisma.soilReport.upsert({
    where: { id: 'rep_1' },
    update: {},
    create: {
      id: 'rep_1',
      farmerId: farmer.id,
      fieldId: field1.id,
      labId: 'lab_pune',
      testDate: new Date('2026-08-28'),
      cropName: 'Wheat',
      ph: 6.5,
      ec: 0.38,
      organicCarbon: 0.45,
      nitrogenKgHa: 260,
      phosphorusKgHa: 18.5,
      potassiumKgHa: 210,
      moisturePct: 22.0,
      overallHealth: 'medium',
      deficiencies: ['सेंद्रिय कर्ब (Organic Carbon) कमी आहे', 'नायट्रोजन (N) ची कमतरता आहे'],
      recommendations: 'एकरनिहाय चांगल्या कुजलेल्या शेणखताचा किंवा गांडूळखताचा वापर करा. सिंचनासोबत संतुलित नत्रयुक्त खतांची मात्रा द्या.',
      pdfUrl: '/reports/soil_report_8821.pdf',
      isDemo: false,
    },
  });

  // 7. Seed Vehicles for Logistics
  await prisma.vehicle.upsert({
    where: { id: 'veh_01' },
    update: {},
    create: {
      id: 'veh_01',
      vehicleNumber: 'MP-07-GA-4821',
      vehicleType: 'Mahindra Bolero Pickup',
      capacityQuintals: 30.0,
      driverName: 'Jagdish Yadav',
      driverPhone: '9826011223',
      status: 'available',
    },
  });

  console.log('✅ [Prisma Seed] Seed data successfully populated in PostgreSQL!');
}

main()
  .catch((e) => {
    console.error('❌ [Prisma Seed] Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
