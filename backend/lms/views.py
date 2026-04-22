from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.exceptions import ValidationError, PermissionDenied
from django.db import models
from django.db.models import Prefetch, Window, Count, F, Q, Sum
from django.views.decorators.cache import cache_page
from django.utils.decorators import method_decorator
from django.core.cache import cache
from .models import (
    Course, Enrollment, Grade, Attendance, DailyAttendanceLog, AttendanceLog, 
    Competition, CompetitionParticipant, Badge, UserBadge, QuizQuestion, 
    CodingQuestion, EnglishQuestion, MemorySet, MemoryQuestion, 
    CompetitionAttempt, TeacherCourseAssignment, DailyChallenge, ChallengeSubmission,
    DailyChallengeQuestion
)
from .serializers import (
    CourseSerializer, EnrollmentSerializer, EnrollCourseSerializer, DailyAttendanceLogSerializer, 
    CompetitionSerializer, CompetitionParticipantSerializer, BadgeSerializer, UserBadgeSerializer, 
    LeaderboardSerializer, QuizQuestionSerializer, CodingQuestionSerializer, EnglishQuestionSerializer, 
    MemorySetSerializer, CompetitionAttemptSerializer, TeacherCourseAssignmentSerializer, TeacherStudentSerializer,
    DailyChallengeSerializer, ChallengeSubmissionSerializer, DailyChallengeQuestionSerializer, CourseLeaderboardSerializer
)
from accounts.serializers import UserSerializer
import csv
from django.http import HttpResponse
from django.utils import timezone

@method_decorator(cache_page(60), name='dispatch')  # Cache course list for 1 min
class CourseListView(generics.ListAPIView):
    queryset = Course.objects.all()
    serializer_class = CourseSerializer
    permission_classes = [permissions.AllowAny]
    pagination_class = None  # Courses are few, no pagination needed

