import { query } from '../../config/database';
import { AppError } from '../../middleware/error.middleware';

export interface VehicleFilters {
  make?: string;
  model?: string;
  yearMin?: number;
  yearMax?: number;
  condition?: string;
  titleType?: string;
  locationState?: string;
  priceMin?: number;
  priceMax?: number;
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}

export interface CreateVehicleDto {
  vin: string;
  year: number;
  make: string;
  model: string;
  trim?: string;
  bodyStyle?: string;
  color?: string;
  odometer?: number;
  condition?: string;
  damageType?: string;
  secondaryDamage?: string;
  keysAvailable?: boolean;
  titleState?: string;
  titleType?: string;
  cylinders?: number;
  engineSize?: string;
  transmission?: string;
  drive?: string;
  fuelType?: string;
  airbags?: string;
  estimatedRepair?: number;
  actualCashValue?: number;
  images?: string[];
  locationCity?: string;
  locationState?: string;
  locationZip?: string;
  lotNumber?: string;
}

export class VehiclesService {
  async findAll(filters: VehicleFilters) {
    const page = filters.page || 1;
    const limit = Math.min(filters.limit || 20, 100);
    const offset = (page - 1) * limit;
    const sortBy = filters.sortBy || 'created_at';
    const sortOrder = filters.sortOrder || 'DESC';

    const allowedSortFields = ['year', 'make', 'model', 'odometer', 'actual_cash_value', 'created_at'];
    const safeSortBy = allowedSortFields.includes(sortBy) ? sortBy : 'created_at';

    const conditions: string[] = [];
    const params: unknown[] = [];
    let idx = 1;

    if (filters.make) {
      conditions.push(`LOWER(make) = LOWER($${idx++})`);
      params.push(filters.make);
    }
    if (filters.model) {
      conditions.push(`LOWER(model) = LOWER($${idx++})`);
      params.push(filters.model);
    }
    if (filters.yearMin) {
      conditions.push(`year >= $${idx++}`);
      params.push(filters.yearMin);
    }
    if (filters.yearMax) {
      conditions.push(`year <= $${idx++}`);
      params.push(filters.yearMax);
    }
    if (filters.condition) {
      conditions.push(`condition = $${idx++}`);
      params.push(filters.condition);
    }
    if (filters.titleType) {
      conditions.push(`LOWER(title_type) = LOWER($${idx++})`);
      params.push(filters.titleType);
    }
    if (filters.locationState) {
      conditions.push(`LOWER(location_state) = LOWER($${idx++})`);
      params.push(filters.locationState);
    }
    if (filters.priceMin) {
      conditions.push(`actual_cash_value >= $${idx++}`);
      params.push(filters.priceMin);
    }
    if (filters.priceMax) {
      conditions.push(`actual_cash_value <= $${idx++}`);
      params.push(filters.priceMax);
    }
    if (filters.search) {
      conditions.push(`(
        LOWER(make) LIKE LOWER($${idx}) OR
        LOWER(model) LIKE LOWER($${idx}) OR
        LOWER(vin) LIKE LOWER($${idx}) OR
        lot_number LIKE $${idx}
      )`);
      params.push(`%${filters.search}%`);
      idx++;
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const countResult = await query(
      `SELECT COUNT(*) FROM vehicles ${where}`,
      params
    );

    const dataResult = await query(
      `SELECT id, vin, year, make, model, trim, body_style, color, odometer,
              condition, damage_type, secondary_damage, keys_available,
              title_state, title_type, cylinders, engine_size, transmission,
              drive, fuel_type, estimated_repair, actual_cash_value,
              images, location_city, location_state, location_zip, lot_number,
              created_at
       FROM vehicles ${where}
       ORDER BY ${safeSortBy} ${sortOrder}
       LIMIT $${idx} OFFSET $${idx + 1}`,
      [...params, limit, offset]
    );

    const total = parseInt(countResult.rows[0].count);

    return {
      data: dataResult.rows.map(this.formatVehicle),
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1,
      },
    };
  }

  async findById(id: string) {
    const result = await query(
      `SELECT v.*, 
              l.id as lot_id, l.current_bid, l.bid_count, l.status as lot_status,
              a.id as auction_id, a.title as auction_title, a.auction_date
       FROM vehicles v
       LEFT JOIN lots l ON l.vehicle_id = v.id
       LEFT JOIN auctions a ON a.id = l.auction_id
       WHERE v.id = $1`,
      [id]
    );

    if (!result.rows.length) {
      throw new AppError(404, 'Vehicle not found');
    }

    return this.formatVehicleDetail(result.rows[0]);
  }

  async findByVin(vin: string) {
    const result = await query('SELECT * FROM vehicles WHERE vin = $1', [vin.toUpperCase()]);
    if (!result.rows.length) {
      throw new AppError(404, 'Vehicle not found');
    }
    return this.formatVehicle(result.rows[0]);
  }

