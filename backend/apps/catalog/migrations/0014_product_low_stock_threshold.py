import django.core.validators
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("catalog", "0013_recommendationinteraction"),
    ]

    operations = [
        migrations.SeparateDatabaseAndState(
            database_operations=[
                migrations.RunSQL(
                    sql="""
                        ALTER TABLE catalog_product
                        ADD COLUMN IF NOT EXISTS low_stock_threshold integer;

                        UPDATE catalog_product
                        SET low_stock_threshold = 10
                        WHERE low_stock_threshold IS NULL;

                        ALTER TABLE catalog_product
                        ALTER COLUMN low_stock_threshold SET DEFAULT 10;

                        ALTER TABLE catalog_product
                        ALTER COLUMN low_stock_threshold SET NOT NULL;

                        DO $$
                        BEGIN
                            IF NOT EXISTS (
                                SELECT 1
                                FROM pg_constraint
                                WHERE conname = 'catalog_product_low_stock_threshold_check'
                            ) THEN
                                ALTER TABLE catalog_product
                                ADD CONSTRAINT catalog_product_low_stock_threshold_check
                                CHECK (low_stock_threshold >= 0);
                            END IF;
                        END $$;
                    """,
                    reverse_sql="""
                        ALTER TABLE catalog_product
                        DROP COLUMN IF EXISTS low_stock_threshold CASCADE;
                    """,
                ),
            ],
            state_operations=[
                migrations.AddField(
                    model_name="product",
                    name="low_stock_threshold",
                    field=models.PositiveIntegerField(
                        default=10,
                        help_text="Warn producers when stock is at or below this quantity",
                        validators=[django.core.validators.MinValueValidator(0)],
                    ),
                ),
            ],
        ),
    ]
