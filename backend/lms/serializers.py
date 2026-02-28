from rest_framework import serializers
from .models import (
    Course, Enrollment, Grade, Attendance, DailyAttendanceLog, AttendanceLog, 
    Competition, CompetitionParticipant, Badge, UserBadge, QuizQuestion, 
    CodingQuestion, EnglishQuestion, MemorySet, MemoryQuestion, 
    CompetitionAttempt, TeacherCourseAssignment, DailyChallenge, ChallengeSubmission,
    DailyChallengeQuestion
)
from accounts.serializers import UserSerializer

class CourseSerializer(serializers.ModelSerializer):
    class Meta:
        model = Course
        fields = '__all__'

class GradeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Grade
        fields = ('grade', 'updated_at')

class AttendanceSerializer(serializers.ModelSerializer):
    percentage = serializers.ReadOnlyField(source='attendance_percentage')
    class Meta:
        model = Attendance
        fields = ('percentage', 'total_classes', 'attended_classes')

class EnrollmentSerializer(serializers.ModelSerializer):
    student = UserSerializer(read_only=True)
    course = CourseSerializer(read_only=True)
    grade = GradeSerializer(read_only=True)
    attendance = AttendanceSerializer(read_only=True)
    class Meta:
        model = Enrollment
        fields = ('id', 'student', 'course', 'enrollment_date', 'manual_progress', 'grade', 'attendance')

class EnrollCourseSerializer(serializers.Serializer):
    course_id = serializers.IntegerField()

class AttendanceLogEnrollmentSerializer(serializers.ModelSerializer):
    """Lightweight nested enrollment serializer used inside AttendanceLogSerializer."""
    student = serializers.SerializerMethodField()
    course = serializers.SerializerMethodField()

    class Meta:
        model = Enrollment
        fields = ('id', 'student', 'course')

    def get_student(self, obj):
        return {
            'id': obj.student.id,
            'username': obj.student.username,
            'email': obj.student.email,
        }

    def get_course(self, obj):
        return {
            'id': obj.course.id,
            'course_name': obj.course.course_name,
        }


class DailyAttendanceLogSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source='student.username', read_only=True)
    day = serializers.SerializerMethodField()

    class Meta:
        model = DailyAttendanceLog
        fields = ('id', 'student', 'student_name', 'date', 'day', 'status')

    def get_day(self, obj):
        return obj.date.strftime('%A')

class BadgeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Badge
        fields = '__all__'

class UserBadgeSerializer(serializers.ModelSerializer):
    badge = BadgeSerializer(read_only=True)
    class Meta:
        model = UserBadge
        fields = ('id', 'badge', 'earned_at')

class CompetitionSerializer(serializers.ModelSerializer):
    reward_badge = BadgeSerializer(read_only=True)
    participant_count = serializers.IntegerField(source='participants.count', read_only=True)
    is_joined = serializers.SerializerMethodField()

    class Meta:
        model = Competition
        fields = ('id', 'title', 'description', 'category', 'mode_type', 'external_link', 'time_limit', 'start_date', 'end_date', 'reward_xp', 'reward_badge', 'participant_count', 'is_joined')

    def get_is_joined(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return obj.participants.filter(user=request.user).exists()
        return False

class LeaderboardSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source='user.username', read_only=True)
    profile_picture = serializers.ImageField(source='user.profile_picture', read_only=True)
    
    class Meta:
        model = CompetitionParticipant
        fields = ('username', 'profile_picture', 'score', 'joined_at')

class CompetitionParticipantSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    competition = CompetitionSerializer(read_only=True)
    class Meta:
        model = CompetitionParticipant
        fields = ('id', 'user', 'competition', 'score', 'joined_at')

class QuizQuestionSerializer(serializers.ModelSerializer):
    class Meta:
        model = QuizQuestion
        fields = ('id', 'question_text', 'option_a', 'option_b', 'option_c', 'option_d', 'correct_option')

class CodingQuestionSerializer(serializers.ModelSerializer):
    class Meta:
        model = CodingQuestion
        fields = ('id', 'problem_text', 'xp_value')

