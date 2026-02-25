from django.contrib import admin
from django.template.response import TemplateResponse
from django.urls import path
from django.http import HttpResponseRedirect
from django.contrib import messages
from django.utils.html import format_html
from datetime import date as dt_date
from .models import (
    Course, Enrollment, Grade, Attendance, AttendanceLog, Badge, UserBadge, 
    Competition, CompetitionParticipant, QuizQuestion, CodingQuestion, 
    EnglishQuestion, MemorySet, MemoryQuestion, CompetitionAttempt, 
    TeacherCourseAssignment, DailyChallenge, DailyChallengeQuestion, ChallengeSubmission
)

@admin.register(Course)
class CourseAdmin(admin.ModelAdmin):
    list_display = ('course_name', 'duration', 'total_classes_completed', 'get_student_count', 'get_avg_attendance', 'created_at')
    fields = ('course_name', 'course_description', 'duration', 'course_image', 'total_classes_completed')
    search_fields = ('course_name',)
    
    @admin.display(description='Students')
    def get_student_count(self, obj):
        return obj.total_students

    @admin.display(description='Avg Attendance')
    def get_avg_attendance(self, obj):
        return f"{obj.average_attendance:.1f}%"

class GradeInline(admin.StackedInline):
    model = Grade
    extra = 1

class AttendanceInline(admin.StackedInline):
    model = Attendance
    extra = 1

@admin.register(Enrollment)
class EnrollmentAdmin(admin.ModelAdmin):
    list_display = ('student', 'course', 'get_grade', 'get_attendance', 'enrollment_date')
    list_filter = ('course', 'enrollment_date')
    search_fields = ('student__email', 'student__username', 'course__course_name')
    inlines = [GradeInline, AttendanceInline]

    @admin.display(description='Grade')
    def get_grade(self, obj):
        return obj.grade.grade if hasattr(obj, 'grade') else "N/A"

    @admin.display(description='Attendance')
    def get_attendance(self, obj):
        if hasattr(obj, 'attendance'):
            return f"{obj.attendance.attendance_percentage:.1f}% ({obj.attendance.attended_classes}/{obj.attendance.total_classes})"
        return "N/A"

@admin.register(Grade)
class GradeAdmin(admin.ModelAdmin):
    list_display = ('get_student', 'get_course', 'grade', 'updated_at')
    list_editable = ('grade',)
    list_filter = ('grade', 'enrollment__course')
    search_fields = ('enrollment__student__username', 'enrollment__student__email', 'enrollment__course__course_name')

    @admin.display(description='Student')
    def get_student(self, obj):
        return obj.enrollment.student
    
    @admin.display(description='Course')
    def get_course(self, obj):
        return obj.enrollment.course

@admin.register(Attendance)
class AttendanceAdmin(admin.ModelAdmin):
    list_display = ('get_student', 'get_course', 'get_attended', 'get_total', 'get_percent', 'get_last_log')
    list_filter = ('enrollment__course',)
    search_fields = ('enrollment__student__username', 'enrollment__student__email', 'enrollment__course__course_name')

    @admin.display(description='Student')
    def get_student(self, obj):
        return obj.enrollment.student

    @admin.display(description='Course')
    def get_course(self, obj):
        return obj.enrollment.course

    @admin.display(description='Attended')
    def get_attended(self, obj):
        return obj.attended_classes

    @admin.display(description='Total')
    def get_total(self, obj):
        return obj.total_classes

    @admin.display(description='%')
    def get_percent(self, obj):
        return f"{obj.attendance_percentage:.1f}%"

    @admin.display(description='Last Log')
    def get_last_log(self, obj):
        return obj.last_log_date or "No Logs"

