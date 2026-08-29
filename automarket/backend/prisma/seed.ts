/* eslint-disable no-console */
// The seed runs under tsx, not the Prisma CLI, so it loads .env itself.
import 'dotenv/config';
import {
  AdminRole,
  EmploymentType,
  FuelType,
  ModelStatus,
  PolicyType,
  PrismaClient,
  Transmission,
  VehicleType,
} from '@prisma/client';
import { hashPassword } from '../src/common/utils/password';

const prisma = new PrismaClient();

// Prices are whole rupees, ex-showroom Delhi, and are indicative reference data
// for a working demo — production catalogues are fed from the OEM price lists.

interface SeedVariant {
  name: string;
  price: number;
  fuel: FuelType;
  transmission?: Transmission;
  cc?: number;
  bhp?: number;
  torque?: number;
  mileage?: number;
  seats?: number;
  batteryKwh?: number;
  rangeKm?: number;
  top?: boolean;
}

interface SeedModel {
  name: string;
  bodyType: string;
  segment?: string;
  status?: ModelStatus;
  description: string;
  mileage?: number;
  seats?: number;
  ptoHp?: number;
  gvwKg?: number;
  popular?: boolean;
  rating?: number;
  reviews?: number;
  launch?: string;
  highlights: [string, string][];
  variants: SeedVariant[];
}

interface SeedBrand {
  name: string;
  country: string;
  popular?: boolean;
  models: SeedModel[];
}

