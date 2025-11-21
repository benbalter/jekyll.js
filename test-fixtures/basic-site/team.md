---
layout: default
title: Team
permalink: /team/
---

# Our Team

## Team Members

{% for member in site.data.members %}
- **{{ member.name }}** - {{ member.role }} ({{ member.email }})
{% endfor %}

## Settings

- Site Name: {{ site.data.settings.site_name }}
- Version: {{ site.data.settings.version }}
- Comments: {{ site.data.settings.features.comments }}

## Developers

Team Lead: {{ site.data.team.developers.lead.name }} (@{{ site.data.team.developers.lead.github }})

### Team Members:
{% for dev in site.data.team.developers.members %}
- {{ dev.name }} (@{{ dev.github }})
{% endfor %}
