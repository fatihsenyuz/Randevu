import requests
import sys
import json
from datetime import datetime, date, timedelta

class RoyalKoltukAPITester:
    def __init__(self, base_url="https://royalapp.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.tests_run = 0
        self.tests_passed = 0
        self.created_services = []
        self.created_appointments = []
        self.created_transactions = []

    def run_test(self, name, method, endpoint, expected_status, data=None, params=None):
        """Run a single API test"""
        url = f"{self.api_url}/{endpoint}"
        headers = {'Content-Type': 'application/json'}

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, params=params)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    return True, response.json() if response.text else {}
                except:
                    return True, {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                print(f"   Response: {response.text[:200]}...")
                return False, {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_services(self):
        """Test service management endpoints"""
        print("\n" + "="*50)
        print("TESTING SERVICE MANAGEMENT")
        print("="*50)
        
        # Test get services (should have default services)
        success, services = self.run_test("Get Services", "GET", "services", 200)
        if success:
            print(f"   Found {len(services)} services")
            if len(services) >= 6:
                print("✅ Default services loaded correctly")
            else:
                print("⚠️  Expected 6 default services")
        
        # Test create service
        test_service = {
            "name": "Test Koltuk Yıkama",
            "price": 500.0
        }
        success, service = self.run_test("Create Service", "POST", "services", 200, test_service)
        if success and 'id' in service:
            self.created_services.append(service['id'])
            print(f"   Created service with ID: {service['id']}")
            
            # Test get single service
            self.run_test("Get Single Service", "GET", f"services/{service['id']}", 200)
            
            # Test update service
            update_data = {"name": "Updated Test Koltuk Yıkama", "price": 600.0}
            self.run_test("Update Service", "PUT", f"services/{service['id']}", 200, update_data)
            
            # Test delete service
            self.run_test("Delete Service", "DELETE", f"services/{service['id']}", 200)
        
        # Test service not found
        self.run_test("Get Non-existent Service", "GET", "services/non-existent-id", 404)

    def test_appointments(self):
        """Test appointment management endpoints"""
        print("\n" + "="*50)
        print("TESTING APPOINTMENT MANAGEMENT")
        print("="*50)
        
        # First get services to use in appointment
        success, services = self.run_test("Get Services for Appointment", "GET", "services", 200)
        if not success or not services:
            print("❌ Cannot test appointments without services")
            return
        
        service_id = services[0]['id']
        today = date.today().isoformat()
        
        # Test create appointment
        test_appointment = {
            "customer_name": "Test Müşteri",
            "phone": "05551234567",
            "address": "Test Adres",
            "service_id": service_id,
            "appointment_date": today,
            "appointment_time": "10:00",
            "notes": "Test randevu"
        }
        
        success, appointment = self.run_test("Create Appointment", "POST", "appointments", 200, test_appointment)
        if success and 'id' in appointment:
            appointment_id = appointment['id']
            self.created_appointments.append(appointment_id)
            print(f"   Created appointment with ID: {appointment_id}")
            
            # Test get appointments
            self.run_test("Get All Appointments", "GET", "appointments", 200)
            
            # Test get appointments with filters
            self.run_test("Get Today's Appointments", "GET", "appointments", 200, params={"date": today})
            self.run_test("Search Appointments", "GET", "appointments", 200, params={"search": "Test"})
            
            # Test get single appointment
            self.run_test("Get Single Appointment", "GET", f"appointments/{appointment_id}", 200)
            
            # Test update appointment status to completed
            update_data = {"status": "Tamamlandı"}
            success, updated = self.run_test("Complete Appointment", "PUT", f"appointments/{appointment_id}", 200, update_data)
            if success:
                print("✅ Appointment marked as completed - should create transaction")
            
            # Test update appointment details
            update_data = {"customer_name": "Updated Test Müşteri", "notes": "Updated notes"}
            self.run_test("Update Appointment Details", "PUT", f"appointments/{appointment_id}", 200, update_data)
            
            # Test cancel appointment
            cancel_data = {"status": "İptal"}
            self.run_test("Cancel Appointment", "PUT", f"appointments/{appointment_id}", 200, cancel_data)
        
        # Test appointment not found
        self.run_test("Get Non-existent Appointment", "GET", "appointments/non-existent-id", 404)

    def test_transactions(self):
        """Test transaction/cash register endpoints"""
        print("\n" + "="*50)
        print("TESTING TRANSACTIONS/CASH REGISTER")
        print("="*50)
        
        # Test get transactions
        self.run_test("Get All Transactions", "GET", "transactions", 200)
        
        # Test get transactions with date filters
        today = date.today().isoformat()
        week_ago = (date.today() - timedelta(days=7)).isoformat()
        
        self.run_test("Get Today's Transactions", "GET", "transactions", 200, 
                     params={"start_date": today, "end_date": today})
        self.run_test("Get Week's Transactions", "GET", "transactions", 200, 
                     params={"start_date": week_ago})
        
        # Get existing transactions to test update/delete
        success, transactions = self.run_test("Get Transactions for Testing", "GET", "transactions", 200)
        if success and transactions:
            transaction_id = transactions[0]['id']
            
            # Test update transaction amount
            update_data = {"amount": 999.99}
            self.run_test("Update Transaction Amount", "PUT", f"transactions/{transaction_id}", 200, update_data)
            
            # Note: We won't delete the transaction as it might be needed
        
        # Test transaction not found
        self.run_test("Get Non-existent Transaction", "GET", "transactions/non-existent-id", 404)

    def test_dashboard_stats(self):
        """Test dashboard statistics endpoint"""
        print("\n" + "="*50)
        print("TESTING DASHBOARD STATISTICS")
        print("="*50)
        
        success, stats = self.run_test("Get Dashboard Stats", "GET", "stats/dashboard", 200)
        if success:
            required_fields = ['today_appointments', 'today_completed', 'today_income', 'week_income', 'month_income']
            for field in required_fields:
                if field in stats:
                    print(f"✅ {field}: {stats[field]}")
                else:
                    print(f"❌ Missing field: {field}")

    def test_settings(self):
        """Test settings management endpoints"""
        print("\n" + "="*50)
        print("TESTING SETTINGS MANAGEMENT")
        print("="*50)
        
        # Test get settings
        success, settings = self.run_test("Get Settings", "GET", "settings", 200)
        if success:
            required_fields = ['work_start_hour', 'work_end_hour', 'appointment_interval']
            for field in required_fields:
                if field in settings:
                    print(f"✅ {field}: {settings[field]}")
                else:
                    print(f"❌ Missing field: {field}")
            
            # Test update settings
            update_data = {
                "id": "app_settings",
                "work_start_hour": 8,
                "work_end_hour": 22,
                "appointment_interval": 45
            }
            self.run_test("Update Settings", "PUT", "settings", 200, update_data)
            
            # Restore original settings
            original_settings = {
                "id": "app_settings",
                "work_start_hour": settings.get('work_start_hour', 7),
                "work_end_hour": settings.get('work_end_hour', 3),
                "appointment_interval": settings.get('appointment_interval', 30)
            }
            self.run_test("Restore Original Settings", "PUT", "settings", 200, original_settings)

    def test_customer_history(self):
        """Test customer history endpoint"""
        print("\n" + "="*50)
        print("TESTING CUSTOMER HISTORY")
        print("="*50)
        
        # Test with a phone number that might exist
        test_phone = "05551234567"
        success, history = self.run_test("Get Customer History", "GET", f"customers/{test_phone}/history", 200)
        if success:
            print(f"✅ Customer history retrieved for {test_phone}")
            print(f"   Total appointments: {history.get('total_appointments', 0)}")
            print(f"   Completed appointments: {history.get('completed_appointments', 0)}")

    def cleanup(self):
        """Clean up created test data"""
        print("\n" + "="*50)
        print("CLEANING UP TEST DATA")
        print("="*50)
        
        # Delete created appointments
        for appointment_id in self.created_appointments:
            self.run_test(f"Delete Test Appointment", "DELETE", f"appointments/{appointment_id}", 200)
        
        # Delete created services
        for service_id in self.created_services:
            self.run_test(f"Delete Test Service", "DELETE", f"services/{service_id}", 200)

    def run_all_tests(self):
        """Run all API tests"""
        print("🚀 Starting Royal Koltuk Yıkama API Tests")
        print(f"Base URL: {self.base_url}")
        print("="*60)
        
        try:
            # Test all endpoints
            self.test_services()
            self.test_appointments()
            self.test_transactions()
            self.test_dashboard_stats()
            self.test_settings()
            self.test_customer_history()
            
            # Cleanup
            self.cleanup()
            
        except Exception as e:
            print(f"\n❌ Test suite failed with error: {str(e)}")
        
        # Print final results
        print("\n" + "="*60)
        print("📊 TEST RESULTS")
        print("="*60)
        print(f"Tests run: {self.tests_run}")
        print(f"Tests passed: {self.tests_passed}")
        print(f"Tests failed: {self.tests_run - self.tests_passed}")
        print(f"Success rate: {(self.tests_passed/self.tests_run*100):.1f}%" if self.tests_run > 0 else "0%")
        
        return self.tests_passed == self.tests_run

def main():
    tester = RoyalKoltukAPITester()
    success = tester.run_all_tests()
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())