const CATALOG: Record<VehicleType, SeedBrand[]> = {
  CAR: [
    {
      name: 'Maruti Suzuki',
      country: 'India',
      popular: true,
      models: [
        {
          name: 'Swift',
          bodyType: 'Hatchback',
          segment: 'Compact',
          description:
            'India’s best-selling hatchback, built around a light 1.2-litre Z-series petrol engine that returns class-leading fuel economy without feeling slow in city traffic.',
          mileage: 24.8,
          seats: 5,
          popular: true,
          rating: 4.4,
          reviews: 1820,
          launch: '2024-05-09',
          highlights: [
            ['Mileage', '24.8 kmpl'],
            ['Engine', '1197 cc'],
            ['Boot space', '265 litres'],
            ['Airbags', '6 standard'],
          ],
          variants: [
            { name: 'LXi', price: 649000, fuel: 'PETROL', transmission: 'MANUAL', cc: 1197, bhp: 80.5, torque: 111.7, mileage: 24.8, seats: 5 },
            { name: 'VXi', price: 739000, fuel: 'PETROL', transmission: 'MANUAL', cc: 1197, bhp: 80.5, torque: 111.7, mileage: 24.8, seats: 5, top: true },
            { name: 'VXi AMT', price: 789000, fuel: 'PETROL', transmission: 'AMT', cc: 1197, bhp: 80.5, torque: 111.7, mileage: 25.75, seats: 5 },
            { name: 'ZXi Plus', price: 919000, fuel: 'PETROL', transmission: 'MANUAL', cc: 1197, bhp: 80.5, torque: 111.7, mileage: 24.8, seats: 5 },
          ],
        },
        {
          name: 'Grand Vitara',
          bodyType: 'SUV',
          segment: 'Mid-size',
          description:
            'A mid-size SUV offered with a strong-hybrid powertrain that switches to pure-electric drive in traffic, plus a mild-hybrid petrol with optional all-wheel drive.',
          mileage: 27.97,
          seats: 5,
          popular: true,
          rating: 4.5,
          reviews: 940,
          launch: '2022-09-26',
          highlights: [
            ['Mileage', '27.97 kmpl'],
            ['Drivetrain', 'AllGrip AWD'],
            ['Boot space', '373 litres'],
            ['Warranty', '3 yrs / 1 lakh km'],
          ],
          variants: [
            { name: 'Sigma', price: 1099000, fuel: 'PETROL', transmission: 'MANUAL', cc: 1462, bhp: 101.6, torque: 136.8, mileage: 21.11, seats: 5 },
            { name: 'Delta Smart Hybrid', price: 1250000, fuel: 'HYBRID', transmission: 'MANUAL', cc: 1462, bhp: 101.6, torque: 136.8, mileage: 21.11, seats: 5 },
            { name: 'Zeta Strong Hybrid', price: 1799000, fuel: 'HYBRID', transmission: 'CVT', cc: 1490, bhp: 115.5, torque: 141, mileage: 27.97, seats: 5, top: true },
            { name: 'Alpha AllGrip', price: 1990000, fuel: 'PETROL', transmission: 'MANUAL', cc: 1462, bhp: 101.6, torque: 136.8, mileage: 19.38, seats: 5 },
          ],
        },
      ],
    },
    {
      name: 'Hyundai',
      country: 'South Korea',
      popular: true,
      models: [
        {
          name: 'Creta',
          bodyType: 'SUV',
          segment: 'Mid-size',
          description:
            'The benchmark mid-size SUV, with petrol, turbo-petrol and diesel options, a Level-2 ADAS suite on higher trims and one of the segment’s best-equipped cabins.',
          mileage: 21.8,
          seats: 5,
          popular: true,
          rating: 4.6,
          reviews: 2410,
          launch: '2024-01-16',
          highlights: [
            ['Mileage', '21.8 kmpl'],
            ['Safety', 'Level-2 ADAS'],
            ['Boot space', '433 litres'],
            ['Sunroof', 'Panoramic'],
          ],
          variants: [
            { name: 'E 1.5 Petrol', price: 1100000, fuel: 'PETROL', transmission: 'MANUAL', cc: 1497, bhp: 113.4, torque: 143.8, mileage: 17.4, seats: 5 },
            { name: 'S(O) 1.5 Diesel', price: 1560000, fuel: 'DIESEL', transmission: 'MANUAL', cc: 1493, bhp: 114, torque: 250, mileage: 21.8, seats: 5, top: true },
            { name: 'SX Tech 1.5 Turbo DCT', price: 1890000, fuel: 'PETROL', transmission: 'DCT', cc: 1482, bhp: 158, torque: 253, mileage: 18.4, seats: 5 },
            { name: 'SX(O) Knight DCT', price: 2065000, fuel: 'PETROL', transmission: 'DCT', cc: 1482, bhp: 158, torque: 253, mileage: 18.4, seats: 5 },
          ],
        },
      ],
    },
    {
      name: 'Tata',
      country: 'India',
      popular: true,
      models: [
        {
          name: 'Nexon',
          bodyType: 'SUV',
          segment: 'Compact',
          description:
            'A 5-star Global NCAP compact SUV with petrol, diesel and CNG options, and the widest spread of automatic gearboxes in its class.',
          mileage: 24.08,
          seats: 5,
          popular: true,
          rating: 4.5,
          reviews: 1990,
          launch: '2023-09-14',
          highlights: [
            ['Safety', '5-star Global NCAP'],
            ['Mileage', '24.08 kmpl'],
            ['Boot space', '382 litres'],
            ['Gearbox', '6-speed DCA'],
          ],
          variants: [
            { name: 'Smart 1.2 Petrol', price: 800000, fuel: 'PETROL', transmission: 'MANUAL', cc: 1199, bhp: 118, torque: 170, mileage: 17.44, seats: 5 },
            { name: 'Creative Diesel', price: 1275000, fuel: 'DIESEL', transmission: 'MANUAL', cc: 1497, bhp: 113, torque: 260, mileage: 24.08, seats: 5, top: true },
            { name: 'Fearless+ DCA', price: 1500000, fuel: 'PETROL', transmission: 'DCT', cc: 1199, bhp: 118, torque: 170, mileage: 17.18, seats: 5 },
          ],
        },
        {
          name: 'Punch EV',
          bodyType: 'SUV',
          segment: 'Micro',
          description:
            'An electric micro-SUV on Tata’s acti.ev architecture, with a 421 km claimed range on the long-range pack and DC fast charging as standard.',
          seats: 5,
          rating: 4.3,
          reviews: 610,
          launch: '2024-01-17',
          highlights: [
            ['Range', '421 km (ARAI)'],
            ['Fast charge', '10-80% in 56 min'],
            ['Boot space', '366 litres'],
            ['Warranty', '8 yrs on battery'],
          ],
          variants: [
            { name: 'Smart Medium Range', price: 999000, fuel: 'ELECTRIC', transmission: 'AUTOMATIC', bhp: 80.5, torque: 114, seats: 5, batteryKwh: 25, rangeKm: 315 },
            { name: 'Empowered+ Long Range', price: 1550000, fuel: 'ELECTRIC', transmission: 'AUTOMATIC', bhp: 120.7, torque: 190, seats: 5, batteryKwh: 35, rangeKm: 421, top: true },
          ],
        },
      ],
    },
    {
      name: 'Mahindra',
      country: 'India',
      popular: true,
      models: [
        {
          name: 'Scorpio N',
          bodyType: 'SUV',
          segment: 'Mid-size',
          description:
            'A body-on-frame SUV with a 2.2-litre diesel producing up to 172 bhp, mechanical 4XPLOR four-wheel drive and six- or seven-seat layouts.',
          mileage: 16.36,
          seats: 7,
          popular: true,
          rating: 4.6,
          reviews: 1560,
          launch: '2022-06-27',
          highlights: [
            ['Power', '172 bhp'],
            ['Drivetrain', '4XPLOR 4WD'],
            ['Seating', '6 / 7 seats'],
            ['Safety', '5-star BNCAP'],
          ],
          variants: [
            { name: 'Z2 Petrol', price: 1399000, fuel: 'PETROL', transmission: 'MANUAL', cc: 1997, bhp: 200, torque: 380, mileage: 12, seats: 7 },
            { name: 'Z4 Diesel', price: 1699000, fuel: 'DIESEL', transmission: 'MANUAL', cc: 2184, bhp: 172, torque: 400, mileage: 16.36, seats: 7, top: true },
            { name: 'Z8L Diesel AT 4WD', price: 2470000, fuel: 'DIESEL', transmission: 'AUTOMATIC', cc: 2184, bhp: 172, torque: 400, mileage: 14.4, seats: 6 },
          ],
        },
      ],
    },
    {
      name: 'Toyota',
      country: 'Japan',
      models: [
        {
          name: 'Innova Hycross',
          bodyType: 'MPV',
          segment: 'Premium',
          description:
            'A monocoque MPV with a self-charging hybrid drivetrain, ottoman second-row seats on top trims and 23.24 kmpl claimed efficiency.',
          mileage: 23.24,
          seats: 8,
          popular: true,
          rating: 4.7,
          reviews: 880,
          launch: '2022-11-25',
          highlights: [
            ['Mileage', '23.24 kmpl'],
            ['Seating', '7 / 8 seats'],
            ['ADAS', 'Toyota Safety Sense'],
            ['Boot space', '991 litres'],
          ],
          variants: [
            { name: 'GX 7-Seater', price: 1899000, fuel: 'PETROL', transmission: 'CVT', cc: 1987, bhp: 172, torque: 205, mileage: 16.13, seats: 7 },
            { name: 'VX Hybrid', price: 2799000, fuel: 'HYBRID', transmission: 'CVT', cc: 1987, bhp: 183, torque: 188, mileage: 23.24, seats: 7, top: true },
            { name: 'ZX(O) Hybrid', price: 3160000, fuel: 'HYBRID', transmission: 'CVT', cc: 1987, bhp: 183, torque: 188, mileage: 23.24, seats: 7 },
          ],
        },
      ],
    },
    {
      name: 'Kia',
      country: 'South Korea',
      models: [
        {
          name: 'Seltos',
          bodyType: 'SUV',
          segment: 'Mid-size',
          description:
            'A feature-first mid-size SUV with three engine options, a 10.25-inch twin-screen layout and ADAS across the upper half of the range.',
          mileage: 20.7,
          seats: 5,
          rating: 4.5,
          reviews: 1320,
          launch: '2023-07-04',
          highlights: [
            ['Mileage', '20.7 kmpl'],
            ['Screens', 'Dual 10.25-inch'],
            ['Safety', 'Level-2 ADAS'],
            ['Boot space', '433 litres'],
          ],
          variants: [
            { name: 'HTE 1.5 Petrol', price: 1090000, fuel: 'PETROL', transmission: 'MANUAL', cc: 1497, bhp: 113, torque: 144, mileage: 17.7, seats: 5 },
            { name: 'HTK+ 1.5 Diesel', price: 1520000, fuel: 'DIESEL', transmission: 'MANUAL', cc: 1493, bhp: 114, torque: 250, mileage: 20.7, seats: 5, top: true },
            { name: 'GTX+ 1.5 Turbo DCT', price: 1999000, fuel: 'PETROL', transmission: 'DCT', cc: 1482, bhp: 158, torque: 253, mileage: 17.9, seats: 5 },
          ],
        },
      ],
    },
    {
      name: 'Honda',
      country: 'Japan',
      models: [
        {
          name: 'City',
          bodyType: 'Sedan',
          segment: 'Mid-size',
          description:
            'The long-running mid-size sedan, now with Honda Sensing ADAS as standard on the petrol range and a strong-hybrid e:HEV option.',
          mileage: 27.26,
          seats: 5,
          rating: 4.6,
          reviews: 1140,
          launch: '2023-03-02',
          highlights: [
            ['Mileage', '27.26 kmpl'],
            ['ADAS', 'Honda Sensing'],
            ['Boot space', '506 litres'],
            ['Warranty', '3 yrs unlimited km'],
          ],
          variants: [
            { name: 'SV Petrol', price: 1200000, fuel: 'PETROL', transmission: 'MANUAL', cc: 1498, bhp: 119, torque: 145, mileage: 17.8, seats: 5 },
            { name: 'VX CVT', price: 1520000, fuel: 'PETROL', transmission: 'CVT', cc: 1498, bhp: 119, torque: 145, mileage: 18.4, seats: 5, top: true },
            { name: 'ZX e:HEV', price: 2040000, fuel: 'HYBRID', transmission: 'CVT', cc: 1498, bhp: 126, torque: 253, mileage: 27.26, seats: 5 },
          ],
        },
      ],
    },
  ],
  BIKE: [
    {
      name: 'Hero MotoCorp',
      country: 'India',
      popular: true,
      models: [
        {
          name: 'Splendor Plus',
          bodyType: 'Commuter',
          description:
            'The commuter that defines the 100 cc class — an i3S start-stop engine, 80 kmpl real-world efficiency and the widest service network in the country.',
          mileage: 80,
          seats: 2,
          popular: true,
          rating: 4.3,
          reviews: 3200,
          highlights: [
            ['Mileage', '80 kmpl'],
            ['Engine', '97.2 cc'],
            ['Kerb weight', '112 kg'],
            ['Fuel tank', '9.8 litres'],
          ],
          variants: [
            { name: 'Drum Self', price: 78551, fuel: 'PETROL', cc: 97.2, bhp: 7.9, torque: 8.05, mileage: 80, seats: 2, top: true },
            { name: 'i3S Xtec', price: 84348, fuel: 'PETROL', cc: 97.2, bhp: 7.9, torque: 8.05, mileage: 80, seats: 2 },
          ],
        },
      ],
    },
    {
      name: 'Honda Motorcycle',
      country: 'Japan',
      popular: true,
      models: [
        {
          name: 'Activa 6G',
          bodyType: 'Scooter',
          description:
            'India’s best-selling scooter, with an eSP silent-start engine, external fuel filler and a 60 kmpl claimed figure.',
          mileage: 60,
          seats: 2,
          popular: true,
          rating: 4.4,
          reviews: 2870,
          highlights: [
            ['Mileage', '60 kmpl'],
            ['Engine', '109.51 cc'],
            ['Under-seat storage', '18 litres'],
            ['Kerb weight', '106 kg'],
          ],
          variants: [
            { name: 'STD', price: 79684, fuel: 'PETROL', transmission: 'AUTOMATIC', cc: 109.51, bhp: 7.68, torque: 8.9, mileage: 60, seats: 2, top: true },
            { name: 'Smart', price: 88184, fuel: 'PETROL', transmission: 'AUTOMATIC', cc: 109.51, bhp: 7.68, torque: 8.9, mileage: 60, seats: 2 },
          ],
        },
      ],
    },
    {
      name: 'Royal Enfield',
      country: 'India',
      popular: true,
      models: [
        {
          name: 'Classic 350',
          bodyType: 'Cruiser',
          description:
            'The J-series 349 cc single in a retro roadster body — smoother than the motor it replaced, with a torque curve built for relaxed highway cruising.',
          mileage: 41,
          seats: 2,
          popular: true,
          rating: 4.5,
          reviews: 1980,
          highlights: [
            ['Engine', '349 cc J-series'],
            ['Torque', '27 Nm'],
            ['Kerb weight', '195 kg'],
            ['Fuel tank', '13 litres'],
          ],
          variants: [
            { name: 'Redditch Single Channel ABS', price: 193080, fuel: 'PETROL', transmission: 'MANUAL', cc: 349, bhp: 20.2, torque: 27, mileage: 41, seats: 2 },
            { name: 'Dark Dual Channel ABS', price: 222310, fuel: 'PETROL', transmission: 'MANUAL', cc: 349, bhp: 20.2, torque: 27, mileage: 41, seats: 2, top: true },
          ],
        },
      ],
    },
    {
      name: 'Bajaj',
      country: 'India',
      models: [
        {
          name: 'Pulsar N160',
          bodyType: 'Sports',
          description:
            'A 164.82 cc streetfighter with dual-channel ABS, USD-look forks and the sharpest handling in Bajaj’s 160 cc line-up.',
          mileage: 47,
          seats: 2,
          rating: 4.2,
          reviews: 1140,
          highlights: [
            ['Power', '15.68 bhp'],
            ['Brakes', 'Dual-channel ABS'],
            ['Mileage', '47 kmpl'],
            ['Kerb weight', '154 kg'],
          ],
          variants: [
            { name: 'Single Channel ABS', price: 122767, fuel: 'PETROL', transmission: 'MANUAL', cc: 164.82, bhp: 15.68, torque: 14.65, mileage: 47, seats: 2 },
            { name: 'Dual Channel ABS', price: 136000, fuel: 'PETROL', transmission: 'MANUAL', cc: 164.82, bhp: 15.68, torque: 14.65, mileage: 47, seats: 2, top: true },
          ],
        },
      ],
    },
    {
      name: 'TVS',
      country: 'India',
      models: [
        {
          name: 'iQube',
          bodyType: 'Electric Scooter',
          status: 'NEW',
          description:
            'An electric scooter with up to 145 km of claimed range, TVS SmartXonnect connectivity and a 5-inch TFT cluster on the higher packs.',
          seats: 2,
          rating: 4.1,
          reviews: 720,
          highlights: [
            ['Range', '145 km (IDC)'],
            ['Top speed', '82 kmph'],
            ['Charge time', '4 hrs 30 min'],
            ['Boot space', '32 litres'],
          ],
          variants: [
            { name: '2.2 kWh', price: 94434, fuel: 'ELECTRIC', transmission: 'AUTOMATIC', bhp: 5.9, torque: 33, seats: 2, batteryKwh: 2.2, rangeKm: 75 },
            { name: '3.4 kWh ST', price: 145000, fuel: 'ELECTRIC', transmission: 'AUTOMATIC', bhp: 5.9, torque: 33, seats: 2, batteryKwh: 3.4, rangeKm: 145, top: true },
          ],
        },
      ],
    },
    {
      name: 'Yamaha',
      country: 'Japan',
      models: [
        {
          name: 'MT-15 V2',
          bodyType: 'Sports',
          description:
            'A 155 cc naked with variable valve actuation, an aluminium swingarm, traction control and a slipper clutch — the enthusiast pick in its class.',
          mileage: 56.87,
          seats: 2,
          rating: 4.4,
          reviews: 960,
          highlights: [
            ['Power', '18.1 bhp'],
            ['Tech', 'VVA + traction control'],
            ['Mileage', '56.87 kmpl'],
            ['Kerb weight', '141 kg'],
          ],
          variants: [
            { name: 'Standard', price: 169000, fuel: 'PETROL', transmission: 'MANUAL', cc: 155, bhp: 18.1, torque: 14.1, mileage: 56.87, seats: 2, top: true },
            { name: 'Dark Knight', price: 172000, fuel: 'PETROL', transmission: 'MANUAL', cc: 155, bhp: 18.1, torque: 14.1, mileage: 56.87, seats: 2 },
          ],
        },
      ],
    },
  ],
  BUS: [
    {
      name: 'Tata Motors',
      country: 'India',
      popular: true,
      models: [
        {
          name: 'Starbus Ultra 20',
          bodyType: 'Staff Bus',
          description:
            'A 20-seat staff and school bus on the Ultra platform, with a 3.3-litre BS6 diesel, air-assisted brakes and a low-effort cable shift gearbox.',
          seats: 20,
          gvwKg: 7490,
          popular: true,
          rating: 4.2,
          reviews: 140,
          highlights: [
            ['Seating', '20 + driver'],
            ['GVW', '7,490 kg'],
            ['Engine', '3.3 L BS6 diesel'],
            ['Wheelbase', '3,860 mm'],
          ],
          variants: [
            { name: 'School Edition', price: 2150000, fuel: 'DIESEL', transmission: 'MANUAL', cc: 3300, bhp: 123, torque: 400, mileage: 8.5, seats: 20, top: true },
            { name: 'Staff Edition AC', price: 2495000, fuel: 'DIESEL', transmission: 'MANUAL', cc: 3300, bhp: 123, torque: 400, mileage: 8, seats: 20 },
          ],
        },
      ],
    },
    {
      name: 'Ashok Leyland',
      country: 'India',
      popular: true,
      models: [
        {
          name: 'Sunshine School Bus',
          bodyType: 'School Bus',
          description:
            'A purpose-built school bus with a low first step, inward-opening emergency door and a speed limiter set to the statutory 60 kmph.',
          seats: 42,
          gvwKg: 12500,
          rating: 4.3,
          reviews: 96,
          highlights: [
            ['Seating', 'Up to 42'],
            ['GVW', '12,500 kg'],
            ['Safety', 'CCTV + speed limiter'],
            ['Engine', 'H-series BS6'],
          ],
          variants: [
            { name: '5250 WB 42-Seater', price: 3250000, fuel: 'DIESEL', transmission: 'MANUAL', cc: 5660, bhp: 160, torque: 550, mileage: 6.5, seats: 42, top: true },
          ],
        },
      ],
    },
    {
      name: 'Eicher',
      country: 'India',
      models: [
        {
          name: 'Skyline Pro 3008',
          bodyType: 'Intercity Coach',
          description:
            'A 30-seat intercity coach with an E483 engine, parabolic suspension and a 6-speed gearbox tuned for hilly long-haul routes.',
          seats: 30,
          gvwKg: 10900,
          rating: 4.1,
          reviews: 62,
          highlights: [
            ['Seating', '30 + driver'],
            ['Engine', 'E483 BS6'],
            ['Fuel tank', '160 litres'],
            ['Suspension', 'Parabolic leaf'],
          ],
          variants: [
            { name: '3008 AC Coach', price: 3890000, fuel: 'DIESEL', transmission: 'MANUAL', cc: 4995, bhp: 180, torque: 650, mileage: 6, seats: 30, top: true },
          ],
        },
      ],
    },
    {
      name: 'Force Motors',
      country: 'India',
      models: [
        {
          name: 'Traveller 3350',
          bodyType: 'Minibus',
          description:
            'The 13- to 17-seat minibus that dominates staff transport, with a 2.6-litre common-rail diesel and a monocoque body.',
          seats: 17,
          gvwKg: 3500,
          rating: 4.0,
          reviews: 210,
          highlights: [
            ['Seating', '13 / 17 seats'],
            ['Engine', '2.6 L CRDi'],
            ['Mileage', '10 kmpl'],
            ['Turning radius', '6.2 m'],
          ],
          variants: [
            { name: '17-Seater Non-AC', price: 1685000, fuel: 'DIESEL', transmission: 'MANUAL', cc: 2596, bhp: 91, torque: 250, mileage: 10, seats: 17, top: true },
            { name: '13-Seater AC', price: 1890000, fuel: 'DIESEL', transmission: 'MANUAL', cc: 2596, bhp: 91, torque: 250, mileage: 9.5, seats: 13 },
          ],
        },
      ],
    },
  ],
  TRACTOR: [
    {
      name: 'Mahindra Tractors',
      country: 'India',
      popular: true,
      models: [
        {
          name: '575 DI XP Plus',
          bodyType: '2WD Tractor',
          description:
            'A 47 hp workhorse with an ELS engine, 1,700 kg lift capacity and 8 forward gears — the standard choice for rotavator and trolley work.',
          ptoHp: 42.7,
          seats: 1,
          popular: true,
          rating: 4.5,
          reviews: 420,
          highlights: [
            ['Engine', '47 HP'],
            ['PTO', '42.7 HP'],
            ['Lift capacity', '1,700 kg'],
            ['Gears', '8 F + 2 R'],
          ],
          variants: [
            { name: '575 DI XP Plus', price: 785000, fuel: 'DIESEL', transmission: 'MANUAL', cc: 2730, bhp: 47, torque: 197, seats: 1, top: true },
          ],
        },
        {
          name: 'JIVO 245 DI 4WD',
          bodyType: '4WD Tractor',
          description:
            'A compact 24 hp four-wheel-drive tractor built for orchards and inter-cultivation, with a 1.6 m turning radius.',
          ptoHp: 21.5,
          seats: 1,
          rating: 4.3,
          reviews: 180,
          highlights: [
            ['Engine', '24 HP'],
            ['Drive', '4WD'],
            ['Lift capacity', '750 kg'],
            ['Turning radius', '1.6 m'],
          ],
          variants: [
            { name: 'JIVO 245 DI 4WD', price: 545000, fuel: 'DIESEL', transmission: 'MANUAL', cc: 1366, bhp: 24, torque: 92, seats: 1, top: true },
          ],
        },
      ],
    },
    {
      name: 'Sonalika',
      country: 'India',
      models: [
        {
          name: 'DI 745 III Sikander',
          bodyType: '2WD Tractor',
          description:
            'A 50 hp tractor with a 3-cylinder engine, 2,000 kg hydraulic lift and multi-speed PTO for heavy haulage.',
          ptoHp: 42.5,
          seats: 1,
          rating: 4.4,
          reviews: 260,
          highlights: [
            ['Engine', '50 HP'],
            ['Lift capacity', '2,000 kg'],
            ['PTO', 'Multi-speed'],
            ['Gears', '8 F + 2 R'],
          ],
          variants: [
            { name: 'DI 745 III Sikander', price: 728000, fuel: 'DIESEL', transmission: 'MANUAL', cc: 3067, bhp: 50, torque: 210, seats: 1, top: true },
          ],
        },
      ],
    },
    {
      name: 'John Deere',
      country: 'United States',
      models: [
        {
          name: '5310 Trem IV',
          bodyType: '4WD Tractor',
          description:
            'A 55 hp four-wheel-drive tractor with collar-shift transmission, power steering and a 2,000 kg lift — built for heavy tillage.',
          ptoHp: 46.7,
          seats: 1,
          popular: true,
          rating: 4.6,
          reviews: 310,
          highlights: [
            ['Engine', '55 HP'],
            ['Drive', '4WD'],
            ['Lift capacity', '2,000 kg'],
            ['Warranty', '5 yrs / 5,000 hrs'],
          ],
          variants: [
            { name: '5310 4WD', price: 1285000, fuel: 'DIESEL', transmission: 'MANUAL', cc: 2900, bhp: 55, torque: 235, seats: 1, top: true },
          ],
        },
      ],
    },
    {
      name: 'Massey Ferguson',
      country: 'United States',
      models: [
        {
          name: '241 DI Maha Shakti',
          bodyType: '2WD Tractor',
          description:
            'A 42 hp tractor known for its fuel efficiency and 1,600 kg lift, widely used for rotavator, cultivator and trolley duty.',
          ptoHp: 36,
          seats: 1,
          rating: 4.4,
          reviews: 290,
          highlights: [
            ['Engine', '42 HP'],
            ['PTO', '36 HP'],
            ['Lift capacity', '1,600 kg'],
            ['Gears', '8 F + 2 R'],
          ],
          variants: [
            { name: '241 DI Maha Shakti', price: 695000, fuel: 'DIESEL', transmission: 'MANUAL', cc: 2500, bhp: 42, torque: 185, seats: 1, top: true },
          ],
        },
      ],
    },
    {
      name: 'Swaraj',
      country: 'India',
      models: [
        {
          name: '744 FE',
          bodyType: '2WD Tractor',
          description:
            'A 48 hp tractor with a 3-cylinder engine and 1,700 kg lift capacity, popular across Punjab and Haryana for its pulling power.',
          ptoHp: 40.5,
          seats: 1,
          rating: 4.5,
          reviews: 350,
          highlights: [
            ['Engine', '48 HP'],
            ['PTO', '40.5 HP'],
            ['Lift capacity', '1,700 kg'],
            ['Fuel tank', '60 litres'],
          ],
          variants: [
            { name: '744 FE', price: 755000, fuel: 'DIESEL', transmission: 'MANUAL', cc: 3136, bhp: 48, torque: 200, seats: 1, top: true },
          ],
        },
      ],
    },
  ],
};

