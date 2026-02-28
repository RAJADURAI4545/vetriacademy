from rest_framework import generics, permissions, status
from rest_framework.response import Response
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
    DailyChallengeSerializer, ChallengeSubmissionSerializer, DailyChallengeQuestionSerializer
)
from accounts.serializers import UserSerializer
import csv
from django.http import HttpResponse
from django.utils import timezone

class CourseListView(generics.ListAPIView):
    queryset = Course.objects.all()
    serializer_class = CourseSerializer
    permission_classes = [permissions.AllowAny]

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
        
        for data in enrollments_data:
            course_id = data['course']['id']
            current_grade = data['grade']['grade']
            if current_grade:
                better_students = Enrollment.objects.filter(
                    course_id=course_id,
                    grade__grade__lt=current_grade
                ).count()
                data['rank'] = better_students + 1
            else:
                data['rank'] = "N/A"
            
            data['course_total_students'] = Enrollment.objects.filter(course_id=course_id).count()

        total_attendance = 0
        count = 0
        if enrollments.exists():
            for enr in enrollments:
                try:
                    total_attendance += enr.attendance.attendance_percentage
                    count += 1
                except Exception:
                    pass
            overall_attendance = total_attendance / count if count > 0 else 0
        else:
            overall_attendance = 0

        return Response({
            "is_staff": user.is_staff,
            "student": user_data,
            "enrollments": enrollments_data,
            "stats": {
                "overall_attendance": overall_attendance,
                "xp": user.xp,
                "level": user.level,
            },
            "recent_badges": UserBadgeSerializer(UserBadge.objects.filter(user=user).order_by('-earned_at')[:5], many=True).data
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
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, enrollment_id):
        try:
            if request.user.is_staff:
                enrollment = Enrollment.objects.get(id=enrollment_id)
            else:
                enrollment = Enrollment.objects.get(id=enrollment_id, student=request.user)
        except Enrollment.DoesNotExist:
            return Response({"detail": "Enrollment not found."}, status=status.HTTP_404_NOT_FOUND)

        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = f'attachment; filename="attendance_{enrollment.course.course_name}_{enrollment.student.username}.csv"'

        writer = csv.writer(response)
        writer.writerow(['Date', 'Day', 'Status'])

        logs = AttendanceLog.objects.filter(enrollment=enrollment).order_by('date')
        for log in logs:
            writer.writerow([log.date, log.date.strftime('%A'), log.status.capitalize()])

        return response


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
        date = request.data.get('date')
        status_val = request.data.get('status')

        if not all([student_id, date, status_val]):
            return Response({"detail": "student_id, date, and status are required."}, status=status.HTTP_400_BAD_REQUEST)

        from django.contrib.auth import get_user_model
        User = get_user_model()
        try:
            student = User.objects.get(id=student_id)
        except User.DoesNotExist:
            return Response({"detail": "Student not found."}, status=status.HTTP_404_NOT_FOUND)

        log, created = DailyAttendanceLog.objects.update_or_create(
            student=student,
            date=date,
            defaults={'status': status_val}
        )

        return Response({
            "detail": "Attendance marked.",
            "student_id": student_id,
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
            queryset = queryset.filter(enrollment__course_id=course_id)
        if student_id:
            queryset = queryset.filter(student_id=student_id)
        if date:
            queryset = queryset.filter(date=date)
        
        return queryset

class CompetitionListView(generics.ListAPIView):
    serializer_class = CompetitionSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        category = self.request.query_params.get('category')
        if category:
            return Competition.objects.filter(category=category).order_by('-start_date')
        return Competition.objects.all().order_by('-start_date')

class CompetitionLeaderboardView(generics.ListAPIView):
    serializer_class = LeaderboardSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        competition_id = self.kwargs.get('competition_id')
        return CompetitionParticipant.objects.filter(competition_id=competition_id).order_by('-score')

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
        badges = UserBadge.objects.filter(user=user).order_by('-earned_at')
        all_badges = Badge.objects.all()
        
        return Response({
            "xp": user.xp,
            "level": user.level,
            "earned_badges": UserBadgeSerializer(badges, many=True).data,
            "all_badges": BadgeSerializer(all_badges, many=True).data,
            "xp_to_next_level": (user.level * 1000) - user.xp if user.xp < (user.level * 1000) else 0
        })

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
                    total_xp += 10
                    correct_count += 1
            if correct_count == total_questions and total_questions > 0:
                total_xp += 20 # Bonus
            
        elif competition.mode_type == 'coding':
            questions = competition.coding_questions.all()
            total_questions = questions.count()
            for q in questions:
                if str(answers.get(str(q.id))).strip() == q.correct_answer:
                    total_xp += q.xp_value
                    correct_count += 1

        elif competition.mode_type == 'english':
            questions = competition.english_questions.all()
            total_questions = questions.count()
            for q in questions:
                user_ans = str(answers.get(str(q.id))).strip().lower()
                actual_ans = q.correct_answer.strip().lower()
                if user_ans == actual_ans:
                    total_xp += 10
                    correct_count += 1

        elif competition.mode_type == 'memory':
            mem_sets = competition.memory_sets.all()
            for ms in mem_sets:
                for q in ms.questions.all():
                    total_questions += 1
                    if str(answers.get(str(q.id))) == q.correct_option:
                        total_xp += 10
                        correct_count += 1

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
        
        total_students = Enrollment.objects.filter(course__in=[a.course for a in assignments]).count()
        
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
        if course_id:
            if not TeacherCourseAssignment.objects.filter(teacher=teacher, course_id=course_id).exists():
                return Enrollment.objects.none()
            return Enrollment.objects.filter(course_id=course_id).select_related('student', 'course', 'attendance', 'grade')
        
        # If no course_id, return all students in all assigned courses
        assigned_course_ids = TeacherCourseAssignment.objects.filter(teacher=teacher).values_list('course_id', flat=True)
        return Enrollment.objects.filter(course_id__in=assigned_course_ids).select_related('student', 'course', 'attendance', 'grade')

class TeacherMarkAttendanceView(generics.GenericAPIView):
    permission_classes = [IsTeacher]

    def post(self, request):
        teacher = request.user
        date = request.data.get('date')
        attendance_data = request.data.get('attendance', []) # list of {student_id, status}

        if not date:
            return Response({"detail": "date is required."}, status=status.HTTP_400_BAD_REQUEST)

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
        return DailyChallenge.objects.filter(course_id__in=enrolled_course_ids).prefetch_related('quiz_questions').order_by('-created_at')

    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset()
        # Use simple list if not many challenges, or paginate
        serializer = self.get_serializer(queryset, many=True)
        data = serializer.data
        
        # Add submission info for each challenge for the current user
        for item in data:
            submission = ChallengeSubmission.objects.filter(challenge_id=item['id'], student=request.user).first()
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
        course_id = self.request.data.get('course')
        if not TeacherCourseAssignment.objects.filter(teacher=self.request.user, course_id=course_id).exists():
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("You are not assigned to this course.")
        serializer.save()

class TeacherChallengeListView(generics.ListAPIView):
    serializer_class = DailyChallengeSerializer
    permission_classes = [IsTeacher]

    def get_queryset(self):
        teacher = self.request.user
        assigned_course_ids = TeacherCourseAssignment.objects.filter(teacher=teacher).values_list('course_id', flat=True)
        return DailyChallenge.objects.filter(course_id__in=assigned_course_ids).order_by('-created_at')
