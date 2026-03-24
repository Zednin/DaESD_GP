from django.db import models
from django.conf import settings
from django.core.validators import MinValueValidator, MaxValueValidator
from django.utils import timezone
from apps.catalog.models import Product
from apps.producers.models import Producer


class Review(models.Model):
    """20 Reviews"""

    # Product FK
    product = models.ForeignKey(
        Product,
        on_delete=models.CASCADE,
        related_name='reviews'
    )

    # Customer Review FK
    customer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='reviews'
    )

    # Order Item FK
    order_item = models.ForeignKey(
        'orders.OrderItem',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='reviews'
    )

    # Rating 1-5
    rating = models.IntegerField(
        validators=[
            MinValueValidator(1),
            MaxValueValidator(5)
        ]
    )

    # Review Title
    review_title = models.CharField(max_length=255)

    # Review Text
    review_text = models.TextField()

    # Anonymous review
    is_anonymous = models.BooleanField(default=False)

    # Created at
    created_at = models.DateTimeField(auto_now_add=True)

    # Producer Response (nullable)
    producer_response = models.TextField(
        null=True,
        blank=True
    )

    # Responded at (nullable)
    responded_at = models.DateTimeField(
        null=True,
        blank=True
    )

    def __str__(self):
        return f"{self.product} - {self.rating} by {self.customer}"
    
class Recipe(models.Model):
    """21 Recipe"""

    SEASONAL_CHOICES = [
        ("spring", "Spring"),
        ("summer", "Summer"),
        ("autumn", "Autumn"),
        ("winter", "Winter"),
        ("autumn_winter", "Autumn/Winter"),
        ("spring_summer", "Spring/Summer"),
        ("all_year", "All Year Round"),
    ]

    # Producer FK
    producer = models.ForeignKey(
        Producer,
        on_delete=models.CASCADE,
        related_name='recipes'
    )

    # Linked products (M2M)
    products = models.ManyToManyField(
        Product,
        blank=True,
        related_name='recipes'
    )

    # Recipe Title
    title = models.CharField(max_length=255)

    # Recipe Description
    description = models.TextField(blank=True, default="")

    # Ingredients
    ingredients = models.TextField(blank=True, default="")

    # Instructions
    instructions = models.TextField(blank=True, default="")

    # Recipe image (Cloudinary URL)
    image = models.URLField(max_length=500, blank=True, null=True)

    # Seasonal tag
    seasonal_tag = models.CharField(
        max_length=20, choices=SEASONAL_CHOICES, default="all_year"
    )

    # Draft / Published
    is_published = models.BooleanField(default=False)

    # Auto-set when published
    published_at = models.DateTimeField(
        null=True,
        blank=True
    )

    # Created at
    created_at = models.DateTimeField(auto_now_add=True)

    # Updated at
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def save(self, *args, **kwargs):
        # Auto-set published_at when is_published becomes True
        if self.is_published and not self.published_at:
            self.published_at = timezone.now()
        elif not self.is_published:
            self.published_at = None
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.title} by {self.producer}"

class FarmStory(models.Model):
    """22 Farm Story"""

    # Producer FK
    producer = models.ForeignKey(
        Producer,
        on_delete=models.CASCADE,
        related_name='farm_stories'
    )

    # Story Title
    title = models.CharField(max_length=255)

    # Story Body
    body = models.TextField()

    # Story image (Cloudinary URL)
    image = models.URLField(max_length=500, blank=True, null=True)

    # Draft / Published
    is_published = models.BooleanField(default=False)

    # Created at
    created_at = models.DateTimeField(auto_now_add=True)

    # Updated at
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name_plural = "farm stories"

    def __str__(self):
        return f"{self.title} by {self.producer}"