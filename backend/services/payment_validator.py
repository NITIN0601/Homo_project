"""
payment_validator.py
~~~~~~~~~~~~~~~~~~~~
Production-grade, offline payment validation infrastructure for:
  - Visa Cards (Mod-10 Luhn check + 13/16/19-digit prefix pattern)
  - Mastercard Cards (Mod-10 Luhn check + 16-digit 51-55 & 2221-2720 BIN ranges)
  - UPI / VPA IDs (Virtual Payment Address syntax pattern: username@handle)

Designed as a standalone, zero-network-latency module with granular error tracking,
UI-friendly form field flags, and a dynamic dispatch router.
"""

from __future__ import annotations

import re
from collections.abc import Callable
from dataclasses import dataclass, field
from enum import Enum
from typing import Any


class PaymentMethod(str, Enum):
    """Supported payment methods for validation routing."""
    VISA = "visa"
    MASTERCARD = "mastercard"
    CARD = "card"       # Auto-detects Visa vs Mastercard
    UPI = "upi"
    VPA = "vpa"         # Alias for UPI


@dataclass(frozen=True)
class PaymentValidationResult:
    """
    Structured outcome of a payment validation check.

    Attributes:
        is_valid: True if all structural, algorithmic, and range checks pass.
        method: The normalized payment method that was evaluated.
        sanitized_input: Cleaned representation (stripped of spaces/hyphens).
        errors: Granular list of human-readable validation error messages.
        field_flags: UI-targeted mapping of form field keys to specific error flags.
        metadata: Diagnostic context (e.g. detected card brand, length, masked string).
    """
    is_valid: bool
    method: str
    sanitized_input: str
    errors: list[str] = field(default_factory=list)
    field_flags: dict[str, str] = field(default_factory=dict)
    metadata: dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> dict[str, Any]:
        """Convert the result into a JSON-serializable dictionary."""
        return {
            "is_valid": self.is_valid,
            "method": self.method,
            "sanitized_input": self.sanitized_input,
            "errors": list(self.errors),
            "field_flags": dict(self.field_flags),
            "metadata": dict(self.metadata),
        }


