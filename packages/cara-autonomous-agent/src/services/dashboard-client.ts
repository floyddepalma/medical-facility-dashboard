import axios from 'axios';

const dashboardUrl = process.env.DASHBOARD_URL || 'http://localhost:3000';
const apiKey = process.env.DASHBOARD_API_KEY;

const client = axios.create({
  baseURL: dashboardUrl,
  headers: {
    'Authorization': `Bearer ${apiKey}`,
    'Content-Type': 'application/json'
  }
});

export interface CreateTaskRequest {
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
}

export interface CreateActionItemRequest {
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
  category: 'facility' | 'equipment' | 'staffing' | 'other';
}

export async function createTask(task: CreateTaskRequest) {
  try {
    // Map Cara's format to backend's expected format
    const backendTask = {
      type: 'agent_task',
      description: `${task.title}: ${task.description}`,
      assignee: 'agent'
    };
    const response = await client.post('/api/tasks', backendTask);
    console.log('[Dashboard] Task created:', response.data.task?.id || response.data.id);
    return response.data;
  } catch (error: any) {
    console.error('[Dashboard] Failed to create task:', error.response?.data || error.message);
    throw error;
  }
}

export async function createActionItem(actionItem: CreateActionItemRequest) {
  try {
    // Map Cara's format to backend's expected format
    const urgencyMap: Record<string, string> = {
      'high': 'urgent',
      'medium': 'normal',
      'low': 'low'
    };
    const typeMap: Record<string, string> = {
      'facility': 'room_issue',
      'equipment': 'equipment_issue',
      'staffing': 'agent_request',
      'other': 'agent_request'
    };
    
    const backendAction = {
      type: typeMap[actionItem.category] || 'agent_request',
      urgency: urgencyMap[actionItem.priority] || 'normal',
      title: actionItem.title,
      description: actionItem.description,
      reasoning: 'Created by Cara Autonomous Agent'
    };
    const response = await client.post('/api/actions', backendAction);
    console.log('[Dashboard] Action item created:', response.data.action?.id || response.data.id);
    return response.data;
  } catch (error: any) {
    console.error('[Dashboard] Failed to create action item:', error.response?.data || error.message);
    throw error;
  }
}
