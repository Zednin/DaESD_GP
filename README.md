# DaESD Group Project
UFCFTR-30-3 - Distributed and enterprise software development


## Group Members
| Name | Student ID | Email |
|-------|-------|-------|
| Harrison Mann | 23036387 | Harrison2.Mann@live.uwe.ac.uk |
| Matt Nogodula | 23025215 | Matt2.Nogodula@live.uwe.ac.uk |
| Dylan Jones | 22024323 | Dylan10.Jones@live.uwe.ac.uk |
| Josh Okanlawon | 23039392 | Joshua2.Okanlawon@live.uwe.ac.uk |
| Sam Waxman | 23023667 | Samuel2.Waxman@live.uwe.ac.uk |



## Dependencies
- 

## Installation
```bash
install-command
```




## Notes on DIR Setup - Harrison
Ran the following commands to create the file dir:

*Bash*
```bash
django-admin startproject web_project .

mkdir -p apps templates/partials static/css static/js static/img media/product_images docs config
touch templates/base.html templates/partials/navbar.html templates/partials/footer.html
touch apps/__init__.py
```

*Powershell*
```powershell
mkdir .\apps\accounts
mkdir .\apps\producers
mkdir .\apps\catalog
mkdir .\apps\cart
mkdir .\apps\orders
mkdir .\apps\payments
mkdir .\apps\traceability
mkdir .\apps\sustainability
mkdir .\apps\community
New-Item -ItemType File .\apps\__init__.py -Force
```

*Powershell*
```powershell
python manage.py startapp accounts apps/accounts
python manage.py startapp producers apps/producers
python manage.py startapp catalog apps/catalog
python manage.py startapp cart apps/cart
python manage.py startapp orders apps/orders
python manage.py startapp payments apps/payments
python manage.py startapp traceability apps/traceability
python manage.py startapp sustainability apps/sustainability
python manage.py startapp community apps/community
```

Then ran migrations:
*powershell*
```powershell
python manage.py runserver
```