function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function specsFor(variant: SeedVariant, model: SeedModel, type: VehicleType) {
  const rows: { group: string; label: string; value: string; sortOrder: number }[] = [];
  let order = 0;
  const add = (group: string, label: string, value?: string | number | null) => {
    if (value === undefined || value === null || value === '') return;
    rows.push({ group, label, value: String(value), sortOrder: (order += 1) });
  };

  add('Engine & Transmission', 'Engine', variant.cc ? `${variant.cc} cc` : 'Electric motor');
  add('Engine & Transmission', 'Max power', variant.bhp ? `${variant.bhp} bhp` : null);
  add('Engine & Transmission', 'Max torque', variant.torque ? `${variant.torque} Nm` : null);
  add('Engine & Transmission', 'Fuel type', variant.fuel);
  add('Engine & Transmission', 'Transmission', variant.transmission ?? 'Manual');

  if (variant.fuel === 'ELECTRIC') {
    add('Battery & Charging', 'Battery capacity', variant.batteryKwh ? `${variant.batteryKwh} kWh` : null);
    add('Battery & Charging', 'Claimed range', variant.rangeKm ? `${variant.rangeKm} km` : null);
  } else {
    add('Mileage & Fuel', 'Claimed mileage', variant.mileage ? `${variant.mileage} kmpl` : null);
  }

  add('Dimensions & Capacity', 'Seating capacity', variant.seats ?? model.seats ?? null);
  if (type === 'BUS') add('Dimensions & Capacity', 'Gross vehicle weight', model.gvwKg ? `${model.gvwKg} kg` : null);
  if (type === 'TRACTOR') add('Implement', 'PTO power', model.ptoHp ? `${model.ptoHp} HP` : null);

  add('Features', 'Body type', model.bodyType);
  add('Features', 'Segment', model.segment ?? null);

  return rows;
}

