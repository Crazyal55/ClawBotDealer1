import { Pool } from 'pg';
import { BaseRepository } from './base.repository';
import {
  Vehicle,
  VehicleInput,
  VehicleFilter,
  VehicleSearchResult,
  VehicleUpdate
} from '../models/vehicle.model';

export class InventoryRepository extends BaseRepository {
  constructor(pool: Pool) {
    super(pool);
  }

  async create(data: VehicleInput, dealershipId: string): Promise<Vehicle> {
    const query = `
      INSERT INTO vehicles (
        vin, make, model, year, trim, price, mileage, stock_number,
        body_type, transmission, drivetrain, fuel_type,
        exterior_color, interior_color, features, images, description,
        dealer_name, dealer_address, dealer_phone, source, url,
        dealership_id, scraped_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12,
        $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24
      )
      RETURNING *
    `;

    const params = [
      data.vin,
      data.make,
      data.model,
      data.year,
      data.trim || null,
      data.price,
      data.mileage || null,
      data.stockNumber || null,
      data.bodyType || null,
      data.transmission || null,
      data.drivetrain || null,
      data.fuelType || null,
      data.exteriorColor || null,
      data.interiorColor || null,
      JSON.stringify(data.features || []),
      JSON.stringify(data.images || []),
      data.description || null,
      data.dealerName || null,
      data.dealerAddress || null,
      data.dealerPhone || null,
      data.source || 'unknown',
      data.url || null,
      dealershipId,
      new Date()
    ];

    const result = await this.query<Vehicle>(query, params);
    return this.mapEntity(result.rows[0]);
  }

  async findById(id: number, dealershipId: string): Promise<Vehicle | null> {
    const query = `
      SELECT * FROM vehicles
      WHERE id = $1 AND dealership_id = $2 AND deleted_at IS NULL
    `;

    const result = await this.query<Vehicle>(query, [id, dealershipId]);
    return result.rows.length > 0 ? this.mapEntity(result.rows[0]) : null;
  }

  async findByVIN(vin: string, dealershipId: string): Promise<Vehicle | null> {
    const query = `
      SELECT * FROM vehicles
      WHERE vin = $1 AND dealership_id = $2 AND deleted_at IS NULL
      ORDER BY scraped_at DESC
      LIMIT 1
    `;

    const result = await this.query<Vehicle>(query, [vin, dealershipId]);
    return result.rows.length > 0 ? this.mapEntity(result.rows[0]) : null;
  }

  async search(filters: VehicleFilter, dealershipId: string): Promise<VehicleSearchResult> {
    const whereClauses: string[] = ['dealership_id = $1', 'deleted_at IS NULL'];
    const params: any[] = [dealershipId];
    let paramCount = 1;

    if (filters.make) {
      whereClauses.push(`make = $${++paramCount}`);
      params.push(filters.make);
    }

    if (filters.model) {
      whereClauses.push(`LOWER(model) LIKE LOWER($${++paramCount})`);
      params.push(`%${filters.model}%`);
    }

    if (filters.minYear) {
      whereClauses.push(`year >= $${++paramCount}`);
      params.push(filters.minYear);
    }

    if (filters.maxYear) {
      whereClauses.push(`year <= $${++paramCount}`);
      params.push(filters.maxYear);
    }

    if (filters.minPrice) {
      whereClauses.push(`price >= $${++paramCount}`);
      params.push(filters.minPrice);
    }

    if (filters.maxPrice) {
      whereClauses.push(`price <= $${++paramCount}`);
      params.push(filters.maxPrice);
    }

    if (filters.source) {
      whereClauses.push(`source = $${++paramCount}`);
      params.push(filters.source);
    }

    const whereSql = `WHERE ${whereClauses.join(' AND ')}`;
    const limit = filters.limit || 50;
    const offset = filters.offset || 0;

    const countQuery = `SELECT COUNT(*) as count FROM vehicles ${whereSql}`;
    const countResult = await this.query<{ count: string }>(countQuery, params);
    const total = parseInt(countResult.rows[0].count, 10);

    const dataQuery = `
      SELECT * FROM vehicles
      ${whereSql}
      ORDER BY scraped_at DESC
      LIMIT $${++paramCount} OFFSET $${++paramCount}
    `;
    const dataParams = [...params, limit, offset];
    const vehiclesResult = await this.query<Vehicle>(dataQuery, dataParams);

    return {
      vehicles: vehiclesResult.rows.map((row) => this.mapEntity(row)),
      total,
      filters
    };
  }

