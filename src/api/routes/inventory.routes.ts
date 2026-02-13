import { Router, Request, Response } from 'express';
import { InventoryService } from '../../services/inventory.service';
import { asyncHandler } from '../../utils/helpers';
import { InventoryRepository } from '../../repositories/inventory.repository';
import { pool } from '../../config/db';

const router = Router();
const inventoryService = new InventoryService(new InventoryRepository(pool));
const headerToString = (value: string | string[] | undefined): string => {
  if (Array.isArray(value)) return value[0] || '';
  return value || '';
};

// Get all vehicles with filters
router.get('/', asyncHandler(async (req: Request, res: Response) => {
  const dealershipId = headerToString(req.headers['x-dealership-id']);
  const filters = req.query;

  const result = await inventoryService.searchVehicles({ ...filters } as any, dealershipId);

  res.json(result);
}));

// Add new vehicle
router.post('/', asyncHandler(async (req: Request, res: Response) => {
  const dealershipId = headerToString(req.headers['x-dealership-id']);
  const data = req.body;

  const result = await inventoryService.addVehicle(data, dealershipId);
  res.status(201).json(result);
}));

// Update vehicle
router.put('/:id', asyncHandler(async (req: Request, res: Response) => {
  const dealershipId = headerToString(req.headers['x-dealership-id']);
  const id = parseInt(String(req.params.id), 10);
  const data = req.body;

  const vehicle = await inventoryService.updateVehicle(id, data, dealershipId);
  res.json(vehicle);
}));

// Delete vehicle
router.delete('/:id', asyncHandler(async (req: Request, res: Response) => {
  const dealershipId = headerToString(req.headers['x-dealership-id']);
  const id = parseInt(String(req.params.id), 10);

  await inventoryService.deleteVehicle(id, dealershipId);
  res.status(204).send();
}));

// Get stats
router.get('/stats', asyncHandler(async (req: Request, res: Response) => {
  const dealershipId = headerToString(req.headers['x-dealership-id']);

  const stats = await inventoryService.getStats(dealershipId);
  res.json(stats);
}));

// Get single vehicle
router.get('/:id', asyncHandler(async (req: Request, res: Response) => {
  const dealershipId = headerToString(req.headers['x-dealership-id']);
  const id = parseInt(String(req.params.id), 10);

  const vehicle = await inventoryService.getVehicle(id, dealershipId);
  res.json(vehicle);
}));

export default router;
