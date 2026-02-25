import os
import django
from django.utils import timezone
from datetime import timedelta
import random

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'lms_backend.settings')
django.setup()

from lms.models import Badge, Competition, CompetitionParticipant, QuizQuestion, CodingQuestion, EnglishQuestion, MemorySet, MemoryQuestion
from django.contrib.auth import get_user_model

User = get_user_model()

def seed_gamification():
    # Badges
    Badge.objects.update_or_create(
        name="Early Bird",
        defaults={"description": "Joined the academy in its early days.", "points_required": 0, "icon": "🌅"}
    )
    Badge.objects.update_or_create(
        name="Scholar",
        defaults={"description": "Enrolled in 3 or more courses.", "points_required": 300, "icon": "📚"}
    )
    Badge.objects.update_or_create(
        name="Top Performer",
        defaults={"description": "Achieved an A+ in any course.", "points_required": 500, "icon": "⭐"}
    )

    # 1. QUIZ MODE Competition
    c_quiz, _ = Competition.objects.get_or_create(
        title="Python Basics Quiz",
        defaults={
            "description": "10 minutes, 5 questions. Test your fundamental Python knowledge!",
            "category": "internal",
            "mode_type": "quiz",
            "time_limit": 10,
            "start_date": timezone.now(),
            "end_date": timezone.now() + timedelta(days=30),
            "reward_xp": 100
        }
    )
    if _:
        QuizQuestion.objects.create(competition=c_quiz, question_text="What is the result of 2 ** 3?", option_a="6", option_b="8", option_c="9", option_d="5", correct_option="B")
        QuizQuestion.objects.create(competition=c_quiz, question_text="Which keyword is used for functions?", option_a="fun", option_b="define", option_c="def", option_d="function", correct_option="C")

    # 2. CODING MODE Competition
    c_code, _ = Competition.objects.get_or_create(
        title="Logic & Math Challenge",
        defaults={
            "description": "Predict the output of small code snippets.",
            "category": "internal",
            "mode_type": "coding",
            "time_limit": 15,
            "start_date": timezone.now(),
            "end_date": timezone.now() + timedelta(days=30),
            "reward_xp": 200
        }
    )
    if _:
        CodingQuestion.objects.create(competition=c_code, problem_text="x = 5\ny = 10\nprint(x + y * 2)", correct_answer="25", xp_value=50)
        CodingQuestion.objects.create(competition=c_code, problem_text="L = [1, 2, 3]\nprint(len(L))", correct_answer="3", xp_value=50)

    # 3. ENGLISH MODE Competition
    c_eng, _ = Competition.objects.get_or_create(
        title="English Proficiency",
        defaults={
            "description": "Fill in the blanks and rearrange sentences.",
            "category": "internal",
            "mode_type": "english",
            "time_limit": 10,
            "start_date": timezone.now(),
            "end_date": timezone.now() + timedelta(days=30),
            "reward_xp": 150
        }
    )
    if _:
        EnglishQuestion.objects.create(competition=c_eng, question_type="fill_blank", question_text="He ___ (is/am/are) a good student.", correct_answer="is")
        EnglishQuestion.objects.create(competition=c_eng, question_type="rearrange", question_text="Rearrange: school / I / go / to", correct_answer="I go to school")

    # 4. MEMORY MODE Competition
    c_mem, _ = Competition.objects.get_or_create(
        title="Visual Memory Test",
        defaults={
            "description": "How many words can you remember in 10 seconds?",
            "category": "internal",
            "mode_type": "memory",
            "time_limit": 5,
            "start_date": timezone.now(),
            "end_date": timezone.now() + timedelta(days=30),
            "reward_xp": 300
        }
    )
    if _:
        mset = MemorySet.objects.create(competition=c_mem, words_list=["Eagle", "Mountain", "River", "Forest", "Sky"])
        MemoryQuestion.objects.create(memory_set=mset, question="Which bird was in the list?", option_a="Hawk", option_b="Sparrow", option_c="Eagle", option_d="Owl", correct_option="C")
        MemoryQuestion.objects.create(memory_set=mset, question="Which nature element was mentioned?", option_a="Desert", option_b="Mountain", option_c="Ocean", option_d="Cave", correct_option="B")

    print("Multi-mode competition data seeded successfully.")

if __name__ == "__main__":
    seed_gamification()
