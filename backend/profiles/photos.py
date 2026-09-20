"""Profile photo handling.

Whatever a user uploads is decoded and re-encoded rather than stored as sent. That
is deliberate, and does three jobs at once:

* it proves the file really is an image (a renamed .exe or .html never gets served
  from /media/);
* it strips metadata -- phone photos routinely carry GPS coordinates in EXIF, and a
  profile photo should not quietly publish where someone lives;
* it caps the size, so a 20 MB camera original becomes a ~40 KB avatar.
"""

import io
import uuid

from django.core.files.base import ContentFile
from PIL import Image, ImageOps, UnidentifiedImageError

MAX_UPLOAD_BYTES = 5 * 1024 * 1024
# Guards against "decompression bombs": a tiny file that inflates to gigabytes.
MAX_PIXELS = 40_000_000
ALLOWED_FORMATS = {"JPEG", "PNG", "WEBP"}
AVATAR_SIZE = 512


class InvalidPhoto(ValueError):
    """The upload can't be used; the message is safe to show to the user."""


def process_avatar(upload):
    """A square, metadata-free JPEG (as a ContentFile) made from an uploaded image."""
    if upload.size > MAX_UPLOAD_BYTES:
        raise InvalidPhoto("That photo is too large. Please use one under 5 MB.")

    try:
        image = Image.open(upload)
        if image.format not in ALLOWED_FORMATS:
            raise InvalidPhoto("Please upload a JPEG, PNG or WebP image.")
        if image.width * image.height > MAX_PIXELS:
            raise InvalidPhoto("That image has too many pixels. Please use a smaller one.")

        # Phones store rotation as metadata rather than rotating the pixels, and
        # that metadata is about to be discarded, so apply it first.
        image = ImageOps.exif_transpose(image)

        if image.mode in ("RGBA", "LA", "P"):
            rgba = image.convert("RGBA")
            flattened = Image.new("RGB", rgba.size, "white")
            flattened.paste(rgba, mask=rgba.getchannel("A"))
            image = flattened
        else:
            image = image.convert("RGB")

        image = ImageOps.fit(image, (AVATAR_SIZE, AVATAR_SIZE), Image.Resampling.LANCZOS)
    except InvalidPhoto:
        raise
    except (UnidentifiedImageError, Image.DecompressionBombError, OSError, SyntaxError, ValueError):
        raise InvalidPhoto("That file isn't a valid image.")

    buffer = io.BytesIO()
    # Saving without an `exif=` argument is what drops the metadata.
    image.save(buffer, format="JPEG", quality=88, optimize=True)
    return ContentFile(buffer.getvalue(), name=f"{uuid.uuid4().hex}.jpg")