const CITIES = [
  { name: 'New Delhi', state: 'Delhi', stateCode: 'DL', popular: true, roadTax: 10, reg: 4500, green: 0 },
  { name: 'Mumbai', state: 'Maharashtra', stateCode: 'MH', popular: true, roadTax: 11, reg: 5500, green: 0 },
  { name: 'Bengaluru', state: 'Karnataka', stateCode: 'KA', popular: true, roadTax: 14, reg: 5000, green: 0 },
  { name: 'Hyderabad', state: 'Telangana', stateCode: 'TS', popular: true, roadTax: 12, reg: 5000, green: 0 },
  { name: 'Chennai', state: 'Tamil Nadu', stateCode: 'TN', popular: true, roadTax: 12, reg: 5000, green: 0 },
  { name: 'Pune', state: 'Maharashtra', stateCode: 'MH', popular: true, roadTax: 11, reg: 5500, green: 0 },
  { name: 'Kolkata', state: 'West Bengal', stateCode: 'WB', popular: true, roadTax: 10, reg: 5000, green: 0 },
  { name: 'Ahmedabad', state: 'Gujarat', stateCode: 'GJ', popular: true, roadTax: 6, reg: 4500, green: 0 },
  { name: 'Jaipur', state: 'Rajasthan', stateCode: 'RJ', popular: false, roadTax: 8, reg: 4500, green: 1500 },
  { name: 'Lucknow', state: 'Uttar Pradesh', stateCode: 'UP', popular: false, roadTax: 8, reg: 4000, green: 1000 },
  { name: 'Chandigarh', state: 'Chandigarh', stateCode: 'CH', popular: false, roadTax: 6, reg: 4000, green: 0 },
  { name: 'Kochi', state: 'Kerala', stateCode: 'KL', popular: false, roadTax: 9, reg: 4500, green: 0 },
];

