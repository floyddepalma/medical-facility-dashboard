import OpenAI from 'openai';
import { aiConfig, systemPrompt } from '../config/ai';
import { pool } from '../db/connection';
import { User } from '../types';

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface ChatContext {
  user: User;
  currentContext: 'facility' | 'doctor_calendar';
  activeDoctorId?: string;
  conversationHistory: ChatMessage[];
}

export interface ChatResponse {
  message: string;
  context: ChatContext;
  toolCalls?: ToolCall[];
}

export interface ToolCall {
  name: string;
  arguments: Record<string, any>;
  result?: any;
}

class AIAssistantService {
  private client: OpenAI | null = null;

  constructor() {
    if (aiConfig.apiKey) {
      this.client = new OpenAI({
        apiKey: aiConfig.apiKey,
        baseURL: aiConfig.baseUrl,
      });
    }
  }

  async chat(message: string, context: ChatContext): Promise<ChatResponse> {
    if (!this.client) {
      throw new Error('AI service not configured. Please set AI_API_KEY environment variable.');
    }

    // Build messages array with system prompt and context
    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      {
        role: 'system',
        content: this.buildSystemPromptWithContext(context),
      },
      ...context.conversationHistory.map(msg => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
      })),
      {
        role: 'user',
        content: message,
      },
    ];

    // Call OpenAI with tool definitions
    const response = await this.client.chat.completions.create({
      model: aiConfig.model,
      messages,
      temperature: aiConfig.temperature,
      max_tokens: aiConfig.maxTokens,
      tools: this.getToolDefinitions(context),
      tool_choice: 'auto',
    });

    const assistantMessage = response.choices[0].message;
    const toolCalls: ToolCall[] = [];

    // Handle tool calls if any
    if (assistantMessage.tool_calls) {
      for (const toolCall of assistantMessage.tool_calls) {
        const args = JSON.parse(toolCall.function.arguments);
        const result = await this.executeToolCall(
          toolCall.function.name,
          args,
          context
        );
        
        toolCalls.push({
          name: toolCall.function.name,
          arguments: args,
          result,
        });

        // Update context if switching
        if (toolCall.function.name === 'switch_context') {
          context.currentContext = args.target;
          context.activeDoctorId = args.doctorId;
        }
      }

      // If tools were called, make another request with results
      const toolMessages: OpenAI.Chat.ChatCompletionMessageParam[] = [
        ...messages,
        assistantMessage,
        ...assistantMessage.tool_calls.map((tc, idx) => ({
          role: 'tool' as const,
          tool_call_id: tc.id,
          content: JSON.stringify(toolCalls[idx].result),
        })),
      ];

      const finalResponse = await this.client.chat.completions.create({
        model: aiConfig.model,
        messages: toolMessages,
        temperature: aiConfig.temperature,
        max_tokens: aiConfig.maxTokens,
      });

      const finalMessage = finalResponse.choices[0].message.content || '';
      
      // Update conversation history
      context.conversationHistory.push(
        { role: 'user', content: message },
        { role: 'assistant', content: finalMessage }
      );

      return {
        message: finalMessage,
        context,
        toolCalls,
      };
    }

    const responseMessage = assistantMessage.content || '';
    
    // Update conversation history
    context.conversationHistory.push(
      { role: 'user', content: message },
      { role: 'assistant', content: responseMessage }
    );

    return {
      message: responseMessage,
      context,
    };
  }

  private buildSystemPromptWithContext(context: ChatContext): string {
    let prompt = systemPrompt;

    prompt += `\n\nCurrent User: ${context.user.name} (${context.user.role})`;
    prompt += `\nCurrent Context: ${context.currentContext}`;

    if (context.currentContext === 'doctor_calendar' && context.activeDoctorId) {
      prompt += `\nActive Doctor ID: ${context.activeDoctorId}`;
    }

    if (context.user.role === 'medical_assistant' && context.user.managedDoctorIds) {
      prompt += `\nManaged Doctors: ${context.user.managedDoctorIds.join(', ')}`;
    }

    return prompt;
  }

  private getToolDefinitions(context: ChatContext): OpenAI.Chat.ChatCompletionTool[] {
    const tools: OpenAI.Chat.ChatCompletionTool[] = [
      {
        type: 'function',
        function: {
          name: 'get_facility_status',
          description: 'Get current facility operational status including rooms, equipment, and patient flow',
          parameters: {
            type: 'object',
            properties: {},
          },
        },
      },
      {
        type: 'function',
        function: {
          name: 'get_doctor_schedule',
          description: 'Get a doctor\'s schedule for a specific date range',
          parameters: {
            type: 'object',
            properties: {
              doctorId: {
                type: 'string',
                description: 'The doctor\'s UUID',
              },
              startDate: {
                type: 'string',
                description: 'Start date in YYYY-MM-DD format',
              },
              endDate: {
                type: 'string',
                description: 'End date in YYYY-MM-DD format',
              },
            },
            required: ['doctorId', 'startDate', 'endDate'],
          },
        },
      },
      {
        type: 'function',
        function: {
          name: 'create_task',
          description: 'Create a new operational task',
          parameters: {
            type: 'object',
            properties: {
              type: {
                type: 'string',
                description: 'Task type (e.g., room_cleaning, equipment_check)',
              },
              description: {
                type: 'string',
                description: 'Task description',
              },
              assignee: {
                type: 'string',
                description: 'Who to assign the task to (user ID or "agent")',
              },
            },
            required: ['type', 'description', 'assignee'],
          },
        },
      },
      {
        type: 'function',
        function: {
          name: 'switch_context',
          description: 'Switch between facility operations and doctor calendar contexts',
          parameters: {
            type: 'object',
            properties: {
              target: {
                type: 'string',
                enum: ['facility', 'doctor_calendar'],
                description: 'The context to switch to',
              },
              doctorId: {
                type: 'string',
                description: 'Doctor ID when switching to doctor_calendar context',
              },
            },
            required: ['target'],
          },
        },
      },
    ];

    return tools;
  }

  private async executeToolCall(
    name: string,
    args: Record<string, any>,
    context: ChatContext
  ): Promise<any> {
    // Verify permissions before executing
    this.verifyPermissions(name, args, context);

    switch (name) {
      case 'get_facility_status':
        return this.getFacilityStatus();
      
      case 'get_doctor_schedule':
        return this.getDoctorSchedule(args.doctorId, args.startDate, args.endDate);
      
      case 'create_task':
        return this.createTask(args, context.user.id);
      
      case 'switch_context':
        return { success: true, newContext: args.target, doctorId: args.doctorId };
      
      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  }

  private verifyPermissions(
    toolName: string,
    args: Record<string, any>,
    context: ChatContext
  ): void {
    const { user } = context;

    // Medical assistants can only manage their assigned doctors
    if (user.role === 'medical_assistant' && args.doctorId) {
      if (!user.managedDoctorIds?.includes(args.doctorId)) {
        throw new Error('You do not have permission to manage this doctor\'s calendar');
      }
    }

    // Doctors can only manage their own calendar
    if (user.role === 'doctor' && args.doctorId) {
      if (args.doctorId !== user.doctorId) {
        throw new Error('You can only manage your own calendar');
      }
    }
  }

  private async getFacilityStatus(): Promise<any> {
    // Get room counts
    const roomsResult = await pool.query(`
      SELECT type, status, COUNT(*) as count
      FROM rooms
      GROUP BY type, status
    `);

    // Get equipment counts
    const equipmentResult = await pool.query(`
      SELECT status, COUNT(*) as count
      FROM equipment
      GROUP BY status
    `);

    // Get patient counts
    const patientResult = await pool.query(`
      SELECT status, COUNT(*) as count
      FROM patient_flow
      WHERE status != 'completed'
      GROUP BY status
    `);

    return {
      rooms: roomsResult.rows,
      equipment: equipmentResult.rows,
      patients: patientResult.rows,
      timestamp: new Date(),
    };
  }

  private async getDoctorSchedule(
    doctorId: string,
    startDate: string,
    endDate: string
  ): Promise<any> {
    const result = await pool.query(
      `SELECT * FROM appointments 
       WHERE doctor_id = $1 
       AND start_time >= $2 
       AND start_time < $3 
       ORDER BY start_time`,
      [doctorId, startDate, endDate]
    );

    return {
      doctorId,
      appointments: result.rows,
      dateRange: { startDate, endDate },
    };
  }

  private async createTask(
    args: { type: string; description: string; assignee: string },
    createdBy: string
  ): Promise<any> {
    const result = await pool.query(
      `INSERT INTO tasks (type, description, assignee, status, created_by)
       VALUES ($1, $2, $3, 'pending', $4)
       RETURNING *`,
      [args.type, args.description, args.assignee, createdBy]
    );

    return result.rows[0];
  }
}

export const aiAssistantService = new AIAssistantService();
