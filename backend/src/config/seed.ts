import { pool } from './database';
import { logger } from '../utils/logger';

const vehicles = [
  {
    vin: '1HGCM82633A004352',
    year: 2022, make: 'Honda', model: 'Accord', trim: 'Sport',
    body_style: 'Sedan', color: 'Sonic Gray Pearl', odometer: 24500,
    condition: 'run_drive', damage_type: 'Front End', secondary_damage: 'Airbag',
    keys_available: true, title_state: 'TX', title_type: 'Salvage',
    cylinders: 4, engine_size: '1.5L', transmission: 'Automatic',
    drive: 'FWD', fuel_type: 'Gasoline', airbags: 'All Deployed',
    estimated_repair: 8500, actual_cash_value: 28000,
    location_city: 'Dallas', location_state: 'TX', location_zip: '75201',
    lot_number: 'LOT-001',
    images: JSON.stringify(['https://placehold.co/800x600?text=2022+Honda+Accord'])
  },
  {
    vin: '2T1BURHE0JC012345',
    year: 2021, make: 'Toyota', model: 'Camry', trim: 'SE',
    body_style: 'Sedan', color: 'Midnight Black', odometer: 38200,
    condition: 'run_drive', damage_type: 'Rear End', secondary_damage: 'None',
    keys_available: true, title_state: 'CA', title_type: 'Salvage',
    cylinders: 4, engine_size: '2.5L', transmission: 'Automatic',
    drive: 'FWD', fuel_type: 'Gasoline', airbags: 'Side Deployed',
    estimated_repair: 6200, actual_cash_value: 26500,
    location_city: 'Los Angeles', location_state: 'CA', location_zip: '90001',
    lot_number: 'LOT-002',
    images: JSON.stringify(['https://placehold.co/800x600?text=2021+Toyota+Camry'])
  },
  {
    vin: '1FTFW1ET8DKE12345',
    year: 2020, make: 'Ford', model: 'F-150', trim: 'XLT',
    body_style: 'Pickup', color: 'Race Red', odometer: 52100,
    condition: 'run_drive', damage_type: 'Side', secondary_damage: 'Mechanical',
    keys_available: false, title_state: 'FL', title_type: 'Salvage',
    cylinders: 6, engine_size: '3.5L', transmission: 'Automatic',
    drive: '4WD', fuel_type: 'Gasoline', airbags: 'Not Deployed',
    estimated_repair: 11400, actual_cash_value: 38000,
    location_city: 'Miami', location_state: 'FL', location_zip: '33101',
    lot_number: 'LOT-003',
    images: JSON.stringify(['https://placehold.co/800x600?text=2020+Ford+F-150'])
  },
  {
    vin: '5YJSA1H47FF014125',
    year: 2023, make: 'Tesla', model: 'Model S', trim: 'Long Range',
    body_style: 'Sedan', color: 'Pearl White', odometer: 12800,
    condition: 'enhanced_vehicle', damage_type: 'Front End', secondary_damage: 'Undercarriage',
    keys_available: true, title_state: 'NV', title_type: 'Salvage',
    cylinders: null, engine_size: 'Electric', transmission: 'Automatic',
    drive: 'AWD', fuel_type: 'Electric', airbags: 'All Deployed',
    estimated_repair: 22000, actual_cash_value: 88000,
    location_city: 'Las Vegas', location_state: 'NV', location_zip: '89101',
    lot_number: 'LOT-004',
    images: JSON.stringify(['https://placehold.co/800x600?text=2023+Tesla+Model+S'])
  },
  {
    vin: '1C4RJFAG5LC123456',
    year: 2019, make: 'Jeep', model: 'Grand Cherokee', trim: 'Laredo',
    body_style: 'SUV', color: 'Granite Crystal', odometer: 68400,
    condition: 'stationary', damage_type: 'Water/Flood', secondary_damage: 'All Over',
    keys_available: true, title_state: 'LA', title_type: 'Certificate of Destruction',
    cylinders: 6, engine_size: '3.6L', transmission: 'Automatic',
    drive: '4WD', fuel_type: 'Gasoline', airbags: 'Not Deployed',
    estimated_repair: 18000, actual_cash_value: 31000,
    location_city: 'New Orleans', location_state: 'LA', location_zip: '70112',
    lot_number: 'LOT-005',
    images: JSON.stringify(['https://placehold.co/800x600?text=2019+Jeep+Grand+Cherokee'])
  },
  {
    vin: 'WAUFFAFL8BN012345',
    year: 2021, make: 'Audi', model: 'A4', trim: 'Premium Plus',
    body_style: 'Sedan', color: 'Glacier White', odometer: 31000,
    condition: 'run_drive', damage_type: 'Front End', secondary_damage: 'None',
    keys_available: true, title_state: 'IL', title_type: 'Salvage',
    cylinders: 4, engine_size: '2.0L', transmission: 'Automatic',
    drive: 'AWD', fuel_type: 'Gasoline', airbags: 'Side Deployed',
    estimated_repair: 9800, actual_cash_value: 42000,
    location_city: 'Chicago', location_state: 'IL', location_zip: '60601',
    lot_number: 'LOT-006',
    images: JSON.stringify(['https://placehold.co/800x600?text=2021+Audi+A4'])
  }
];

