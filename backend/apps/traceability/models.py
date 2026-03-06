from django.db import models

# Create your models here.
from apps.catalog.models import Product

class Allergen(models.Model):

    ALLERGEN_DATA = [
    ('gluten', 'Gluten', 'Found in wheat, rye, barley, oats, spelt, kamut and their derivatives such as flour, bread, pasta, couscous, and baked goods.'),
    ('crustaceans', 'Crustaceans', 'Includes crabs, lobsters, crayfish, shrimps, prawns, and derivatives such as shrimp paste and crustacean stock.'),
    ('eggs', 'Eggs', 'Includes hen eggs and other bird eggs, found in mayonnaise, meringue, pasta, quiche, batter, glazes, and some sauces.'),
    ('fish', 'Fish', 'All species of fish including anchovies, cod, salmon, tuna, and derivatives such as fish sauce, fish oil, and Worcestershire sauce.'),
    ('peanuts', 'Peanuts', 'A legume (not a tree nut), found in peanut butter, groundnut oil, satay sauce, some cereals, and many processed snack foods.'),
    ('soybeans', 'Soybeans', 'Found in tofu, soy sauce, miso, tempeh, edamame, soy milk, soybean oil, and widely used as an emulsifier (lecithin E322).'),
    ('dairy', 'Dairy', 'Milk from cows, goats, and sheep, found in butter, cheese, cream, yoghurt, casein, whey, and lactose-containing products.'),
    ('nuts', 'Tree Nuts', 'Includes almonds, hazelnuts, walnuts, cashews, pecans, brazil nuts, pistachios, macadamia nuts, and products like marzipan and praline.'),
    ('celery', 'Celery', 'Includes celery stalks, leaves, seeds, and celeriac, commonly found in soups, stock cubes, salads, and spice mixes.'),
    ('mustard', 'Mustard', 'Includes mustard seeds, powder, paste, and oil, found in dressings, marinades, curries, sauces, and processed meats.'),
    ('sesame', 'Sesame', 'Includes sesame seeds, tahini, sesame oil, and hummus, found in breads, breadsticks, and many Asian and Middle Eastern dishes.'),
    ('sulphites', 'Sulphites', 'Sulphur dioxide (E220) and sulphites (E221-E228) used as preservatives in wine, beer, dried fruits, pickled foods, and soft drinks. Declarable above 10mg/kg or 10mg/litre.'),
    ('lupin', 'Lupin', 'A legume related to peanuts, found in lupin flour, seeds, and increasingly used in gluten-free and high-protein baked goods and pasta.'),
    ('molluscs', 'Molluscs', 'Includes mussels, oysters, clams, scallops, squid, octopus, and snails, found in seafood dishes, sauces, and oyster sauce.'),
    ]

    # Generate choices from ALLERGEN_DATA (key, display_name)
    ALLERGEN_CHOICES = [(key, name) for key, name, _ in ALLERGEN_DATA]

    # Allergen Name
    name = models.CharField(
        max_length=100, 
        unique=True
    )
    
    # Allergen Description
    description = models.TextField(
        blank=True, 
        null=True
    )  
     
    # Products FK *:*
    products = models.ManyToManyField(                      
        Product,
        related_name='allergens',
        blank=True
    )

    def __str__(self):
        return self.name