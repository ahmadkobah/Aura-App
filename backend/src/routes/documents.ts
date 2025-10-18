import { Router } from 'express';

const router = Router();

router.get('/', (req, res) => {
  res.json({ message: 'Document routes - Coming soon' });
});

export { router as documentRoutes };