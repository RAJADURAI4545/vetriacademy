from rest_framework import serializers
from rest_framework.exceptions import ValidationError
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
    course_name = serializers.SerializerMethodField()
    day = serializers.SerializerMethodField()

    class Meta:
        model = DailyAttendanceLog
        fields = ('id', 'student', 'student_name', 'course', 'course_name', 'date', 'day', 'status')

    def get_course_name(self, obj):
        return obj.course.course_name if obj.course else "General / Academy"

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
    is_completed = serializers.SerializerMethodField()

    course_name = serializers.CharField(source='course.course_name', read_only=True)
    class Meta:
        model = Competition
        fields = ('id', 'title', 'description', 'category', 'course', 'course_name', 'mode_type', 'external_link', 'time_limit', 'start_date', 'end_date', 'reward_xp', 'reward_badge', 'participant_count', 'is_joined', 'is_completed')

    def get_is_joined(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return obj.participants.filter(user=request.user).exists()
        return False

    def get_is_completed(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return obj.competitionattempt_set.filter(user=request.user, is_completed=True).exists()
        return False

class LeaderboardSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source='user.username', read_only=True)
    profile_picture = serializers.ImageField(source='user.profile_picture', read_only=True)

    class Meta:
        model = CompetitionParticipant
        fields = ('username', 'profile_picture', 'score', 'joined_at')

class CourseLeaderboardSerializer(serializers.Serializer):
    student_id = serializers.IntegerField()
    username = serializers.CharField()
    profile_picture = serializers.ImageField(allow_null=True)
    course_xp = serializers.IntegerField()
    rank = serializers.IntegerField()

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
    username = serializers.CharField(source='user.username', read_only=True)
    competition_title = serializers.CharField(source='competition.title', read_only=True)
    mode = serializers.CharField(source='competition.mode_type', read_only=True)
    
    class Meta:
        model = CompetitionAttempt
        fields = ('id', 'username', 'competition_title', 'mode', 'score', 'correct_answers', 'total_questions', 'start_time', 'is_completed')

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
        # Use prefetched data if available
        participants = list(obj.student.competitions.all())
        if not participants:
            return 0
        return max(p.score for p in participants)

    def get_competition_records(self, obj):
        records = sorted(list(obj.student.competitions.all()), key=lambda x: x.joined_at, reverse=True)
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
        # Use prefetched logs
        logs = obj.student.daily_attendance_logs.all()
        # Find the one for this specific course and date
        from datetime import datetime
        try:
            target_date = datetime.strptime(date_str, '%Y-%m-%d').date()
        except:
            return None
            
        for log in logs:
            if log.course_id == obj.course_id and log.date == target_date:
                return log.status
        return None

class DailyChallengeQuestionSerializer(serializers.ModelSerializer):
    class Meta:
        model = DailyChallengeQuestion
        fields = ('id', 'question_text', 'option_a', 'option_b', 'option_c', 'option_d', 'correct_option')

class DailyChallengeSerializer(serializers.ModelSerializer):
    course_name = serializers.CharField(source='course.course_name', read_only=True)
    quiz_questions = DailyChallengeQuestionSerializer(many=True, required=False)
    
    class Meta:
        model = DailyChallenge
        fields = ('id', 'course', 'course_name', 'mission', 'challenge_type', 'deadline', 
                  'allow_audio', 'allow_text', 'allow_file', 'reward_xp', 'created_at', 'quiz_questions')

    def create(self, validated_data):
        try:
            quiz_questions_data = validated_data.pop('quiz_questions', [])
            if quiz_questions_data is None:
                quiz_questions_data = []

            challenge = DailyChallenge.objects.create(**validated_data)
            for question_data in quiz_questions_data:
                # Defensive: remove id if present
                question_data.pop('id', None)
                DailyChallengeQuestion.objects.create(challenge=challenge, **question_data)
            return challenge
        except Exception as e:
            raise ValidationError({"detail": f"Failed to create challenge: {str(e)}"})

class ChallengeSubmissionSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source='student.username', read_only=True)
    challenge_mission = serializers.CharField(source='challenge.mission', read_only=True)
    challenge_type = serializers.CharField(source='challenge.challenge_type', read_only=True)
    submission_date = serializers.DateTimeField(source='submitted_at', read_only=True)
    course_name = serializers.CharField(source='challenge.course.course_name', read_only=True)
    
    class Meta:
        model = ChallengeSubmission
        fields = '__all__'
