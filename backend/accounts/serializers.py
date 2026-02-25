from rest_framework import serializers
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

User = get_user_model()

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ('id', 'email', 'username', 'profile_picture', 'xp', 'level', 'is_teacher', 'is_staff', 'full_name', 'parent_name', 'dob', 'address', 'school_name', 'standard_grade')

class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = ('email', 'username', 'password', 'full_name', 'parent_name', 'dob', 'address', 'school_name', 'standard_grade')

    def create(self, validated_data):
        user = User.objects.create_user(
            email=validated_data['email'],
            username=validated_data['username'],
            password=validated_data['password'],
            full_name=validated_data.get('full_name', ''),
            parent_name=validated_data.get('parent_name', ''),
            dob=validated_data.get('dob'),
            address=validated_data.get('address', ''),
            school_name=validated_data.get('school_name', ''),
            standard_grade=validated_data.get('standard_grade', '')
        )
        return user

class MyTokenObtainPairSerializer(TokenObtainPairSerializer):
    def validate(self, attrs):
        data = super().validate(attrs)
        data['is_teacher'] = self.user.is_teacher
        data['is_staff'] = self.user.is_staff
        return data
