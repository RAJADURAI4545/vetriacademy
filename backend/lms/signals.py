from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from django.core.cache import cache
from .models import Course

@receiver(post_save, sender=Course)
@receiver(post_delete, sender=Course)
def clear_course_cache(sender, instance, **kwargs):
    """
    Clear the entire cache when a course is created, updated, or deleted.
    This ensures the 'Explore Course Catalog' (which is cached for 5 mins) 
    updates immediately.
    """
    cache.clear()
    print(f"Cache cleared due to change in Course: {instance.course_name}")
