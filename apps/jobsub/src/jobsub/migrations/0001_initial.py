# -*- coding: utf-8 -*-
# Generated by Django 1.11.20 on 2019-07-16 14:39
from __future__ import unicode_literals

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    initial = True

    dependencies = [
    ]

    operations = [
        migrations.CreateModel(
            name='CheckForSetup',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('setup_run', models.BooleanField(default=False)),
                ('setup_level', models.IntegerField(default=0)),
            ],
        ),
        migrations.CreateModel(
            name='JobDesign',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=40)),
                ('description', models.CharField(max_length=1024)),
                ('last_modified', models.DateTimeField(auto_now=True)),
                ('type', models.CharField(max_length=128)),
                ('data', models.TextField()),
            ],
        ),
        migrations.CreateModel(
            name='JobHistory',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('submission_date', models.DateTimeField(auto_now=True)),
                ('job_id', models.CharField(max_length=128)),
            ],
        ),
        migrations.CreateModel(
            name='OozieAction',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('action_type', models.CharField(max_length=64)),
            ],
        ),
        migrations.CreateModel(
            name='OozieDesign',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(help_text='Name of the design, which must be unique per user.', max_length=64)),
                ('description', models.CharField(blank=True, max_length=1024)),
                ('last_modified', models.DateTimeField(auto_now=True)),
            ],
        ),
        migrations.CreateModel(
            name='OozieJavaAction',
            fields=[
                ('oozieaction_ptr', models.OneToOneField(auto_created=True, on_delete=django.db.models.deletion.CASCADE, parent_link=True, primary_key=True, serialize=False, to='jobsub.OozieAction')),
                ('files', models.CharField(default=b'[]', help_text='List of paths to files to be added to the distributed cache.', max_length=512)),
                ('archives', models.CharField(default=b'[]', help_text='List of paths to archives to be added to the distributed cache.', max_length=512)),
                ('jar_path', models.CharField(max_length=512)),
                ('main_class', models.CharField(max_length=256)),
                ('args', models.TextField(blank=True)),
                ('java_opts', models.CharField(blank=True, max_length=256)),
                ('job_properties', models.TextField(default=b'[]')),
            ],
            bases=('jobsub.oozieaction',),
        ),
        migrations.CreateModel(
            name='OozieMapreduceAction',
            fields=[
                ('oozieaction_ptr', models.OneToOneField(auto_created=True, on_delete=django.db.models.deletion.CASCADE, parent_link=True, primary_key=True, serialize=False, to='jobsub.OozieAction')),
                ('files', models.CharField(default=b'[]', help_text='List of paths to files to be added to the distributed cache.', max_length=512)),
                ('archives', models.CharField(default=b'[]', help_text='List of paths to archives to be added to the distributed cache.', max_length=512)),
                ('job_properties', models.TextField(default=b'[]')),
                ('jar_path', models.CharField(help_text='Path to jar files on HDFS.', max_length=512)),
            ],
            bases=('jobsub.oozieaction',),
        ),
        migrations.CreateModel(
            name='OozieStreamingAction',
            fields=[
                ('oozieaction_ptr', models.OneToOneField(auto_created=True, on_delete=django.db.models.deletion.CASCADE, parent_link=True, primary_key=True, serialize=False, to='jobsub.OozieAction')),
                ('files', models.CharField(default=b'[]', max_length=512)),
                ('archives', models.CharField(default=b'[]', max_length=512)),
                ('job_properties', models.TextField(default=b'[]')),
                ('mapper', models.CharField(max_length=512)),
                ('reducer', models.CharField(max_length=512)),
            ],
            bases=('jobsub.oozieaction',),
        ),
    ]
