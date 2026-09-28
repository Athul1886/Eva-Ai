import { Router } from 'express';

const router = Router();

// Placeholder for wedding invitation PDF and QR-code routes
router.get('/', (req, res) => {
  res.status(200).json({
    status: 'ok',
    message: 'Invitations route placeholder'
  });
});

export default router;
