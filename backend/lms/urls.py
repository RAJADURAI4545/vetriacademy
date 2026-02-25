from django.urls import path
from . import views

urlpatterns = [
    path('courses/', views.CourseListView.as_view(), name='course-list'),
    path('enroll/', views.EnrollCourseView.as_view(), name='enroll'),
    path('dashboard/', views.StudentDashboardView.as_view(), name='dashboard'),
    path('all-students/', views.StaffStudentListView.as_view(), name='all-students'),
    path('attendance/export/<int:enrollment_id>/', views.ExportAttendanceView.as_view(), name='export-attendance'),
    path('attendance/logs/', views.AttendanceLogListView.as_view(), name='attendance-logs'),
    path('attendance/logs/<int:student_id>/', views.AttendanceLogListView.as_view(), name='student-attendance-logs'),
    path('attendance/mark/', views.MarkAttendanceView.as_view(), name='mark-attendance'),
    path('attendance/all-logs/', views.StaffAllAttendanceLogsView.as_view(), name='all-attendance-logs'),
    path('competitions/', views.CompetitionListView.as_view(), name='competition-list'),
    path('competitions/join/<int:competition_id>/', views.JoinCompetitionView.as_view(), name='join-competition'),
    path('competitions/leaderboard/<int:competition_id>/', views.CompetitionLeaderboardView.as_view(), name='competition-leaderboard'),
    path('competitions/questions/<int:competition_id>/', views.GetCompetitionQuestions.as_view(), name='competition-questions'),
    path('competitions/start/<int:competition_id>/', views.StartCompetitionAttempt.as_view(), name='competition-start'),
    path('competitions/submit/<int:competition_id>/', views.SubmitCompetitionAttempt.as_view(), name='competition-submit'),
    path('gamification/', views.GamificationDataView.as_view(), name='gamification-data'),
    
    # Teacher Dashboard Endpoints
    path('teacher/dashboard/', views.TeacherDashboardView.as_view(), name='teacher-dashboard'),
    path('teacher/students/', views.TeacherStudentListView.as_view(), name='teacher-students'),
    path('teacher/attendance/mark/', views.TeacherMarkAttendanceView.as_view(), name='teacher-mark-attendance'),
    path('teacher/update-progress/', views.TeacherUpdateProgressView.as_view(), name='teacher-update-progress'),
    path('teacher/students/<int:enrollment_id>/performance/', views.TeacherStudentPerformanceView.as_view(), name='teacher-student-performance'),

    # Daily Challenge Endpoints
    path('daily-challenges/', views.DailyChallengeListView.as_view(), name='daily-challenge-list'),
    path('daily-challenges/submit/', views.ChallengeSubmissionView.as_view(), name='daily-challenge-submit'),
    path('teacher/challenges/submissions/', views.TeacherChallengeSubmissionsView.as_view(), name='teacher-challenge-submissions'),
    path('teacher/challenges/feedback/', views.TeacherFeedbackChallengeView.as_view(), name='teacher-challenge-feedback'),
    path('teacher/daily-challenges/create/', views.DailyChallengeCreateView.as_view(), name='teacher-challenge-create'),
    path('teacher/daily-challenges/list/', views.TeacherChallengeListView.as_view(), name='teacher-challenge-assigned-list'),
]
