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

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['username']