import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'lms_backend.settings')
django.setup()

from lms.models import Course, TeacherCourseAssignment
from accounts.models import User

def setup_teacher_panels():
    # 1. Ensure courses exist
    course_data = [
        {"name": "Python for Beginners", "teacher_uname": "Vakpython"},
        {"name": "Spoken English Masterclass", "teacher_uname": "Vakspoken"},
        {"name": "Computer Science & Engineering", "teacher_uname": "Vakcse"}
    ]
    
    for item in course_data:
        course, _ = Course.objects.get_or_create(
            course_name=item["name"],
            defaults={"course_description": f"Master {item['name']} with expert guidance.", "duration": "3 Months"}
        )
        
        teacher = User.objects.filter(username=item["teacher_uname"]).first()
        if teacher:
            teacher.is_teacher = True
            teacher.save()
            
            assignment, created = TeacherCourseAssignment.objects.get_or_create(
                teacher=teacher,
                course=course
            )
            print(f"Teacher '{teacher.username}' linked to '{course.course_name}' ({'Created' if created else 'Already Assigned'}).")
        else:
            print(f"Teacher '{item['teacher_uname']}' not found. Please run seed_teachers.py first.")

if __name__ == "__main__":
    setup_teacher_panels()
