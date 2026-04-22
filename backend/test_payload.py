import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'lms_backend.settings')
django.setup()

from lms.models import Course, DailyChallenge
from lms.serializers import DailyChallengeSerializer
from django.contrib.auth import get_user_model
from rest_framework.test import APIRequestFactory, force_authenticate
from lms.views import DailyChallengeCreateView

User = get_user_model()
teacher = User.objects.filter(is_teacher=True).first()

if not teacher:
    print("No teacher found.")
    exit(1)

# Ensure the teacher is assigned to at least one course
from lms.models import TeacherCourseAssignment
assignment = TeacherCourseAssignment.objects.filter(teacher=teacher).first()

if not assignment:
    print("Teacher is not assigned to any course.")
    course = Course.objects.first()
    TeacherCourseAssignment.objects.create(teacher=teacher, course=course)
    assignment = TeacherCourseAssignment.objects.filter(teacher=teacher).first()

course = assignment.course

data = {
    "course": course.id,
    "mission": "aghabansns?",
    "challenge_type": "mission",
    "reward_xp": 0,
    "deadline": "2026-08-03T23:59:59Z",
    "allow_text": True,
    "allow_audio": False,
    "allow_file": False,
    "quiz_questions": []
}

factory = APIRequestFactory()
request = factory.post('/api/lms/teacher/daily-challenges/create/', data, format='json')
force_authenticate(request, user=teacher)

view = DailyChallengeCreateView.as_view()

try:
    response = view(request)
    print("Status code:", response.status_code)
    print("Response data:", response.data)
except Exception as e:
    import traceback
    traceback.print_exc()
