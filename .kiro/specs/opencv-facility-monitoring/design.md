# Design Document: OpenCV Facility Monitoring

## Overview

The OpenCV Facility Monitoring system is a Python-based computer vision service that processes video feeds from facility cameras to automatically detect room occupancy, equipment status, and patient flow patterns. The system integrates with the existing Node.js dashboard backend via REST API and WebSocket connections, generating real-time updates and action items while maintaining strict privacy standards through anonymized tracking and in-memory processing.

### Key Design Decisions

1. **Separate Python Service**: OpenCV processing runs as an independent Python service rather than embedded in Node.js, leveraging Python's superior computer vision ecosystem
2. **Event-Driven Architecture**: Vision service generates detection events consumed by dashboard backend and Open CLAW agent
3. **Privacy by Design**: No facial recognition, no frame storage, all processing in-memory with immediate frame disposal
4. **Dual Communication**: REST API for action items and configuration, WebSocket for real-time status updates
5. **Graceful Degradation**: System continues operating when AI agent unavailable, falling back to human action items

## Architecture

### System Components

```
┌─────────────────────────────────────────────────────────────────┐
│                     Facility Cameras                             │
│  (Examination Rooms, Hallways, Equipment Areas)                  │
└────────────────┬────────────────────────────────────────────────┘
                 │ RTSP/HTTP Video Streams
                 ▼
┌─────────────────────────────────────────────────────────────────┐
│              Vision Service (Python + OpenCV)                    │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │ Frame        │  │ Detection    │  │ Event        │          │
│  │ Processor    │─▶│ Engine       │─▶│ Generator    │          │
│  └──────────────┘  └──────────────┘  └──────┬───────┘          │
│                                              │                   │
│  ┌──────────────┐  ┌──────────────┐         │                   │
│  │ Config       │  │ Health       │         │                   │
│  │ Manager      │  │ Monitor      │         │                   │
│  └──────────────┘  └──────────────┘         │                   │
└─────────────────────────────────────────────┼───────────────────┘
                                               │
                    ┌──────────────────────────┼──────────────────┐
                    │                          │                  │
                    ▼                          ▼                  ▼
         ┌──────────────────┐      ┌──────────────────┐  ┌──────────────┐
         │ Dashboard Backend│      │ Open CLAW Agent  │  │ WebSocket    │
         │ (Node.js/Express)│      │ (HTTP API)       │  │ Clients      │
         └──────────────────┘      └──────────────────┘  └──────────────┘
                    │
                    ▼
         ┌──────────────────┐
         │ PostgreSQL       │
         │ (Rooms, Actions, │
         │  Patient Flow)   │
         └──────────────────┘
```

### Communication Flows

**Detection Event Flow:**
1. Camera → Vision Service: Video frames via RTSP/HTTP
2. Vision Service → Detection Engine: Frame analysis
3. Detection Engine → Event Generator: Detection results
4. Event Generator → Dashboard Backend: REST API (action items) or WebSocket (status updates)
5. Event Generator → Open CLAW Agent: HTTP POST with event data
6. Dashboard Backend → WebSocket Clients: Real-time updates

**Configuration Flow:**
1. Admin → Config File: JSON camera and detection configuration
2. Vision Service → Config Manager: Load and validate configuration
3. Config Manager → Frame Processor: Camera connection parameters

## Components and Interfaces

### Vision Service (Python)

**Technology Stack:**
- Python 3.10+
- OpenCV 4.8+ for video processing
- NumPy for numerical operations
- Requests library for HTTP communication
- websocket-client for WebSocket connections
- FastAPI for health check endpoint

**Main Components:**

#### 1. Frame Processor
Manages camera connections and frame extraction.

```python
class FrameProcessor:
    def __init__(self, camera_config: CameraConfig):
        self.camera_id: str
        self.video_capture: cv2.VideoCapture
        self.room_id: Optional[str]
        self.detection_zones: List[DetectionZone]
        self.frame_rate: int  # Target FPS
        
    def connect(self) -> bool:
        """Establish connection to camera feed"""
        
    def get_next_frame(self) -> Optional[np.ndarray]:
        """Retrieve next frame from camera"""
        
    def disconnect(self):
        """Close camera connection"""
        
    def is_healthy(self) -> bool:
        """Check if camera connection is active"""
```

#### 2. Detection Engine
Performs computer vision analysis on frames.

```python
class DetectionEngine:
    def __init__(self, config: DetectionConfig):
        self.confidence_threshold: float = 0.7
        self.background_subtractor: cv2.BackgroundSubtractor
        self.equipment_templates: Dict[str, np.ndarray]
        
    def detect_occupancy(self, frame: np.ndarray, zone: DetectionZone) -> OccupancyResult:
        """Detect if a room/zone is occupied using motion and presence detection"""
        
    def detect_equipment(self, frame: np.ndarray, zone: DetectionZone) -> List[EquipmentDetection]:
        """Detect equipment presence and status using template matching"""
        
    def track_movement(self, frame: np.ndarray, previous_frame: np.ndarray) -> List[MovementVector]:
        """Track anonymous movement patterns for patient flow"""
        
    def calculate_confidence(self, detection_data: Any) -> float:
        """Calculate confidence score for detection"""
```

#### 3. Event Generator
Converts detections into structured events.

```python
class EventGenerator:
    def __init__(self, backend_client: BackendClient, agent_client: AgentClient):
        self.backend_client: BackendClient
        self.agent_client: AgentClient
        self.event_queue: Queue[DetectionEvent]
        self.last_events: Dict[str, DetectionEvent]  # Deduplication
        
    def generate_room_status_event(self, room_id: str, status: RoomStatus, confidence: float) -> DetectionEvent:
        """Create room status change event"""
        
    def generate_equipment_event(self, equipment_id: str, status: EquipmentStatus, location: str) -> DetectionEvent:
        """Create equipment status/location event"""
        
    def generate_flow_metrics_event(self, metrics: FlowMetrics) -> DetectionEvent:
        """Create patient flow metrics event"""
        
    def should_create_action_item(self, event: DetectionEvent) -> bool:
        """Determine if event requires human attention"""
        
    def send_to_agent(self, event: DetectionEvent) -> bool:
        """Send event to Open CLAW agent, return True if handled"""
        
    def send_to_backend(self, event: DetectionEvent):
        """Send event to dashboard backend"""
```

#### 4. Backend Client
Handles communication with dashboard backend.

```python
class BackendClient:
    def __init__(self, base_url: str, api_key: str):
        self.base_url: str
        self.api_key: str
        self.session: requests.Session
        self.ws_connection: Optional[WebSocketApp]
        
    def create_action_item(self, action: ActionItemCreate) -> ActionItemResponse:
        """POST /api/actions - Create action item"""
        
    def update_room_status(self, room_id: str, status: RoomStatus) -> RoomResponse:
        """PUT /api/rooms/:id/status - Update room status"""
        
    def update_equipment_status(self, equipment_id: str, status: EquipmentStatus) -> EquipmentResponse:
        """PUT /api/equipment/:id - Update equipment status"""
        
    def update_patient_flow(self, flow_data: PatientFlowData):
        """POST /api/patient-flow - Update patient flow metrics"""
        
    def connect_websocket(self):
        """Establish WebSocket connection for real-time updates"""
        
    def send_websocket_event(self, event: DetectionEvent):
        """Send event via WebSocket"""
```

