import io
import os
import shutil
import tempfile

from django.contrib.auth.models import User
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import override_settings
from PIL import Image
from rest_framework.test import APITestCase

from profiles.models import SeekerProfile
from profiles.tests import STRONG, recruiter_payload, seeker_payload


def image_bytes(fmt="PNG", size=(800, 600), mode="RGB", color=(200, 30, 30), exif=None):
    buffer = io.BytesIO()
    image = Image.new(mode, size, color)
    kwargs = {"exif": exif} if exif is not None else {}
    image.save(buffer, format=fmt, **kwargs)
    return buffer.getvalue()


def upload(content, name="me.png", content_type="image/png"):
    return SimpleUploadedFile(name, content, content_type=content_type)


class MediaTestCase(APITestCase):
    """Sends uploads to a throwaway directory instead of backend/media."""

    @classmethod
    def setUpClass(cls):
        cls._media = tempfile.mkdtemp()
        cls._override = override_settings(MEDIA_ROOT=cls._media)
        cls._override.enable()
        super().setUpClass()

    @classmethod
    def tearDownClass(cls):
        super().tearDownClass()
        cls._override.disable()
        shutil.rmtree(cls._media, ignore_errors=True)


class ProfilePhotoTests(MediaTestCase):
    def setUp(self):
        self.client.post("/api/auth/register/", seeker_payload(), format="json")
        self.seeker = SeekerProfile.objects.get(user__username="newseeker")

    def post_photo(self, file):
        return self.client.post("/api/profile/photo/", {"photo": file}, format="multipart")

    def stored_image(self):
        self.seeker.refresh_from_db()
        return Image.open(self.seeker.photo.path)

    def test_starts_without_a_photo(self):
        self.assertIsNone(self.client.get("/api/profile/").data["photoUrl"])
        self.assertIsNone(self.client.get("/api/auth/session/").data["user"]["photoUrl"])

    def test_upload_becomes_a_small_square_jpeg_with_an_absolute_url(self):
        response = self.post_photo(upload(image_bytes(size=(1600, 900))))

        self.assertEqual(response.status_code, 200)
        url = response.data["photoUrl"]
        self.assertTrue(url.startswith("http://testserver/media/avatars/"), url)
        self.assertTrue(url.endswith(".jpg"))
        stored = self.stored_image()
        self.assertEqual((stored.format, stored.size), ("JPEG", (512, 512)))
        # The session carries it too, which is what the navbar avatar reads.
        self.assertEqual(self.client.get("/api/auth/session/").data["user"]["photoUrl"], url)

    def test_gps_and_other_metadata_are_stripped(self):
        exif = Image.Exif()
        exif[0x010F] = "SecretPhoneMaker"          # Make
        exif[0x8825] = {1: "N", 2: (30.0, 16.0, 1.0), 3: "W", 4: (97.0, 44.0, 35.0)}  # GPS block
        original = image_bytes(fmt="JPEG", exif=exif)
        self.assertIn(0x8825, Image.open(io.BytesIO(original)).getexif())  # the test input really has GPS

        self.post_photo(upload(original, "phone.jpg", "image/jpeg"))

        stored = self.stored_image()
        self.assertEqual(dict(stored.getexif()), {})
        with open(self.seeker.photo.path, "rb") as f:
            self.assertNotIn(b"SecretPhoneMaker", f.read())

    def test_rotation_metadata_is_applied_before_it_is_discarded(self):
        exif = Image.Exif()
        exif[0x0112] = 6  # "rotate 90 degrees clockwise to display"
        left_red = Image.new("RGB", (200, 100), (0, 0, 255))
        left_red.paste((255, 0, 0), (0, 0, 100, 100))
        buffer = io.BytesIO()
        left_red.save(buffer, format="JPEG", exif=exif, quality=100)

        self.post_photo(upload(buffer.getvalue(), "r.jpg", "image/jpeg"))

        stored = self.stored_image().convert("RGB")
        top, bottom = stored.getpixel((256, 20)), stored.getpixel((256, 490))
        # After rotating clockwise the red half is on top.
        self.assertGreater(top[0], top[2])
        self.assertGreater(bottom[2], bottom[0])

    def test_transparent_png_is_flattened_onto_white(self):
        self.post_photo(upload(image_bytes(mode="RGBA", color=(0, 0, 0, 0))))
        pixel = self.stored_image().convert("RGB").getpixel((10, 10))
        self.assertGreater(min(pixel), 240)

    def test_webp_is_accepted(self):
        self.assertEqual(self.post_photo(upload(image_bytes(fmt="WEBP"), "a.webp", "image/webp")).status_code, 200)

    def test_replacing_deletes_the_old_file(self):
        self.post_photo(upload(image_bytes()))
        self.seeker.refresh_from_db()
        first = self.seeker.photo.path
        self.assertTrue(os.path.exists(first))

        self.post_photo(upload(image_bytes(color=(0, 200, 0))))
        self.seeker.refresh_from_db()
        self.assertNotEqual(self.seeker.photo.path, first)
        self.assertFalse(os.path.exists(first))

    def test_delete_removes_photo_and_file(self):
        self.post_photo(upload(image_bytes()))
        self.seeker.refresh_from_db()
        path = self.seeker.photo.path

        response = self.client.delete("/api/profile/photo/")
        self.assertEqual(response.status_code, 200)
        self.assertIsNone(response.data["photoUrl"])
        self.assertFalse(os.path.exists(path))
        self.assertEqual(self.client.delete("/api/profile/photo/").status_code, 200)  # idempotent

    def test_rejects_things_that_are_not_images(self):
        def stored_files():
            folder = os.path.join(self._media, "avatars")
            return set(os.listdir(folder)) if os.path.isdir(folder) else set()

        before = stored_files()
        html = upload(b"<html><script>alert(1)</script></html>", "evil.png", "image/png")
        response = self.post_photo(html)
        self.assertEqual(response.status_code, 400)
        self.assertIn("photo", response.data)
        self.assertEqual(stored_files(), before)  # nothing was written

    def test_rejects_disallowed_formats(self):
        for fmt, name in (("GIF", "a.gif"), ("BMP", "a.bmp")):
            with self.subTest(fmt=fmt):
                self.assertEqual(self.post_photo(upload(image_bytes(fmt=fmt), name)).status_code, 400)

    def test_rejects_svg(self):
        svg = b'<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)"></svg>'
        self.assertEqual(self.post_photo(upload(svg, "a.svg", "image/svg+xml")).status_code, 400)

    def test_rejects_oversized_uploads(self):
        big = upload(b"\x89PNG" + b"0" * (5 * 1024 * 1024 + 1))
        response = self.post_photo(big)
        self.assertEqual(response.status_code, 400)
        self.assertIn("too large", response.data["photo"][0])

    def test_rejects_images_with_too_many_pixels(self):
        with self.settings():
            from profiles import photos

            original = photos.MAX_PIXELS
            photos.MAX_PIXELS = 1000
            try:
                self.assertEqual(self.post_photo(upload(image_bytes(size=(100, 100)))).status_code, 400)
            finally:
                photos.MAX_PIXELS = original

    def test_missing_file_is_a_400(self):
        self.assertEqual(self.client.post("/api/profile/photo/", {}, format="multipart").status_code, 400)

    def test_uploaded_names_are_random_not_user_controlled(self):
        self.post_photo(upload(image_bytes(), "../../etc/passwd.png"))
        self.seeker.refresh_from_db()
        self.assertRegex(os.path.basename(self.seeker.photo.name), r"^[0-9a-f]{32}\.jpg$")

    def test_recruiters_and_signed_out_users_cannot_upload(self):
        self.client.post("/api/auth/logout/")
        self.assertIn(self.post_photo(upload(image_bytes())).status_code, (401, 403))
        self.client.post("/api/auth/register/", recruiter_payload(), format="json")
        self.assertEqual(self.post_photo(upload(image_bytes())).status_code, 403)

    def test_photo_is_not_exposed_to_recruiters(self):
        """A photo would defeat 'show initials only', so recruiter serializers omit it."""
        self.post_photo(upload(image_bytes()))
        self.client.post("/api/auth/logout/")
        self.client.post("/api/auth/register/", recruiter_payload(), format="json")
        body = self.client.get("/api/recruiter/candidates/").content.decode()
        self.assertNotIn("photo", body)
        self.assertNotIn("avatars", body)