const seedAuction = {
  title: 'Dallas Metro Salvage Auction - March 2025',
  description: 'Weekly salvage vehicle auction featuring clean and flood title vehicles from the DFW metroplex.',
  auction_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  location: 'Dallas, TX - Lane 1-5',
  status: 'scheduled',
};

async function seed(): Promise<void> {
  const client = await pool.connect();
  try {
    logger.info('Seeding database...');

    // Seed vehicles
    for (const v of vehicles) {
      await client.query(`
        INSERT INTO vehicles (vin, year, make, model, trim, body_style, color, odometer,
          condition, damage_type, secondary_damage, keys_available, title_state, title_type,
          cylinders, engine_size, transmission, drive, fuel_type, airbags,
          estimated_repair, actual_cash_value, images, location_city, location_state,
          location_zip, lot_number)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27)
        ON CONFLICT (vin) DO NOTHING
      `, [
        v.vin, v.year, v.make, v.model, v.trim, v.body_style, v.color, v.odometer,
        v.condition, v.damage_type, v.secondary_damage, v.keys_available,
        v.title_state, v.title_type, v.cylinders, v.engine_size, v.transmission,
        v.drive, v.fuel_type, v.airbags, v.estimated_repair, v.actual_cash_value,
        v.images, v.location_city, v.location_state, v.location_zip, v.lot_number
      ]);
    }
    logger.info(`✅ Seeded ${vehicles.length} vehicles`);

    // Seed auction
    const auctionResult = await client.query(`
      INSERT INTO auctions (title, description, auction_date, location, status)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT DO NOTHING
      RETURNING id
    `, [seedAuction.title, seedAuction.description, seedAuction.auction_date, seedAuction.location, seedAuction.status]);

    if (auctionResult.rows.length > 0) {
      const auctionId = auctionResult.rows[0].id;
      const vehicleRows = await client.query('SELECT id FROM vehicles ORDER BY created_at LIMIT 6');

      for (let i = 0; i < vehicleRows.rows.length; i++) {
        await client.query(`
          INSERT INTO lots (auction_id, vehicle_id, lot_order, starting_bid, bid_increment)
          VALUES ($1, $2, $3, $4, $5)
          ON CONFLICT DO NOTHING
        `, [auctionId, vehicleRows.rows[i].id, i + 1, 500, 25]);
      }
      logger.info('✅ Seeded 1 auction with 6 lots');
    }

    logger.info('✅ Database seeded successfully');
  } catch (error) {
    logger.error('❌ Seeding failed', { error });
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