  async update(id: number, data: VehicleUpdate, dealershipId: string): Promise<Vehicle> {
    const updates: string[] = [];
    const values: any[] = [id, dealershipId];
    let paramCount = 2;

    if (data.price !== undefined) {
      updates.push(`price = $${++paramCount}`);
      values.push(data.price);
    }

    if (data.mileage !== undefined) {
      updates.push(`mileage = $${++paramCount}`);
      values.push(data.mileage);
    }

    if (data.description !== undefined) {
      updates.push(`description = $${++paramCount}`);
      values.push(data.description);
    }

    if (data.images !== undefined) {
      updates.push(`images = $${++paramCount}`);
      values.push(JSON.stringify(data.images));
    }

    if (data.features !== undefined) {
      updates.push(`features = $${++paramCount}`);
      values.push(JSON.stringify(data.features));
    }

    if (updates.length === 0) {
      throw new Error('No fields to update');
    }

    const query = `
      UPDATE vehicles
      SET ${updates.join(', ')}, updated_at = NOW()
      WHERE id = $1 AND dealership_id = $2 AND deleted_at IS NULL
      RETURNING *
    `;

    const result = await this.query<Vehicle>(query, values);
    return this.mapEntity(result.rows[0]);
  }

  async softDelete(id: number, dealershipId: string): Promise<void> {
    const query = `
      UPDATE vehicles
      SET deleted_at = NOW()
      WHERE id = $1 AND dealership_id = $2
    `;

    await this.query(query, [id, dealershipId]);
  }

  async softDeleteByVIN(vin: string, dealershipId: string): Promise<number> {
    const query = `
      UPDATE vehicles
      SET deleted_at = NOW()
      WHERE vin = $1 AND dealership_id = $2 AND deleted_at IS NULL
      RETURNING id
    `;

    const result = await this.query<{ id: number }>(query, [vin, dealershipId]);
    return result.rowCount || 0;
  }

  async getStats(dealershipId: string): Promise<{
    total: number;
    avgPrice: number;
    avgMileage: number;
    makeDistribution: { make: string; count: number }[];
  }> {
    const statsQuery = `
      SELECT
        COUNT(*) as total,
        AVG(price) as avg_price,
        AVG(mileage) as avg_mileage
      FROM vehicles
      WHERE dealership_id = $1 AND deleted_at IS NULL
    `;

    const statsResult = await this.query<{
      total: string;
      avg_price: string | null;
      avg_mileage: string | null;
    }>(statsQuery, [dealershipId]);
    const stats = statsResult.rows[0];

    const makeQuery = `
      SELECT make, COUNT(*) as count
      FROM vehicles
      WHERE dealership_id = $1 AND deleted_at IS NULL
      GROUP BY make
      ORDER BY count DESC
      LIMIT 10
    `;

    const makeResult = await this.query<{ make: string; count: string }>(makeQuery, [dealershipId]);

    return {
      total: parseInt(stats.total || '0', 10),
      avgPrice: stats.avg_price ? parseFloat(stats.avg_price) : 0,
      avgMileage: stats.avg_mileage ? Math.round(parseFloat(stats.avg_mileage)) : 0,
      makeDistribution: makeResult.rows.map((row) => ({
        make: row.make,
        count: parseInt(row.count, 10)
      }))
    };
  }

  protected mapEntity(row: any): Vehicle {
    return {
      id: row.id,
      vin: row.vin,
      year: row.year,
      make: row.make,
      model: row.model,
      trim: row.trim,
      price: Number(row.price),
      mileage: row.mileage !== null ? Number(row.mileage) : null,
      stockNumber: row.stock_number,
      bodyType: row.body_type,
      transmission: row.transmission,
      drivetrain: row.drivetrain,
      fuelType: row.fuel_type,
      exteriorColor: row.exterior_color,
      interiorColor: row.interior_color,
      features: row.features ? JSON.parse(row.features) : [],
      images: row.images ? JSON.parse(row.images) : [],
      description: row.description,
      dealerName: row.dealer_name,
      dealerAddress: row.dealer_address,
      dealerPhone: row.dealer_phone,
      source: row.source,
      url: row.url,
      qualityScore: row.quality_score,
      qualityFlags: row.quality_flags ? JSON.parse(row.quality_flags) : [],
      scrapedAt: row.scraped_at,
      dealershipId: row.dealership_id,
      embeddingId: row.embedding_id
    };
  }
}