#### 5. Agent Client
Handles communication with Open CLAW agent.

```python
class AgentClient:
    def __init__(self, agent_url: str, timeout: int = 5):
        self.agent_url: str
        self.timeout: int
        self.session: requests.Session
        
    def send_event(self, event: DetectionEvent) -> AgentResponse:
        """POST /agent/vision-event - Send detection event to agent"""
        
    def is_available(self) -> bool:
        """Check if agent is reachable"""
```

#### 6. Config Manager
Manages configuration loading and validation.

```python
class ConfigManager:
    def __init__(self, config_path: str):
        self.config_path: str
        self.cameras: List[CameraConfig]
        self.detection_params: DetectionConfig
        self.backend_config: BackendConfig
        self.agent_config: AgentConfig
        
    def load_config(self) -> Config:
        """Load and validate configuration from JSON file"""
        
    def validate_camera_config(self, camera: CameraConfig) -> bool:
        """Validate camera configuration"""
        
    def get_camera_by_id(self, camera_id: str) -> Optional[CameraConfig]:
        """Retrieve camera configuration by ID"""
```

#### 7. Health Monitor
Tracks system health and performance.

```python
class HealthMonitor:
    def __init__(self):
        self.camera_status: Dict[str, CameraHealth]
        self.processing_metrics: ProcessingMetrics
        self.last_health_check: datetime
        
    def update_camera_health(self, camera_id: str, is_healthy: bool):
        """Update camera health status"""
        
    def record_frame_processed(self, camera_id: str, latency_ms: float):
        """Record frame processing metrics"""
        
    def get_health_status(self) -> HealthStatus:
        """Get overall system health"""
        
    def check_and_alert(self, backend_client: BackendClient):
        """Check health and create action items for issues"""
```

### Dashboard Backend Extensions (Node.js)

**New Endpoints:**

```typescript
// POST /api/vision/events
// Receive detection events from vision service
interface VisionEventRequest {
  eventType: 'room_status' | 'equipment_status' | 'flow_metrics' | 'alert';
  cameraId: string;
  timestamp: string;
  confidence: float;
  data: {
    roomId?: string;
    equipmentId?: string;
    status?: string;
    location?: string;
    metrics?: FlowMetrics;
  };
  reasoning?: string;
}

// GET /api/vision/health
// Get vision service health status
interface VisionHealthResponse {
  status: 'healthy' | 'degraded' | 'offline';
  cameras: Array<{
    id: string;
    status: 'connected' | 'disconnected';
    lastFrame: string;
    fps: number;
  }>;
  lastUpdate: string;
}
```

**WebSocket Events:**

```typescript
// Server → Client
interface VisionDetectionEvent {
  type: 'vision:detection';
  data: {
    eventType: string;
    roomId?: string;
    equipmentId?: string;
    status?: string;
    confidence: number;
    timestamp: string;
  };
}
```

## Data Models

### Vision Service Models

```python
@dataclass
class CameraConfig:
    id: str
    url: str  # RTSP or HTTP stream URL
    room_id: Optional[str]
    detection_zones: List[DetectionZone]
    frame_rate: int = 1  # Target FPS
    enabled: bool = True

@dataclass
class DetectionZone:
    name: str
    zone_type: str  # 'room', 'equipment', 'hallway'
    coordinates: List[Tuple[int, int]]  # Polygon vertices
    equipment_ids: List[str] = field(default_factory=list)

@dataclass
class DetectionConfig:
    confidence_threshold: float = 0.7
    occupancy_motion_threshold: int = 500  # Pixel change threshold
    cleaning_timeout_minutes: int = 5
    equipment_check_hours: int = 4
    bottleneck_wait_minutes: int = 15
    deduplication_window_minutes: int = 30

@dataclass
class OccupancyResult:
    is_occupied: bool
    confidence: float
    motion_detected: bool
    object_count: int

@dataclass
class EquipmentDetection:
    equipment_id: str
    detected: bool
    confidence: float
    location: Tuple[int, int]  # Center coordinates
    in_designated_area: bool

@dataclass
class MovementVector:
    tracking_id: str  # Anonymous identifier
    position: Tuple[int, int]
    velocity: Tuple[float, float]
    timestamp: datetime

@dataclass
class DetectionEvent:
    event_id: str
    event_type: str  # 'room_status', 'equipment_status', 'flow_metrics', 'alert'
    camera_id: str
    timestamp: datetime
    confidence: float
    data: Dict[str, Any]
    reasoning: Optional[str]

@dataclass
class FlowMetrics:
    area: str  # 'waiting_room', 'examination', 'checkout'
    average_wait_time_minutes: float
    current_occupancy: int
    bottleneck_detected: bool
    interval_start: datetime
    interval_end: datetime

@dataclass
class ActionItemCreate:
    type: str  # 'room_issue', 'equipment_issue', 'manual'
    urgency: str  # 'urgent', 'normal', 'low'
    title: str
    description: str
    context: Dict[str, Any]
    reasoning: str
    room_id: Optional[str]
    equipment_id: Optional[str]

@dataclass
class AgentResponse:
    handled: bool
    action_taken: Optional[str]
    requires_human: bool
    reasoning: str
```

### Database Schema Extensions

