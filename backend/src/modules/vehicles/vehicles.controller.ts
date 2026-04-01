import { Request, Response, NextFunction } from 'express';
import { body, param, query as queryValidator, validationResult } from 'express-validator';
import { VehiclesService } from './vehicles.service';
import { AuthRequest } from '../../middleware/auth.middleware';

const vehiclesService = new VehiclesService();

export const createVehicleValidation = [
  body('vin').isLength({ min: 17, max: 17 }).withMessage('VIN must be exactly 17 characters'),
  body('year').isInt({ min: 1900, max: new Date().getFullYear() + 2 }).withMessage('Invalid year'),
  body('make').trim().notEmpty().withMessage('Make required'),
  body('model').trim().notEmpty().withMessage('Model required'),
];

export const getVehicles = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const filters = {
      make: req.query.make as string,
      model: req.query.model as string,
      yearMin: req.query.yearMin ? parseInt(req.query.yearMin as string) : undefined,
      yearMax: req.query.yearMax ? parseInt(req.query.yearMax as string) : undefined,
      condition: req.query.condition as string,
      titleType: req.query.titleType as string,
      locationState: req.query.locationState as string,
      priceMin: req.query.priceMin ? parseFloat(req.query.priceMin as string) : undefined,
      priceMax: req.query.priceMax ? parseFloat(req.query.priceMax as string) : undefined,
      search: req.query.search as string,
      page: req.query.page ? parseInt(req.query.page as string) : 1,
      limit: req.query.limit ? parseInt(req.query.limit as string) : 20,
      sortBy: req.query.sortBy as string,
      sortOrder: (req.query.sortOrder as 'ASC' | 'DESC') || 'DESC',
    };

    const result = await vehiclesService.findAll(filters);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

export const getVehicle = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const vehicle = await vehiclesService.findById(req.params.id);
    res.json(vehicle);
  } catch (error) {
    next(error);
  }
};

export const getVehicleByVin = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const vehicle = await vehiclesService.findByVin(req.params.vin);
    res.json(vehicle);
  } catch (error) {
    next(error);
  }
};

export const createVehicle = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }
    const vehicle = await vehiclesService.create(req.body);
    res.status(201).json(vehicle);
  } catch (error) {
    next(error);
  }
};

export const updateVehicle = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const vehicle = await vehiclesService.update(req.params.id, req.body);
    res.json(vehicle);
  } catch (error) {
    next(error);
  }
};

export const deleteVehicle = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    await vehiclesService.delete(req.params.id);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};

export const getVehicleStats = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const stats = await vehiclesService.getStats();
    res.json(stats);
  } catch (error) {
    next(error);
  }
};
