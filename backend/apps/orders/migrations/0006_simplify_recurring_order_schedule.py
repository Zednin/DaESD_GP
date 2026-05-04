from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('orders', '0005_order_special_instructions'),
    ]

    operations = [
        migrations.SeparateDatabaseAndState(
            database_operations=[
                migrations.RunSQL(
                    sql='ALTER TABLE orders_recurringorder DROP COLUMN IF EXISTS interval CASCADE;',
                    reverse_sql='ALTER TABLE orders_recurringorder ADD COLUMN IF NOT EXISTS interval integer NOT NULL DEFAULT 1;',
                ),
                migrations.RunSQL(
                    sql='ALTER TABLE orders_recurringorder DROP COLUMN IF EXISTS monthday CASCADE;',
                    reverse_sql='ALTER TABLE orders_recurringorder ADD COLUMN IF NOT EXISTS monthday smallint NULL;',
                ),
                migrations.RunSQL(
                    sql='ALTER TABLE orders_recurringorder DROP COLUMN IF EXISTS weekday CASCADE;',
                    reverse_sql='ALTER TABLE orders_recurringorder ADD COLUMN IF NOT EXISTS weekday smallint NULL;',
                ),
            ],
            state_operations=[
                migrations.RemoveField(
                    model_name='recurringorder',
                    name='interval',
                ),
                migrations.RemoveField(
                    model_name='recurringorder',
                    name='monthday',
                ),
                migrations.RemoveField(
                    model_name='recurringorder',
                    name='weekday',
                ),
            ],
        ),
        migrations.SeparateDatabaseAndState(
            database_operations=[
                migrations.RunSQL(
                    sql="""
                    UPDATE orders_recurringorder
                    SET frequency = 'weekly'
                    WHERE frequency NOT IN ('weekly', 'fortnightly');
                    """,
                    reverse_sql=migrations.RunSQL.noop,
                ),
                migrations.RunSQL(
                    sql="""
                    ALTER TABLE orders_recurringorder
                    ADD COLUMN IF NOT EXISTS order_day smallint;
                    UPDATE orders_recurringorder SET order_day = 0 WHERE order_day IS NULL;
                    ALTER TABLE orders_recurringorder ALTER COLUMN order_day SET DEFAULT 0;
                    ALTER TABLE orders_recurringorder ALTER COLUMN order_day SET NOT NULL;
                    """,
                    reverse_sql='ALTER TABLE orders_recurringorder DROP COLUMN IF EXISTS order_day CASCADE;',
                ),
                migrations.RunSQL(
                    sql="""
                    ALTER TABLE orders_recurringorder
                    ADD COLUMN IF NOT EXISTS delivery_day smallint;
                    UPDATE orders_recurringorder SET delivery_day = 2 WHERE delivery_day IS NULL;
                    ALTER TABLE orders_recurringorder ALTER COLUMN delivery_day SET DEFAULT 2;
                    ALTER TABLE orders_recurringorder ALTER COLUMN delivery_day SET NOT NULL;
                    """,
                    reverse_sql='ALTER TABLE orders_recurringorder DROP COLUMN IF EXISTS delivery_day CASCADE;',
                ),
            ],
            state_operations=[
                migrations.AlterField(
                    model_name='recurringorder',
                    name='frequency',
                    field=models.CharField(choices=[('weekly', 'Weekly'), ('fortnightly', 'Fortnightly')], max_length=20),
                ),
                migrations.AddField(
                    model_name='recurringorder',
                    name='order_day',
                    field=models.PositiveSmallIntegerField(choices=[(0, 'Monday'), (1, 'Tuesday'), (2, 'Wednesday'), (3, 'Thursday'), (4, 'Friday'), (5, 'Saturday'), (6, 'Sunday')], default=0),
                ),
                migrations.AddField(
                    model_name='recurringorder',
                    name='delivery_day',
                    field=models.PositiveSmallIntegerField(choices=[(0, 'Monday'), (1, 'Tuesday'), (2, 'Wednesday'), (3, 'Thursday'), (4, 'Friday'), (5, 'Saturday'), (6, 'Sunday')], default=2),
                ),
            ],
        ),
    ]