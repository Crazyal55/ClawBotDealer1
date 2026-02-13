import { InventoryRepository } from '../repositories/inventory.repository';
import { VehicleInput, VehicleFilter, VehicleSearchResult } from '../models/vehicle.model';

export class InventoryService {
  constructor(
    private inventoryRepo: InventoryRepository
  ) {}

  async addVehicle(data: VehicleInput, dealershipId: string): Promise<any> {
    // Validate vehicle data
    this.validateVehicle(data);

    // Check for duplicate VIN
    const existing = await this.inventoryRepo.findByVIN(data.vin, dealershipId);
    if (existing) {
      throw new Error(`Duplicate VIN: ${data.vin}. Vehicle already exists.`);
    }

    // Create vehicle
    const vehicle = await this.inventoryRepo.create(data, dealershipId);

    return {
      success: true,
      vehicle,
      message: 'Vehicle added successfully'
    };
  }

  async getVehicle(id: number, dealershipId: string): Promise<any> {
    const vehicle = await this.inventoryRepo.findById(id, dealershipId);
    if (!vehicle) {
      throw new Error(`Vehicle not found: ${id}`);
    }
    return vehicle;
  }

  async searchVehicles(filters: VehicleFilter, dealershipId: string): Promise<VehicleSearchResult> {
    const result = await this.inventoryRepo.search(filters, dealershipId);
    return result;
  }

  async updateVehicle(id: number, data: any, dealershipId: string): Promise<any> {
    const vehicle = await this.inventoryRepo.findById(id, dealershipId);
    if (!vehicle) {
      throw new Error(`Vehicle not found: ${id}`);
    }
    return this.inventoryRepo.update(id, data, dealershipId);
  }

  async deleteVehicle(id: number, dealershipId: string): Promise<void> {
    const vehicle = await this.inventoryRepo.findById(id, dealershipId);
    if (!vehicle) {
      throw new Error(`Vehicle not found: ${id}`);
    }
    await this.inventoryRepo.softDelete(id, dealershipId);
  }

  async getStats(dealershipId: string): Promise<any> {
    const stats = await this.inventoryRepo.getStats(dealershipId);
    return stats;
  }

  private validateVehicle(data: VehicleInput): void {
    if (!data.vin) {
      throw new Error('VIN is required');
    }

    if (data.vin.length !== 17) {
      throw new Error('Invalid VIN: must be 17 characters');
    }

    if (!data.make || !data.model || !data.year) {
      throw new Error('Make, model, and year are required');
    }

    if (!data.price || data.price <= 0) {
      throw new Error('Price must be greater than 0');
    }

    if (data.year < 1900 || data.year > new Date().getFullYear() + 2) {
      throw new Error('Invalid year');
    }

    if (data.mileage && data.mileage < 0) {
      throw new Error('Mileage cannot be negative');
    }
  }
}