// Road tax rises with the price band in every state; the multipliers below are
// applied to the city's base rate to produce the band rules.
const PRICE_BANDS: { min: number; max: number; taxMultiplier: number }[] = [
  { min: 0, max: 500_000, taxMultiplier: 0.8 },
  { min: 500_000, max: 1_000_000, taxMultiplier: 1 },
  { min: 1_000_000, max: 2_000_000, taxMultiplier: 1.25 },
  { min: 2_000_000, max: 100_000_000, taxMultiplier: 1.5 },
];

const THIRD_PARTY_RATES = [
  { vehicleType: 'CAR' as VehicleType, ccMin: 0, ccMax: 1000, annualPremium: 2094, label: 'Up to 1000 cc' },
  { vehicleType: 'CAR' as VehicleType, ccMin: 1001, ccMax: 1500, annualPremium: 3416, label: '1001 - 1500 cc' },
  { vehicleType: 'CAR' as VehicleType, ccMin: 1501, ccMax: 20000, annualPremium: 7897, label: 'Above 1500 cc' },
  { vehicleType: 'BIKE' as VehicleType, ccMin: 0, ccMax: 75, annualPremium: 538, label: 'Up to 75 cc' },
  { vehicleType: 'BIKE' as VehicleType, ccMin: 76, ccMax: 150, annualPremium: 714, label: '76 - 150 cc' },
  { vehicleType: 'BIKE' as VehicleType, ccMin: 151, ccMax: 350, annualPremium: 1366, label: '151 - 350 cc' },
  { vehicleType: 'BIKE' as VehicleType, ccMin: 351, ccMax: 5000, annualPremium: 2804, label: 'Above 350 cc' },
  { vehicleType: 'BUS' as VehicleType, ccMin: 0, ccMax: 20000, annualPremium: 14000, label: 'Passenger carrying vehicle' },
  { vehicleType: 'TRACTOR' as VehicleType, ccMin: 0, ccMax: 20000, annualPremium: 1050, label: 'Agricultural tractor' },
];

