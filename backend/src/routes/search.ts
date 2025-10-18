import { Router } from 'express';
const router = Router();
router.get('/', (req, res) => { res.json({ message: 'Search routes - Coming soon' }); });
export { router as searchRoutes };