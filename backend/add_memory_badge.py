import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'lms_backend.settings')
django.setup()

from lms.models import Badge, Competition

def add_memory_badge():
    badge, _ = Badge.objects.get_or_create(
        name="Memory Master",
        defaults={
            "description": "Achieved a perfect score in a memory challenge.",
            "points_required": 1000,
            "icon": "🧠"
        }
    )
    
    # Update the memory competitions to reward this badge
    Competition.objects.filter(mode_type='memory').update(reward_badge=badge)
    
    print("Memory Master badge added and linked to memory competitions.")

if __name__ == "__main__":
    add_memory_badge()
