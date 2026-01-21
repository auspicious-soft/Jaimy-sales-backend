import { Router } from 'express';
import { getDashboardOverview } from 'src/controllers/dashboard-controller';

const router = Router();

router.get("/overview", getDashboardOverview);


export { router };