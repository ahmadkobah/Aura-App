import { Router } from 'express';
const router = Router();
router.get('/', (req, res) => { res.json({ message: 'Admin routes - Coming soon' }); });
export { router as adminRoutes };