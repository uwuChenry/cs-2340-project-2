"""Turning free-typed skill names into Skill rows.

Skills are matched by name to score a seeker against a posting, and that
comparison is an exact set intersection. If "react" and "React" became two rows,
a seeker who typed one would silently fail to match a posting that listed the
other. So typed names are resolved to an existing row case-insensitively, and
only a genuinely new name creates one.
"""

from .models import Skill

MAX_NAME_LENGTH = 100


def resolve_skills(names):
    """Skill rows for the given names: trimmed, de-duplicated, existing rows reused."""
    resolved, seen = [], set()
    for raw in names:
        name = " ".join(str(raw).split())[:MAX_NAME_LENGTH]
        if not name or name.lower() in seen:
            continue
        seen.add(name.lower())
        skill = Skill.objects.filter(name__iexact=name).first()
        resolved.append(skill or Skill.objects.create(name=name))
    return resolved