class AccountSettingsTests(APITestCase):
    def setUp(self):
        self.client.post("/api/auth/register/", seeker_payload(), format="json")

    def test_get_account(self):
        self.assertEqual(self.client.get("/api/auth/account/").data, {"username": "newseeker", "email": "s@example.test"})

    def test_change_username_and_email(self):
        response = self.client.patch("/api/auth/account/", {"username": "renamed", "email": "new@example.test"}, format="json")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(self.client.get("/api/auth/session/").data["user"]["username"], "renamed")
        self.assertTrue(User.objects.filter(username="renamed", email="new@example.test").exists())

    def test_keeping_your_own_username_is_fine_even_with_different_case(self):
        response = self.client.patch("/api/auth/account/", {"username": "NewSeeker"}, format="json")
        self.assertEqual(response.status_code, 200)

    def test_username_taken_by_someone_else_ignoring_case(self):
        User.objects.create_user("Taken", password=STRONG)
        response = self.client.patch("/api/auth/account/", {"username": "taken"}, format="json")
        self.assertEqual(response.status_code, 400)
        self.assertIn("username", response.data)
        self.assertEqual(User.objects.get(pk=self.client.get("/api/auth/session/").data["user"]["id"]).username, "newseeker")

    def test_invalid_username_and_email_rejected(self):
        self.assertEqual(self.client.patch("/api/auth/account/", {"username": "has space"}, format="json").status_code, 400)
        self.assertEqual(self.client.patch("/api/auth/account/", {"email": "nope"}, format="json").status_code, 400)

    def test_change_password_keeps_you_signed_in_and_new_password_works(self):
        response = self.client.post("/api/auth/password/", {"currentPassword": STRONG, "newPassword": "another-solid-pass-77"}, format="json")
        self.assertEqual(response.status_code, 204)
        self.assertEqual(self.client.get("/api/auth/session/").data["user"]["username"], "newseeker")  # still signed in

        self.client.post("/api/auth/logout/")
        self.assertEqual(self.client.post("/api/auth/login/", {"username": "newseeker", "password": STRONG}, format="json").status_code, 401)
        self.assertEqual(self.client.post("/api/auth/login/", {"username": "newseeker", "password": "another-solid-pass-77"}, format="json").status_code, 200)

    def test_wrong_current_password_rejected_and_nothing_changes(self):
        response = self.client.post("/api/auth/password/", {"currentPassword": "guess", "newPassword": "another-solid-pass-77"}, format="json")
        self.assertEqual(response.status_code, 400)
        self.assertIn("currentPassword", response.data)
        self.assertTrue(User.objects.get(username="newseeker").check_password(STRONG))

    def test_weak_new_password_rejected_alongside_wrong_current(self):
        response = self.client.post("/api/auth/password/", {"currentPassword": "guess", "newPassword": "12345678"}, format="json")
        self.assertEqual({"currentPassword", "newPassword"}, set(response.data))

    def test_new_password_too_similar_to_username_rejected(self):
        response = self.client.post("/api/auth/password/", {"currentPassword": STRONG, "newPassword": "newseeker1"}, format="json")
        self.assertEqual(response.status_code, 400)
        self.assertIn("newPassword", response.data)

    def test_recruiters_can_use_account_settings_too(self):
        self.client.post("/api/auth/logout/")
        self.client.post("/api/auth/register/", recruiter_payload(), format="json")
        self.assertEqual(self.client.get("/api/auth/account/").status_code, 200)
        self.assertEqual(self.client.post("/api/auth/password/", {"currentPassword": STRONG, "newPassword": "another-solid-pass-77"}, format="json").status_code, 204)

    def test_signed_out_is_refused(self):
        self.client.post("/api/auth/logout/")
        self.assertIn(self.client.get("/api/auth/account/").status_code, (401, 403))
        self.assertIn(self.client.post("/api/auth/password/", {"currentPassword": "x", "newPassword": "y"}, format="json").status_code, (401, 403))
