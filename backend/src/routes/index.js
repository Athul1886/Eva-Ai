import { Router } from 'express';
import authRoutes from './auth.routes.js';
import userRoutes from './user.routes.js';
import providerRoutes from './provider.routes.js';
import serviceRoutes from './service.routes.js';
import eventRoutes from './event.routes.js';
import recommendationRoutes from './recommendation.routes.js';
import bookingRoutes from './booking.routes.js';
import invitationRoutes from './invitation.routes.js';
import adminRoutes from './admin.routes.js';
import aiRoutes from './ai.routes.js';
import { getPublicInvitation, submitPublicRsvp } from '../controllers/invitation.controller.js';

const router = Router();

// Health check endpoint
router.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    message: 'Eva-Ai Backend API is operational',
    timestamp: new Date().toISOString()
  });
});

// Mount module route placeholders
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/providers', providerRoutes);
router.use('/services', serviceRoutes);
router.use('/events', eventRoutes);
router.use('/recommendations', recommendationRoutes);
router.use('/bookings', bookingRoutes);
router.use('/invitations', invitationRoutes);
router.use('/admin', adminRoutes);
router.use('/ai', aiRoutes);

// Public invitation and RSVP endpoints (unauthenticated QR entrypoint)
const publicInvitationRouter = Router();
publicInvitationRouter.get('/:publicToken', getPublicInvitation);
publicInvitationRouter.post('/:publicToken/rsvp', submitPublicRsvp);
router.use('/public/invitations', publicInvitationRouter);

export default router;