@admin.register(AttendanceLog)
class AttendanceLogAdmin(admin.ModelAdmin):
    list_display = ('get_student', 'get_course', 'date', 'get_day', 'colored_status', 'status')
    list_editable   = ('status',)  # inline dropdown edit in the list
    list_filter     = ('enrollment__course', 'status', 'date')
    search_fields   = ('enrollment__student__username', 'enrollment__student__email', 'enrollment__course__course_name')
    autocomplete_fields = ['enrollment']
    date_hierarchy  = 'date'
    ordering        = ['-date']
    save_as         = True
    actions         = ['mark_all_present', 'mark_all_absent']

    # ── column helpers ──────────────────────────────────────────────────────
    @admin.display(description='Student')
    def get_student(self, obj):
        return obj.enrollment.student.username

    @admin.display(description='Course')
    def get_course(self, obj):
        return obj.enrollment.course.course_name

    @admin.display(description='Day')
    def get_day(self, obj):
        return obj.date.strftime('%A')

    @admin.display(description='Status')
    def colored_status(self, obj):
        color = '#16a34a' if obj.status == 'present' else '#dc2626'
        label = '● Present' if obj.status == 'present' else '● Absent'
        return format_html('<span style="color:{};font-weight:700;">{}</span>', color, label)

    # ── bulk actions ────────────────────────────────────────────────────────
    @admin.action(description='Mark selected → Present')
    def mark_all_present(self, request, queryset):
        updated = queryset.update(status='present')
        self.message_user(request, f'{updated} record(s) marked Present.', messages.SUCCESS)

    @admin.action(description='Mark selected → Absent')
    def mark_all_absent(self, request, queryset):
        updated = queryset.update(status='absent')
        self.message_user(request, f'{updated} record(s) marked Absent.', messages.SUCCESS)

    # ── custom URL: mark-class/ ─────────────────────────────────────────────
    def get_urls(self):
        custom = [
            path(
                'mark-class/',
                self.admin_site.admin_view(self.mark_class_view),
                name='lms_attendancelog_markclass',
            ),
        ]
        return custom + super().get_urls()

    # Inject button into the changelist context
    def changelist_view(self, request, extra_context=None):
        extra_context = extra_context or {}
        extra_context['mark_class_url'] = 'mark-class/'
        return super().changelist_view(request, extra_context=extra_context)

    def mark_class_view(self, request):
        """Classroom-style bulk attendance marking."""
        courses  = Course.objects.all().order_by('course_name')
        today    = dt_date.today().isoformat()

        # Read filter params (GET or POST)
        course_id    = request.POST.get('course_id') or request.GET.get('course_id', '')
        selected_date = request.POST.get('date')    or request.GET.get('date', today)

        enrollments   = []
        existing_logs = {}
        selected_course = None

        if course_id:
            selected_course = Course.objects.filter(pk=course_id).first()
            enrollments = list(
                Enrollment.objects
                .filter(course_id=course_id)
                .select_related('student', 'course')
                .order_by('student__username')
            )
            existing_logs = {
                str(log.enrollment_id): log.status
                for log in AttendanceLog.objects.filter(
                    enrollment__course_id=course_id,
                    date=selected_date,
                )
            }
            # Annotate each enrollment with its current status for the template
            for enr in enrollments:
                enr.current_status = existing_logs.get(str(enr.id), '')

        # Handle the bulk-save POST
        if request.method == 'POST' and course_id and 'save_attendance' in request.POST:
            saved = 0
            for enr in enrollments:
                status = request.POST.get(f'status_{enr.id}', 'absent')
                AttendanceLog.objects.update_or_create(
                    enrollment=enr,
                    date=selected_date,
                    defaults={'status': status},
                )
                saved += 1
            self.message_user(
                request,
                f'✅ Attendance saved for {saved} student(s) in "{selected_course}" on {selected_date}.',
                messages.SUCCESS,
            )
            # Stay on the same course+date so admin can verify
            return HttpResponseRedirect(f'?course_id={course_id}&date={selected_date}')

        context = {
            **self.admin_site.each_context(request),
            'title':            'Mark Class Attendance',
            'opts':             self.model._meta,
            'courses':          courses,
            'enrollments':      enrollments,
            'existing_logs':    existing_logs,
            'selected_course':  selected_course,
            'selected_course_id': int(course_id) if course_id else None,
            'selected_date':    selected_date,
            'today':            today,
        }
        return TemplateResponse(request, 'admin/lms/mark_class_attendance.html', context)

