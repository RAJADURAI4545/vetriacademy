from accounts.models import User
import sys

emails = ['Vakpython@gmail.com', 'Vakspoken@gmail.com', 'Vakcse@gmail.com']
names = ['Python Teacher', 'Spoken English Teacher', 'CSE Teacher']
usernames = ['Vakpython', 'Vakspoken', 'Vakcse']
password = 'VetriTeacher@123'

for i, email in enumerate(emails):
    u, created = User.objects.get_or_create(
        email=email,
        defaults={
            'username': usernames[i],
            'full_name': names[i],
            'is_teacher': True
        }
    )
    if created:
        u.set_password(password)
        u.save()
        print(f"Created teacher account: {email}")
    else:
        u.is_teacher = True
        u.save()
        print(f"Updated teacher status for: {email}")