class EnrollCourseView(generics.CreateAPIView):
    serializer_class = EnrollCourseSerializer
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        if serializer.is_valid():
            course_id = serializer.validated_data.get('course_id')
            try:
                course = Course.objects.get(id=course_id)
            except Course.DoesNotExist:
                return Response({"detail": "Course not found."}, status=status.HTTP_404_NOT_FOUND)
            
            # Check if already enrolled
            if Enrollment.objects.filter(student=request.user, course=course).exists():
                return Response({"detail": "You are already enrolled in this course."}, status=status.HTTP_400_BAD_REQUEST)
            
            enrollment = Enrollment.objects.create(student=request.user, course=course)
            return Response({"detail": f"Successfully enrolled in {course.course_name}!"}, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

from django.db.models.functions import Rank

class StudentDashboardView(generics.GenericAPIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        
        if user.is_staff:
            enrollments = Enrollment.objects.all().select_related('student', 'course', 'grade', 'attendance').order_by('-enrollment_date')
        else:
            enrollments = Enrollment.objects.filter(student=user).select_related('course', 'grade', 'attendance')
        
        user_data = UserSerializer(user).data
        enrollments_data = EnrollmentSerializer(enrollments, many=True).data
        
        # Batch: total students per course AND ranks per course (single query each)
        course_counts = {
            c['course_id']: c['count'] 
            for c in Enrollment.objects.values('course_id').annotate(count=Count('id'))
        }

        # Batch-compute all ranks per course to avoid N+1 rank queries
        # Get all course IDs from the enrollments
        course_ids = set(d['course']['id'] for d in enrollments_data)
        # For each course, precompute grade -> rank mapping
        course_rank_maps = {}
        for cid in course_ids:
            # Get sorted distinct grades for this course
            graded_enrollments = (
                Enrollment.objects.filter(course_id=cid)
                .exclude(grade__grade__isnull=True)
                .exclude(grade__grade='')
                .values('id', 'grade__grade')
            )
            # Sort by grade and assign rank
            sorted_grades = sorted(graded_enrollments, key=lambda x: x['grade__grade'] or 'ZZZ')
            rank_map = {}
            for rank_idx, item in enumerate(sorted_grades, 1):
                rank_map[item['id']] = rank_idx
            course_rank_maps[cid] = rank_map

        for data in enrollments_data:
            course_id = data['course']['id']
            enrollment_id = data['id']
            
            data['course_total_students'] = course_counts.get(course_id, 0)
            
            rank_map = course_rank_maps.get(course_id, {})
            data['rank'] = rank_map.get(enrollment_id, "N/A")

        # Overall attendance: (Sum of all present logs) / (Sum of all logs)
        # This provides a combined metric across all enrolled courses
        all_logs_stats = DailyAttendanceLog.objects.filter(student=user).aggregate(
            total=Count('id'),
            present=Count('id', filter=Q(status='present')),
        )
        total_logs = all_logs_stats['total'] or 0
        present_logs = all_logs_stats['present'] or 0
        overall_attendance = (present_logs / total_logs * 100) if total_logs > 0 else 0

        # Tier thresholds
        tiers = [
            {"name": "Bronze", "xp": 500},
            {"name": "Silver", "xp": 1000},
            {"name": "Gold", "xp": 1500},
            {"name": "Platinum", "xp": 2000},
            {"name": "Diamond", "xp": 2500},
        ]
        
        next_tier_name = "Max Tier"
        xp_to_next_tier = 0
        progress_percentage = 100

        for i, tier in enumerate(tiers):
            if user.xp < tier["xp"]:
                next_tier_name = tier["name"]
                xp_to_next_tier = tier["xp"] - user.xp
                prev_tier_xp = tiers[i-1]["xp"] if i > 0 else 0
                progress_percentage = ((user.xp - prev_tier_xp) / (tier["xp"] - prev_tier_xp) * 100)
                break

        return Response({
            "is_staff": user.is_staff,
            "student": user_data,
            "enrollments": enrollments_data,
            "stats": {
                "overall_attendance": overall_attendance,
                "xp": user.xp,
                "level": user.level,
                "next_tier_name": next_tier_name,
                "xp_to_next_tier": xp_to_next_tier,
                "progress_percentage": progress_percentage
            },
            "recent_badges": UserBadgeSerializer(
                UserBadge.objects.filter(user=user).select_related('badge').order_by('-earned_at')[:5],
                many=True
            ).data
        })

class StaffStudentListView(generics.ListAPIView):
    serializer_class = EnrollmentSerializer
    permission_classes = [permissions.IsAdminUser]

    def get_queryset(self):
        queryset = Enrollment.objects.all().select_related('student', 'course', 'grade', 'attendance')
        course_id = self.request.query_params.get('course_id')
        if course_id:
            queryset = queryset.filter(course_id=course_id)
        return queryset

class ExportAttendanceView(generics.GenericAPIView):
    """Allows a student to download their OWN attendance log for a specific course."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, enrollment_id):
        try:
            # Strictly enforce that a student can only download their own enrollment records
            if request.user.is_staff or request.user.is_teacher:
                enrollment = Enrollment.objects.get(id=enrollment_id)
            else:
                enrollment = Enrollment.objects.get(id=enrollment_id, student=request.user)
        except Enrollment.DoesNotExist:
            return Response({"detail": "Enrollment not found or unauthorized."}, status=status.HTTP_404_NOT_FOUND)

        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = f'attachment; filename="Attendance_{enrollment.course.course_name}_{enrollment.student.username}.csv"'

        writer = csv.writer(response)
        writer.writerow(['Date', 'Day', 'Status'])

        # Course specific logs
        logs = AttendanceLog.objects.filter(enrollment=enrollment).order_by('date')
        for log in logs:
            writer.writerow([log.date, log.date.strftime('%A'), log.status.capitalize()])

        return response


class ExportUserDailyAttendanceView(generics.GenericAPIView):
    """Allows a student to download their FULL daily attendance history across all courses."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        logs = DailyAttendanceLog.objects.filter(student=user).order_by('date')

        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = f'attachment; filename="Full_Attendance_Report_{user.username}.csv"'

        writer = csv.writer(response)
        writer.writerow(['Date', 'Day', 'Status'])

        for log in logs:
            writer.writerow([log.date, log.date.strftime('%A'), log.status.capitalize()])

        return response


# Removed ExportCourseAttendanceView as per user request to disable bulk course downloads


class AttendanceLogListView(generics.GenericAPIView):
    """List all daily attendance logs for the current student or for a specific student (staff)."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, student_id=None):
        target_user = request.user
        if student_id and request.user.is_staff:
            from django.contrib.auth import get_user_model
            User = get_user_model()
            try:
                target_user = User.objects.get(id=student_id)
            except User.DoesNotExist:
                return Response({"detail": "User not found."}, status=status.HTTP_404_NOT_FOUND)

        logs = DailyAttendanceLog.objects.filter(student=target_user).order_by('-date')
        serializer = DailyAttendanceLogSerializer(logs, many=True)
        return Response(serializer.data)


class MarkAttendanceView(generics.GenericAPIView):
    """Staff-only: mark or update a student's full-day attendance."""
    permission_classes = [permissions.IsAdminUser]

    def post(self, request):
        student_id = request.data.get('student_id')
        course_id = request.data.get('course_id')
        date = request.data.get('date')
        status_val = request.data.get('status')

        if student_id is None or date is None or status_val is None:
            return Response({"detail": "student_id, date, and status are required."}, status=status.HTTP_400_BAD_REQUEST)

        from django.contrib.auth import get_user_model
        User = get_user_model()
        try:
            student = User.objects.get(id=student_id)
        except User.DoesNotExist:
            return Response({"detail": "Student not found."}, status=status.HTTP_404_NOT_FOUND)

        log, created = DailyAttendanceLog.objects.update_or_create(
            student=student,
            course_id=course_id,
            date=date,
            defaults={'status': status_val}
        )

        return Response({
            "detail": "Attendance marked.",
            "student_id": student_id,
            "course_id": course_id,
            "date": str(log.date),
            "status": log.status
        })

class StaffAllAttendanceLogsView(generics.ListAPIView):
    """Staff-only: View all daily attendance logs with filters."""
    serializer_class = DailyAttendanceLogSerializer
    permission_classes = [permissions.IsAdminUser]

    def get_queryset(self):
        queryset = DailyAttendanceLog.objects.all().select_related('student')
        course_id = self.request.query_params.get('course_id')
        student_id = self.request.query_params.get('student_id')
        date = self.request.query_params.get('date')

        if course_id:
            queryset = queryset.filter(course_id=course_id)
        if student_id:
            queryset = queryset.filter(student_id=student_id)
        if date:
            queryset = queryset.filter(date=date)
        
        return queryset

from django.db.models import Q

class CompetitionListView(generics.ListAPIView):
    serializer_class = CompetitionSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        queryset = Competition.objects.all().select_related('reward_badge', 'course')
        
        # Filter by enrollments for students
        if not user.is_staff and not getattr(user, 'is_teacher', False):
            enrolled_course_ids = user.enrollments.values_list('course_id', flat=True)
            queryset = queryset.filter(
                Q(course__isnull=True) | Q(course_id__in=enrolled_course_ids)
            )

        category = self.request.query_params.get('category')
        course_id = self.request.query_params.get('course_id')

        if category:
            queryset = queryset.filter(category=category)
        if course_id:
            queryset = queryset.filter(course_id=course_id)
            
        return queryset.order_by('-start_date')

@method_decorator(cache_page(60), name='dispatch')  # Cache leaderboard for 1 min
class CompetitionLeaderboardView(generics.ListAPIView):
    serializer_class = LeaderboardSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        competition_id = self.kwargs.get('competition_id')
        return CompetitionParticipant.objects.filter(competition_id=competition_id).select_related('user').order_by('-score')

class JoinCompetitionView(generics.GenericAPIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, competition_id):
        try:
            competition = Competition.objects.get(id=competition_id)
        except Competition.DoesNotExist:
            return Response({"detail": "Competition not found."}, status=status.HTTP_404_NOT_FOUND)
        
        participant, created = CompetitionParticipant.objects.get_or_create(
            user=request.user,
            competition=competition
        )
        if not created:
            return Response({"detail": "Already joined."}, status=status.HTTP_400_BAD_REQUEST)
        
        return Response({"detail": "Successfully joined competition."}, status=status.HTTP_201_CREATED)

class GamificationDataView(generics.GenericAPIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        
        # Use per-user cache key for gamification data
        cache_key = f'gamification_{user.id}'
        cached_data = cache.get(cache_key)
        if cached_data:
            return Response(cached_data)
        
        badges = UserBadge.objects.filter(user=user).select_related('badge').order_by('-earned_at')
        all_badges = Badge.objects.all()
        
        # Tier thresholds
        tiers = [
            {"name": "Bronze", "xp": 500},
            {"name": "Silver", "xp": 1000},
            {"name": "Gold", "xp": 1500},
            {"name": "Platinum", "xp": 2000},
            {"name": "Diamond", "xp": 2500},
        ]
        
        next_tier_name = "Max Tier"
        xp_to_next_tier = 0
        next_tier_xp = 0
        prev_tier_xp = 0

        for i, tier in enumerate(tiers):
            if user.xp < tier["xp"]:
                next_tier_name = tier["name"]
                xp_to_next_tier = tier["xp"] - user.xp
                next_tier_xp = tier["xp"]
                prev_tier_xp = tiers[i-1]["xp"] if i > 0 else 0
                break
        
        data = {
            "xp": user.xp,
            "level": user.level,
            "earned_badges": UserBadgeSerializer(badges, many=True).data,
            "all_badges": BadgeSerializer(all_badges, many=True).data,
            "next_tier_name": next_tier_name,
            "xp_to_next_tier": xp_to_next_tier,
            "next_tier_xp": next_tier_xp,
            "prev_tier_xp": prev_tier_xp,
            "progress_percentage": min(100, ((user.xp - prev_tier_xp) / (next_tier_xp - prev_tier_xp) * 100)) if next_tier_xp > prev_tier_xp else 100
        }
        cache.set(cache_key, data, 60)  # Cache for 1 min
        return Response(data)

class GetCompetitionQuestions(generics.GenericAPIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, competition_id):
        try:
            competition = Competition.objects.get(id=competition_id)
        except Competition.DoesNotExist:
            return Response({"detail": "Competition not found."}, status=status.HTTP_404_NOT_FOUND)

        # Check if already completed
        if CompetitionAttempt.objects.filter(user=request.user, competition=competition, is_completed=True).exists():
            return Response({"detail": "You have already completed this challenge."}, status=status.HTTP_400_BAD_REQUEST)

        data = {"mode_type": competition.mode_type, "time_limit": competition.time_limit}
        
        if competition.mode_type == 'quiz':
            questions = competition.quiz_questions.all()
            data["questions"] = QuizQuestionSerializer(questions, many=True).data
        elif competition.mode_type == 'coding':
            questions = competition.coding_questions.all()
            data["questions"] = CodingQuestionSerializer(questions, many=True).data
        elif competition.mode_type == 'english':
            questions = competition.english_questions.all()
            data["questions"] = EnglishQuestionSerializer(questions, many=True).data
        elif competition.mode_type == 'memory':
            mem_sets = competition.memory_sets.all()
            data["memory_sets"] = MemorySetSerializer(mem_sets, many=True).data

        return Response(data)

class StartCompetitionAttempt(generics.GenericAPIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, competition_id):
        try:
            competition = Competition.objects.get(id=competition_id)
        except Competition.DoesNotExist:
            return Response({"detail": "Competition not found."}, status=status.HTTP_404_NOT_FOUND)

        attempt, created = CompetitionAttempt.objects.get_or_create(
            user=request.user,
            competition=competition
        )
        if not created and attempt.is_completed:
            return Response({"detail": "Already completed."}, status=status.HTTP_400_BAD_REQUEST)
        
        return Response({"detail": "Attempt started.", "start_time": attempt.start_time})

class SubmitCompetitionAttempt(generics.GenericAPIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, competition_id):
        try:
            competition = Competition.objects.get(id=competition_id)
            attempt = CompetitionAttempt.objects.get(user=request.user, competition=competition)
        except (Competition.DoesNotExist, CompetitionAttempt.DoesNotExist):
            return Response({"detail": "Invalid attempt."}, status=status.HTTP_404_NOT_FOUND)

        if attempt.is_completed:
            return Response({"detail": "Already submitted."}, status=status.HTTP_400_BAD_REQUEST)


        # Validate time limit (allow 30s buffer)
        elapsed = timezone.now() - attempt.start_time
        if elapsed.total_seconds() > (competition.time_limit * 60 + 30):
            attempt.is_completed = True
            attempt.save()
            return Response({"detail": "Time limit exceeded."}, status=status.HTTP_400_BAD_REQUEST)

        answers = request.data.get('answers', {})
        total_xp = 0
        correct_count = 0
        total_questions = 0

        if competition.mode_type == 'quiz':
            questions = competition.quiz_questions.all()
            total_questions = questions.count()
            for q in questions:
                if str(answers.get(str(q.id))) == q.correct_option:
                    correct_count += 1
            
        elif competition.mode_type == 'coding':
            questions = competition.coding_questions.all()
            total_questions = questions.count()
            for q in questions:
                if str(answers.get(str(q.id))).strip() == q.correct_answer:
                    correct_count += 1

        elif competition.mode_type == 'english':
            questions = competition.english_questions.all()
            total_questions = questions.count()
            for q in questions:
                user_ans = str(answers.get(str(q.id))).strip().lower()
                actual_ans = q.correct_answer.strip().lower()
                if user_ans == actual_ans:
                    correct_count += 1

        elif competition.mode_type == 'memory':
            mem_sets = competition.memory_sets.all()
            for ms in mem_sets:
                for q in ms.questions.all():
                    total_questions += 1
                    if str(answers.get(str(q.id))) == q.correct_option:
                        correct_count += 1
            
        # Calculate Final XP based on predefined competition reward
        if total_questions > 0:
            # Base XP: proportional to correct answers
            score_ratio = correct_count / total_questions
            total_xp = int(score_ratio * competition.reward_xp)
            
            # Bonus: if perfect score, ensure they get at least the full reward_xp 
            # (or more if it's a very difficult one, but usually reward_xp is the ceiling)
            if correct_count == total_questions:
                total_xp = max(total_xp, competition.reward_xp)
        else:
            total_xp = 0

        # Reward XP and update attempt
        user = request.user
        user.xp += total_xp
        # Simple level up logic: 1000 XP per level
        user.level = (user.xp // 1000) + 1
        user.save()

        attempt.score = total_xp
        attempt.correct_answers = correct_count
        attempt.total_questions = total_questions
        attempt.is_completed = True
        attempt.end_time = timezone.now()
        attempt.save()

        # Update or create participant record for leaderboard
        participant, _ = CompetitionParticipant.objects.get_or_create(user=user, competition=competition)
        participant.score = total_xp
        participant.correct_answers = correct_count
        participant.total_questions = total_questions
        participant.save()

        # Award rewards
        badges_earned = []
        
        # 1. Competition-specific badge
        if competition.reward_badge:
            ub, created = UserBadge.objects.get_or_create(user=user, badge=competition.reward_badge)
            if created:
                badges_earned.append(BadgeSerializer(competition.reward_badge).data)
        
        # 2. XP-based badges
        xp_badges = Badge.objects.filter(points_required__lte=user.xp, points_required__gt=0)
        for b in xp_badges:
            ub, created = UserBadge.objects.get_or_create(user=user, badge=b)
            if created:
                badges_earned.append(BadgeSerializer(b).data)

        return Response({
            "detail": "Challenge submitted successfully!",
            "xp_earned": total_xp,
            "correct_answers": correct_count,
            "total_questions": total_questions,
            "new_total_xp": user.xp,
            "new_level": user.level,
            "badges_earned": badges_earned
        })

class IsTeacher(permissions.BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.is_teacher)

class TeacherDashboardView(generics.GenericAPIView):
    permission_classes = [IsTeacher]

    def get(self, request):
        teacher = request.user
        assignments = TeacherCourseAssignment.objects.filter(teacher=teacher).select_related('course')
        assigned_courses = TeacherCourseAssignmentSerializer(assignments, many=True).data
        
        # Use values_list instead of Python-side [a.course for a in assignments]
        assigned_course_ids = assignments.values_list('course_id', flat=True)
        total_students = Enrollment.objects.filter(course_id__in=assigned_course_ids).count()
        
        return Response({
            "teacher_name": teacher.username,
            "assigned_courses": assigned_courses,
            "total_students": total_students
        })

class TeacherStudentListView(generics.ListAPIView):
    serializer_class = TeacherStudentSerializer
    permission_classes = [IsTeacher]

    def get_queryset(self):
        teacher = self.request.user
        course_id = self.request.query_params.get('course_id')
        
        # Security: ensure teacher is assigned to this course
        if course_id and course_id != 'all':
            if not TeacherCourseAssignment.objects.filter(teacher=teacher, course_id=course_id).exists():
                return Enrollment.objects.none()
            return Enrollment.objects.filter(course_id=course_id).select_related('student', 'course', 'attendance', 'grade').prefetch_related('student__competitions', 'student__daily_attendance_logs')
        
        # If no course_id, return all students in all assigned courses
        assigned_course_ids = TeacherCourseAssignment.objects.filter(teacher=teacher).values_list('course_id', flat=True)
        return Enrollment.objects.filter(course_id__in=assigned_course_ids).select_related('student', 'course', 'attendance', 'grade').prefetch_related('student__competitions', 'student__daily_attendance_logs')

class TeacherMarkAttendanceView(generics.GenericAPIView):
    permission_classes = [IsTeacher]

    def post(self, request):
        teacher = request.user
        date = request.data.get('date')
        course_id = request.data.get('course_id')
        attendance_data = request.data.get('attendance', []) # list of {student_id, status}

        if date is None or course_id is None:
            return Response({"detail": "date and course_id are required."}, status=status.HTTP_400_BAD_REQUEST)

        saved_count = 0
        from django.contrib.auth import get_user_model
        User = get_user_model()

        for entry in attendance_data:
            student_id = entry.get('student_id')
            status_val = entry.get('status')
            
            if not student_id or status_val not in ('present', 'absent'):
                continue
                
            try:
                student = User.objects.get(id=student_id)
                DailyAttendanceLog.objects.update_or_create(
                    student=student,
                    course_id=course_id,
                    date=date,
                    defaults={'status': status_val}
                )
                saved_count += 1
            except User.DoesNotExist:
                continue

        return Response({"detail": f"Successfully marked attendance for {saved_count} students."}, status=status.HTTP_200_OK)

class TeacherUpdateProgressView(generics.GenericAPIView):
    permission_classes = [IsTeacher]

    def post(self, request):
        teacher = request.user
        enrollment_id = request.data.get('enrollment_id')
        progress = request.data.get('progress') # 0-100

        try:
            enrollment = Enrollment.objects.get(id=enrollment_id)
            # Security: ensure teacher is assigned to this course
            if not TeacherCourseAssignment.objects.filter(teacher=teacher, course=enrollment.course).exists():
                return Response({"detail": "Not authorized."}, status=status.HTTP_403_FORBIDDEN)
            
            enrollment.manual_progress = progress
            enrollment.save()
            return Response({"detail": "Progress updated."})
        except Enrollment.DoesNotExist:
            return Response({"detail": "Enrollment not found."}, status=status.HTTP_404_NOT_FOUND)

class TeacherUpdateCourseProgressView(generics.GenericAPIView):
    permission_classes = [IsTeacher]

    def post(self, request):
        teacher = request.user
        course_id = request.data.get('course_id')
        progress = request.data.get('progress')

        try:
            course = Course.objects.get(id=course_id)
            # Security: ensure teacher is assigned to this course
            if not TeacherCourseAssignment.objects.filter(teacher=teacher, course=course).exists():
                return Response({"detail": "Not authorized."}, status=status.HTTP_403_FORBIDDEN)
            
            course.course_progress = progress
            course.save()

            # Sync to all students in this course
            Enrollment.objects.filter(course=course).update(manual_progress=progress)
            
            return Response({"detail": f"Course progress updated to {progress}% and synced to all students."})
        except Course.DoesNotExist:
            return Response({"detail": "Course not found."}, status=status.HTTP_404_NOT_FOUND)

class TeacherCompetitionAttemptsView(generics.ListAPIView):
    permission_classes = [IsTeacher]
    serializer_class = CompetitionAttemptSerializer

    def get_queryset(self):
        teacher = self.request.user
        assigned_course_ids = TeacherCourseAssignment.objects.filter(teacher=teacher).values_list('course_id', flat=True)
        # Get students enrolled in these courses
        student_ids = Enrollment.objects.filter(course_id__in=assigned_course_ids).values_list('student_id', flat=True)
        # Return all attempts by these students
        return CompetitionAttempt.objects.filter(user_id__in=student_ids).select_related('user', 'competition').order_by('-start_time')

class TeacherStudentPerformanceView(generics.RetrieveAPIView):
    serializer_class = TeacherStudentSerializer
    permission_classes = [IsTeacher]
    lookup_field = 'id'
    lookup_url_kwarg = 'enrollment_id'

    def get_queryset(self):
        teacher = self.request.user
        assigned_course_ids = TeacherCourseAssignment.objects.filter(teacher=teacher).values_list('course_id', flat=True)
        return Enrollment.objects.filter(course_id__in=assigned_course_ids).select_related('student', 'course', 'attendance', 'grade')

class DailyChallengeListView(generics.ListAPIView):
    serializer_class = DailyChallengeSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        enrolled_course_ids = Enrollment.objects.filter(student=user).values_list('course_id', flat=True)
        return DailyChallenge.objects.filter(
            course_id__in=enrolled_course_ids
        ).prefetch_related(
            'quiz_questions',
            Prefetch(
                'submissions',
                queryset=ChallengeSubmission.objects.filter(student=user),
                to_attr='user_submissions'
            )
        ).order_by('-created_at')

    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset()
        serializer = self.get_serializer(queryset, many=True)
        data = serializer.data
        
        # queryset is evaluated here, so we can access user_submissions
        queryset_list = list(queryset)
        for idx, item in enumerate(data):
            if idx < len(queryset_list):
                obj = queryset_list[idx]
                user_subs = getattr(obj, 'user_submissions', [])
                submission = user_subs[0] if user_subs else None
                if submission:
                    item['user_submission'] = ChallengeSubmissionSerializer(submission).data
                else:
                    item['user_submission'] = None
        
        return Response(data)

class ChallengeSubmissionView(generics.GenericAPIView):
    serializer_class = ChallengeSubmissionSerializer
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        challenge_id = request.data.get('challenge_id')
        try:
            challenge = DailyChallenge.objects.get(id=challenge_id)
        except DailyChallenge.DoesNotExist:
            return Response({"detail": "Challenge not found."}, status=status.HTTP_404_NOT_FOUND)
        
        # Check if it's a quiz or mission
        if challenge.challenge_type == 'quiz':
            responses = request.data.get('responses', {}) # Format: { "q_id": "A", ... }
            questions = challenge.quiz_questions.all()
            score = 0
            for q in questions:
                if responses.get(str(q.id)) == q.correct_option:
                    score += 1
            
            submission, created = ChallengeSubmission.objects.update_or_create(
                challenge=challenge,
                student=request.user,
                defaults={
                    'quiz_score': score,
                    'total_quiz_questions': questions.count(),
                    'status': 'approved' # Quiz is auto-approved
                }
            )
            
            # Auto-award XP for quiz if not previously approved
            if created or submission.status == 'approved':
                student = request.user
                student.xp += challenge.reward_xp
                student.level = (student.xp // 1000) + 1
                student.save()

            return Response({
                "detail": f"Quiz submitted! Score: {score}/{questions.count()}",
                "score": score,
                "total": questions.count()
            }, status=status.HTTP_201_CREATED)
        else:
            submission, created = ChallengeSubmission.objects.update_or_create(
                challenge=challenge,
                student=request.user,
                defaults={
                    'text_response': request.data.get('text_response'),
                    'audio_response': request.FILES.get('audio_response'),
                    'file_response': request.FILES.get('file_response'),
                    'status': 'pending'
                }
            )
            return Response({"detail": "Submission uploaded successfully!"}, status=status.HTTP_201_CREATED)

class TeacherChallengeSubmissionsView(generics.ListAPIView):
    serializer_class = ChallengeSubmissionSerializer
    permission_classes = [IsTeacher]

    def get_queryset(self):
        teacher = self.request.user
        course_id = self.request.query_params.get('course_id')
        assigned_course_ids = TeacherCourseAssignment.objects.filter(teacher=teacher).values_list('course_id', flat=True)
        
        queryset = ChallengeSubmission.objects.all().select_related('challenge', 'student', 'challenge__course')
        
        if course_id:
            if int(course_id) not in assigned_course_ids:
                return ChallengeSubmission.objects.none()
            queryset = queryset.filter(challenge__course_id=course_id)
        else:
            queryset = queryset.filter(challenge__course_id__in=assigned_course_ids)
            
        return queryset.order_by('-submitted_at')

class TeacherFeedbackChallengeView(generics.GenericAPIView):
    permission_classes = [IsTeacher]

    def post(self, request):
        submission_id = request.data.get('submission_id')
        new_status = request.data.get('status') # approved, correction
        feedback = request.data.get('feedback')

        try:
            submission = ChallengeSubmission.objects.get(id=submission_id)
            if not TeacherCourseAssignment.objects.filter(teacher=request.user, course=submission.challenge.course).exists():
                return Response({"detail": "Not authorized."}, status=status.HTTP_403_FORBIDDEN)
            
            submission.status = new_status
            submission.feedback = feedback
            submission.save()

            if new_status == 'approved':
                student = submission.student
                student.xp += submission.challenge.reward_xp
                student.level = (student.xp // 1000) + 1
                student.save()

            return Response({"detail": f"Submission {new_status}."})
        except ChallengeSubmission.DoesNotExist:
            return Response({"detail": "Submission not found."}, status=status.HTTP_404_NOT_FOUND)

class DailyChallengeCreateView(generics.CreateAPIView):
    serializer_class = DailyChallengeSerializer
    permission_classes = [IsTeacher]

    def perform_create(self, serializer):
        try:
            # course will be a Course object in validated_data if validation passed
            course = serializer.validated_data.get('course')
            if not course:
                raise ValidationError({"course": "Course is required."})

            if not TeacherCourseAssignment.objects.filter(teacher=self.request.user, course=course).exists():
                raise PermissionDenied("You are not assigned to this course.")
            
            serializer.save()
        except ValidationError:
            raise
        except PermissionDenied:
            raise
        except Exception as e:
            raise ValidationError({"detail": f"An unexpected error occurred: {str(e)}"})

class TeacherChallengeListView(generics.ListAPIView):
    serializer_class = DailyChallengeSerializer
    permission_classes = [IsTeacher]

    def get_queryset(self):
        teacher = self.request.user
        assigned_course_ids = TeacherCourseAssignment.objects.filter(teacher=teacher).values_list('course_id', flat=True)
        return DailyChallenge.objects.filter(course_id__in=assigned_course_ids).order_by('-created_at')

class CourseLeaderboardView(generics.GenericAPIView):
    serializer_class = CourseLeaderboardSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        course_id = self.request.query_params.get('course_id')
        user = request.user
        
        # Determine which students to show
        if course_id and course_id != 'all':
            # Specific course leaderboard
            if not user.is_staff:
                is_assigned_teacher = TeacherCourseAssignment.objects.filter(teacher=user, course_id=course_id).exists()
                is_enrolled_student = Enrollment.objects.filter(student=user, course_id=course_id).exists()
                if not is_assigned_teacher and not is_enrolled_student:
                    return Response({"detail": "Not authorized to view this leaderboard."}, status=status.HTTP_403_FORBIDDEN)
            
            enrollments = Enrollment.objects.filter(course_id=course_id).select_related('student')
            target_course_id = course_id
        else:
            # Overall leaderboard for teacher's students or all students if staff
            if user.is_staff:
                # For staff, we could show all students, but let's stick to those enrolled in something
                enrollments = Enrollment.objects.all().select_related('student', 'course')
            else:
                assigned_course_ids = TeacherCourseAssignment.objects.filter(teacher=user).values_list('course_id', flat=True)
                enrollments = Enrollment.objects.filter(course_id__in=assigned_course_ids).select_related('student', 'course')
            target_course_id = None
        
        # 1. Group by student to avoid duplicates if enrolled in multiple courses
        student_map = {}
        for enrollment in enrollments:
            s = enrollment.student
            if s.id not in student_map:
                student_map[s.id] = {
                    "student_id": s.id,
                    "username": s.username,
                    "profile_picture": s.profile_picture.url if s.profile_picture else None,
                    "course_xp": 0
                }

        # 2. Calculate XP
        for student_id, data in student_map.items():
            if target_course_id:
                # Specific course
                comp_xp = CompetitionParticipant.objects.filter(
                    user_id=student_id, 
                    competition__course_id=target_course_id
                ).aggregate(total=Sum('score'))['total'] or 0
                
                challenge_xp = ChallengeSubmission.objects.filter(
                    student_id=student_id,
                    challenge__course_id=target_course_id,
                    status='approved'
                ).aggregate(total=Sum('challenge__reward_xp'))['total'] or 0
            else:
                # Overall XP (Global rank for students managed by this teacher)
                from accounts.models import User as AccountUser
                try:
                    u = AccountUser.objects.get(id=student_id)
                    total_course_xp = u.xp
                except AccountUser.DoesNotExist:
                    total_course_xp = 0
                
                data["course_xp"] = total_course_xp
                continue

            data["course_xp"] = comp_xp + challenge_xp
        
        leaderboard_data = list(student_map.values())
        
        # Sort and assign ranks
        leaderboard_data.sort(key=lambda x: x['course_xp'], reverse=True)
        for idx, item in enumerate(leaderboard_data, 1):
            item['rank'] = idx
            
        return Response(leaderboard_data)
