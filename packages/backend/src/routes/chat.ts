import { Router } from 'express';
import { z } from 'zod';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { validateBody } from '../middleware/validation';
import { asyncHandler } from '../utils/error-handler';
import { aiAssistantService, ChatContext } from '../services/ai-assistant-service';
import { Response } from 'express';

const router = Router();

const chatSchema = z.object({
  message: z.string().min(1),
  context: z.object({
    currentContext: z.enum(['facility', 'doctor_calendar']),
    activeDoctorId: z.string().uuid().optional(),
    conversationHistory: z.array(
      z.object({
        role: z.enum(['user', 'assistant', 'system']),
        content: z.string(),
      })
    ).default([]),
  }),
});

// POST /api/chat
router.post(
  '/',
  authenticateToken,
  validateBody(chatSchema),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { message, context: clientContext } = req.body;
    const user = req.user!;

    // Build full context
    const context: ChatContext = {
      user,
      currentContext: clientContext.currentContext,
      activeDoctorId: clientContext.activeDoctorId,
      conversationHistory: clientContext.conversationHistory,
    };

    // Get AI response
    const response = await aiAssistantService.chat(message, context);

    res.json({
      message: response.message,
      context: {
        currentContext: response.context.currentContext,
        activeDoctorId: response.context.activeDoctorId,
        conversationHistory: response.context.conversationHistory,
      },
      toolCalls: response.toolCalls,
    });
  })
);

export default router;
