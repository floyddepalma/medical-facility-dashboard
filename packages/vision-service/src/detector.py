"""
Motion and occupancy detection using OpenCV
"""
import cv2
import numpy as np
import logging
from typing import Optional, Tuple
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)


class OccupancyDetector:
    """Detects room occupancy using motion detection"""
    
    def __init__(self, motion_threshold: int = 500, confidence_threshold: float = 0.7):
        self.motion_threshold = motion_threshold
        self.confidence_threshold = confidence_threshold
        
        # Background subtractor for motion detection
        self.bg_subtractor = cv2.createBackgroundSubtractorMOG2(
            history=500,
            varThreshold=16,
            detectShadows=True
        )
        
        # State tracking
        self.previous_frame: Optional[np.ndarray] = None
        self.current_status = "available"
        self.last_motion_time: Optional[datetime] = None
        self.last_status_change: Optional[datetime] = None
        self.motion_frames_count = 0
        self.no_motion_frames_count = 0
        
        # Thresholds for state changes
        self.motion_frames_required = 3  # 3 consecutive frames with motion (~1.5s at 2 FPS)
        self.no_motion_frames_required = 40  # 40 consecutive frames without motion (~20s at 2 FPS)
        
        # Cooldown: minimum time to stay in "occupied" before allowing transition to "available"
        self.occupied_cooldown_seconds = 30
        
        logger.info(f"Occupancy detector initialized (threshold: {motion_threshold})")
    
    def detect(self, frame: np.ndarray) -> Tuple[str, float, bool]:
        """
        Detect occupancy in the frame
        
        Returns:
            (status, confidence, changed) tuple
            - status: 'occupied' or 'available'
            - confidence: 0.0 to 1.0
            - changed: True if status changed from previous detection
        """
        if frame is None:
            return self.current_status, 0.0, False
        
        # Convert to grayscale for processing
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        gray = cv2.GaussianBlur(gray, (21, 21), 0)
        
        # Apply background subtraction
        fg_mask = self.bg_subtractor.apply(gray)
        
        # Calculate motion amount
        motion_pixels = cv2.countNonZero(fg_mask)
        has_motion = motion_pixels > self.motion_threshold
        
        # Update motion tracking
        if has_motion:
            self.last_motion_time = datetime.now()
            self.motion_frames_count += 1
            self.no_motion_frames_count = 0
        else:
            self.motion_frames_count = 0
            self.no_motion_frames_count += 1
        
        # Determine status and confidence
        previous_status = self.current_status
        confidence = 0.0
        
        if self.motion_frames_count >= self.motion_frames_required:
            # Consistent motion detected - room is occupied
            self.current_status = "occupied"
            confidence = min(1.0, self.motion_frames_count / 10.0)
        elif self.no_motion_frames_count >= self.no_motion_frames_required:
            # No motion for a sustained period
            # But only transition to available if we've been occupied long enough (cooldown)
            if self.current_status == "occupied" and self.last_status_change is not None:
                time_in_occupied = (datetime.now() - self.last_status_change).total_seconds()
                if time_in_occupied < self.occupied_cooldown_seconds:
                    # Still in cooldown — stay occupied
                    confidence = 0.5
                else:
                    self.current_status = "available"
                    confidence = min(1.0, self.no_motion_frames_count / 60.0)
            else:
                self.current_status = "available"
                confidence = min(1.0, self.no_motion_frames_count / 60.0)
        else:
            # Uncertain state - keep previous status
            confidence = 0.5
        
        # Check if status changed
        changed = False
        if self.current_status != previous_status and confidence >= self.confidence_threshold:
            changed = True
            self.last_status_change = datetime.now()
            logger.info(f"Status changed: {previous_status} → {self.current_status} (confidence: {confidence:.2f})")
        
        self.previous_frame = gray
        return self.current_status, confidence, changed
    
    def get_time_since_last_motion(self) -> Optional[timedelta]:
        """Get time elapsed since last motion was detected"""
        if self.last_motion_time is None:
            return None
        return datetime.now() - self.last_motion_time
    
    def get_time_since_status_change(self) -> Optional[timedelta]:
        """Get time elapsed since last status change"""
        if self.last_status_change is None:
            return None
        return datetime.now() - self.last_status_change
    
    def should_trigger_cleaning(self, cleaning_timeout_minutes: int) -> bool:
        """
        Check if room should be marked for cleaning
        Room must be available and empty for the specified timeout
        """
        if self.current_status != "available":
            return False
        
        time_since_change = self.get_time_since_status_change()
        if time_since_change is None:
            return False
        
        return time_since_change.total_seconds() >= (cleaning_timeout_minutes * 60)
