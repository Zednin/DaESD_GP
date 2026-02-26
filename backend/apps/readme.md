-------------
http://localhost:8000/admin/
-------------
-----------------------------------
check react port and click 'signup' button
    http://localhost:5173

signup page and enter:
    username
    email
    Password
    Customer or Producer
    Create account

Verify it was made 
    create a superuser login to view admin page
        docker compose exec web python manage.py createsuperuser
    
    go to 
        http://localhost:8000/admin/
    
    Login   
        Accounts > Users
        

-----------------------------------
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
    ```
    from django.shortcuts import render

    # Create your views here.
    from rest_framework.decorators import api_view  
    from rest_framework.response import Response     
    from rest_framework import status                
    from .models import Account                     

    @api_view(['POST']) 
    def register(request):
        
        # Get the data sent from React
        username = request.data.get('username')
        email = request.data.get('email')
        password = request.data.get('password')
        account_type = request.data.get('account_type', 'customer')  
        
        if not username or not email or not password:
            return Response(
                {"error": "Username, email and password are required"},
                status=status.HTTP_400_BAD_REQUEST  # 400 = bad request
            )

        if Account.objects.filter(username=username).exists():
            return Response(
                {"error": "Username already taken"},
                status=status.HTTP_400_BAD_REQUEST
            )

        Account.objects.create_user(
            username=username,
            email=email,
            password=password,
            account_type=account_type
        )

        return Response(
            {"message": "Account created successfully!"},
            status=status.HTTP_201_CREATED  # 201 = successfully created
        )
    ```

2. Make accounts/urls.py 
Tells django to listen for the register function

    ```
    from django.urls import path
    from . import views  # Import views from THIS folder (accounts)

    urlpatterns = [
        # When React hits /api/accounts/register/, run the register function
        path('register/', views.register, name='register'),
    ]
    ```

3. Add path to accounts/urls.py in web_project/urls.py
    ```
    """
    from django.contrib import admin
    from django.urls import path, include

    urlpatterns = [
        path("admin/", admin.site.urls),
        path("api/", include("apps.api.urls")),
        path("api/accounts/", include("apps.accounts.urls")) <------------------!!!
    ]

    ```
    
4. Create forms to send to backend /frontend/src/signup.jsx
    ```
    // Send form data to Django backend
    const response = await fetch("http://localhost:8000/api/accounts/register/", {
        method: "POST", // We are sending data
        headers: { "Content-Type": "application/json" }, // Telling backend its JSON
        body: JSON.stringify(formData) // Convert form data to JSON
    })
    ```

5. (After adding sum new stuff) Restart container to test
    ```
    docker compose restart web
    ```