class PaymentValidator:
    """
    Production-grade validation engine enforcing offline data-integrity checks
    for Credit/Debit Cards and UPI Virtual Payment Addresses.
    """

    # ── COMPILED REGEX PATTERNS ──────────────────────────────────────────────
    # Visa: starts with 4; total length must be 13, 16, or 19 digits
    _VISA_PATTERN: re.Pattern = re.compile(r"^4(?:\d{12}|\d{15}|\d{18})$")

    # Mastercard 16-digit layout:
    #   - 51-55: standard legacy IIN/BIN range
    #   - 2221-2720: 2-series IIN/BIN range (effective since 2017)
    _MASTERCARD_PATTERN: re.Pattern = re.compile(
        r"^(?:5[1-5]\d{14}|2(?:2(?:2[1-9]|[3-9]\d)|[3-6]\d\d|7(?:[01]\d|20))\d{12})$"
    )

    # UPI VPA syntax: ^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$
    _UPI_PATTERN: re.Pattern = re.compile(
        r"^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$"
    )

    # ── OFFLINE INTEGRITY ALGORITHMS ─────────────────────────────────────────
    @staticmethod
    def luhn_checksum(number_str: str) -> bool:
        """
        Validate numerical integrity via the Mod-10 Luhn check algorithm.
        Pure Python implementation with O(N) single-pass complexity and zero allocations.

        Args:
            number_str: A string composed entirely of ASCII digits.

        Returns:
            bool: True if Mod-10 checksum equals 0, False otherwise.
        """
        if not number_str or not number_str.isdigit():
            return False

        checksum = 0
        is_second_digit = False

        # Traverse right-to-left
        for char in reversed(number_str):
            digit = ord(char) - ord("0")
            if is_second_digit:
                digit *= 2
                if digit > 9:
                    digit -= 9
            checksum += digit
            is_second_digit = not is_second_digit

        return (checksum % 10) == 0

    @staticmethod
    def sanitize_card_number(raw_card: str | Any) -> str:
        """Strip all whitespaces, tabs, and hyphens from the card number string."""
        if not isinstance(raw_card, str):
            raw_card = str(raw_card or "")
        return re.sub(r"[\s\-]+", "", raw_card.strip())

    @staticmethod
    def sanitize_upi_id(raw_upi: str | Any) -> str:
        """Trim surrounding whitespace from the UPI / VPA handle."""
        if not isinstance(raw_upi, str):
            raw_upi = str(raw_upi or "")
        return raw_upi.strip()

    @staticmethod
    def mask_identifier(value: str, visible_start: int = 0, visible_end: int = 4) -> str:
        """Helper to create a PCI/PII-safe masked string for audit logs and UI confirmation."""
        if len(value) <= (visible_start + visible_end):
            return "*" * len(value)
        return (
            value[:visible_start]
            + ("*" * (len(value) - visible_start - visible_end))
            + value[-visible_end:]
        )

    # ── VALIDATION METHODS ───────────────────────────────────────────────────
    @classmethod
    def validate_visa(cls, card_input: str) -> PaymentValidationResult:
        """
        Validate a Visa card number against:
          1. Character sanitization (digits only)
          2. Structural layout regex (^4... with length 13, 16, or 19)
          3. Mod-10 Luhn checksum algorithm
        """
        sanitized = cls.sanitize_card_number(card_input)
        errors: list[str] = []
        field_flags: dict[str, str] = {}
        metadata: dict[str, Any] = {
            "card_brand": "Visa",
            "length": len(sanitized),
            "masked": cls.mask_identifier(sanitized, 1, 4) if sanitized else "",
        }

        if not sanitized:
            msg = "Visa card number is required."
            errors.append(msg)
            field_flags["card_number"] = msg
            return PaymentValidationResult(
                is_valid=False,
                method="visa",
                sanitized_input=sanitized,
                errors=errors,
                field_flags=field_flags,
                metadata=metadata,
            )

        if not sanitized.isdigit():
            msg = "Card number must contain digits only after removing spaces/hyphens."
            errors.append(msg)
            field_flags["card_number"] = msg
            return PaymentValidationResult(
                is_valid=False,
                method="visa",
                sanitized_input=sanitized,
                errors=errors,
                field_flags=field_flags,
                metadata=metadata,
            )

        # Check structural layout (IIN starts with '4' and length in [13, 16, 19])
        if not sanitized.startswith("4"):
            msg = "Invalid Visa card prefix: must begin with digit '4'."
            errors.append(msg)
            field_flags["card_number"] = msg

        if len(sanitized) not in (13, 16, 19):
            msg = f"Invalid Visa card length ({len(sanitized)} digits). Visa cards must be exactly 13, 16, or 19 digits."
            errors.append(msg)
            field_flags["card_number"] = msg

        if not errors and not cls._VISA_PATTERN.match(sanitized):
            msg = "Card number failed Visa structural regex validation."
            errors.append(msg)
            field_flags["card_number"] = msg

        # Algorithmic integrity check
        if not cls.luhn_checksum(sanitized):
            msg = "Card number failed Mod-10 Luhn checksum verification. Please re-check the entered digits."
            errors.append(msg)
            field_flags["card_number"] = msg

        is_valid = len(errors) == 0
        return PaymentValidationResult(
            is_valid=is_valid,
            method="visa",
            sanitized_input=sanitized,
            errors=errors,
            field_flags=field_flags,
            metadata=metadata,
        )

    @classmethod
    def validate_mastercard(cls, card_input: str) -> PaymentValidationResult:
        """
        Validate a Mastercard card number against:
          1. Character sanitization (digits only)
          2. Structural layout regex (51-55 or 2221-2720, exactly 16 digits)
          3. Mod-10 Luhn checksum algorithm
        """
        sanitized = cls.sanitize_card_number(card_input)
        errors: list[str] = []
        field_flags: dict[str, str] = {}
        metadata: dict[str, Any] = {
            "card_brand": "Mastercard",
            "length": len(sanitized),
            "masked": cls.mask_identifier(sanitized, 2, 4) if sanitized else "",
        }

        if not sanitized:
            msg = "Mastercard card number is required."
            errors.append(msg)
            field_flags["card_number"] = msg
            return PaymentValidationResult(
                is_valid=False,
                method="mastercard",
                sanitized_input=sanitized,
                errors=errors,
                field_flags=field_flags,
                metadata=metadata,
            )

        if not sanitized.isdigit():
            msg = "Card number must contain digits only after removing spaces/hyphens."
            errors.append(msg)
            field_flags["card_number"] = msg
            return PaymentValidationResult(
                is_valid=False,
                method="mastercard",
                sanitized_input=sanitized,
                errors=errors,
                field_flags=field_flags,
                metadata=metadata,
            )

        # Check length
        if len(sanitized) != 16:
            msg = f"Invalid Mastercard length ({len(sanitized)} digits). Mastercard numbers must be exactly 16 digits."
            errors.append(msg)
            field_flags["card_number"] = msg

        # Check IIN / BIN prefix range (51-55 or 2221-2720)
        prefix_2 = int(sanitized[:2]) if len(sanitized) >= 2 else 0
        prefix_4 = int(sanitized[:4]) if len(sanitized) >= 4 else 0
        in_legacy_range = 51 <= prefix_2 <= 55
        in_2series_range = 2221 <= prefix_4 <= 2720

        if not (in_legacy_range or in_2series_range):
            msg = (
                "Invalid Mastercard prefix: must start with 51-55 (legacy) "
                "or 2221-2720 (2-series IIN range)."
            )
            errors.append(msg)
            field_flags["card_number"] = msg

        if not errors and not cls._MASTERCARD_PATTERN.match(sanitized):
            msg = "Card number failed Mastercard structural regex validation."
            errors.append(msg)
            field_flags["card_number"] = msg

        # Algorithmic integrity check
        if not cls.luhn_checksum(sanitized):
            msg = "Card number failed Mod-10 Luhn checksum verification. Please re-check the entered digits."
            errors.append(msg)
            field_flags["card_number"] = msg

        is_valid = len(errors) == 0
        return PaymentValidationResult(
            is_valid=is_valid,
            method="mastercard",
            sanitized_input=sanitized,
            errors=errors,
            field_flags=field_flags,
            metadata=metadata,
        )

    @classmethod
    def validate_card_auto(cls, card_input: str) -> PaymentValidationResult:
        """
        Auto-detect whether the card is Visa or Mastercard based on prefix
        and execute the corresponding validator.
        """
        sanitized = cls.sanitize_card_number(card_input)
        if sanitized.startswith("4"):
            return cls.validate_visa(sanitized)

        # Check Mastercard prefix
        if len(sanitized) >= 2:
            prefix_2 = int(sanitized[:2]) if sanitized[:2].isdigit() else 0
            prefix_4 = int(sanitized[:4]) if len(sanitized) >= 4 and sanitized[:4].isdigit() else 0
            if (51 <= prefix_2 <= 55) or (2221 <= prefix_4 <= 2720):
                return cls.validate_mastercard(sanitized)

        # Fallback if brand couldn't be detected
        errors = ["Unsupported or unrecognized card brand. Only Visa and Mastercard are accepted."]
        return PaymentValidationResult(
            is_valid=False,
            method="card",
            sanitized_input=sanitized,
            errors=errors,
            field_flags={"card_number": errors[0]},
            metadata={"length": len(sanitized), "card_brand": "Unknown"},
        )

    @classmethod
    def validate_upi(cls, upi_input: str) -> PaymentValidationResult:
        r"""
        Validate a UPI Virtual Payment Address (VPA) syntax against:
          Pattern: ^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$
        """
        sanitized = cls.sanitize_upi_id(upi_input)
        errors: list[str] = []
        field_flags: dict[str, str] = {}
        metadata: dict[str, Any] = {
            "type": "UPI_VPA",
            "length": len(sanitized),
        }

        if not sanitized:
            msg = "UPI ID / VPA is required."
            errors.append(msg)
            field_flags["upi_id"] = msg
            return PaymentValidationResult(
                is_valid=False,
                method="upi",
                sanitized_input=sanitized,
                errors=errors,
                field_flags=field_flags,
                metadata=metadata,
            )

        if "@" not in sanitized:
            msg = "Invalid UPI ID format: missing '@' separator (expected format: username@bank)."
            errors.append(msg)
            field_flags["upi_id"] = msg
        else:
            username_part, handle_part = sanitized.split("@", 1)
            metadata["username"] = username_part
            metadata["bank_handle"] = handle_part

            if len(username_part) < 2 or len(username_part) > 256:
                msg = f"UPI username length must be between 2 and 256 characters (got {len(username_part)})."
                errors.append(msg)
                field_flags["upi_id"] = msg

            if len(handle_part) < 2 or len(handle_part) > 64:
                msg = f"UPI bank handle length must be between 2 and 64 alphabetic characters (got {len(handle_part)})."
                errors.append(msg)
                field_flags["upi_id"] = msg

            if not cls._UPI_PATTERN.match(sanitized):
                msg = (
                    "Invalid UPI ID structure. Allowed characters: alphanumeric, dots, hyphens, "
                    "or underscores before '@', followed by an alphabetic bank PSP handle."
                )
                errors.append(msg)
                field_flags["upi_id"] = msg

        is_valid = len(errors) == 0
        return PaymentValidationResult(
            is_valid=is_valid,
            method="upi",
            sanitized_input=sanitized,
            errors=errors,
            field_flags=field_flags,
            metadata=metadata,
        )

    # ── DYNAMIC ROUTER FUNCTION ──────────────────────────────────────────────
    @classmethod
    def validate_payment(
        cls,
        method: str | PaymentMethod,
        payment_data: str | dict[str, Any],
    ) -> PaymentValidationResult:
        """
        Dynamic router function that inspects the payment method string,
        unpacks the account/card/VPA input, and dispatches to the corresponding validator.

        Supported method strings (case-insensitive):
          - 'visa'
          - 'mastercard' / 'master_card' / 'mc'
          - 'card' / 'debit_card' / 'credit_card' (auto-detects Visa or Mastercard)
          - 'upi' / 'vpa' / 'bhim' / 'gpay' / 'phonepe'

        Args:
            method: The selected payment/account method key or enum.
            payment_data: Either a raw input string (e.g. card number or VPA)
                          or a dict with keys like 'card_number', 'upi_id', 'account', or 'value'.

        Returns:
            PaymentValidationResult containing is_valid, sanitized_input, errors, and field_flags.
        """
        # Extract raw target string from dict or direct scalar
        raw_value = ""
        if isinstance(payment_data, dict):
            for key in ("card_number", "upi_id", "vpa", "account", "value", "number"):
                if payment_data.get(key):
                    raw_value = str(payment_data[key])
                    break
        else:
            raw_value = str(payment_data or "")

        # Normalize method key
        normalized_method = str(method).strip().lower()
        if normalized_method.startswith("paymentmethod."):
            normalized_method = normalized_method.split(".", 1)[1]

        # Dispatch table
        router_map: dict[str, Callable[[str], PaymentValidationResult]] = {
            "visa": cls.validate_visa,
            "mastercard": cls.validate_mastercard,
            "master_card": cls.validate_mastercard,
            "mc": cls.validate_mastercard,
            "card": cls.validate_card_auto,
            "debit_card": cls.validate_card_auto,
            "credit_card": cls.validate_card_auto,
            "upi": cls.validate_upi,
            "vpa": cls.validate_upi,
            "bhim": cls.validate_upi,
            "gpay": cls.validate_upi,
            "phonepe": cls.validate_upi,
            "paytm": cls.validate_upi,
        }

        validator_fn = router_map.get(normalized_method)
        if not validator_fn:
            supported = sorted(set(router_map.keys()))
            msg = (
                f"Unsupported payment method '{method}'. "
                f"Supported methods are: {', '.join(supported)}"
            )
            return PaymentValidationResult(
                is_valid=False,
                method=normalized_method,
                sanitized_input=raw_value,
                errors=[msg],
                field_flags={"payment_method": msg},
                metadata={"supported_methods": supported},
            )

        return validator_fn(raw_value)


# Global top-level convenience router function
validate_payment = PaymentValidator.validate_payment
validate_visa = PaymentValidator.validate_visa
validate_mastercard = PaymentValidator.validate_mastercard
validate_upi = PaymentValidator.validate_upi
luhn_checksum = PaymentValidator.luhn_checksum
