import { callOpenRouter } from './openrouter-client';
import { createTask, createActionItem } from './dashboard-client';

interface FacilityStatus {
  rooms?: Array<{ id: number; name: string; status: string; lastCleaned?: string }>;
  equipment?: Array<{ id: number; name: string; status: string; lastMaintenance?: string }>;
  occupancyRate?: number;
  waitingPatients?: number;
  timestamp?: string;
}

interface Decision {
  action: 'create_task' | 'create_action_item' | 'no_action';
  confidence: number;
  reasoning: string;
  details?: any;
}

const SYSTEM_PROMPT = `You are Cara, an AI operations agent for a medical facility. Your role is to monitor facility status and make autonomous decisions about operational tasks.

DECISION FRAMEWORK:
1. Autonomously handle routine operations (confidence > 80%):
   - Room cleaning after patient visits
   - Equipment maintenance checks
   - Supply restocking
   - Standard operational tasks

2. Escalate to human staff (confidence < 70% or patient-related):
   - Anything involving patient care decisions
   - Unusual situations or anomalies
   - Equipment failures requiring immediate attention
   - Scheduling conflicts

3. Be proactive but conservative:
   - Anticipate needs before they become urgent
   - When uncertain, escalate to humans
   - Always prioritize patient safety

RESPONSE FORMAT:
Respond with a JSON object:
{
  "action": "create_task" | "create_action_item" | "no_action",
  "confidence": 0.0-1.0,
  "reasoning": "brief explanation",
  "details": {
    "title": "task/action title",
    "description": "detailed description",
    "priority": "low" | "medium" | "high",
    "category": "facility" | "equipment" | "staffing" | "other"
  }
}`;

export async function processFacilityStatus(status: FacilityStatus): Promise<void> {
  try {
    console.log('[Decision Engine] Processing facility status...');

    // Build context from facility status
    const context = buildContext(status);
    
    // Get AI decision
    const decision = await getAIDecision(context);
    
    console.log(`[Decision Engine] Decision: ${decision.action} (confidence: ${decision.confidence})`);
    console.log(`[Decision Engine] Reasoning: ${decision.reasoning}`);

    // Execute decision
    await executeDecision(decision);

  } catch (error: any) {
    console.error('[Decision Engine] Error:', error.message);
  }
}

function buildContext(status: FacilityStatus): string {
  const parts: string[] = [];

  if (status.rooms && status.rooms.length > 0) {
    const dirtyRooms = status.rooms.filter(r => r.status === 'dirty' || r.status === 'needs_cleaning');
    if (dirtyRooms.length > 0) {
      parts.push(`Rooms needing cleaning: ${dirtyRooms.map(r => r.name).join(', ')}`);
    }
  }

  if (status.equipment && status.equipment.length > 0) {
    const maintenanceNeeded = status.equipment.filter(e => 
      e.status === 'maintenance_required' || e.status === 'out_of_service'
    );
    if (maintenanceNeeded.length > 0) {
      parts.push(`Equipment needing attention: ${maintenanceNeeded.map(e => `${e.name} (${e.status})`).join(', ')}`);
    }
  }

  if (status.occupancyRate !== undefined) {
    parts.push(`Occupancy rate: ${status.occupancyRate}%`);
  }

  if (status.waitingPatients !== undefined && status.waitingPatients > 0) {
    parts.push(`Waiting patients: ${status.waitingPatients}`);
  }

  return parts.length > 0 
    ? parts.join('\n') 
    : 'All systems normal. No immediate actions required.';
}

async function getAIDecision(context: string): Promise<Decision> {
  const userPrompt = `Current facility status:\n${context}\n\nWhat action should I take? Respond with JSON only.`;

  try {
    const response = await callOpenRouter([
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: userPrompt }
    ]);

    // Parse JSON response
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in AI response');
    }

    const decision: Decision = JSON.parse(jsonMatch[0]);
    return decision;

  } catch (error: any) {
    console.error('[Decision Engine] AI decision failed:', error.message);
    // Default to no action on error
    return {
      action: 'no_action',
      confidence: 0,
      reasoning: `Error getting AI decision: ${error.message}`
    };
  }
}

async function executeDecision(decision: Decision): Promise<void> {
  const confidenceThreshold = parseFloat(process.env.CONFIDENCE_THRESHOLD || '0.7');
  const autoTaskThreshold = parseFloat(process.env.AUTO_TASK_THRESHOLD || '0.8');

  if (decision.action === 'no_action') {
    console.log('[Decision Engine] No action needed');
    return;
  }

  if (!decision.details) {
    console.log('[Decision Engine] No details provided for action');
    return;
  }

  // High confidence: create task autonomously
  if (decision.confidence >= autoTaskThreshold && decision.action === 'create_task') {
    await createTask({
      title: decision.details.title,
      description: decision.details.description,
      priority: decision.details.priority || 'medium'
    });
    return;
  }

  // Medium confidence: create action item for human review
  if (decision.confidence >= confidenceThreshold) {
    await createActionItem({
      title: decision.details.title,
      description: `${decision.details.description}\n\nAI Reasoning: ${decision.reasoning}\nConfidence: ${(decision.confidence * 100).toFixed(0)}%`,
      priority: decision.details.priority || 'medium',
      category: decision.details.category || 'other'
    });
    return;
  }

  // Low confidence: log only
  console.log('[Decision Engine] Confidence too low, no action taken');
}
