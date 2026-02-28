from django.db import models
from django.conf import settings

class Course(models.Model):
    course_name = models.CharField(max_length=255)
    course_description = models.TextField()
    duration = models.CharField(max_length=100)
    course_image = models.ImageField(upload_to='courses/', blank=True, null=True)
    total_classes_completed = models.IntegerField(default=0, help_text="Number of classes completed for this course so far")
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.course_name

    @property
    def total_students(self):
        return self.enrollments.count()

    @property
    def average_attendance(self):
        try:
            from django.db.models import Avg
            enrollments = self.enrollments.all()
            if not enrollments.exists():
                return 0
            total_pct = 0
            count = 0
            for enr in enrollments:
                if hasattr(enr, 'attendance') and enr.attendance:
                    total_pct += enr.attendance.attendance_percentage
                    count += 1
            return total_pct / count if count > 0 else 0
        except:
            return 0

class Enrollment(models.Model):
    student = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='enrollments')
    course = models.ForeignKey(Course, on_delete=models.CASCADE, related_name='enrollments')
    enrollment_date = models.DateTimeField(auto_now_add=True)
    manual_progress = models.IntegerField(default=0, help_text="Manually entered progress percentage (0-100)")

    def save(self, *args, **kwargs):
        is_new = self.pk is None
        super().save(*args, **kwargs)
        if is_new:
            Attendance.objects.get_or_create(enrollment=self)
            Grade.objects.get_or_create(enrollment=self)

    def __str__(self):
        return f"{self.student.email} enrolled in {self.course.course_name}"

class Grade(models.Model):
    enrollment = models.OneToOneField(Enrollment, on_delete=models.CASCADE, related_name='grade')
    grade = models.CharField(max_length=10, blank=True, null=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Grade for {self.enrollment}: {self.grade}"

class Attendance(models.Model):
    enrollment = models.OneToOneField(Enrollment, on_delete=models.CASCADE, related_name='attendance')
    
    @property
    def last_log_date(self):
        last_log = DailyAttendanceLog.objects.filter(student=self.enrollment.student).order_by('-date').first()
        return last_log.date if last_log else None

    @property
    def total_classes(self):
        # Full day attendance logs for this student
        return DailyAttendanceLog.objects.filter(student=self.enrollment.student).count()

    @property
    def attended_classes(self):
        return DailyAttendanceLog.objects.filter(student=self.enrollment.student, status='present').count()

    @property
    def attendance_percentage(self):
        total = self.total_classes
        if total == 0:
            return 0
        return (self.attended_classes / total) * 100

    def __str__(self):
        return f"Attendance Summary for {self.enrollment}: {self.attended_classes}/{self.total_classes}"

class DailyAttendanceLog(models.Model):
    student = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='daily_attendance_logs')
    date = models.DateField()
    status = models.CharField(max_length=10, choices=[('present', 'Present'), ('absent', 'Absent')], default='present')

    class Meta:
        unique_together = ('student', 'date')
        ordering = ['-date']

    def __str__(self):
        return f"{self.student.username} - {self.date}: {self.status}"

# Keep for legacy if needed, or remove later
class AttendanceLog(models.Model):
    enrollment = models.ForeignKey(Enrollment, on_delete=models.CASCADE, related_name='attendance_logs')
    date = models.DateField()
    status = models.CharField(max_length=10, choices=[('present', 'Present'), ('absent', 'Absent')], default='present')

    class Meta:
        unique_together = ('enrollment', 'date')
        ordering = ['-date']

    def __str__(self):
        return f"{self.enrollment.student.username} - {self.enrollment.course.course_name} - {self.date}: {self.status}"

class Badge(models.Model):
    name = models.CharField(max_length=100)
    description = models.TextField()
    icon = models.CharField(max_length=50, blank=True, null=True)
    points_required = models.IntegerField(default=0)

    def __str__(self):
        return self.name

class UserBadge(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='badges')
    badge = models.ForeignKey(Badge, on_delete=models.CASCADE)
    earned_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('user', 'badge')

    def __str__(self):
        return f"{self.user.username} earned {self.badge.name}"

