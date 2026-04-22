import requests
import json

base_url = "http://localhost:8000"
login_payload = {"email": "Vakcse@gmail.com", "password": "password"} # I assume the password is 'password' or similar from context

session = requests.Session()
login_resp = session.post(f"{base_url}/api/accounts/login/", json=login_payload)

if login_resp.status_code == 200:
    token = login_resp.json()['access']
    headers = {"Authorization": f"Bearer {token}"}
    students_resp = session.get(f"{base_url}/api/lms/teacher/students/?course_id=all", headers=headers)
    print(f"Students Status: {students_resp.status_code}")
    print(f"Students Data: {json.dumps(students_resp.json(), indent=2)}")
else:
    print(f"Login failed: {login_resp.status_code}")
    print(login_resp.text)
