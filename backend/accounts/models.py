from django.contrib.auth.models import AbstractUser
from django.db import models

class User(AbstractUser):
    email = models.EmailField(unique=True)
    profile_picture = models.ImageField(upload_to='profiles/', null=True, blank=True)
    xp = models.IntegerField(default=0)
    level = models.IntegerField(default=1)
    is_teacher = models.BooleanField(default=False)
    
    # New Fields
    full_name = models.CharField(max_length=255, blank=True)
    parent_name = models.CharField(max_length=255, blank=True)
    dob = models.DateField(null=True, blank=True)
    address = models.TextField(blank=True)
    school_name = models.CharField(max_length=255, blank=True)
    standard_grade = models.CharField(max_length=100, blank=True)

    def check_badges(self):
        from lms.models import Badge, UserBadge
        applicable_badges = Badge.objects.filter(points_required__lte=self.xp)
        for badge in applicable_badges:
            UserBadge.objects.get_or_create(user=self, badge=badge)

    def save(self, *args, **kwargs):
        is_xp_update = False
        if self.pk:
            orig = User.objects.get(pk=self.pk)
            if orig.xp != self.xp:
                is_xp_update = True
        
        super().save(*args, **kwargs)
        
        if is_xp_update or not self.pk:
            self.check_badges()

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['username']