"""Tests for order API validation and file extension checks."""

import pytest
from bot.api.routers.orders import is_allowed_file


class TestFileExtensionValidation:
    """Test is_allowed_file function."""

    def test_allows_pdf(self):
        assert is_allowed_file("document.pdf") is True

    def test_allows_docx(self):
        assert is_allowed_file("essay.docx") is True

    def test_allows_jpg(self):
        assert is_allowed_file("photo.jpg") is True

    def test_allows_zip(self):
        assert is_allowed_file("archive.zip") is True

    def test_blocks_exe(self):
        assert is_allowed_file("virus.exe") is False

    def test_blocks_bat(self):
        assert is_allowed_file("script.bat") is False

    def test_blocks_dll(self):
        assert is_allowed_file("library.dll") is False

    def test_rejects_no_extension(self):
        """Files without extensions should be rejected (security fix)."""
        assert is_allowed_file("Makefile") is False

    def test_rejects_empty_filename(self):
        assert is_allowed_file("") is False

    def test_rejects_none(self):
        assert is_allowed_file(None) is False

    def test_case_insensitive(self):
        assert is_allowed_file("DOCUMENT.PDF") is True
        assert is_allowed_file("photo.JPG") is True

    def test_double_extension(self):
        assert is_allowed_file("file.tar.gz") is True

    def test_blocks_unknown_extension(self):
        assert is_allowed_file("file.xyz") is False
