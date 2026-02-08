#!/usr/bin/env python3
"""
Quick camera test script
Tests if your Logitech webcam is accessible
"""
import cv2
import sys

print("=" * 60)
print("Camera Test")
print("=" * 60)
print()

# Try to open camera
print("Attempting to open camera 0...")
cap = cv2.VideoCapture(0)

if not cap.isOpened():
    print("❌ Failed to open camera 0")
    print()
    print("Troubleshooting:")
    print("1. Make sure no other app is using the camera")
    print("2. Try camera index 1: cv2.VideoCapture(1)")
    print("3. Check camera permissions in System Preferences")
    sys.exit(1)

print("✓ Camera opened successfully")

# Get camera properties
width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
fps = int(cap.get(cv2.CAP_PROP_FPS))

print(f"  Resolution: {width}x{height}")
print(f"  FPS: {fps}")
print()

# Try to read a frame
print("Reading test frame...")
ret, frame = cap.read()

if not ret or frame is None:
    print("❌ Failed to read frame from camera")
    cap.release()
    sys.exit(1)

print("✓ Frame captured successfully")
print(f"  Frame shape: {frame.shape}")
print()

# Test motion detection
print("Testing motion detection...")
gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
print("✓ Grayscale conversion works")

# Create background subtractor
bg_subtractor = cv2.createBackgroundSubtractorMOG2()
fg_mask = bg_subtractor.apply(gray)
print("✓ Background subtraction works")

cap.release()

print()
print("=" * 60)
print("✓ All tests passed!")
print("=" * 60)
print()
print("Your Logitech webcam is ready for the vision service.")
print("Run: python src/main.py")
print()
