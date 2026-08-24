"""
Locust load test script for InvIQ backend.
Targets the 6 primary critical endpoints:
1. GET /api/inventory/items (Medicine catalog lookup)
2. GET /api/analytics/dashboard/stats (Real-time dashboard metrics)
3. GET /api/analytics/alerts?severity=CRITICAL (Critical stock alerts)
4. GET /api/inventory/locations (Branch & warehouse locations)
5. POST /api/inventory/scan-dispense (Barcode scan and stock reduction)
6. GET /api/admin/overview (Administrator overview)
"""

from locust import HttpUser, task, between
import os


class PharmacyUser(HttpUser):
    wait_time = between(0.1, 0.5)

    def on_start(self):
        # Authenticate and obtain JWT bearer token
        resp = self.client.post(
            "/api/auth/login",
            json={
                "email": "admin@inviq.local",
                "password": "admin123",
            },
        )
        if resp.status_code == 200:
            token = resp.json().get("access_token")
            self.client.headers.update({"Authorization": f"Bearer {token}"})

    @task(3)
    def get_inventory_items(self):
        self.client.get("/api/inventory/items", name="1_GET /api/inventory/items")

    @task(3)
    def get_dashboard_stats(self):
        self.client.get("/api/analytics/dashboard/stats", name="2_GET /api/analytics/dashboard/stats")

    @task(3)
    def get_critical_alerts(self):
        self.client.get("/api/analytics/alerts?severity=CRITICAL", name="3_GET /api/analytics/alerts")

    @task(2)
    def get_locations(self):
        self.client.get("/api/inventory/locations", name="4_GET /api/inventory/locations")

    @task(2)
    def scan_dispense_item(self):
        self.client.post(
            "/api/inventory/scan-dispense",
            json={
                "barcode": "8901234567890",
                "location_id": 1,
                "quantity": 1,
                "dispensed_by": "locust_virtual_user",
            },
            name="5_POST /api/inventory/scan-dispense",
        )

    @task(1)
    def get_admin_overview(self):
        self.client.get("/api/admin/overview", name="6_GET /api/admin/overview")
