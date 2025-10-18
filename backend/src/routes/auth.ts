import { Router } from 'express';

const router = Router();

// Placeholder for auth routes
router.get('/', (req, res) => {
  res.json({ message: 'Auth routes - Coming soon' });
});

export { router as authRoutes };