  async create(dto: CreateVehicleDto) {
    const result = await query(
      `INSERT INTO vehicles (
        vin, year, make, model, trim, body_style, color, odometer,
        condition, damage_type, secondary_damage, keys_available,
        title_state, title_type, cylinders, engine_size, transmission,
        drive, fuel_type, airbags, estimated_repair, actual_cash_value,
        images, location_city, location_state, location_zip, lot_number
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27)
      RETURNING *`,
      [
        dto.vin.toUpperCase(), dto.year, dto.make, dto.model, dto.trim, dto.bodyStyle,
        dto.color, dto.odometer, dto.condition, dto.damageType, dto.secondaryDamage,
        dto.keysAvailable ?? false, dto.titleState, dto.titleType, dto.cylinders,
        dto.engineSize, dto.transmission, dto.drive, dto.fuelType, dto.airbags,
        dto.estimatedRepair, dto.actualCashValue,
        JSON.stringify(dto.images || []),
        dto.locationCity, dto.locationState, dto.locationZip, dto.lotNumber
      ]
    );
    return this.formatVehicle(result.rows[0]);
  }

  async update(id: string, dto: Partial<CreateVehicleDto>) {
    const existing = await query('SELECT id FROM vehicles WHERE id = $1', [id]);
    if (!existing.rows.length) throw new AppError(404, 'Vehicle not found');

    const fields: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    const mapping: Record<string, string> = {
      year: 'year', make: 'make', model: 'model', trim: 'trim',
      bodyStyle: 'body_style', color: 'color', odometer: 'odometer',
      condition: 'condition', damageType: 'damage_type',
      keysAvailable: 'keys_available', titleType: 'title_type',
      estimatedRepair: 'estimated_repair', actualCashValue: 'actual_cash_value',
    };

    for (const [key, col] of Object.entries(mapping)) {
      if (dto[key as keyof CreateVehicleDto] !== undefined) {
        fields.push(`${col} = $${idx++}`);
        values.push(dto[key as keyof CreateVehicleDto]);
      }
    }

    if (!fields.length) throw new AppError(400, 'No fields to update');

    values.push(id);
    const result = await query(
      `UPDATE vehicles SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`,
      values
    );
    return this.formatVehicle(result.rows[0]);
  }

  async delete(id: string): Promise<void> {
    const result = await query('DELETE FROM vehicles WHERE id = $1 RETURNING id', [id]);
    if (!result.rows.length) throw new AppError(404, 'Vehicle not found');
  }

  async getStats() {
    const result = await query(`
      SELECT
        COUNT(*) as total,
        COUNT(CASE WHEN condition = 'run_drive' THEN 1 END) as run_drive,
        COUNT(CASE WHEN condition = 'stationary' THEN 1 END) as stationary,
        COUNT(CASE WHEN condition = 'parts_only' THEN 1 END) as parts_only,
        AVG(actual_cash_value)::NUMERIC(10,2) as avg_acv,
        AVG(estimated_repair)::NUMERIC(10,2) as avg_repair,
        COUNT(DISTINCT make) as unique_makes
      FROM vehicles
    `);
    return result.rows[0];
  }

  private formatVehicle(row: any) {
    return {
      id: row.id,
      vin: row.vin,
      year: row.year,
      make: row.make,
      model: row.model,
      trim: row.trim,
      bodyStyle: row.body_style,
      color: row.color,
      odometer: row.odometer,
      odometerUnit: row.odometer_unit,
      condition: row.condition,
      damageType: row.damage_type,
      secondaryDamage: row.secondary_damage,
      keysAvailable: row.keys_available,
      titleState: row.title_state,
      titleType: row.title_type,
      cylinders: row.cylinders,
      engineSize: row.engine_size,
      transmission: row.transmission,
      drive: row.drive,
      fuelType: row.fuel_type,
      airbags: row.airbags,
      estimatedRepair: row.estimated_repair ? parseFloat(row.estimated_repair) : null,
      actualCashValue: row.actual_cash_value ? parseFloat(row.actual_cash_value) : null,
      images: typeof row.images === 'string' ? JSON.parse(row.images) : row.images || [],
      locationCity: row.location_city,
      locationState: row.location_state,
      locationZip: row.location_zip,
      lotNumber: row.lot_number,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private formatVehicleDetail(row: any) {
    return {
      ...this.formatVehicle(row),
      currentLot: row.lot_id ? {
        id: row.lot_id,
        currentBid: row.current_bid ? parseFloat(row.current_bid) : 0,
        bidCount: row.bid_count,
        status: row.lot_status,
        auction: row.auction_id ? {
          id: row.auction_id,
          title: row.auction_title,
          auctionDate: row.auction_date,
        } : null,
      } : null,
    };
  }
}
