#!/usr/bin/env python3
"""
Simple Socket.IO connection test
"""

import socketio
import time
import requests

def test_socketio():
    print("Testing Socket.IO connection...")
    
    try:
        sio = socketio.Client()
        
        connected = False
        error_msg = None
        
        @sio.event
        def connect():
            nonlocal connected
            connected = True
            print("✅ Socket.IO connected successfully")
        
        @sio.event
        def connect_error(data):
            nonlocal error_msg
            error_msg = str(data)
            print(f"❌ Socket.IO connection error: {data}")
        
        @sio.event
        def disconnect():
            print("Socket.IO disconnected")
        
        # Try to connect
        url = "https://repair-local.preview.emergentagent.com"
        print(f"Connecting to {url} with socketio_path='/api/socket.io'...")
        
        sio.connect(url, socketio_path='/api/socket.io', wait_timeout=20)
        
        if connected:
            print("✅ Socket.IO connection successful!")
            
            # Test join_room
            test_room = f"test_room_{int(time.time())}"
            sio.emit('join_room', {'conversation_id': test_room})
            print(f"✅ Emitted join_room event for {test_room}")
            
            time.sleep(2)
            sio.disconnect()
            return True
        else:
            print(f"❌ Socket.IO connection failed: {error_msg}")
            return False
            
    except Exception as e:
        print(f"❌ Socket.IO exception: {str(e)}")
        return False

def test_basic_endpoints():
    base_url = "https://repair-local.preview.emergentagent.com"
    
    # Test impact stats
    try:
        response = requests.get(f"{base_url}/api/impact-stats", timeout=10)
        if response.status_code == 200:
            print("✅ Impact Stats API working")
        else:
            print(f"❌ Impact Stats API failed: {response.status_code}")
    except Exception as e:
        print(f"❌ Impact Stats API error: {str(e)}")

if __name__ == "__main__":
    print("🧪 Running focused backend tests...")
    test_basic_endpoints()
    test_socketio()