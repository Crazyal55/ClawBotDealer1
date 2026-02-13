import { Router, Request, Response } from 'express';
import { InventoryService } from '../../services/inventory.service';
import { asyncHandler } from '../../utils/async-handler';

const router = Router();
const inventoryService = new InventoryService();

// Get all vehicles with filters
router.get('/', asyncHandler(async (req: Request, res: Response) => {
  const dealershipId = req.headers['x-dealership-id'] as string;
  const filters = req.query;

  const result = await inventoryService.searchVehicles(
    {
      ...filters,
      dealershipId
    } as any
  );

  res.json(result);
}));

// Get single vehicle
router.get('/:id', asyncHandler(async (req: Request, res: Response) => {
  const dealershipId = req.headers['x-dealership-id'] as string;
  const id = parseInt(req.params.id);

  const vehicle = await inventoryService.getVehicle(id, dealershipId);
  res.json(vehicle);
}));

// Add new vehicle
router.post('/', asyncHandler(async (req: Request, res: Response) => {
  const dealershipId = req.headers['x-dealership-id'] as string;
  const data = req.body;

  const result = await inventoryService.addVehicle(data, dealershipId);
  res.status(201).json(result);
}));

// Update vehicle
router.put('/:id', asyncHandler(async (req: Request, res: Response) => {
  const dealershipId = req.headers['x-dealership-id'] as string;
  const id = parseInt(req.params.id);
  const data = req.body;

  const vehicle = await inventoryService.updateVehicle(id, data, dealershipId);
  res.json(vehicle);
}));

// Delete vehicle
router.delete('/:id', asyncHandler(async (req: Request, res: Response) => {
  const dealershipId = req.headers['x-dealership-id'] as string;
  const id = parseInt(req.params.id);

  await inventoryService.deleteVehicle(id, dealershipId);
  res.status(204).send();
}));

// Get stats
router.get('/stats', asyncHandler(async (req: Request, res: Response) => {
  const dealershipId = req.headers['x-dealership-id'] as string;

  const stats = await inventoryService.getStats(dealershipId);
  res.json(stats);
}));

export default router;