```sql
-- Vision system configuration (stored in backend database)
CREATE TABLE IF NOT EXISTS vision_cameras (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  camera_id VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  stream_url TEXT NOT NULL,
  room_id UUID,
  status VARCHAR(50) NOT NULL CHECK (status IN ('active', 'inactive', 'error')),
  last_frame_at TIMESTAMP WITH TIME ZONE,
  frames_per_second FLOAT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_vision_room FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE SET NULL
);

-- Vision detection events log (for audit and debugging)
CREATE TABLE IF NOT EXISTS vision_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type VARCHAR(50) NOT NULL,
  camera_id VARCHAR(255) NOT NULL,
  confidence FLOAT NOT NULL,
  event_data JSONB NOT NULL,
  reasoning TEXT,
  action_item_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_vision_action FOREIGN KEY (action_item_id) REFERENCES action_items(id) ON DELETE SET NULL
);

-- Indexes
CREATE INDEX idx_vision_cameras_status ON vision_cameras(status);
CREATE INDEX idx_vision_cameras_room ON vision_cameras(room_id);
CREATE INDEX idx_vision_events_camera ON vision_events(camera_id);
CREATE INDEX idx_vision_events_created ON vision_events(created_at);
CREATE INDEX idx_vision_events_type ON vision_events(event_type);
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*


### Property 1: Camera Connection Initialization
*For any* valid camera configuration, when the Vision_Service starts, it should successfully connect to the camera stream and begin processing frames.
**Validates: Requirements 1.1, 1.6**

### Property 2: Processing Latency Compliance
*For any* processed video frame, the time from frame capture to Detection_Event generation should be less than 2 seconds.
**Validates: Requirements 1.2**

### Property 3: Camera Failure Handling
*For any* camera that becomes unavailable during operation, the Vision_Service should log the error and create an urgent Action_Item without crashing.
**Validates: Requirements 1.3**

### Property 4: Minimum Frame Rate
*For any* active camera feed, the Vision_Service should process at least 1 frame per second over any 10-second measurement window.
**Validates: Requirements 1.4**

### Property 5: Concurrent Camera Support
*For any* configuration with up to 8 cameras, the Vision_Service should successfully process all camera feeds concurrently.
**Validates: Requirements 1.5**

### Property 6: Room Occupancy Detection
*For any* room that transitions between empty and occupied states, the Vision_Service should detect the change and generate a Detection_Event within 2 seconds.
**Validates: Requirements 2.1, 2.2**

### Property 7: Cleaning Timeout Detection
*For any* room that has been empty for more than 5 minutes after being occupied, the Vision_Service should generate a "needs_cleaning" Detection_Event.
**Validates: Requirements 2.3**

### Property 8: Detection Confidence Threshold
*For any* room status detection, the Vision_Service should include a confidence score, and only update room status when confidence is at least 0.7.
**Validates: Requirements 2.5, 2.6**

### Property 9: Equipment Status Detection
*For any* equipment that transitions between idle and in-use states, the Vision_Service should detect the change and generate a Detection_Event.
**Validates: Requirements 3.1, 3.2**

### Property 10: Equipment Location Validation
*For any* equipment detected outside its designated room, the Vision_Service should create an urgent Action_Item for equipment relocation.
**Validates: Requirements 3.3**

### Property 11: Equipment Usage Duration Monitoring
*For any* equipment in continuous use for more than 4 hours, the Vision_Service should create a normal-urgency Action_Item for equipment check.
**Validates: Requirements 3.4**

### Property 12: Missing Equipment Detection
*For any* equipment that cannot be located in its designated area for more than 10 minutes, the Vision_Service should create an Action_Item for missing equipment.
**Validates: Requirements 3.6**

### Property 13: Anonymized Tracking Data Format
*For any* patient movement tracking data, the Vision_Service should use only position coordinates and movement vectors without any identifying information.
**Validates: Requirements 4.3, 4.7**

### Property 14: Tracking Identifier Expiration
*For any* person entering the facility, the Vision_Service should assign an anonymous tracking identifier that expires after 24 hours.
**Validates: Requirements 4.4**

### Property 15: Aggregated Metrics Privacy
*For any* patient flow metrics generated, the data should be aggregated without individual identification.
**Validates: Requirements 4.5**

### Property 16: Event Delivery Latency
*For any* Detection_Event generated by the Vision_Service, the Dashboard_Backend should receive it within 500 milliseconds.
**Validates: Requirements 5.1**

### Property 17: Room Status Update Latency
*For any* Detection_Event that updates room status, the Dashboard_Backend should update the database and broadcast via WebSocket within 1 second.
**Validates: Requirements 5.2**

### Property 18: Action Item Creation Latency
*For any* Detection_Event that creates an Action_Item, the Dashboard_Backend should persist it and notify clients within 1 second.
**Validates: Requirements 5.3**

### Property 19: Connection Loss Graceful Degradation
*For any* Vision_Service connection loss, the Dashboard_Backend should continue operating with last-known status and create an Action_Item for service restoration.
**Validates: Requirements 5.6**

### Property 20: Room Cleaning Action Item Creation
*For any* room that needs cleaning, the Vision_Service should create a normal-urgency Action_Item with type "room_issue".
**Validates: Requirements 6.1**

### Property 21: Equipment Issue Action Item Creation
*For any* equipment that is misplaced or missing, the Vision_Service should create an urgent Action_Item with type "equipment_issue".
**Validates: Requirements 6.2**

### Property 22: Camera Failure Action Item Creation
*For any* camera feed that fails, the Vision_Service should create an urgent Action_Item with type "manual" for technical support.
**Validates: Requirements 6.3**

### Property 23: Action Item Context Completeness
*For any* Action_Item created by the Vision_Service, it should include context data (room_id or equipment_id, detection confidence, timestamp) and reasoning text.
**Validates: Requirements 6.4, 6.5**

### Property 24: Action Item Deduplication
*For any* issue detected, the Vision_Service should not create duplicate Action_Items for the same issue within a 30-minute window.
**Validates: Requirements 6.6**

### Property 25: Agent Event Communication
*For any* Detection_Event generated, the Vision_Service should send event data to the Open_CLAW_Agent with detection confidence and context.
**Validates: Requirements 7.1, 7.5**

### Property 26: Agent Unavailable Fallback
*For any* Detection_Event when the Open_CLAW_Agent is unavailable, the Vision_Service should fall back to creating Action_Items for human attention.
**Validates: Requirements 7.2**

### Property 27: Agent Acknowledgment Handling
*For any* Detection_Event acknowledged by the Open_CLAW_Agent, the Vision_Service should log the response and not create an Action_Item.
**Validates: Requirements 7.3**

### Property 28: Agent Rejection Handling
*For any* Detection_Event rejected by the Open_CLAW_Agent, the Vision_Service should create an Action_Item with agent reasoning included.
**Validates: Requirements 7.4**

### Property 29: Agent Communication Timeout
*For any* communication with the Open_CLAW_Agent that exceeds 5 seconds, the Vision_Service should timeout and fall back to Action_Item creation.
**Validates: Requirements 7.6**

### Property 30: Patient Flow Metrics Calculation
*For any* 15-minute interval with patient movement, the Vision_Service should calculate average wait times per area (waiting room, examination rooms, checkout).
**Validates: Requirements 8.1, 8.2**

### Property 31: Bottleneck Detection
*For any* area where patient wait times exceed 15 minutes, the Vision_Service should identify it as a bottleneck and create a normal-urgency Action_Item.
**Validates: Requirements 8.3, 8.4**

### Property 32: Patient Flow Database Updates
*For any* patient flow tracking data, the Vision_Service should update the patient_flow table with anonymized data.
**Validates: Requirements 8.5**

### Property 33: Occupancy Rate Calculation
*For any* room type (examination, treatment), the Vision_Service should calculate occupancy rates over rolling 1-hour windows.
**Validates: Requirements 8.6**

### Property 34: Configuration Loading
*For any* valid JSON configuration file, the Vision_Service should successfully load camera configurations at startup.
**Validates: Requirements 9.1**

### Property 35: Configuration Validation
*For any* camera configuration, the Vision_Service should require camera URL, room mapping, and detection zones, rejecting incomplete configurations.
**Validates: Requirements 9.2**

### Property 36: Per-Camera Threshold Configuration
*For any* camera, the Vision_Service should support configuration of detection thresholds (confidence, timing, sensitivity) independently.
**Validates: Requirements 9.3**

### Property 37: Invalid Configuration Handling
*For any* invalid configuration, the Vision_Service should log detailed error messages and refuse to start.
**Validates: Requirements 9.4**

### Property 38: Calibration Mode Isolation
*For any* detection in calibration mode, the Vision_Service should log all detections with confidence scores without updating production data.
**Validates: Requirements 9.6**

### Property 39: Frame Drop Resilience
*For any* camera feed that drops frames, the Vision_Service should continue processing available frames without crashing.
**Validates: Requirements 10.1**

### Property 40: Backend Unreachable Retry Logic
*For any* event when the Dashboard_Backend API is unreachable, the Vision_Service should queue events and retry with exponential backoff (max 5 retries).
**Validates: Requirements 10.2**

### Property 41: Event Queue Overflow Handling
*For any* event queue that exceeds 100 pending events, the Vision_Service should log a critical error and create an urgent Action_Item.
**Validates: Requirements 10.3**

### Property 42: Frame Processing Error Recovery
*For any* frame where OpenCV processing fails, the Vision_Service should log the error and continue with the next frame.
**Validates: Requirements 10.4**

### Property 43: Service Restart Recovery
*For any* Vision_Service restart, the service should resume monitoring without requiring manual intervention.
**Validates: Requirements 10.6**

### Property 44: Comprehensive Event Logging
*For any* Detection_Event, Action_Item creation, or external API communication, the Vision_Service should log the event with timestamp, relevant IDs, and context.
**Validates: Requirements 11.1, 11.2, 11.3**

### Property 45: Performance Metrics Logging
*For any* 60-second interval, the Vision_Service should log performance metrics (frames processed per second, processing latency).
**Validates: Requirements 11.4**

### Property 46: Structured Logging Format
*For any* log entry, the Vision_Service should use structured logging in JSON format for machine-readable analysis.
**Validates: Requirements 11.5**

### Property 47: Privacy-Preserving Logging
*For any* log entry, the Vision_Service should not include video frame data or personally identifiable information.
**Validates: Requirements 11.6**

### Property 48: Demo Mode Real-Time Playback
*For any* video file in demo mode, the Vision_Service should process it at real-time speed to simulate live monitoring.
**Validates: Requirements 12.2**

### Property 49: Feature Flag Enforcement
*For any* feature disabled via configuration, the Vision_Service should not execute that feature's functionality.
**Validates: Requirements 13.2**

### Property 50: Configuration Refresh
*For any* configuration update, the Vision_Service should detect and apply the change within 5 minutes without requiring a restart.
**Validates: Requirements 13.5, 13.6**

### Property 51: Configuration Audit Logging
*For any* configuration change, the Dashboard_Backend should store the change in an audit log with user ID, timestamp, and change reason.
**Validates: Requirements 13.4**

### Property 52: Automation Enablement Notification
*For any* automation feature that is first enabled, the Dashboard_Backend should create a notification Action_Item informing staff of the change.
**Validates: Requirements 13.8**

### Property 53: Agent Learning Phase Behavior
*For any* agent learning phase (observation, assisted, autonomous), the Open_CLAW_Agent should exhibit the correct behavior for that phase (log only, require approval, or act autonomously).
**Validates: Requirements 14.2, 14.3, 14.4, 14.5**

### Property 54: Agent Feedback Storage
*For any* staff feedback on an agent decision, the Dashboard_Backend should store the feedback and update agent performance metrics.
**Validates: Requirements 14.6, 14.7**

### Property 55: Agent Performance Metrics Calculation
*For any* day with agent activity, the Dashboard_Backend should calculate performance metrics (accuracy, total decisions, autonomous vs. escalated).
**Validates: Requirements 14.8**

### Property 56: Automated Training Data Generation
*For any* staff task creation, agent override, or task completion, the Dashboard_Backend should capture it as training data for the agent.
**Validates: Requirements 14.11**

## Error Handling

### Error Categories

**1. Camera Connection Errors**
- Connection timeout: Retry 3 times with 5-second intervals, then create Action_Item
- Authentication failure: Log error and create urgent Action_Item immediately
- Stream format unsupported: Log error and create urgent Action_Item

**2. Processing Errors**
- Frame decode failure: Skip frame, log warning, continue with next frame
- Detection algorithm failure: Skip frame, log error, continue with next frame
- Confidence calculation error: Log error, use default confidence of 0.0

**3. Communication Errors**
- Backend API timeout: Queue event, retry with exponential backoff (1s, 2s, 4s, 8s, 16s)
- Backend API 4xx error: Log error, do not retry, create Action_Item if critical
- Backend API 5xx error: Queue event, retry with exponential backoff
- WebSocket disconnection: Attempt reconnection every 10 seconds
- Agent timeout: Fall back to Action_Item creation after 5 seconds
- Agent error response: Log error, create Action_Item with agent reasoning

**4. Configuration Errors**
- Missing required field: Log detailed error, refuse to start
- Invalid URL format: Log error, refuse to start
- Invalid detection zone coordinates: Log error, refuse to start
- File not found: Log error, refuse to start

**5. Resource Errors**
- Out of memory: Log critical error, attempt graceful shutdown
- Disk full (for logs): Rotate logs, delete oldest entries
- Event queue full: Log critical error, create urgent Action_Item, drop oldest events

### Error Response Format

All errors logged in structured JSON format:

```json
{
  "timestamp": "2024-01-15T10:30:45.123Z",
  "level": "error",
  "component": "FrameProcessor",
  "camera_id": "cam-001",
  "error_type": "ConnectionTimeout",
  "message": "Failed to connect to camera after 3 attempts",
  "context": {
    "camera_url": "rtsp://192.168.1.100:554/stream",
    "retry_count": 3,
    "last_error": "Connection timed out"
  }
}
```

## Testing Strategy

### Dual Testing Approach

The OpenCV Facility Monitoring system requires both unit tests and property-based tests for comprehensive coverage:

**Unit Tests** - Verify specific examples, edge cases, and error conditions:
- Camera connection with valid/invalid URLs
- Detection algorithm with known test images
- Event generation for specific scenarios
- Configuration parsing with sample files
- Error handling for specific failure modes
- Integration with backend API endpoints
- Demo mode with sample video files

**Property-Based Tests** - Verify universal properties across all inputs:
- All 48 correctness properties listed above
- Minimum 100 iterations per property test
- Use fast-check for JavaScript/TypeScript components
- Use Hypothesis for Python Vision Service components

### Property Test Configuration

**Python (Vision Service) - Using Hypothesis:**

```python
from hypothesis import given, strategies as st
import pytest

