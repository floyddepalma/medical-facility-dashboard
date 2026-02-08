"""
Dashboard backend API client
"""
import requests
import logging
from typing import Optional, Dict, Any
from datetime import datetime

logger = logging.getLogger(__name__)


class DashboardClient:
    """Client for communicating with the dashboard backend"""
    
    def __init__(self, base_url: str, api_key: str):
        self.base_url = base_url.rstrip('/')
        self.api_key = api_key
        self.session = requests.Session()
        self.session.headers.update({
            'Authorization': f'Bearer {api_key}',
            'Content-Type': 'application/json'
        })
        
        logger.info(f"Dashboard client initialized: {base_url}")
    
    def update_room_status(self, room_id: str, status: str) -> bool:
        """
        Update room status in the dashboard
        
        Args:
            room_id: Room UUID
            status: 'available', 'occupied', 'needs_cleaning', or 'maintenance'
        
        Returns:
            True if successful, False otherwise
        """
        try:
            url = f"{self.base_url}/api/facility/rooms/{room_id}/status"
            payload = {
                'status': status
            }
            
            logger.info(f"Updating room {room_id} status to: {status}")
            response = self.session.put(url, json=payload, timeout=5)
            
            if response.status_code == 200:
                logger.info(f"✓ Room status updated successfully")
                return True
            else:
                logger.error(f"Failed to update room status: {response.status_code} - {response.text}")
                return False
                
        except requests.exceptions.Timeout:
            logger.error("Request timeout updating room status")
            return False
        except Exception as e:
            logger.error(f"Error updating room status: {e}")
            return False
    
    def create_action_item(
        self,
        title: str,
        description: str,
        urgency: str = 'normal',
        action_type: str = 'room_issue',
        room_id: Optional[str] = None,
        reasoning: Optional[str] = None
    ) -> bool:
        """
        Create an action item in the dashboard
        
        Args:
            title: Action item title
            description: Detailed description
            urgency: 'urgent', 'normal', or 'low'
            action_type: 'room_issue', 'equipment_issue', 'agent_request', or 'manual'
            room_id: Optional room UUID
            reasoning: Optional reasoning text
        
        Returns:
            True if successful, False otherwise
        """
        try:
            url = f"{self.base_url}/api/actions"
            payload = {
                'type': action_type,
                'urgency': urgency,
                'title': title,
                'description': description,
                'context': {
                    'source': 'vision_service',
                    'timestamp': datetime.now().isoformat()
                }
            }
            
            if room_id:
                payload['roomId'] = room_id
            
            if reasoning:
                payload['reasoning'] = reasoning
            
            logger.info(f"Creating action item: {title}")
            response = self.session.post(url, json=payload, timeout=5)
            
            if response.status_code == 201:
                logger.info(f"✓ Action item created successfully")
                return True
            else:
                logger.error(f"Failed to create action item: {response.status_code} - {response.text}")
                return False
                
        except requests.exceptions.Timeout:
            logger.error("Request timeout creating action item")
            return False
        except Exception as e:
            logger.error(f"Error creating action item: {e}")
            return False
    
    def health_check(self) -> bool:
        """Check if dashboard backend is reachable"""
        try:
            url = f"{self.base_url}/api/auth/me"
            response = self.session.get(url, timeout=3)
            return response.status_code in [200, 401]  # 401 means server is up but auth failed
        except Exception:
            return False
