"""
Locust load test for Vetri Academy API.
Simulates 100 concurrent users performing realistic actions.

Usage:
    pip install locust
    locust -f locustfile.py --host=http://127.0.0.1:8000

Then open http://localhost:8089 in your browser to start the test.
"""

from locust import HttpUser, task, between, events
import json
import random


class VetriAcademyUser(HttpUser):
    """Simulates a typical student user."""
    
    # Wait 1-3 seconds between tasks (realistic browsing behavior)
    wait_time = between(1, 3)
    
    # Store auth token
    token = None
    
    def on_start(self):
        """Login and get JWT token at the start of each user session."""
        # Try to register first, then login
        username = f"loadtest_user_{random.randint(1, 100000)}"
        email = f"{username}@test.com"
        password = "TestPass123!"
        
        # Register (may fail if user exists, that's OK)
        self.client.post("/api/accounts/register/", json={
            "email": email,
            "username": username,
            "password": password
        }, name="/api/accounts/register/")
        
        # Login
        response = self.client.post("/api/accounts/login/", json={
            "email": email,
            "password": password
        }, name="/api/accounts/login/")
        
        if response.status_code == 200:
            data = response.json()
            self.token = data.get("access")
        else:
            # Fallback: try with a known test account
            self.token = None
    
    @property
    def auth_headers(self):
        if self.token:
            return {"Authorization": f"Bearer {self.token}"}
        return {}
    
    # =========================================================================
    # HIGH-FREQUENCY TASKS (most common user actions)
    # =========================================================================
    
    @task(10)  # Weight: most frequent
    def view_dashboard(self):
        """Student dashboard - the heaviest endpoint."""
        self.client.get(
            "/api/lms/dashboard/",
            headers=self.auth_headers,
            name="/api/lms/dashboard/"
        )
    
    @task(8)
    def view_courses(self):
        """Course list - should be cached."""
        self.client.get(
            "/api/lms/courses/",
            name="/api/lms/courses/"
        )
    
    @task(5)
    def view_competitions(self):
        """Competition list - should be cached."""
        self.client.get(
            "/api/lms/competitions/",
            headers=self.auth_headers,
            name="/api/lms/competitions/"
        )
    
    @task(5)
    def view_gamification(self):
        """Gamification data - should be cached per user."""
        self.client.get(
            "/api/lms/gamification/",
            headers=self.auth_headers,
            name="/api/lms/gamification/"
        )
    
    @task(3)
    def view_daily_challenges(self):
        """Daily challenges list."""
        self.client.get(
            "/api/lms/daily-challenges/",
            headers=self.auth_headers,
            name="/api/lms/daily-challenges/"
        )
    
    @task(3)
    def view_attendance_logs(self):
        """View own attendance."""
        self.client.get(
            "/api/lms/attendance/logs/",
            headers=self.auth_headers,
            name="/api/lms/attendance/logs/"
        )
    
    @task(2)
    def view_profile(self):
        """User profile."""
        self.client.get(
            "/api/accounts/profile/",
            headers=self.auth_headers,
            name="/api/accounts/profile/"
        )
    
    # =========================================================================
    # LOW-FREQUENCY TASKS (occasional user actions)
    # =========================================================================
    
    @task(1)
    def health_check(self):
        """API health check."""
        self.client.get("/", name="/health")


class AdminUser(HttpUser):
    """Simulates an admin/teacher user (lower proportion)."""
    
    wait_time = between(2, 5)
    weight = 1  # 1 admin per 3 students
    token = None
    
    def on_start(self):
        """Login as admin."""
        response = self.client.post("/api/accounts/login/", json={
            "email": "rajaduraideepak45@gmail.com",
            "password": "admin123"
        }, name="/api/accounts/login/ [admin]")
        
        if response.status_code == 200:
            data = response.json()
            self.token = data.get("access")
    
    @property
    def auth_headers(self):
        if self.token:
            return {"Authorization": f"Bearer {self.token}"}
        return {}
    
    @task(5)
    def view_admin_dashboard(self):
        """Admin dashboard - heavier query."""
        self.client.get(
            "/api/lms/dashboard/",
            headers=self.auth_headers,
            name="/api/lms/dashboard/ [admin]"
        )
    
    @task(3)
    def view_all_students(self):
        """Staff: all students list."""
        self.client.get(
            "/api/lms/all-students/",
            headers=self.auth_headers,
            name="/api/lms/all-students/"
        )
    
    @task(2)
    def view_all_attendance(self):
        """Staff: all attendance logs."""
        self.client.get(
            "/api/lms/attendance/all-logs/",
            headers=self.auth_headers,
            name="/api/lms/attendance/all-logs/"
        )
