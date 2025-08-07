import { PrismaClient } from '@prisma/client';
import { config } from '../src/config/environment';

const prisma = new PrismaClient();

/**
 * Seed Nigerian shipping data including carriers, zones, and rates
 * Optimized for Nigerian logistics ecosystem
 */
async function seedShippingData() {
  try {
    console.log('🚚 Starting shipping data seeding...');

    // Create Nigerian shipping zones
    console.log('📍 Creating Nigerian shipping zones...');
    const zones = await createShippingZones();
    
    // Create shipping carriers
    console.log('🏢 Creating shipping carriers...');
    const carriers = await createShippingCarriers();
    
    // Create shipping rates
    console.log('💰 Creating shipping rates...');
    await createShippingRates(carriers, zones);
    
    console.log('✅ Shipping data seeded successfully!');
    console.log(`Created ${zones.length} shipping zones`);
    console.log(`Created ${carriers.length} shipping carriers`);
    console.log('Nigerian logistics ecosystem ready for operations');

  } catch (error) {
    console.error('❌ Error seeding shipping data:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

/**
 * Create Nigerian shipping zones based on geographical regions
 */
async function createShippingZones() {
  const zones = [
    {
      name: 'Lagos Metropolitan',
      states: ['Lagos'],
      cities: ['Lagos Island', 'Victoria Island', 'Ikoyi', 'Lekki', 'Ikeja', 'Maryland', 'Surulere'],
      baseRate: 2000,
      weightMultiplier: 1.0,
      deliveryDays: 1,
      expressDeliveryDays: 1,
    },
    {
      name: 'Southwest Region',
      states: ['Ogun', 'Oyo', 'Osun', 'Ondo', 'Ekiti'],
      cities: ['Abeokuta', 'Ibadan', 'Akure', 'Osogbo', 'Ado-Ekiti'],
      baseRate: 2800,
      weightMultiplier: 1.1,
      deliveryDays: 2,
      expressDeliveryDays: 1,
    },
    {
      name: 'North Central (FCT)',
      states: ['Abuja', 'FCT', 'Kwara', 'Kogi', 'Nasarawa', 'Niger', 'Plateau', 'Benue'],
      cities: ['Abuja', 'Ilorin', 'Lokoja', 'Lafia', 'Minna', 'Jos', 'Makurdi'],
      baseRate: 3200,
      weightMultiplier: 1.2,
      deliveryDays: 3,
      expressDeliveryDays: 2,
    },
    {
      name: 'Southeast Region',
      states: ['Abia', 'Anambra', 'Ebonyi', 'Enugu', 'Imo'],
      cities: ['Aba', 'Onitsha', 'Abakaliki', 'Enugu', 'Owerri'],
      baseRate: 3000,
      weightMultiplier: 1.15,
      deliveryDays: 3,
      expressDeliveryDays: 2,
    },
    {
      name: 'South South Region',
      states: ['Rivers', 'Bayelsa', 'Delta', 'Edo', 'Cross River', 'Akwa Ibom'],
      cities: ['Port Harcourt', 'Yenagoa', 'Warri', 'Benin City', 'Calabar', 'Uyo'],
      baseRate: 3500,
      weightMultiplier: 1.25,
      deliveryDays: 4,
      expressDeliveryDays: 2,
    },
    {
      name: 'Northeast Region',
      states: ['Adamawa', 'Bauchi', 'Borno', 'Gombe', 'Taraba', 'Yobe'],
      cities: ['Yola', 'Bauchi', 'Maiduguri', 'Gombe', 'Jalingo', 'Damaturu'],
      baseRate: 4000,
      weightMultiplier: 1.4,
      deliveryDays: 5,
      expressDeliveryDays: 3,
    },
    {
      name: 'Northwest Region',
      states: ['Kaduna', 'Kano', 'Jigawa', 'Kebbi', 'Sokoto', 'Zamfara', 'Katsina'],
      cities: ['Kaduna', 'Kano', 'Dutse', 'Birnin Kebbi', 'Sokoto', 'Gusau', 'Katsina'],
      baseRate: 3800,
      weightMultiplier: 1.3,
      deliveryDays: 4,
      expressDeliveryDays: 3,
    },
  ];

  const createdZones = [];
  for (const zone of zones) {
    try {
      const createdZone = await prisma.shippingZone.create({
        data: zone
      });
      createdZones.push(createdZone);
      console.log(`✓ Created zone: ${zone.name}`);
    } catch (error) {
      console.log(`⚠️  Zone ${zone.name} might already exist, skipping...`);
    }
  }

  return createdZones;
}

/**
 * Create shipping carriers for Nigerian market
 */
async function createShippingCarriers() {
  const carriers = [
    {
      name: 'Jumia Logistics',
      code: 'JUMIA_NG',
      type: 'standard',
      status: 'ACTIVE',
      baseUrl: 'https://api.jumia-logistics.com/v2',
      supportedServices: ['standard', 'express', 'same-day'],
      coverageAreas: [
        'Lagos', 'Abuja', 'FCT', 'Kano', 'Rivers', 'Oyo', 'Kaduna', 'Ogun', 
        'Imo', 'Plateau', 'Akwa Ibom', 'Delta', 'Edo', 'Enugu', 'Kwara'
      ],
      businessHours: {
        weekdays: { start: '08:00', end: '18:00' },
        saturday: { start: '09:00', end: '16:00' },
        sunday: null
      },
      maxWeight: 50.0,
      maxDimensions: { length: 120, width: 80, height: 80 },
      deliveryTimeframes: {
        'Lagos Metropolitan': { standard: 1, express: 1, sameDay: true },
        'Southwest Region': { standard: 2, express: 1 },
        'North Central (FCT)': { standard: 3, express: 2 },
        'Southeast Region': { standard: 3, express: 2 },
        'South South Region': { standard: 4, express: 2 },
        'Northeast Region': { standard: 5, express: 3 },
        'Northwest Region': { standard: 4, express: 3 }
      },
      contactInfo: {
        phone: '+234-700-JUMIA-NG',
        email: 'logistics@jumia.com.ng',
        website: 'https://logistics.jumia.com.ng'
      },
      isDefault: true,
    },
    {
      name: 'Swift Local Delivery',
      code: 'SLD_NG',
      type: 'economy',
      status: 'ACTIVE',
      baseUrl: 'https://api.swiftlocal.ng/v1',
      supportedServices: ['standard', 'express'],
      coverageAreas: [
        'Lagos', 'Ogun', 'Abuja', 'FCT', 'Oyo', 'Osun', 'Kano', 'Kaduna',
        'Rivers', 'Edo', 'Enugu', 'Plateau'
      ],
      businessHours: {
        weekdays: { start: '09:00', end: '17:00' },
        saturday: { start: '10:00', end: '15:00' },
        sunday: null
      },
      maxWeight: 25.0,
      maxDimensions: { length: 80, width: 60, height: 40 },
      deliveryTimeframes: {
        'Lagos Metropolitan': { standard: 2, express: 1 },
        'Southwest Region': { standard: 3, express: 2 },
        'North Central (FCT)': { standard: 4, express: 3 },
        'Southeast Region': { standard: 4, express: 3 },
        'South South Region': { standard: 5, express: 4 },
        'Northeast Region': { standard: 6, express: 5 },
        'Northwest Region': { standard: 5, express: 4 }
      },
      contactInfo: {
        phone: '+234-803-SWIFT-NG',
        email: 'support@swiftlocal.ng',
        website: 'https://www.swiftlocal.ng'
      },
      isDefault: false,
    },
  ];

  const createdCarriers = [];
  for (const carrier of carriers) {
    try {
      const createdCarrier = await prisma.shippingCarrier.create({
        data: carrier
      });
      createdCarriers.push(createdCarrier);
      console.log(`✓ Created carrier: ${carrier.name}`);
    } catch (error) {
      console.log(`⚠️  Carrier ${carrier.name} might already exist, skipping...`);
    }
  }

  return createdCarriers;
}

/**
 * Create shipping rates for all carrier-zone combinations
 */
async function createShippingRates(carriers: any[], zones: any[]) {
  const serviceTypes = ['standard', 'express', 'same-day'];
  const weightRanges = [
    { min: 0.1, max: 1.0 },
    { min: 1.0, max: 5.0 },
    { min: 5.0, max: 10.0 },
    { min: 10.0, max: 25.0 },
    { min: 25.0, max: 50.0 },
  ];

  let ratesCreated = 0;

  for (const carrier of carriers) {
    for (const zone of zones) {
      for (const serviceType of serviceTypes) {
        // Skip same-day for remote areas and some carriers
        if (serviceType === 'same-day') {
          const remoteZones = ['Northeast Region', 'Northwest Region'];
          if (remoteZones.includes(zone.name) || carrier.code === 'SLD_NG') {
            continue;
          }
        }

        for (const weightRange of weightRanges) {
          // Skip heavy packages for local carrier
          if (carrier.code === 'SLD_NG' && weightRange.min >= 25.0) {
            continue;
          }

          try {
            const baseRate = calculateBaseRate(zone, serviceType, weightRange);
            const weightRate = calculateWeightRate(serviceType, weightRange);

            await prisma.shippingRate.create({
              data: {
                carrierId: carrier.id,
                zoneId: zone.id,
                serviceType,
                minWeight: weightRange.min,
                maxWeight: weightRange.max,
                baseRate,
                weightRate,
                dimensionalFactor: 5000, // Standard for Nigerian logistics
                fuelSurcharge: 0.08, // 8% fuel surcharge
                insuranceRate: 0.01, // 1% insurance rate
                isActive: true,
                effectiveFrom: new Date(),
              }
            });
            ratesCreated++;
          } catch (error) {
            // Rate combination might already exist, continue
            continue;
          }
        }
      }
    }
  }

  console.log(`✓ Created ${ratesCreated} shipping rates`);
  return ratesCreated;
}

/**
 * Calculate base rate based on zone and service type
 */
function calculateBaseRate(zone: any, serviceType: string, weightRange: any): number {
  let baseRate = zone.baseRate;

  // Service type multipliers
  switch (serviceType) {
    case 'express':
      baseRate *= 1.5;
      break;
    case 'same-day':
      baseRate *= 2.0;
      break;
    default:
      // standard rate
      break;
  }

  // Weight range adjustments
  if (weightRange.min >= 10.0) {
    baseRate *= 1.2;
  } else if (weightRange.min >= 5.0) {
    baseRate *= 1.1;
  }

  return Math.round(baseRate);
}

/**
 * Calculate weight rate per kg
 */
function calculateWeightRate(serviceType: string, weightRange: any): number {
  let rate = 200; // Base rate per kg

  switch (serviceType) {
    case 'express':
      rate *= 1.3;
      break;
    case 'same-day':
      rate *= 1.8;
      break;
    default:
      // standard rate
      break;
  }

  // Higher rates for heavier packages
  if (weightRange.min >= 10.0) {
    rate *= 0.8; // Bulk discount
  }

  return Math.round(rate);
}

// Run the seeding function if this script is executed directly
if (require.main === module) {
  seedShippingData()
    .then(() => {
      console.log('🎉 Shipping data seeding completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Shipping data seeding failed:', error);
      process.exit(1);
    });
}

export { seedShippingData };