class EnglishQuestionSerializer(serializers.ModelSerializer):
    class Meta:
        model = EnglishQuestion
        fields = ('id', 'question_type', 'question_text', 'options_json', 'correct_answer')

class MemoryQuestionSerializer(serializers.ModelSerializer):
    class Meta:
        model = MemoryQuestion
        fields = ('id', 'question', 'option_a', 'option_b', 'option_c', 'option_d', 'correct_option')

class MemorySetSerializer(serializers.ModelSerializer):
    questions = MemoryQuestionSerializer(many=True, read_only=True)
    class Meta:
        model = MemorySet
        fields = ('id', 'words_list', 'questions')

class CompetitionAttemptSerializer(serializers.ModelSerializer):
    class Meta:
        model = CompetitionAttempt
        fields = '__all__'

class TeacherCourseAssignmentSerializer(serializers.ModelSerializer):
    course_name = serializers.CharField(source='course.course_name', read_only=True)
    student_count = serializers.IntegerField(source='course.total_students', read_only=True)
    course_progress = serializers.IntegerField(source='course.course_progress', read_only=True)
    
    class Meta:
        model = TeacherCourseAssignment
        fields = ('id', 'course', 'course_name', 'student_count', 'course_progress')

class TeacherStudentSerializer(serializers.ModelSerializer):
    student_details = serializers.SerializerMethodField()
    course_name = serializers.CharField(source='course.course_name', read_only=True)
    attendance_pct = serializers.FloatField(source='attendance.attendance_percentage', read_only=True)
    grade_val = serializers.CharField(source='grade.grade', read_only=True)
    best_competition_score = serializers.SerializerMethodField()
    competition_records = serializers.SerializerMethodField()
    daily_status = serializers.SerializerMethodField()

    class Meta:
        model = Enrollment
        fields = ('id', 'student_details', 'course_name', 'attendance_pct', 'grade_val', 'manual_progress', 'best_competition_score', 'competition_records', 'daily_status')

    def get_student_details(self, obj):
        return {
            'id': obj.student.id,
            'username': obj.student.username,
            'email': obj.student.email,
            'profile_picture': obj.student.profile_picture.url if obj.student.profile_picture else None
        }

    def get_best_competition_score(self, obj):
        from .models import CompetitionParticipant
        best = CompetitionParticipant.objects.filter(user=obj.student).order_by('-score').first()
        return best.score if best else 0

    def get_competition_records(self, obj):
        from .models import CompetitionParticipant
        records = CompetitionParticipant.objects.filter(user=obj.student).select_related('competition').order_by('-joined_at')
        return [
            {
                'competition_title': r.competition.title,
                'score': r.score,
                'correct_answers': r.correct_answers,
                'total_questions': r.total_questions,
                'date': r.joined_at.strftime('%Y-%m-%d'),
                'mode': r.competition.mode_type
            } for r in records
        ]

    def get_daily_status(self, obj):
        date_str = self.context.get('request').query_params.get('date') if self.context.get('request') else None
        if not date_str:
            return None
        from .models import AttendanceLog

class DailyChallengeQuestionSerializer(serializers.ModelSerializer):
    class Meta:
        model = DailyChallengeQuestion
        fields = '__all__'

class DailyChallengeSerializer(serializers.ModelSerializer):
    course_name = serializers.CharField(source='course.course_name', read_only=True)
    quiz_questions = DailyChallengeQuestionSerializer(many=True, required=False)
    
    class Meta:
        model = DailyChallenge
        fields = '__all__'

    def create(self, validated_data):
        quiz_questions_data = self.initial_data.get('quiz_questions', [])
        challenge = DailyChallenge.objects.create(**validated_data)
        for question_data in quiz_questions_data:
            DailyChallengeQuestion.objects.create(challenge=challenge, **question_data)
        return challenge

class ChallengeSubmissionSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source='student.username', read_only=True)
    challenge_mission = serializers.CharField(source='challenge.mission', read_only=True)
    challenge_type = serializers.CharField(source='challenge.challenge_type', read_only=True)
    submission_date = serializers.DateTimeField(source='submitted_at', read_only=True)
    
    class Meta:
        model = ChallengeSubmission
        fields = '__all__'
