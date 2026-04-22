import os
import json
import django
from django.test import Client

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'lms_backend.settings')
os.environ['DEBUG'] = 'False'
django.setup()

from django.contrib.auth import get_user_model
from lms.models import Course, TeacherCourseAssignment

User = get_user_model()
teacher = User.objects.filter(is_teacher=True).first()

if not teacher:
    print("No teacher available to test.")
    exit(1)

assignment = TeacherCourseAssignment.objects.filter(teacher=teacher).first()
if not assignment:
    course = Course.objects.first()
    TeacherCourseAssignment.objects.create(teacher=teacher, course=course)
    assignment = TeacherCourseAssignment.objects.filter(teacher=teacher).first()

course = assignment.course

payload = {
    "course": str(course.id),
    "mission": "aghabansns?",
    "challenge_type": "mission",
    "reward_xp": 0,
    "deadline": "2026-08-03T23:59:59Z",
    "allow_text": True,
    "allow_audio": False,
    "allow_file": False,
    "quiz_questions": []
}

client = Client(HTTP_HOST='localhost')
client.force_login(teacher)

response = client.post(
    '/api/lms/teacher/daily-challenges/create/', 
    data=json.dumps(payload), 
    content_type='application/json'
)

print(f"Status: {response.status_code}")
if response.status_code >= 400:
    print(f"Content: {response.content.decode('utf-8')[:500]}")
