import requests
import json

url = "http://localhost:8000/api/accounts/login/"
payload = {"email": "Vakcse@gmail.com", "password": "wrongpassword"}
headers = {"Content-Type": "application/json"}

try:
    response = requests.post(url, data=json.dumps(payload), headers=headers)
    print(f"Status Code: {response.status_code}")
    print(f"Response Body: {response.text}")
except Exception as e:
    print(f"Error: {e}")