# Example property test
@given(
    camera_config=st.builds(CameraConfig,
        id=st.text(min_size=1),
        url=st.from_regex(r'rtsp://[\w\.\:]+/\w+'),
        room_id=st.uuids().map(str),
        detection_zones=st.lists(st.builds(DetectionZone), min_size=1),
        frame_rate=st.integers(min_value=1, max_value=30)
    )
)
@pytest.mark.property
def test_property_1_camera_connection_initialization(camera_config):
    """
    Feature: opencv-facility-monitoring, Property 1
    For any valid camera configuration, when the Vision_Service starts,
    it should successfully connect to the camera stream and begin processing frames.
    """
    # Test implementation
    pass
```

**TypeScript (Backend Integration) - Using fast-check:**

```typescript
import fc from 'fast-check';

// Example property test
describe('Property 16: Event Delivery Latency', () => {
  it('should receive Detection_Events within 500ms', () => {
    fc.assert(
      fc.property(
        fc.record({
          eventType: fc.constantFrom('room_status', 'equipment_status', 'flow_metrics'),
          cameraId: fc.uuid(),
          confidence: fc.float({ min: 0.7, max: 1.0 }),
          data: fc.object()
        }),
        async (event) => {
          // Feature: opencv-facility-monitoring, Property 16
          const startTime = Date.now();
          await visionService.sendEvent(event);
          const deliveryTime = Date.now() - startTime;
          expect(deliveryTime).toBeLessThan(500);
        }
      ),
      { numRuns: 100 }
    );
  });
});
```

### Test Organization

**Vision Service (Python):**
```
packages/vision-service/
├── tests/
│   ├── unit/
│   │   ├── test_frame_processor.py
│   │   ├── test_detection_engine.py
│   │   ├── test_event_generator.py
│   │   ├── test_backend_client.py
│   │   └── test_config_manager.py
│   ├── property/
│   │   ├── test_properties_1_10.py
│   │   ├── test_properties_11_20.py
│   │   ├── test_properties_21_30.py
│   │   ├── test_properties_31_40.py
│   │   └── test_properties_41_48.py
│   └── integration/
│       ├── test_end_to_end.py
│       └── test_demo_mode.py
```

**Backend Integration (TypeScript):**
```
packages/backend/src/
├── routes/
│   └── vision.test.ts
├── services/
│   └── vision-event-handler.test.ts
└── tests/
    └── property/
        └── vision-integration.property.test.ts
