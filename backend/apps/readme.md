-------------
http://localhost:8000/admin/

-------------
# OLD 
# Creating a table 
## example 1 ACCOUNT 
### Users who log in (admin, producer, customer)

0. Making new app 
cd backend
```
    docker-compose exec web python manage.py startapp 'new_feature' apps/'new_feature'
```

1. make table in Models.py
we use abstract user since its dockers prebuilt user model

apps/accounts/models.py
    ```
    from django.contrib.auth.models import AbstractUser
    # Create your models here.
    class Account(AbstractUser):
        ACCOUNT_TYPE_CHOICES = [
            ('customer', 'Customer'),
            ('producer', 'Producer'),
        ]
        phone_number = models.CharField(max_length=15, blank=True, null=True)
        account_type = models.CharField(max_length=10, choices=ACCOUNT_TYPE_CHOICES, default='customer')


        def __str__(self):
            return self.username
    ```

2. Add new model to installed apps 
backend/settings.py
    ```
    INSTALLED_APPS = [
        'django.contrib.admin',
        'django.contrib.auth',
        'django.contrib.contenttypes',
        'django.contrib.sessions',
        'django.contrib.messages',
        'django.contrib.staticfiles',
        "rest_framework",
        "rest_framework.authtoken",
        "corsheaders",
        "apps.catalog",
        "apps.api",
        "apps.accounts", <--------------------------------------------!!!
    ]

    AUTH_USER_MODEL = 'accounts.Account' <----------------------------!!! added for extended columns
    ```


3. Add serializers
Added 'accounts/serializer.py'
This is done to take model object (Account) and convert it to JSON 
OR
Take JSON from front end and convert it to database object

    ```
    from rest_framework import serializers
    from .models import Account

    class AccountSerializer(serializers.ModelSerializer):
        class Meta:
            model = Account
            fields = ['id', 'username', 'email', 'phone_number', 'account_type', 'is_staff']
            read_only_fields = ['id']
    ```

4. Edit accounts/apps.py
Used to specify where the app is created
    ```
    class AccountsConfig(AppConfig):
        default_auto_field = 'django.db.models.BigAutoField'
        name = 'apps.accounts' 
    ```

5. migrate n shi
    ```
    docker-compose down
    docker-compose up --build
    docker-compose exec web python manage.py makemigrations
    docker compose exec web python manage.py migrate
    ```

Admin shi
6. Testing the table
Using django admin panel to view table n verify it workin
apps/admin.py
    ```
    @admin.register(Account)
    class AccountAdmin(admin.ModelAdmin):
        list_display = ['id', 'username', 'email', 'phone_number', 'account_type']
    ```
Create an admin user to use django admin interface
    ```
    docker compose exec web python manage.py createsuperuser
    ```

check ts out
    ```
    http://localhost:8000/admin/
    ```

Bomboclat table created 

# Connecting backend to front

1. Creating the Register function in accounts/view.py
