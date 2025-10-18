import { Router } from 'express';
const router = Router();
router.get('/', (req, res) => { res.json({ message: 'Job routes - Coming soon' }); });
export { router as jobRoutes };