```

### Test Execution

**Run all tests:**
```bash
# Python vision service
cd packages/vision-service
pytest tests/ --cov=src --cov-report=html

# Backend integration
cd packages/backend
npm test
npm run test:property
```

**Run specific property tests:**
```bash
# Python
pytest tests/property/ -v

# TypeScript
npm run test:property -- vision-integration
```

### Coverage Goals

- Unit test coverage: 80% minimum for all components
- All 48 correctness properties implemented as property tests
- Integration tests for critical workflows (camera → detection → backend → dashboard)
- Demo mode end-to-end test

### Privacy Testing

Special attention to privacy requirements:
- Verify no facial recognition libraries imported
- Verify no frame data in logs or database
- Verify tracking data contains only coordinates
- Verify all identifiers are anonymous and expire correctly

## Implementation Notes

### Technology Choices

**Python for Vision Service:**
- OpenCV has mature Python bindings with extensive documentation
- NumPy provides efficient array operations for image processing
- Hypothesis provides robust property-based testing
- FastAPI enables lightweight health check endpoint

**Communication Protocols:**
- REST API for action item creation (reliable, retryable)
- WebSocket for real-time status updates (low latency)
- HTTP for agent communication (simple, widely supported)

**Privacy Implementation:**
- Background subtraction for occupancy detection (no facial features)
- Template matching for equipment detection (shape-based)
- Optical flow for movement tracking (position vectors only)
- In-memory processing with immediate frame disposal

### Performance Optimization

**Frame Processing:**
- Resize frames to 640x480 before processing (reduce computation)
- Process detection zones independently (parallel processing)
- Use background subtraction for motion detection (efficient)
- Cache equipment templates (avoid repeated loading)

**Event Generation:**
- Batch database updates every 5 seconds (reduce DB load)
- Deduplicate events using 30-minute sliding window
- Queue events during backend unavailability (prevent data loss)
- Use connection pooling for HTTP requests (reduce overhead)

**Resource Management:**
- Limit event queue to 100 items (prevent memory exhaustion)
- Rotate logs daily with 7-day retention (manage disk space)
- Release video capture resources on camera failure (prevent leaks)
- Use threading for concurrent camera processing (maximize throughput)

### Demo Mode Implementation

**Demo Assets:**
- 3 sample video files (room occupancy, equipment usage, patient flow)
- Demo configuration file with pre-configured cameras
- Sample detection zones overlaid on videos
- README with step-by-step setup instructions

**Demo Behavior:**
- Process video files at 1 FPS (real-time simulation)
- Generate realistic Detection_Events based on video content
- Create Action_Items visible in dashboard
- Support loop playback for continuous demo

### Feature Configuration System

**Configurable Automation Levels:**

To address varying comfort levels with automation and AI, the system supports granular feature flags that allow facilities to enable/disable specific capabilities:

```typescript
interface VisionFeatureConfig {
  // Core monitoring (always available)
  cameraMonitoring: boolean;  // Enable/disable all vision monitoring
  
  // Detection features (can be enabled independently)
  roomOccupancyDetection: boolean;  // Auto-detect room status
  equipmentMonitoring: boolean;     // Track equipment usage/location
  patientFlowTracking: boolean;     // Anonymous patient flow metrics
  
  // Automation features (progressive adoption)
  autoActionItemCreation: boolean;  // Auto-create action items from detections
  agentIntegration: boolean;        // Send events to Open CLAW agent
  autoRoomStatusUpdate: boolean;    // Automatically update room status in DB
  autoEquipmentStatusUpdate: boolean; // Automatically update equipment status
  
  // Alert thresholds (customizable per facility)
  cleaningTimeoutMinutes: number;   // Default: 5
  equipmentCheckHours: number;      // Default: 4
  bottleneckWaitMinutes: number;    // Default: 15
  
  // Privacy controls
  enableFlowMetrics: boolean;       // Aggregate patient flow data
  metricRetentionDays: number;      // How long to keep metrics (default: 30)
}
```

**Adoption Levels:**

**Level 1 - Monitoring Only (Minimal Automation):**
```json
{
  "cameraMonitoring": true,
  "roomOccupancyDetection": true,
  "equipmentMonitoring": true,
  "patientFlowTracking": false,
  "autoActionItemCreation": false,
  "agentIntegration": false,
  "autoRoomStatusUpdate": false,
  "autoEquipmentStatusUpdate": false,
  "enableFlowMetrics": false
}
```
- Vision system detects events but only logs them
- Staff manually reviews logs and takes action
- No automatic database updates
- No AI agent involvement

**Level 2 - Assisted Operations (Moderate Automation):**
```json
{
  "cameraMonitoring": true,
  "roomOccupancyDetection": true,
  "equipmentMonitoring": true,
  "patientFlowTracking": true,
  "autoActionItemCreation": true,
  "agentIntegration": false,
  "autoRoomStatusUpdate": false,
  "autoEquipmentStatusUpdate": false,
  "enableFlowMetrics": true
}
```
- System creates action items for staff review
- Staff still manually updates room/equipment status
- Patient flow metrics available for analysis
- No AI agent involvement

**Level 3 - Full Automation (Maximum Efficiency):**
```json
{
  "cameraMonitoring": true,
  "roomOccupancyDetection": true,
  "equipmentMonitoring": true,
  "patientFlowTracking": true,
  "autoActionItemCreation": true,
  "agentIntegration": true,
  "autoRoomStatusUpdate": true,
  "autoEquipmentStatusUpdate": true,
  "enableFlowMetrics": true
}
```
- Full automation with AI agent integration
- Automatic status updates
- Agent handles routine tasks autonomously
- Staff only involved for exceptions

**Configuration Management:**

```typescript
// Backend API endpoint for feature configuration
// GET /api/vision/config
// PUT /api/vision/config (admin only)

