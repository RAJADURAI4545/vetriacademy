import os
import django
from django.utils import timezone
from datetime import timedelta

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'lms_backend.settings')
django.setup()

from lms.models import Competition, MemorySet, MemoryQuestion, Badge

def seed_memory_games():
    # 1. Color Patterns
    c_colors, _ = Competition.objects.get_or_create(
        title="Color Sequence Challenge",
        defaults={
            "description": "Memorize the sequence of colors and recall them correctly.",
            "category": "internal",
            "mode_type": "memory",
            "time_limit": 5,
            "start_date": timezone.now(),
            "end_date": timezone.now() + timedelta(days=60),
            "reward_xp": 250
        }
    )
    if _:
        mset = MemorySet.objects.create(competition=c_colors, words_list=["Crimson", "Azure", "Emerald", "Gold", "Violet", "Amber"])
        MemoryQuestion.objects.create(memory_set=mset, question="What was the third color in the list?", option_a="Crimson", option_b="Azure", option_c="Emerald", option_d="Gold", correct_option="C")
        MemoryQuestion.objects.create(memory_set=mset, question="Which color was NOT in the list?", option_a="Violet", option_b="Amber", option_c="Silver", option_d="Gold", correct_option="C")
        MemoryQuestion.objects.create(memory_set=mset, question="What was the first color?", option_a="Azure", option_b="Crimson", option_c="Emerald", option_d="Violet", correct_option="B")

    # 2. Tech Giants
    c_tech, _ = Competition.objects.get_or_create(
        title="Tech Titan Memory",
        defaults={
            "description": "Remember these famous technology companies.",
            "category": "internal",
            "mode_type": "memory",
            "time_limit": 5,
            "start_date": timezone.now(),
            "end_date": timezone.now() + timedelta(days=60),
            "reward_xp": 200
        }
    )
    if _:
        mset = MemorySet.objects.create(competition=c_tech, words_list=["Google", "Apple", "Nvidia", "Microsoft", "Tesla", "Meta"])
        MemoryQuestion.objects.create(memory_set=mset, question="Which GPU manufacturer was mentioned?", option_a="Intel", option_b="AMD", option_c="Nvidia", option_d="ARM", correct_option="C")
        MemoryQuestion.objects.create(memory_set=mset, question="Who makes the iPhone in the list?", option_a="Google", option_b="Apple", option_c="Tesla", option_d="Meta", correct_option="B")

    # 3. Planet Master
    c_planets, _ = Competition.objects.get_or_create(
        title="Galactic Memory Test",
        defaults={
            "description": "Test your knowledge of the solar system's order.",
            "category": "internal",
            "mode_type": "memory",
            "time_limit": 8,
            "start_date": timezone.now(),
            "end_date": timezone.now() + timedelta(days=60),
            "reward_xp": 350
        }
    )
    if _:
        mset = MemorySet.objects.create(competition=c_planets, words_list=["Mercury", "Venus", "Earth", "Mars", "Jupiter", "Saturn", "Uranus", "Neptune"])
        MemoryQuestion.objects.create(memory_set=mset, question="Which planet comes after Earth in the list?", option_a="Venus", option_b="Mars", option_c="Jupiter", option_d="Saturn", correct_option="B")
        MemoryQuestion.objects.create(memory_set=mset, question="How many planets were in the list?", option_a="6", option_b="7", option_c="8", option_d="9", correct_option="C")
        MemoryQuestion.objects.create(memory_set=mset, question="Which is the largest planet mentioned?", option_a="Earth", option_b="Mars", option_c="Jupiter", option_d="Saturn", correct_option="C")

    # 4. Programming Languages
    c_prog, _ = Competition.objects.get_or_create(
        title="Coder's Recall",
        defaults={
            "description": "Can you remember these 5 languages in order?",
            "category": "internal",
            "mode_type": "memory",
            "time_limit": 5,
            "start_date": timezone.now(),
            "end_date": timezone.now() + timedelta(days=60),
            "reward_xp": 150
        }
    )
    if _:
        mset = MemorySet.objects.create(competition=c_prog, words_list=["Python", "JavaScript", "Rust", "Go", "TypeScript"])
        MemoryQuestion.objects.create(memory_set=mset, question="Which language was first?", option_a="Python", option_b="Rust", option_c="Go", option_d="JavaScript", correct_option="A")
        MemoryQuestion.objects.create(memory_set=mset, question="Which language was between Go and Rust?", option_a="Python", option_b="TypeScript", option_c="JavaScript", option_d="None of these", correct_option="D")

    print("Memory games seeded successfully!")

if __name__ == "__main__":
    seed_memory_games()
