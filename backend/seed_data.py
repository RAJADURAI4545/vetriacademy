import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'lms_backend.settings')
django.setup()

from lms.models import Course

def seed_courses():
    courses = [
        {
            "course_name": "Full Stack Web Development",
            "course_description": "Master React, Node.js, and Django to build modern web applications.",
            "duration": "6 Months"
        },
        {
            "course_name": "Data Science & Machine Learning",
            "course_description": "Learn Python, SQL, and AI to derive insights from data.",
            "duration": "8 Months"
        },
        {
            "course_name": "UI/UX Design Masterclass",
            "course_description": "Design stunning user interfaces and experiences with Figma.",
            "duration": "3 Months"
        },
        {
            "course_name": "Cloud Computing (AWS/Azure)",
            "course_description": "Scale your applications globally using modern cloud platforms.",
            "duration": "4 Months"
        }
    ]

    for c in courses:
        Course.objects.get_or_create(
            course_name=c['course_name'],
            defaults={
                'course_description': c['course_description'],
                'duration': c['duration']
            }
        )
    print("Courses seeded successfully!")

if __name__ == '__main__':
    seed_courses()