class Competition(models.Model):
    CATEGORY_CHOICES = [
        ('internal', 'Internal Contest'),
        ('external', 'External Opportunity'),
    ]
    MODE_CHOICES = [
        ('quiz', 'Quiz Mode'),
        ('coding', 'Coding Mode'),
        ('english', 'English Mode'),
        ('memory', 'Memory Mode'),
    ]
    title = models.CharField(max_length=255)
    description = models.TextField()
    category = models.CharField(max_length=20, choices=CATEGORY_CHOICES, default='internal')
    mode_type = models.CharField(max_length=20, choices=MODE_CHOICES, default='quiz')
    external_link = models.URLField(max_length=500, blank=True, null=True)
    time_limit = models.IntegerField(default=15, help_text="Time limit in minutes")
    start_date = models.DateTimeField()
    end_date = models.DateTimeField()
    reward_xp = models.IntegerField(default=0)
    reward_badge = models.ForeignKey(Badge, on_delete=models.SET_NULL, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.title

class CompetitionParticipant(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='competitions')
    competition = models.ForeignKey(Competition, on_delete=models.CASCADE, related_name='participants')
    score = models.IntegerField(default=0)
    correct_answers = models.IntegerField(default=0)
    total_questions = models.IntegerField(default=0)
    joined_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('user', 'competition')

    def __str__(self):
        return f"{self.user.username} in {self.competition.title}"

class QuizQuestion(models.Model):
    competition = models.ForeignKey(Competition, on_delete=models.CASCADE, related_name='quiz_questions')
    question_text = models.TextField()
    option_a = models.CharField(max_length=255)
    option_b = models.CharField(max_length=255)
    option_c = models.CharField(max_length=255)
    option_d = models.CharField(max_length=255)
    correct_option = models.CharField(max_length=1, choices=[('A', 'A'), ('B', 'B'), ('C', 'C'), ('D', 'D')])

    def __str__(self):
        return f"Quiz: {self.question_text[:50]}"

class CodingQuestion(models.Model):
    competition = models.ForeignKey(Competition, on_delete=models.CASCADE, related_name='coding_questions')
    problem_text = models.TextField()
    correct_answer = models.CharField(max_length=255)
    xp_value = models.IntegerField(default=10)

    def __str__(self):
        return f"Coding: {self.problem_text[:50]}"

class EnglishQuestion(models.Model):
    TYPE_CHOICES = [
        ('fill_blank', 'Fill in the Blanks'),
        ('rearrange', 'Rearrange Sentence'),
        ('match', 'Vocabulary Match'),
    ]
    competition = models.ForeignKey(Competition, on_delete=models.CASCADE, related_name='english_questions')
    question_type = models.CharField(max_length=20, choices=TYPE_CHOICES)
    question_text = models.TextField()
    correct_answer = models.TextField()
    options_json = models.JSONField(blank=True, null=True, help_text="Use for matching pairs or MCQ options")

    def __str__(self):
        return f"English ({self.question_type}): {self.question_text[:50]}"

class MemorySet(models.Model):
    competition = models.ForeignKey(Competition, on_delete=models.CASCADE, related_name='memory_sets')
    words_list = models.JSONField(help_text="List of words to remember")

    def __str__(self):
        return f"Memory Set for {self.competition.title}"

class MemoryQuestion(models.Model):
    memory_set = models.ForeignKey(MemorySet, on_delete=models.CASCADE, related_name='questions')
    question = models.TextField()
    option_a = models.CharField(max_length=255)
    option_b = models.CharField(max_length=255)
    option_c = models.CharField(max_length=255)
    option_d = models.CharField(max_length=255)
    correct_option = models.CharField(max_length=1, choices=[('A', 'A'), ('B', 'B'), ('C', 'C'), ('D', 'D')])

    def __str__(self):
        return f"Memory Q: {self.question[:50]}"

class CompetitionAttempt(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    competition = models.ForeignKey(Competition, on_delete=models.CASCADE)
    start_time = models.DateTimeField(auto_now_add=True)
    end_time = models.DateTimeField(null=True, blank=True)
    score = models.IntegerField(default=0)
    correct_answers = models.IntegerField(default=0)
    total_questions = models.IntegerField(default=0)
    is_completed = models.BooleanField(default=False)

    class Meta:
        unique_together = ('user', 'competition')

    def __str__(self):
        return f"{self.user.username} attempt at {self.competition.title}"

class TeacherCourseAssignment(models.Model):
    teacher = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='course_assignments', limit_choices_to={'is_teacher': True})
    course = models.ForeignKey(Course, on_delete=models.CASCADE, related_name='teacher_assignments')
    assigned_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('teacher', 'course')

    def __str__(self):
        return f"{self.teacher.username} assigned to {self.course.course_name}"

class DailyChallenge(models.Model):
    TYPE_CHOICES = [
        ('mission', 'Mission (Text/Audio/File)'),
        ('quiz', 'Quiz Contest'),
    ]
    course = models.ForeignKey(Course, on_delete=models.CASCADE, related_name='daily_challenges')
    mission = models.TextField()
    challenge_type = models.CharField(max_length=20, choices=TYPE_CHOICES, default='mission')
    deadline = models.DateTimeField()
    allow_audio = models.BooleanField(default=True)
    allow_text = models.BooleanField(default=True)
    allow_file = models.BooleanField(default=True)
    reward_xp = models.IntegerField(default=50)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.get_challenge_type_display()}: {self.mission[:50]}"

class DailyChallengeQuestion(models.Model):
    challenge = models.ForeignKey(DailyChallenge, on_delete=models.CASCADE, related_name='quiz_questions')
    question_text = models.TextField()
    option_a = models.CharField(max_length=255)
    option_b = models.CharField(max_length=255)
    option_c = models.CharField(max_length=255)
    option_d = models.CharField(max_length=255)
    correct_option = models.CharField(max_length=1, choices=[('A', 'A'), ('B', 'B'), ('C', 'C'), ('D', 'D')])

    def __str__(self):
        return f"Q: {self.question_text[:50]}"

class ChallengeSubmission(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Pending Review'),
        ('approved', 'Approved'),
        ('correction', 'Needs Improvement'),
    ]
    challenge = models.ForeignKey(DailyChallenge, on_delete=models.CASCADE, related_name='submissions')
    student = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='challenge_submissions')
    text_response = models.TextField(blank=True, null=True)
    audio_response = models.FileField(upload_to='submissions/audio/', blank=True, null=True)
    file_response = models.FileField(upload_to='submissions/files/', blank=True, null=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    feedback = models.TextField(blank=True, null=True)
    quiz_score = models.IntegerField(default=0, help_text="Number of correct answers if type is quiz")
    total_quiz_questions = models.IntegerField(default=0)
    submitted_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('challenge', 'student')

    def __str__(self):
        return f"{self.student.username} - {self.challenge}"
