import { Router } from 'express';
import { updateAdminDetails } from 'src/controllers/auth-controller';
import { getDashboardOverview } from 'src/controllers/dashboard-controller';

const router = Router();

router.get("/overview", getDashboardOverview);
router.patch("/details", updateAdminDetails);


export { router };