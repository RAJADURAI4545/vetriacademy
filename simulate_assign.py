import os
import django
import sys

# Add the project path to sys.path
project_path = r'c:\Users\rajad\Desktop\victorys_way-2026(vetri acadamy)\backend'
sys.path.append(project_path)

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'lms_backend.settings')
django.setup()

from lms.serializers import DailyChallengeSerializer
from lms.models import Course, TeacherCourseAssignment
from django.contrib.auth import get_user_model

User = get_user_model()

def simulate_creation():
    course = Course.objects.first()
    teacher = User.objects.filter(is_teacher=True).first()
    
    if not course or not teacher:
        print("Required data missing.")
        return

    # Ensure assignment exists
    TeacherCourseAssignment.objects.get_or_create(teacher=teacher, course=course)

    data = {
        "course": course.id,
        "mission": "test mission local",
        "challenge_type": "mission",
        "reward_xp": 100,
        "deadline": "2026-03-08T23:59:59Z",
        "allow_text": True,
        "allow_audio": False,
        "allow_file": False,
        "quiz_questions": []
    }

    serializer = DailyChallengeSerializer(data=data)
    if serializer.is_valid():
        print("Serializer is valid")
        try:
            # Simulate what views.py perform_create does
            course_id = int(data['course'])
            if not TeacherCourseAssignment.objects.filter(teacher=teacher, course_id=course_id).exists():
                print("Permission Denied simulation")
            else:
                instance = serializer.save()
                print("Successfully created challenge ID:", instance.id)
        except Exception as e:
            print("Error during save:", str(e))
            import traceback
            traceback.print_exc()
    else:
        print("Serializer errors:", serializer.errors)

if __name__ == "__main__":
    simulate_creation()