interface VisionConfigResponse {
  facilityId: string;
  config: VisionFeatureConfig;
  adoptionLevel: 'monitoring' | 'assisted' | 'full';
  lastUpdated: string;
  updatedBy: string;
}
```

**Database Schema for Configuration:**

```sql
CREATE TABLE IF NOT EXISTS vision_feature_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id UUID NOT NULL,
  config JSONB NOT NULL,
  adoption_level VARCHAR(50) NOT NULL CHECK (adoption_level IN ('monitoring', 'assisted', 'full')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_by UUID NOT NULL,
  CONSTRAINT fk_config_user FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE CASCADE
);

-- Configuration change audit log
CREATE TABLE IF NOT EXISTS vision_config_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id UUID NOT NULL,
  previous_config JSONB,
  new_config JSONB NOT NULL,
  changed_by UUID NOT NULL,
  change_reason TEXT,
  changed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_config_history_user FOREIGN KEY (changed_by) REFERENCES users(id) ON DELETE CASCADE
);
```

**Vision Service Behavior Based on Configuration:**

The Vision Service queries the backend for feature configuration on startup and periodically (every 5 minutes) to pick up changes:

```python
class FeatureConfigManager:
    def __init__(self, backend_client: BackendClient):
        self.backend_client = backend_client
        self.config: VisionFeatureConfig
        self.last_refresh: datetime
        
    def should_create_action_item(self) -> bool:
        return self.config.auto_action_item_creation
        
    def should_send_to_agent(self) -> bool:
        return self.config.agent_integration
        
    def should_update_room_status(self) -> bool:
        return self.config.auto_room_status_update
        
    def should_track_patient_flow(self) -> bool:
        return self.config.patient_flow_tracking
```

**UI for Configuration Management:**

Dashboard includes admin settings page accessible from main navigation (admin role only):

**Navigation Structure:**
```
Dashboard (existing)
├── Operational Status
├── Action Items
├── Tasks
├── Scheduling
├── Metrics
└── Settings (admin only) ← NEW
    ├── Vision Configuration ← NEW
    ├── User Management (future)
    └── System Settings (future)
```

**Vision Configuration Page (`/settings/vision`):**

Components to implement:
1. **Adoption Level Selector** - Large visual cards showing three levels with descriptions
2. **Feature Toggle Panel** - Individual switches for each feature with descriptions
3. **Threshold Configuration** - Number inputs for timing thresholds (cleaning timeout, equipment check hours, etc.)
4. **Configuration History** - Table showing past changes with revert buttons
5. **Save/Cancel Actions** - Confirmation dialog before applying changes

**React Component Structure:**
```typescript
// packages/frontend/src/components/settings/VisionConfiguration.tsx
interface VisionConfigurationProps {
  currentConfig: VisionFeatureConfig;
  onSave: (config: VisionFeatureConfig, reason: string) => Promise<void>;
}

// Sub-components:
// - AdoptionLevelSelector.tsx - Visual cards for preset levels
// - FeatureToggles.tsx - Individual feature switches
// - ThresholdInputs.tsx - Number inputs for thresholds
// - ConfigurationHistory.tsx - Audit log table with revert
// - ConfirmationDialog.tsx - Warning before enabling automation
```

**Visual Design:**

```
┌─────────────────────────────────────────────────────────────┐
│ Settings > Vision Configuration                    [Admin] │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│ Choose Adoption Level:                                       │
│                                                               │
│ ┌──────────┐  ┌──────────┐  ┌──────────┐                   │
│ │ Level 1  │  │ Level 2  │  │ Level 3  │                   │
│ │Monitoring│  │ Assisted │  │   Full   │  ← Current        │
│ │   Only   │  │Operations│  │Automation│                   │
│ └──────────┘  └──────────┘  └──────────┘                   │
│                                                               │
│ Or customize individual features:                            │
│                                                               │
│ Core Monitoring                                              │
│ ☑ Camera Monitoring                    [Always enabled]     │
│ ☑ Room Occupancy Detection             [Toggle]             │
│ ☑ Equipment Monitoring                 [Toggle]             │
│ ☐ Patient Flow Tracking                [Toggle]             │
│                                                               │
│ Automation Features                                          │
│ ☐ Auto-Create Action Items             [Toggle]             │
│ ☐ AI Agent Integration                 [Toggle]             │
│ ☐ Auto-Update Room Status              [Toggle]             │
│ ☐ Auto-Update Equipment Status         [Toggle]             │
│                                                               │
│ Alert Thresholds                                             │
│ Cleaning Timeout:     [5] minutes                           │
│ Equipment Check:      [4] hours                             │
│ Bottleneck Wait:     [15] minutes                           │
│                                                               │
│ [Save Changes]  [Cancel]                                    │
│                                                               │
│ Configuration History                                        │
│ ┌───────────────────────────────────────────────────────┐  │
│ │ Date       │ User    │ Level  │ Changes  │ Action    │  │
│ ├───────────────────────────────────────────────────────┤  │
│ │ 2024-01-15 │ Admin   │ Level 2│ Enabled  │ [Revert]  │  │
│ │ 10:30 AM   │         │        │ action   │           │  │
│ │            │         │        │ items    │           │  │
│ └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

**Confirmation Dialog (when enabling automation):**

```
┌─────────────────────────────────────────────────┐
│ ⚠️  Enable Automation Feature?                  │
├─────────────────────────────────────────────────┤
│                                                  │
│ You are about to enable:                        │
│ • Auto-Create Action Items                      │
│                                                  │
│ This will allow the system to automatically     │
│ create action items based on camera detections. │
│                                                  │
│ Staff will be notified of this change.          │
│                                                  │
│ Reason for change (optional):                   │
│ ┌──────────────────────────────────────────┐   │
│ │ Facility is comfortable with monitoring  │   │
│ │ and ready for assisted operations        │   │
│ └──────────────────────────────────────────┘   │
│                                                  │
│        [Cancel]  [Enable Feature]               │
└─────────────────────────────────────────────────┘
```

**Access Control:**

- Settings menu item only visible to users with `role === 'admin'`
- API endpoints protected with admin role check in middleware
- Non-admin users attempting to access `/settings/*` redirected to dashboard
- Audit log records which admin made each change

**Existing Admin UI:**

The current dashboard does not have a dedicated admin section. This feature adds:
1. New "Settings" navigation item (admin only)
2. Vision Configuration page as first settings section
3. Foundation for future admin features (user management, system settings)

**Integration with Existing Dashboard:**

The Vision Configuration page integrates with existing dashboard components:
- Uses existing authentication/authorization system
- Follows existing UI design patterns and component library
- Shares WebSocket connection for real-time updates
- Uses existing API client service for backend communication

**Mobile Responsiveness:**

