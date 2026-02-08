import { Router } from 'express';
import { authenticateRequest } from '../middleware/auth';
import { processFacilityStatus } from '../services/decision-engine';

export const webhookRouter = Router();

// Authenticate all webhook requests
webhookRouter.use(authenticateRequest);

// Receive facility status updates from dashboard
webhookRouter.post('/facility-status', async (req, res) => {
  try {
    const facilityStatus = req.body;
    
    console.log('[Webhook] Received facility status update');
    console.log(`  Rooms: ${facilityStatus.rooms?.length || 0}`);
    console.log(`  Equipment: ${facilityStatus.equipment?.length || 0}`);
    console.log(`  Occupancy: ${facilityStatus.occupancyRate || 0}%`);

    // Process asynchronously - don't block the response
    processFacilityStatus(facilityStatus).catch(err => {
      console.error('[Webhook] Error processing facility status:', err);
    });

    res.json({ 
      status: 'received',
      message: 'Facility status update received and processing',
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('[Webhook] Error:', error);
    res.status(500).json({ error: 'Failed to process facility status', message: error.message });
  }
});