@admin.register(Badge)
class BadgeAdmin(admin.ModelAdmin):
    list_display = ('name', 'points_required')
    search_fields = ('name',)

@admin.register(UserBadge)
class UserBadgeAdmin(admin.ModelAdmin):
    list_display = ('user', 'badge', 'earned_at')
    list_filter = ('badge', 'earned_at')
    search_fields = ('user__username', 'badge__name')

class QuizQuestionInline(admin.TabularInline):
    model = QuizQuestion
    extra = 1

class CodingQuestionInline(admin.TabularInline):
    model = CodingQuestion
    extra = 1

class EnglishQuestionInline(admin.TabularInline):
    model = EnglishQuestion
    extra = 1

class MemorySetInline(admin.TabularInline):
    model = MemorySet
    extra = 1

@admin.register(Competition)
class CompetitionAdmin(admin.ModelAdmin):
    list_display = ('title', 'category', 'mode_type', 'start_date', 'end_date', 'reward_xp')
    list_filter = ('category', 'mode_type', 'start_date', 'end_date')
    search_fields = ('title',)
    inlines = [QuizQuestionInline, CodingQuestionInline, EnglishQuestionInline, MemorySetInline]

@admin.register(MemorySet)
class MemorySetAdmin(admin.ModelAdmin):
    list_display = ('competition',)
    inlines = [admin.TabularInline]
    
    class MemoryQuestionInline(admin.TabularInline):
        model = MemoryQuestion
        extra = 1
    
    inlines = [MemoryQuestionInline]

@admin.register(CompetitionAttempt)
class CompetitionAttemptAdmin(admin.ModelAdmin):
    list_display = ('user', 'competition', 'score', 'is_completed', 'start_time')
    list_filter = ('is_completed', 'competition')
    search_fields = ('user__username', 'competition__title')

@admin.register(CompetitionParticipant)
class CompetitionParticipantAdmin(admin.ModelAdmin):
    list_display = ('user', 'competition', 'score', 'joined_at')
    list_filter = ('competition', 'joined_at')
    search_fields = ('user__username', 'competition__title')

@admin.register(TeacherCourseAssignment)
class TeacherCourseAssignmentAdmin(admin.ModelAdmin):
    list_display = ('teacher', 'course', 'assigned_at')
    list_filter = ('teacher', 'course')
    search_fields = ('teacher__username', 'teacher__email', 'course__course_name')
    autocomplete_fields = ['teacher', 'course']

class DailyChallengeQuestionInline(admin.TabularInline):
    model = DailyChallengeQuestion
    extra = 1

@admin.register(DailyChallenge)
class DailyChallengeAdmin(admin.ModelAdmin):
    list_display = ('mission', 'course', 'challenge_type', 'deadline', 'reward_xp', 'created_at')
    list_filter = ('course', 'challenge_type', 'deadline')
    search_fields = ('mission', 'course__course_name')
    inlines = [DailyChallengeQuestionInline]

@admin.register(ChallengeSubmission)
class ChallengeSubmissionAdmin(admin.ModelAdmin):
    list_display = ('student', 'challenge', 'status', 'quiz_score', 'total_quiz_questions', 'submitted_at')
    list_filter = ('status', 'challenge__challenge_type', 'challenge__course')
    search_fields = ('student__username', 'challenge__mission')
    readonly_fields = ('submitted_at',)
    
    def save_model(self, request, obj, form, change):
        # Auto-award XP if manually approved in admin
        if change and 'status' in form.changed_data and obj.status == 'approved':
            # Check if he was not already approved (to avoid double XP)
            # Actually, standard logic in views handles this, but here let's be safe
            student = obj.student
            student.xp += obj.challenge.reward_xp
            student.level = (student.xp // 1000) + 1
            student.save()
        super().save_model(request, obj, form, change)
