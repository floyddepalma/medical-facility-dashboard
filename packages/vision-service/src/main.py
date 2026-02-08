"""
Vision Service - Main Entry Point

Monitors webcam for room occupancy and sends updates to dashboard
"""
import os
import sys
import time
import logging
from datetime import datetime
from dotenv import load_dotenv

from camera import Camera
from detector import OccupancyDetector
from dashboard_client import DashboardClient

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(
    level=getattr(logging, os.getenv('LOG_LEVEL', 'INFO')),
    format='[%(asctime)s] %(levelname)s - %(message)s',
    datefmt='%H:%M:%S'
)
logger = logging.getLogger(__name__)


class VisionService:
    """Main vision service coordinator"""
    
    def __init__(self):
        # Load configuration
        self.camera_index = int(os.getenv('CAMERA_INDEX', '0'))
        self.camera_name = os.getenv('CAMERA_NAME', 'Webcam')
        self.room_id = os.getenv('ROOM_ID', 'room-1')
        self.room_name = os.getenv('ROOM_NAME', 'Exam Room 1')
        self.frame_rate = int(os.getenv('FRAME_RATE', '2'))
        self.motion_threshold = int(os.getenv('MOTION_THRESHOLD', '500'))
        self.occupancy_confidence = float(os.getenv('OCCUPANCY_CONFIDENCE', '0.7'))
        self.cleaning_timeout_minutes = int(os.getenv('CLEANING_TIMEOUT_MINUTES', '5'))
        
        # Dashboard configuration
        dashboard_url = os.getenv('DASHBOARD_URL', 'http://localhost:3000')
        dashboard_api_key = os.getenv('DASHBOARD_API_KEY', 'vision_service_key_12345')
        
        # Initialize components
        self.camera = Camera(self.camera_index, self.camera_name)
        self.detector = OccupancyDetector(self.motion_threshold, self.occupancy_confidence)
        self.dashboard = DashboardClient(dashboard_url, dashboard_api_key)
        
        # State tracking
        self.running = False
        self.last_cleaning_check = None
        self.cleaning_action_created = False
        self.debug_logging = os.getenv('DEBUG_LOGGING', 'false').lower() == 'true'
        self.last_dashboard_status = None  # Track what we last sent to avoid redundant updates
        
    def start(self):
        """Start the vision service"""
        logger.info("=" * 60)
        logger.info("Vision Service Starting")
        logger.info("=" * 60)
        logger.info(f"Room: {self.room_name} (ID: {self.room_id})")
        logger.info(f"Camera: {self.camera_name} (Index: {self.camera_index})")
        logger.info(f"Frame Rate: {self.frame_rate} FPS")
        logger.info(f"Cleaning Timeout: {self.cleaning_timeout_minutes} minutes")
        logger.info("=" * 60)
        
        # Connect to camera
        if not self.camera.connect():
            logger.error("Failed to connect to camera. Exiting.")
            return False
        
        # Check dashboard connection
        logger.info("Checking dashboard connection...")
        if not self.dashboard.health_check():
            logger.warning("⚠ Dashboard backend not reachable")
            logger.warning("  Service will continue but updates may fail")
        else:
            logger.info("✓ Dashboard backend connected")
        
        logger.info("")
        logger.info(f"Monitoring {self.room_name}...")
        logger.info("Press Ctrl+C to stop")
        logger.info("")
        
        self.running = True
        return True
    
    def process_frame(self):
        """Process a single frame"""
        # Capture frame
        frame = self.camera.get_frame()
        if frame is None:
            logger.warning("Failed to capture frame")
            return
        
        # Detect occupancy
        status, confidence, changed = self.detector.detect(frame)
        
        # Debug: Log detection info every 10 frames (every 5 seconds at 2 FPS)
        if self.debug_logging:
            if hasattr(self, '_frame_count'):
                self._frame_count += 1
            else:
                self._frame_count = 1
            
            if self._frame_count % 10 == 0:
                logger.info(f"[DEBUG] Status: {status}, Confidence: {confidence:.2f}, Motion frames: {self.detector.motion_frames_count}, No-motion frames: {self.detector.no_motion_frames_count}")
        
        # If status changed, update dashboard
        if changed:
            dashboard_status = "occupied" if status == "occupied" else "available"
            
            # Only send if different from what we last sent (avoid redundant API calls)
            if dashboard_status != self.last_dashboard_status:
                success = self.dashboard.update_room_status(self.room_id, dashboard_status)
                
                if success:
                    logger.info(f"→ Dashboard updated: {self.room_name} is {dashboard_status}")
                    self.last_dashboard_status = dashboard_status
            
            # Reset cleaning flag when room becomes occupied
            if status == "occupied":
                self.cleaning_action_created = False
        
        # Check if room needs cleaning
        if status == "available" and not self.cleaning_action_created:
            if self.detector.should_trigger_cleaning(self.cleaning_timeout_minutes):
                logger.info(f"Room empty for {self.cleaning_timeout_minutes} minutes")
                
                success = self.dashboard.create_action_item(
                    title=f"{self.room_name} needs cleaning",
                    description=f"Room has been empty for {self.cleaning_timeout_minutes} minutes and requires cleaning before next patient.",
                    urgency='normal',
                    action_type='room_issue',
                    room_id=self.room_id,
                    reasoning=f"Automatic detection: Room empty for {self.cleaning_timeout_minutes} minutes after last occupancy"
                )
                
                if success:
                    logger.info(f"→ Action item created: Room needs cleaning")
                    self.cleaning_action_created = True
    
    def run(self):
        """Main processing loop"""
        if not self.start():
            return
        
        frame_delay = 1.0 / self.frame_rate
        
        try:
            while self.running:
                start_time = time.time()
                
                # Process frame
                self.process_frame()
                
                # Maintain frame rate
                elapsed = time.time() - start_time
                if elapsed < frame_delay:
                    time.sleep(frame_delay - elapsed)
                
        except KeyboardInterrupt:
            logger.info("")
            logger.info("Shutting down...")
        except Exception as e:
            logger.error(f"Unexpected error: {e}", exc_info=True)
        finally:
            self.stop()
    
    def stop(self):
        """Stop the vision service"""
        self.running = False
        self.camera.disconnect()
        logger.info("Vision service stopped")


def main():
    """Main entry point"""
    service = VisionService()
    service.run()


if __name__ == '__main__':
    main()
