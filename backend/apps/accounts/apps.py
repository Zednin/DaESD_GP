from django.apps import AppConfig


class AccountsConfig(AppConfig):
    #django default id assignment shi
    default_auto_field = 'django.db.models.BigAutoField'
    #specify location of model
    name = 'apps.accounts' 

    def ready(self):
        import apps.accounts.signals 