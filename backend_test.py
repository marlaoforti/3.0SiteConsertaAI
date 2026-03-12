#!/usr/bin/env python3
"""
ConsertaAí Backend API Test Suite
Comprehensive testing for the marketplace backend APIs
"""

import requests
import json
import time
import uuid
from datetime import datetime, timezone, timedelta
import subprocess
import sys
import socketio
import asyncio
import threading
from typing import Optional, Dict, Any

class ConsertaAITester:
    def __init__(self):
        # Use the configured backend URL from environment
        self.base_url = "https://repair-local.preview.emergentagent.com"
        self.session_token = None
        self.user_id = None
        self.test_results = []
        self.sio_client = None
        
    def log_result(self, test_name: str, success: bool, message: str = "", details: Any = None):
        """Log test result"""
        result = {
            "test": test_name,
            "success": success,
            "message": message,
            "details": details,
            "timestamp": datetime.now().isoformat()
        }
        self.test_results.append(result)
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} {test_name}: {message}")
        if details and not success:
            print(f"   Details: {details}")
    
    def setup_test_user_session(self):
        """Create test user and session in MongoDB"""
        try:
            timestamp = str(int(time.time()))
            self.user_id = f"test-user-{timestamp}"
            self.session_token = f"test_session_{timestamp}"
            
            # MongoDB script to create test user and session
            mongo_script = f'''
            use('consertaai_db');
            db.users.insertOne({{
              user_id: "{self.user_id}",
              email: "test.user.{timestamp}@example.com",
              name: "João Silva",
              picture: "https://via.placeholder.com/150",
              role: "customer",
              location: {{
                type: "Point",
                coordinates: [-23.5505, -46.6333]
              }},
              address: "São Paulo, SP, Brasil",
              created_at: new Date()
            }});
            db.user_sessions.insertOne({{
              user_id: "{self.user_id}",
              session_token: "{self.session_token}",
              expires_at: new Date(Date.now() + 7*24*60*60*1000),
              created_at: new Date()
            }});
            print("Test user created successfully");
            '''
            
            # Execute MongoDB script
            result = subprocess.run([
                "mongosh", "--eval", mongo_script
            ], capture_output=True, text=True)
            
            if result.returncode == 0:
                self.log_result("Setup Test User", True, f"Created user {self.user_id} with session")
                return True
            else:
                self.log_result("Setup Test User", False, f"MongoDB error: {result.stderr}")
                return False
                
        except Exception as e:
            self.log_result("Setup Test User", False, f"Exception: {str(e)}")
            return False
    
    def cleanup_test_data(self):
        """Clean up test data from MongoDB"""
        try:
            mongo_script = '''
            use('consertaai_db');
            db.users.deleteMany({email: /test\.user\./});
            db.user_sessions.deleteMany({session_token: /test_session/});
            db.repairers.deleteMany({user_id: /test-user-/});
            db.repair_requests.deleteMany({customer_id: /test-user-/});
            db.conversations.deleteMany({participants: /test-user-/});
            db.messages.deleteMany({sender_id: /test-user-/});
            print("Test data cleaned");
            '''
            
            subprocess.run(["mongosh", "--eval", mongo_script], capture_output=True)
            print("🧹 Test data cleaned up")
        except Exception as e:
            print(f"⚠️ Cleanup warning: {str(e)}")
    
    def test_impact_stats_public(self):
        """Test public impact stats endpoint"""
        try:
            url = f"{self.base_url}/api/impact-stats"
            response = requests.get(url, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                required_fields = ["total_repairs", "total_waste_kg", "total_money_saved", "total_co2_saved"]
                
                missing_fields = [field for field in required_fields if field not in data]
                if not missing_fields:
                    self.log_result("Impact Stats API", True, "All required fields present", data)
                else:
                    self.log_result("Impact Stats API", False, f"Missing fields: {missing_fields}", data)
            else:
                self.log_result("Impact Stats API", False, f"HTTP {response.status_code}", response.text)
                
        except Exception as e:
            self.log_result("Impact Stats API", False, f"Exception: {str(e)}")
    
    def test_auth_me(self):
        """Test authentication with session token"""
        try:
            url = f"{self.base_url}/api/auth/me"
            headers = {"Authorization": f"Bearer {self.session_token}"}
            response = requests.get(url, headers=headers, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                if data.get("user_id") == self.user_id:
                    self.log_result("Auth Me Endpoint", True, "User data returned correctly", data)
                else:
                    self.log_result("Auth Me Endpoint", False, "User ID mismatch", data)
            else:
                self.log_result("Auth Me Endpoint", False, f"HTTP {response.status_code}", response.text)
                
        except Exception as e:
            self.log_result("Auth Me Endpoint", False, f"Exception: {str(e)}")
    
    def test_repairer_profile_creation(self):
        """Test repairer profile creation and retrieval"""
        try:
            headers = {"Authorization": f"Bearer {self.session_token}", "Content-Type": "application/json"}
            
            # Create repairer profile
            profile_data = {
                "skills": ["Electrodomésticos", "Smartphones", "Computadores"],
                "bio": "Técnico especializado com 10 anos de experiência em reparos eletrônicos",
                "hourly_rate": 50.0,
                "photos": []
            }
            
            url = f"{self.base_url}/api/repairer/profile"
            response = requests.post(url, json=profile_data, headers=headers, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                self.log_result("Create Repairer Profile", True, "Profile created successfully", data)
                
                # Test profile retrieval
                get_response = requests.get(url, headers=headers, timeout=10)
                if get_response.status_code == 200:
                    get_data = get_response.json()
                    self.log_result("Get Repairer Profile", True, "Profile retrieved successfully", get_data)
                    
                    # Test repairers list
                    list_url = f"{self.base_url}/api/repairers"
                    list_response = requests.get(list_url, headers=headers, timeout=10)
                    if list_response.status_code == 200:
                        repairers = list_response.json()
                        self.log_result("List Repairers", True, f"Found {len(repairers)} repairers", len(repairers))
                    else:
                        self.log_result("List Repairers", False, f"HTTP {list_response.status_code}", list_response.text)
                else:
                    self.log_result("Get Repairer Profile", False, f"HTTP {get_response.status_code}", get_response.text)
            else:
                self.log_result("Create Repairer Profile", False, f"HTTP {response.status_code}", response.text)
                
        except Exception as e:
            self.log_result("Repairer Profile Tests", False, f"Exception: {str(e)}")
    
    def test_repair_requests(self):
        """Test repair request creation and retrieval"""
        try:
            headers = {"Authorization": f"Bearer {self.session_token}", "Content-Type": "application/json"}
            
            # Create repair request
            request_data = {
                "title": "Geladeira não está gelando",
                "description": "Minha geladeira Brastemp de 400L parou de gelar ontem. O freezer funciona normalmente, mas a parte de baixo não está gelando.",
                "category": "Electrodomésticos",
                "images": [],
                "location": {
                    "type": "Point",
                    "coordinates": [-23.5505, -46.6333]
                },
                "address": "Rua das Flores, 123 - Vila Madalena, São Paulo - SP"
            }
            
            url = f"{self.base_url}/api/repair-requests"
            response = requests.post(url, json=request_data, headers=headers, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                request_id = data.get("request_id")
                self.log_result("Create Repair Request", True, "Request created successfully", data)
                
                # Test requests list
                get_response = requests.get(url, headers=headers, timeout=10)
                if get_response.status_code == 200:
                    requests_list = get_response.json()
                    self.log_result("List Repair Requests", True, f"Found {len(requests_list)} requests", len(requests_list))
                    
                    # Verify our request is in the list
                    our_request = next((r for r in requests_list if r.get("request_id") == request_id), None)
                    if our_request and our_request.get("status") == "open":
                        self.log_result("Verify Request Status", True, "Request has correct 'open' status")
                    else:
                        self.log_result("Verify Request Status", False, "Request not found or wrong status")
                else:
                    self.log_result("List Repair Requests", False, f"HTTP {get_response.status_code}", get_response.text)
            else:
                self.log_result("Create Repair Request", False, f"HTTP {response.status_code}", response.text)
                
        except Exception as e:
            self.log_result("Repair Request Tests", False, f"Exception: {str(e)}")
    
    def test_chat_messaging(self):
        """Test chat/messaging system"""
        try:
            headers = {"Authorization": f"Bearer {self.session_token}", "Content-Type": "application/json"}
            
            # Create a second test user to message
            receiver_id = f"test-receiver-{int(time.time())}"
            
            # Send message (this should create conversation)
            message_data = {
                "receiver_id": receiver_id,
                "content": "Olá! Gostaria de solicitar um orçamento para reparo da minha geladeira.",
                "repair_request_id": None
            }
            
            url = f"{self.base_url}/api/messages/send"
            response = requests.post(url, json=message_data, headers=headers, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                conversation_id = data.get("conversation_id")
                self.log_result("Send Message", True, "Message sent successfully", data)
                
                # Test conversations list
                conv_url = f"{self.base_url}/api/conversations"
                conv_response = requests.get(conv_url, headers=headers, timeout=10)
                if conv_response.status_code == 200:
                    conversations = conv_response.json()
                    self.log_result("List Conversations", True, f"Found {len(conversations)} conversations", len(conversations))
                    
                    # Test messages retrieval
                    if conversation_id:
                        msg_url = f"{self.base_url}/api/messages/{conversation_id}"
                        msg_response = requests.get(msg_url, headers=headers, timeout=10)
                        if msg_response.status_code == 200:
                            messages = msg_response.json()
                            self.log_result("Get Messages", True, f"Retrieved {len(messages)} messages", len(messages))
                        else:
                            self.log_result("Get Messages", False, f"HTTP {msg_response.status_code}", msg_response.text)
                    else:
                        self.log_result("Get Messages", False, "No conversation_id to test with")
                else:
                    self.log_result("List Conversations", False, f"HTTP {conv_response.status_code}", conv_response.text)
            else:
                self.log_result("Send Message", False, f"HTTP {response.status_code}", response.text)
                
        except Exception as e:
            self.log_result("Chat Messaging Tests", False, f"Exception: {str(e)}")
    
    def test_socketio_connection(self):
        """Test Socket.IO connection"""
        try:
            # Create Socket.IO client
            self.sio_client = socketio.Client()
            
            connection_success = False
            connect_error = None
            
            @self.sio_client.event
            def connect():
                nonlocal connection_success
                connection_success = True
                print("Socket.IO connected successfully")
            
            @self.sio_client.event
            def connect_error(data):
                nonlocal connect_error
                connect_error = str(data)
                print(f"Socket.IO connection error: {data}")
            
            @self.sio_client.event
            def disconnect():
                print("Socket.IO disconnected")
            
            # Connect to Socket.IO
            socket_url = f"{self.base_url}"
            self.sio_client.connect(socket_url, socketio_path='/api/socket.io', wait_timeout=15)
            
            # Wait a bit for connection
            time.sleep(2)
            
            if connection_success:
                self.log_result("Socket.IO Connection", True, "Successfully connected to Socket.IO server")
                
                # Test join_room event
                try:
                    test_conversation_id = f"test_conv_{int(time.time())}"
                    self.sio_client.emit('join_room', {'conversation_id': test_conversation_id})
                    time.sleep(1)
                    self.log_result("Socket.IO Join Room", True, f"Joined room {test_conversation_id}")
                except Exception as e:
                    self.log_result("Socket.IO Join Room", False, f"Failed to join room: {str(e)}")
                
                # Disconnect
                self.sio_client.disconnect()
                
            else:
                error_msg = connect_error or "Connection failed - no response"
                self.log_result("Socket.IO Connection", False, error_msg)
                
        except Exception as e:
            self.log_result("Socket.IO Connection", False, f"Exception: {str(e)}")
    
    def run_all_tests(self):
        """Run all backend tests"""
        print("🚀 Starting ConsertaAí Backend API Test Suite")
        print(f"Backend URL: {self.base_url}")
        print("=" * 60)
        
        # Setup
        if not self.setup_test_user_session():
            print("❌ Failed to setup test user - cannot continue")
            return
        
        # Run tests
        self.test_impact_stats_public()
        self.test_auth_me()
        self.test_repairer_profile_creation()
        self.test_repair_requests()
        self.test_chat_messaging()
        self.test_socketio_connection()
        
        # Summary
        print("=" * 60)
        print("📊 TEST SUMMARY")
        print("=" * 60)
        
        total_tests = len(self.test_results)
        passed_tests = sum(1 for result in self.test_results if result["success"])
        failed_tests = total_tests - passed_tests
        
        print(f"Total Tests: {total_tests}")
        print(f"Passed: {passed_tests}")
        print(f"Failed: {failed_tests}")
        print(f"Success Rate: {(passed_tests/total_tests)*100:.1f}%")
        
        if failed_tests > 0:
            print("\n❌ FAILED TESTS:")
            for result in self.test_results:
                if not result["success"]:
                    print(f"  - {result['test']}: {result['message']}")
        
        # Cleanup
        self.cleanup_test_data()
        
        return self.test_results

def main():
    """Main test execution"""
    tester = ConsertaAITester()
    results = tester.run_all_tests()
    
    # Exit with error code if any tests failed
    failed = any(not result["success"] for result in results)
    sys.exit(1 if failed else 0)

if __name__ == "__main__":
    main()