- Adoption level cards stack vertically on mobile
- Feature toggles remain accessible with touch-friendly sizing
- Configuration history table scrolls horizontally on small screens
- Confirmation dialogs adapt to mobile viewport

**Progressive Adoption Workflow:**

1. **Initial Setup (Level 1):** Facility starts with monitoring only, staff reviews logs to build trust
2. **Gradual Increase (Level 2):** After 2-4 weeks, enable action item creation, staff still controls updates
3. **Full Automation (Level 3):** After 1-2 months of successful operation, enable agent integration and auto-updates

**Safety Mechanisms:**

- Configuration changes require admin role
- Audit log tracks all configuration changes with reasoning
- Ability to quickly revert to previous configuration
- System alerts when automation features are first enabled
- Weekly summary reports showing automation effectiveness

### Deployment Considerations

**Vision Service Deployment:**
- Docker container with OpenCV and dependencies
- Environment variables for backend URL and API key
- Volume mount for configuration file
- Health check endpoint for orchestration
- Automatic configuration refresh every 5 minutes

**Backend Integration:**
- New vision routes added to Express app
- WebSocket events added to existing server
- Database migrations for vision tables and configuration
- API key authentication for vision service
- Admin-only endpoints for configuration management

**Monitoring:**
- Prometheus metrics for frame processing rate
- Grafana dashboard for camera health
- Alert on camera disconnection or high latency
- Log aggregation for error analysis
- Configuration change notifications


### Open CLAW Agent Training and Onboarding

**Agent Training Protocol:**

The Open CLAW agent needs domain-specific training to understand medical facility operations and respond appropriately to vision system events. This section provides a structured training program.

**Training Data Structure:**

```typescript
interface AgentTrainingScenario {
  scenarioId: string;
  category: 'room_management' | 'equipment_handling' | 'patient_flow' | 'emergency';
  detectionEvent: DetectionEvent;
  expectedResponse: AgentAction;
  reasoning: string;
  priority: 'high' | 'medium' | 'low';
}

interface AgentAction {
  actionType: 'handle_autonomously' | 'create_task' | 'escalate_to_human' | 'defer';
  taskDescription?: string;
  assignee?: 'agent' | 'staff' | 'specific_role';
  urgency?: 'urgent' | 'normal' | 'low';
  reasoning: string;
}
```

**Training Scenarios by Category:**

**1. Room Management Scenarios:**

```json
{
  "scenarioId": "room-001",
  "category": "room_management",
  "detectionEvent": {
    "eventType": "room_status",
    "data": {
      "roomId": "exam-room-1",
      "previousStatus": "occupied",
      "newStatus": "empty",
      "emptyDuration": "6 minutes"
    },
    "confidence": 0.85
  },
  "expectedResponse": {
    "actionType": "create_task",
    "taskDescription": "Clean and sanitize Exam Room 1",
    "assignee": "staff",
    "urgency": "normal",
    "reasoning": "Room has been empty for 6 minutes after patient visit. Standard cleaning protocol requires sanitization before next patient."
  },
  "reasoning": "Agent should autonomously create cleaning tasks when rooms need attention. This is routine and doesn't require human decision-making.",
  "priority": "high"
}
```

```json
{
  "scenarioId": "room-002",
  "category": "room_management",
  "detectionEvent": {
    "eventType": "room_status",
    "data": {
      "roomId": "exam-room-2",
      "status": "occupied",
      "occupancyDuration": "45 minutes",
      "scheduledDuration": "15 minutes"
    },
    "confidence": 0.90
  },
  "expectedResponse": {
    "actionType": "escalate_to_human",
    "urgency": "normal",
    "reasoning": "Appointment is running 30 minutes over scheduled time. This may indicate a complex case or issue that requires human awareness. Medical assistant should check if doctor needs assistance."
  },
  "reasoning": "Extended appointments may be normal (complex cases) or may indicate a problem. Agent should alert staff rather than assume.",
  "priority": "high"
}
```

**2. Equipment Handling Scenarios:**

```json
{
  "scenarioId": "equipment-001",
  "category": "equipment_handling",
  "detectionEvent": {
    "eventType": "equipment_status",
    "data": {
      "equipmentId": "ultrasound-1",
      "status": "in_use",
      "usageDuration": "5 hours",
      "location": "exam-room-3"
    },
    "confidence": 0.88
  },
  "expectedResponse": {
    "actionType": "create_task",
    "taskDescription": "Inspect ultrasound machine in Exam Room 3 - extended use",
    "assignee": "staff",
    "urgency": "normal",
    "reasoning": "Equipment has been in continuous use for 5 hours. Standard protocol requires inspection to ensure proper functioning and prevent overheating."
  },
  "reasoning": "Agent should proactively schedule equipment checks based on usage patterns. This prevents equipment failures.",
  "priority": "high"
}
```

```json
{
  "scenarioId": "equipment-002",
  "category": "equipment_handling",
  "detectionEvent": {
    "eventType": "equipment_status",
    "data": {
      "equipmentId": "bp-monitor-2",
      "expectedLocation": "exam-room-1",
      "actualLocation": "hallway",
      "missingDuration": "15 minutes"
    },
    "confidence": 0.92
  },
  "expectedResponse": {
    "actionType": "escalate_to_human",
    "urgency": "urgent",
    "reasoning": "Blood pressure monitor has been left in hallway for 15 minutes. This is a safety and security concern. Equipment should be returned to designated room immediately."
  },
  "reasoning": "Misplaced equipment requires immediate human attention for security and availability reasons.",
  "priority": "high"
}
```

**3. Patient Flow Scenarios:**

```json
{
  "scenarioId": "flow-001",
  "category": "patient_flow",
  "detectionEvent": {
    "eventType": "flow_metrics",
    "data": {
      "area": "waiting_room",
      "currentOccupancy": 8,
      "averageWaitTime": "22 minutes",
      "bottleneckDetected": true
    },
    "confidence": 0.85
  },
  "expectedResponse": {
    "actionType": "escalate_to_human",
    "urgency": "normal",
    "reasoning": "Waiting room has 8 patients with 22-minute average wait time. Medical assistant should be notified to manage patient expectations and potentially adjust scheduling."
  },
  "reasoning": "Patient flow bottlenecks require human judgment about scheduling adjustments and patient communication.",
  "priority": "medium"
}
```

**4. Emergency Scenarios:**

```json
{
  "scenarioId": "emergency-001",
  "category": "emergency",
  "detectionEvent": {
    "eventType": "alert",
    "data": {
      "alertType": "camera_failure",
      "cameraId": "exam-room-1-cam",
      "affectedAreas": ["exam-room-1"]
    },
    "confidence": 1.0
  },
  "expectedResponse": {
    "actionType": "escalate_to_human",
    "urgency": "urgent",
    "reasoning": "Camera monitoring for Exam Room 1 has failed. This is a technical issue requiring immediate IT attention. Vision monitoring for this room is unavailable."
  },
  "reasoning": "Technical failures always escalate to humans. Agent cannot resolve infrastructure issues.",
  "priority": "high"
}
```

**Agent Training Instructions (System Prompt):**