const LENDERS = [
  {
    slug: 'hdfc-bank', name: 'HDFC Bank', type: 'BANK' as const,
    about: 'Fastest sanction in the market for salaried applicants, with pre-approved offers for existing customers.',
    offers: [
      { vehicleType: 'CAR' as VehicleType, rate: [8.75, 12.5], tenure: 84, ltv: 100, minIncome: 25000, minScore: 700, fee: 0.5, feeMin: 3500, feeMax: 12000, minLoan: 100000, maxLoan: 10000000, hours: 24, featured: true, employment: ['SALARIED', 'SELF_EMPLOYED', 'BUSINESS'] },
      { vehicleType: 'BIKE' as VehicleType, rate: [10.5, 18], tenure: 48, ltv: 95, minIncome: 12000, minScore: 675, fee: 1.5, feeMin: 1200, feeMax: 4500, minLoan: 25000, maxLoan: 500000, hours: 24, featured: true, employment: ['SALARIED', 'SELF_EMPLOYED', 'BUSINESS'] },
    ],
  },
  {
    slug: 'sbi', name: 'State Bank of India', type: 'BANK' as const,
    about: 'Lowest headline rates for salaried government employees, with no foreclosure charges after 12 EMIs.',
    offers: [
      { vehicleType: 'CAR' as VehicleType, rate: [8.6, 11.4], tenure: 84, ltv: 90, minIncome: 20000, minScore: 700, fee: 0.4, feeMin: 1500, feeMax: 7500, minLoan: 100000, maxLoan: 20000000, hours: 72, featured: true, employment: ['SALARIED', 'SELF_EMPLOYED', 'BUSINESS', 'FARMER'] },
      { vehicleType: 'TRACTOR' as VehicleType, rate: [9.5, 13], tenure: 84, ltv: 85, minIncome: 15000, minScore: 650, fee: 0.5, feeMin: 2000, feeMax: 8000, minLoan: 150000, maxLoan: 2500000, hours: 96, featured: true, employment: ['FARMER', 'BUSINESS', 'SELF_EMPLOYED'] },
    ],
  },
  {
    slug: 'icici-bank', name: 'ICICI Bank', type: 'BANK' as const,
    about: 'Digital-first processing with instant in-principle approval and doorstep documentation.',
    offers: [
      { vehicleType: 'CAR' as VehicleType, rate: [9.1, 13.5], tenure: 84, ltv: 100, minIncome: 25000, minScore: 720, fee: 0.5, feeMin: 3000, feeMax: 10000, minLoan: 100000, maxLoan: 15000000, hours: 24, featured: false, employment: ['SALARIED', 'SELF_EMPLOYED', 'BUSINESS'] },
      { vehicleType: 'BUS' as VehicleType, rate: [11, 15.5], tenure: 60, ltv: 85, minIncome: 60000, minScore: 700, fee: 1, feeMin: 10000, feeMax: 50000, minLoan: 500000, maxLoan: 50000000, hours: 120, featured: true, employment: ['BUSINESS', 'FLEET_OPERATOR', 'SELF_EMPLOYED'] },
    ],
  },
  {
    slug: 'mahindra-finance', name: 'Mahindra Finance', type: 'NBFC' as const,
    about: 'Rural and semi-urban specialist — funds applicants with informal income proof that banks decline.',
    offers: [
      { vehicleType: 'TRACTOR' as VehicleType, rate: [11.5, 18], tenure: 72, ltv: 90, minIncome: 10000, minScore: 600, fee: 1.5, feeMin: 3000, feeMax: 15000, minLoan: 100000, maxLoan: 2000000, hours: 48, featured: true, employment: ['FARMER', 'BUSINESS', 'SELF_EMPLOYED'] },
      { vehicleType: 'CAR' as VehicleType, rate: [11, 17], tenure: 72, ltv: 90, minIncome: 15000, minScore: 620, fee: 1.5, feeMin: 3000, feeMax: 12000, minLoan: 100000, maxLoan: 5000000, hours: 48, featured: false, employment: ['SALARIED', 'SELF_EMPLOYED', 'BUSINESS', 'FARMER'] },
    ],
  },
  {
    slug: 'bajaj-finserv', name: 'Bajaj Finserv', type: 'NBFC' as const,
    about: 'Two-wheeler financing at the dealership counter, with same-day disbursal on approved profiles.',
    offers: [
      { vehicleType: 'BIKE' as VehicleType, rate: [12, 22], tenure: 36, ltv: 100, minIncome: 10000, minScore: 600, fee: 2, feeMin: 999, feeMax: 5000, minLoan: 20000, maxLoan: 400000, hours: 4, featured: true, employment: ['SALARIED', 'SELF_EMPLOYED', 'BUSINESS', 'FARMER'] },
    ],
  },
  {
    slug: 'tata-motors-finance', name: 'Tata Motors Finance', type: 'CAPTIVE' as const,
    about: 'Captive financier for commercial vehicles, with EMI schedules aligned to fleet cash flows.',
    offers: [
      { vehicleType: 'BUS' as VehicleType, rate: [10.5, 16], tenure: 60, ltv: 90, minIncome: 50000, minScore: 650, fee: 1.25, feeMin: 8000, feeMax: 40000, minLoan: 500000, maxLoan: 40000000, hours: 72, featured: true, employment: ['BUSINESS', 'FLEET_OPERATOR'] },
    ],
  },
];

// odFactor scales the base own-damage rate for each insurer, so the comparison
// page shows the real trade-off buyers face: the insurer with the best claim
// record is rarely the cheapest.
const INSURERS = [
  { slug: 'hdfc-ergo', name: 'HDFC ERGO', csr: 99.1, garages: 8300, odFactor: 1.08, about: 'One of the largest cashless garage networks in India, with 24x7 claim registration.' },
  { slug: 'icici-lombard', name: 'ICICI Lombard', csr: 98.5, garages: 8800, odFactor: 1.03, about: 'InstaSpect video claim inspection settles most own-damage claims the same day.' },
  { slug: 'bajaj-allianz', name: 'Bajaj Allianz', csr: 98.4, garages: 7200, odFactor: 0.97, about: 'Motor On The Spot app-based settlement for claims under one lakh rupees.' },
  { slug: 'tata-aig', name: 'TATA AIG', csr: 98, garages: 7500, odFactor: 1, about: 'Auto Secure add-on range including zero depreciation, engine and key protect.' },
  { slug: 'new-india-assurance', name: 'New India Assurance', csr: 97.5, garages: 3500, odFactor: 0.9, about: 'Public-sector insurer with the widest branch presence in tier-3 towns.' },
];

