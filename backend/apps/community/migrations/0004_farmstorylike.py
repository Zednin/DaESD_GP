from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ("community", "0003_alter_review_options_review_updated_at_and_more"),
    ]

    operations = [
        migrations.CreateModel(
            name="FarmStoryLike",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                (
                    "customer",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="farm_story_likes",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
                (
                    "story",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="likes",
                        to="community.farmstory",
                    ),
                ),
            ],
            options={
                "ordering": ["-created_at"],
            },
        ),
        migrations.AddConstraint(
            model_name="farmstorylike",
            constraint=models.UniqueConstraint(
                fields=("story", "customer"),
                name="uniq_farm_story_like_story_customer",
            ),
        ),
        migrations.AddIndex(
            model_name="farmstorylike",
            index=models.Index(
                fields=["story", "-created_at"],
                name="community_f_story_i_03d495_idx",
            ),
        ),
        migrations.AddIndex(
            model_name="farmstorylike",
            index=models.Index(
                fields=["customer", "-created_at"],
                name="community_f_custome_64fd49_idx",
            ),
        ),
    ]