Save this as `agent-training-prompt.md` for Open CLAW configuration:

```markdown
# Open CLAW Agent Training: Medical Facility Operations

You are an AI agent responsible for managing routine operations in a medical facility. Your role is to handle automated tasks, create work items for staff, and escalate issues that require human judgment.

## Your Capabilities

1. **Receive Vision Events**: You receive real-time events from computer vision system monitoring:
   - Room occupancy changes
   - Equipment usage and location
   - Patient flow metrics
   - System alerts

2. **Decision Making**: For each event, you must decide:
   - Handle autonomously (create task, no human needed)
   - Create action item for human review
   - Escalate urgently to staff

3. **Task Creation**: You can create operational tasks:
   - Room cleaning and preparation
   - Equipment checks and maintenance
   - Workflow adjustments

## Decision Framework

### ALWAYS Handle Autonomously:
- Room cleaning after patient departure (empty > 5 minutes)
- Equipment inspection after extended use (> 4 hours)
- Routine maintenance reminders
- Standard workflow tasks

### ALWAYS Escalate to Human:
- Extended appointments (> 30 minutes over schedule)
- Equipment misplaced or missing
- Patient flow bottlenecks (wait time > 15 minutes)
- Any camera or system failures
- Low confidence detections (< 0.7)
- Anything involving patient safety or medical decisions

### Context Matters:
- Time of day (busy morning vs. quiet afternoon)
- Day of week (Monday rush vs. Friday wind-down)
- Current facility load (all rooms occupied vs. quiet)
- Staff availability (full team vs. short-staffed)

## Response Format

For each vision event, respond with:

```json
{
  "decision": "handle_autonomously" | "escalate_to_human",
  "action": {
    "type": "create_task" | "create_action_item",
    "title": "Brief description",
    "description": "Detailed explanation",
    "urgency": "urgent" | "normal" | "low",
    "assignee": "agent" | "staff" | "medical_assistant" | "doctor"
  },
  "reasoning": "Why you made this decision",
  "confidence": 0.0-1.0
}
```

## Learning Objectives

After training, you should be able to:
1. Distinguish routine tasks from situations requiring human judgment
2. Assess urgency appropriately based on context
3. Create clear, actionable task descriptions
4. Explain your reasoning for transparency
5. Recognize when you lack sufficient information to decide

## Evaluation Criteria

Your performance will be evaluated on:
- **Accuracy**: Correct decision (autonomous vs. escalate)
- **Appropriateness**: Correct urgency level
- **Clarity**: Task descriptions are clear and actionable
- **Safety**: Never handle medical decisions autonomously
- **Efficiency**: Minimize unnecessary human interruptions

## Continuous Learning

You will receive feedback on your decisions:
- When staff overrides your decision, learn from it
- When tasks are completed successfully, reinforce the pattern
- When escalations are deemed unnecessary, adjust threshold
- Track patterns in facility operations over time

## Prohibited Actions

NEVER:
- Make medical decisions or diagnoses
- Override doctor or medical assistant decisions
- Ignore urgent safety issues
- Create tasks without clear reasoning
- Handle patient-facing communications
- Access or process patient medical records
```

**Agent Onboarding Process:**

**Phase 1: Observation Mode (Week 1)**
- Agent receives all vision events but only logs decisions
- Staff reviews agent's proposed decisions daily
- No autonomous actions taken
- Goal: Calibrate decision-making to facility norms

**Phase 2: Assisted Mode (Weeks 2-3)**
- Agent creates tasks for routine operations
- All tasks require staff approval before execution
- Staff provides feedback on each decision
- Goal: Build confidence in agent's judgment

**Phase 3: Autonomous Mode (Week 4+)**
- Agent handles routine tasks autonomously
- Staff monitors agent activity dashboard
- Agent escalates edge cases and uncertainties
- Goal: Achieve efficient human-in-the-loop operations

**Agent Configuration API:**

```typescript
// POST /api/agent/training/scenario
// Submit training scenario for agent learning
interface TrainingScenarioSubmission {
  scenario: AgentTrainingScenario;
  agentResponse: AgentAction;
  staffFeedback: {
    correct: boolean;
    suggestedAction?: AgentAction;
    notes: string;
  };
}

// GET /api/agent/training/performance
// Get agent performance metrics
interface AgentPerformanceMetrics {
  totalDecisions: number;
  correctDecisions: number;
  accuracy: number;
  autonomousHandled: number;
  escalatedToHuman: number;
  overriddenByStaff: number;
  averageConfidence: number;
  learningPhase: 'observation' | 'assisted' | 'autonomous';
}

// POST /api/agent/training/feedback
// Provide feedback on agent decision
interface AgentFeedback {
  eventId: string;
  agentDecision: AgentAction;
  staffOverride?: AgentAction;
  wasCorrect: boolean;
  notes: string;
}
```

**Training Data Storage:**

```sql
CREATE TABLE IF NOT EXISTS agent_training_scenarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scenario_id VARCHAR(255) UNIQUE NOT NULL,
  category VARCHAR(50) NOT NULL,
  detection_event JSONB NOT NULL,
  expected_response JSONB NOT NULL,
  reasoning TEXT NOT NULL,
  priority VARCHAR(50) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS agent_decisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL,
  detection_event JSONB NOT NULL,
  agent_decision JSONB NOT NULL,
  agent_confidence FLOAT NOT NULL,
  staff_feedback JSONB,
  was_correct BOOLEAN,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS agent_performance_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,
  total_decisions INTEGER NOT NULL,
  correct_decisions INTEGER NOT NULL,
  accuracy FLOAT NOT NULL,
  autonomous_handled INTEGER NOT NULL,
  escalated_to_human INTEGER NOT NULL,
  overridden_by_staff INTEGER NOT NULL,
  learning_phase VARCHAR(50) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

**Agent Dashboard UI:**

New section in admin settings: `/settings/agent-training`

Shows:
- Current learning phase (observation/assisted/autonomous)
- Performance metrics (accuracy, decisions per day)
- Recent decisions with staff feedback
- Training scenario library
- Ability to add custom scenarios
- Phase progression controls

**Automated Training Data Generation:**

The system automatically generates training data from real operations:
- When staff manually creates tasks, capture as training example
- When staff overrides agent decision, capture as correction
- When tasks complete successfully, reinforce agent's decision
- Build facility-specific training corpus over time

**Training Scenario Files:**

Create `packages/backend/src/data/agent-training-scenarios.json` with all scenarios:

```json
{
  "scenarios": [
    {
      "scenarioId": "room-001",
      "category": "room_management",
      ...
    },
    {
      "scenarioId": "room-002",
      "category": "room_management",
      ...
    },
    ...
  ]
}
```

**Initial Training Script:**

```bash
# Load training scenarios into database
npm run agent:load-training-scenarios

# Start agent in observation mode
npm run agent:start --mode=observation

# Review agent decisions
npm run agent:review-decisions --date=2024-01-15

# Promote agent to assisted mode
npm run agent:set-phase --phase=assisted

# Promote agent to autonomous mode
npm run agent:set-phase --phase=autonomous
```