const ADD_ONS = [
  { slug: 'zero-depreciation', name: 'Zero depreciation', description: 'Full claim on replaced parts with no depreciation deducted.', rate: 15, sort: 1 },
  { slug: 'engine-protect', name: 'Engine protection', description: 'Covers engine and gearbox damage from water ingress or oil leakage.', rate: 8, sort: 2 },
  { slug: 'roadside-assistance', name: 'Roadside assistance', description: '24x7 towing, on-site repair, fuel delivery and key assistance.', rate: 3, sort: 3 },
  { slug: 'return-to-invoice', name: 'Return to invoice', description: 'Pays the full invoice value if the vehicle is stolen or a total loss.', rate: 10, sort: 4 },
  { slug: 'consumables', name: 'Consumables cover', description: 'Covers nuts, bolts, engine oil, coolant and other consumables in a claim.', rate: 4, sort: 5 },
  { slug: 'ncb-protect', name: 'No Claim Bonus protect', description: 'Keeps your NCB intact even after one claim in the policy year.', rate: 5, sort: 6 },
];

async function seedCatalog() {
  for (const [vehicleType, brands] of Object.entries(CATALOG) as [VehicleType, SeedBrand[]][]) {
    for (const brand of brands) {
      const brandSlug = slugify(brand.name);
      const createdBrand = await prisma.brand.upsert({
        where: { slug: brandSlug },
        update: {},
        create: {
          slug: brandSlug,
          name: brand.name,
          vehicleType,
          country: brand.country,
          isPopular: brand.popular ?? false,
          about: `${brand.name} vehicles — prices, variants, specifications and city-wise on-road price.`,
        },
      });

      for (const model of brand.models) {
        const modelSlug = slugify(model.name);
        const prices = model.variants.map((v) => v.price);
        const topVariant = model.variants.find((v) => v.top) ?? model.variants[0];

        const createdModel = await prisma.vehicleModel.upsert({
          where: { brandId_slug: { brandId: createdBrand.id, slug: modelSlug } },
          update: {},
          create: {
            slug: modelSlug,
            name: model.name,
            brandId: createdBrand.id,
            vehicleType,
            status: model.status ?? 'NEW',
            bodyType: model.bodyType,
            segment: model.segment,
            description: model.description,
            priceMin: BigInt(Math.min(...prices)),
            priceMax: BigInt(Math.max(...prices)),
            mileageKmpl: model.mileage,
            engineCc: topVariant.cc ? Math.round(topVariant.cc) : null,
            powerBhp: topVariant.bhp,
            seatingCapacity: model.seats,
            batteryKwh: topVariant.batteryKwh,
            rangeKm: topVariant.rangeKm,
            ptoHp: model.ptoHp,
            gvwKg: model.gvwKg,
            rating: model.rating ?? 0,
            reviewCount: model.reviews ?? 0,
            isPopular: model.popular ?? false,
            launchDate: model.launch ? new Date(model.launch) : null,
            metaTitle: `${brand.name} ${model.name} price, variants & specifications`,
            metaDescription: model.description.slice(0, 155),
            highlights: {
              create: model.highlights.map(([label, value], index) => ({
                label,
                value,
                sortOrder: index,
              })),
            },
          },
        });

        for (const variant of model.variants) {
          const variantSlug = slugify(variant.name);
          const createdVariant = await prisma.variant.upsert({
            where: { modelId_slug: { modelId: createdModel.id, slug: variantSlug } },
            update: {},
            create: {
              slug: variantSlug,
              name: variant.name,
              modelId: createdModel.id,
              exShowroomPrice: BigInt(variant.price),
              fuelType: variant.fuel,
              transmission: variant.transmission ?? 'MANUAL',
              engineCc: variant.cc ? Math.round(variant.cc) : null,
              powerBhp: variant.bhp,
              torqueNm: variant.torque,
              mileageKmpl: variant.mileage,
              seatingCapacity: variant.seats ?? model.seats,
              batteryKwh: variant.batteryKwh,
              rangeKm: variant.rangeKm,
              isTopSelling: variant.top ?? false,
            },
          });

          const specs = specsFor(variant, model, vehicleType);
          for (const spec of specs) {
            await prisma.variantSpec.upsert({
              where: {
                variantId_group_label: {
                  variantId: createdVariant.id,
                  group: spec.group,
                  label: spec.label,
                },
              },
              update: { value: spec.value, sortOrder: spec.sortOrder },
              create: { variantId: createdVariant.id, ...spec },
            });
          }
        }
      }
    }
  }
}

async function seedCitiesAndRules() {
  for (const city of CITIES) {
    const slug = slugify(city.name);
    const created = await prisma.city.upsert({
      where: { slug },
      update: {},
      create: {
        slug,
        name: city.name,
        state: city.state,
        stateCode: city.stateCode,
        isPopular: city.popular,
      },
    });

    await prisma.rtoRule.deleteMany({ where: { cityId: created.id } });

    for (const vehicleType of Object.values(VehicleType)) {
      for (const band of PRICE_BANDS) {
        // Two-wheelers and tractors are taxed far more lightly than cars, and
        // buses are taxed per seat rather than on value — approximated here as
        // a flat low rate on price.
        const typeMultiplier =
          vehicleType === 'BIKE' ? 0.7 : vehicleType === 'TRACTOR' ? 0.35 : vehicleType === 'BUS' ? 0.6 : 1;

        await prisma.rtoRule.create({
          data: {
            cityId: created.id,
            vehicleType,
            priceBandMin: BigInt(band.min),
            priceBandMax: BigInt(band.max),
            roadTaxPercent: Number((city.roadTax * band.taxMultiplier * typeMultiplier).toFixed(2)),
            registrationFee: BigInt(vehicleType === 'BIKE' ? Math.round(city.reg * 0.3) : city.reg),
            hypothecationFee: BigInt(vehicleType === 'BIKE' ? 500 : 1500),
            fastagFee: BigInt(vehicleType === 'BIKE' || vehicleType === 'TRACTOR' ? 0 : 600),
            greenCess: BigInt(vehicleType === 'CAR' ? city.green : 0),
            handlingChargePercent: vehicleType === 'BIKE' ? 0.5 : 0.4,
            handlingChargeCap: BigInt(vehicleType === 'BIKE' ? 3000 : 25000),
            insuranceOdPercent: vehicleType === 'BIKE' ? 1.6 : vehicleType === 'TRACTOR' ? 1.2 : 3,
            tcsPercent: 1,
          },
        });
      }
    }
  }

  for (const rate of THIRD_PARTY_RATES) {
    await prisma.thirdPartyRate.upsert({
      where: {
        vehicleType_ccMin_ccMax: {
          vehicleType: rate.vehicleType,
          ccMin: rate.ccMin,
          ccMax: rate.ccMax,
        },
      },
      update: { annualPremium: BigInt(rate.annualPremium), label: rate.label },
      create: {
        vehicleType: rate.vehicleType,
        ccMin: rate.ccMin,
        ccMax: rate.ccMax,
        annualPremium: BigInt(rate.annualPremium),
        label: rate.label,
      },
    });
  }
}

