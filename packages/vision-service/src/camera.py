"""
Camera connection and frame capture
"""
import cv2
import logging
from typing import Optional
import numpy as np

logger = logging.getLogger(__name__)


class Camera:
    """Manages webcam connection and frame capture"""
    
    def __init__(self, camera_index: int = 0, camera_name: str = "Webcam"):
        self.camera_index = camera_index
        self.camera_name = camera_name
        self.capture: Optional[cv2.VideoCapture] = None
        self.is_connected = False
        
    def connect(self) -> bool:
        """Connect to the camera"""
        try:
            logger.info(f"Connecting to camera {self.camera_index} ({self.camera_name})...")
            self.capture = cv2.VideoCapture(self.camera_index)
            
            if not self.capture.isOpened():
                logger.error(f"Failed to open camera {self.camera_index}")
                return False
            
            # Set camera properties for better performance
            self.capture.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
            self.capture.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)
            self.capture.set(cv2.CAP_PROP_FPS, 30)
            
            # Test read
            ret, frame = self.capture.read()
            if not ret or frame is None:
                logger.error("Camera opened but cannot read frames")
                return False
            
            self.is_connected = True
            logger.info(f"✓ Connected to {self.camera_name}")
            logger.info(f"  Resolution: {frame.shape[1]}x{frame.shape[0]}")
            return True
            
        except Exception as e:
            logger.error(f"Error connecting to camera: {e}")
            return False
    
    def get_frame(self) -> Optional[np.ndarray]:
        """Capture a single frame from the camera"""
        if not self.is_connected or self.capture is None:
            return None
        
        try:
            ret, frame = self.capture.read()
            if not ret or frame is None:
                logger.warning("Failed to read frame from camera")
                return None
            
            return frame
            
        except Exception as e:
            logger.error(f"Error reading frame: {e}")
            return None
    
    def disconnect(self):
        """Release the camera"""
        if self.capture is not None:
            self.capture.release()
            self.is_connected = False
            logger.info(f"Disconnected from {self.camera_name}")
    
    def is_healthy(self) -> bool:
        """Check if camera connection is healthy"""
        return self.is_connected and self.capture is not None and self.capture.isOpened()
