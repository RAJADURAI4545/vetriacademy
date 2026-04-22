import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'lms_backend.settings')
django.setup()

from lms.models import Badge

def seed_badges():
    badges = [
        {
            "name": "Bronze Badge",
            "description": "Awarded for reaching 500 XP!",
            "icon": "🥉",
            "points_required": 500
        },
        {
            "name": "Silver Badge",
            "description": "Awarded for reaching 1000 XP!",
            "icon": "🥈",
            "points_required": 1000
        },
        {
            "name": "Gold Badge",
            "description": "Awarded for reaching 1500 XP!",
            "icon": "🥇",
            "points_required": 1500
        },
        {
            "name": "Platinum Badge",
            "description": "Awarded for reaching 2000 XP!",
            "icon": "💎",
            "points_required": 2000
        },
        {
            "name": "Diamond Badge",
            "description": "Awarded for reaching 2500 XP!",
            "icon": "💠",
            "points_required": 2500
        }
    ]

    for b in badges:
        obj, created = Badge.objects.get_or_create(
            name=b['name'],
            defaults={
                'description': b['description'],
                'icon': b['icon'],
                'points_required': b['points_required']
            }
        )
        if not created:
            obj.description = b['description']
            obj.icon = b['icon']
            obj.points_required = b['points_required']
            obj.save()
            print(f"Updated {b['name']}")
        else:
            print(f"Created {b['name']}")

if __name__ == '__main__':
    seed_badges()