async function seedFinance() {
  for (const lender of LENDERS) {
    const created = await prisma.lender.upsert({
      where: { slug: lender.slug },
      update: {},
      create: { slug: lender.slug, name: lender.name, type: lender.type, about: lender.about },
    });

    for (const offer of lender.offers) {
      await prisma.loanOffer.upsert({
        where: { lenderId_vehicleType: { lenderId: created.id, vehicleType: offer.vehicleType } },
        update: {},
        create: {
          lenderId: created.id,
          vehicleType: offer.vehicleType,
          interestRateMin: offer.rate[0],
          interestRateMax: offer.rate[1],
          maxTenureMonths: offer.tenure,
          maxLtvPercent: offer.ltv,
          processingFeePercent: offer.fee,
          processingFeeMin: BigInt(offer.feeMin),
          processingFeeMax: BigInt(offer.feeMax),
          minLoanAmount: BigInt(offer.minLoan),
          maxLoanAmount: BigInt(offer.maxLoan),
          minMonthlyIncome: BigInt(offer.minIncome),
          minCreditScore: offer.minScore,
          approvalHours: offer.hours,
          isFeatured: offer.featured,
          employmentTypes: offer.employment as EmploymentType[],
        },
      });
    }
  }
}

async function seedInsurance() {
  for (const insurer of INSURERS) {
    const created = await prisma.insurer.upsert({
      where: { slug: insurer.slug },
      update: {},
      create: {
        slug: insurer.slug,
        name: insurer.name,
        claimSettlementRatio: insurer.csr,
        cashlessGarages: insurer.garages,
        about: insurer.about,
      },
    });

    // Every insurer offers a comprehensive and a third-party plan for cars and
    // bikes; commercial vehicles get a comprehensive plan only.
    const planSpecs: { vehicleType: VehicleType; policyType: PolicyType; suffix: string; odRate: number; zeroDep: boolean }[] = [
      { vehicleType: 'CAR', policyType: 'COMPREHENSIVE', suffix: 'Car Comprehensive', odRate: 3.2, zeroDep: false },
      { vehicleType: 'CAR', policyType: 'COMPREHENSIVE', suffix: 'Car Comprehensive Plus', odRate: 3.9, zeroDep: true },
      { vehicleType: 'CAR', policyType: 'THIRD_PARTY', suffix: 'Car Third Party', odRate: 0, zeroDep: false },
      { vehicleType: 'BIKE', policyType: 'COMPREHENSIVE', suffix: 'Two-Wheeler Comprehensive', odRate: 2.1, zeroDep: false },
      { vehicleType: 'BIKE', policyType: 'THIRD_PARTY', suffix: 'Two-Wheeler Third Party', odRate: 0, zeroDep: false },
      { vehicleType: 'BUS', policyType: 'COMPREHENSIVE', suffix: 'Commercial Passenger Carrier', odRate: 3.6, zeroDep: false },
      { vehicleType: 'TRACTOR', policyType: 'COMPREHENSIVE', suffix: 'Tractor Comprehensive', odRate: 1.8, zeroDep: false },
    ];

    for (const spec of planSpecs) {
      const name = `${insurer.name} ${spec.suffix}`;
      const slug = slugify(spec.suffix);
      await prisma.insurancePlan.upsert({
        where: { insurerId_slug: { insurerId: created.id, slug } },
        update: {},
        create: {
          insurerId: created.id,
          slug,
          name,
          vehicleType: spec.vehicleType,
          policyType: spec.policyType,
          odRatePercent: Number((spec.odRate * insurer.odFactor).toFixed(3)),
          zeroDepIncluded: spec.zeroDep,
          roadsideAssistance: spec.policyType === 'COMPREHENSIVE',
          engineProtect: spec.zeroDep,
          isFeatured: spec.zeroDep,
          keyBenefits:
            spec.policyType === 'THIRD_PARTY'
              ? ['Mandatory legal cover', 'Unlimited third-party injury liability', 'Property damage up to ₹7.5 lakh']
              : [
                  `${insurer.garages.toLocaleString('en-IN')} cashless garages`,
                  `${insurer.csr}% claim settlement ratio`,
                  'Own damage + third party cover',
                  ...(spec.zeroDep ? ['Zero depreciation included', 'Engine protection included'] : []),
                ],
        },
      });
    }
  }

  for (const vehicleType of Object.values(VehicleType)) {
    for (const addOn of ADD_ONS) {
      await prisma.insuranceAddOn.upsert({
        where: { vehicleType_slug: { vehicleType, slug: addOn.slug } },
        update: {},
        create: {
          vehicleType,
          slug: addOn.slug,
          name: addOn.name,
          description: addOn.description,
          ratePercent: addOn.rate,
          sortOrder: addOn.sort,
        },
      });
    }
  }
}

async function seedAdmins() {
  const password = process.env.SEED_ADMIN_PASSWORD ?? 'ChangeMe@12345';
  const admins = [
    { email: 'admin@automarket.in', fullName: 'Platform Admin', role: AdminRole.SUPER_ADMIN },
    { email: 'ops@automarket.in', fullName: 'Operations Manager', role: AdminRole.OPS_MANAGER },
    { email: 'sales@automarket.in', fullName: 'Sales Agent', role: AdminRole.SALES_AGENT },
  ];

  for (const admin of admins) {
    await prisma.adminUser.upsert({
      where: { email: admin.email },
      update: {},
      create: { ...admin, passwordHash: await hashPassword(password) },
    });
  }

  console.log(`Seeded ${admins.length} admin users (password from SEED_ADMIN_PASSWORD, default ChangeMe@12345)`);
}

async function seedDealers() {
  const cities = await prisma.city.findMany({ where: { isPopular: true } });
  const brands = await prisma.brand.findMany({ where: { isPopular: true } });

  for (const city of cities.slice(0, 6)) {
    for (const brand of brands) {
      await prisma.dealer.create({
        data: {
          name: `${brand.name} ${city.name} — Authorised Dealer`,
          brandSlug: brand.slug,
          vehicleType: brand.vehicleType,
          cityId: city.id,
          address: `Plot 12, Ring Road, ${city.name}, ${city.state}`,
          phone: '18001234567',
          email: `${brand.slug}.${city.slug}@dealers.automarket.in`,
        },
      });
    }
  }
}

async function main() {
  console.log('Seeding AutoMarket…');
  await seedAdmins();
  await seedCitiesAndRules();
  console.log(`Seeded ${CITIES.length} cities with RTO rules and third-party premium slabs`);
  await seedCatalog();
  const [brands, models, variants] = await Promise.all([
    prisma.brand.count(),
    prisma.vehicleModel.count(),
    prisma.variant.count(),
  ]);
  console.log(`Seeded catalog: ${brands} brands, ${models} models, ${variants} variants`);
  await seedFinance();
  console.log(`Seeded ${LENDERS.length} lenders with vehicle-wise loan offers`);
  await seedInsurance();
  console.log(`Seeded ${INSURERS.length} insurers, plans and ${ADD_ONS.length} add-ons`);
  await seedDealers();
  console.log('Done.');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
