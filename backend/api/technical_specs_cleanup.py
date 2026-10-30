"""
Pulizia controllata del testo `technical_specs` dei prodotti.

Rimuove solo etichette spurie di tipo "Voce Dettaglio" (tipicamente righe TSV
importate come `Voce\\tDettaglio`) senza toccare il resto della scheda tecnica.
"""

from __future__ import annotations

import re
from typing import NamedTuple

# Riga che contiene *solo* l'intestazione colonna "Voce | Dettaglio" (varianti tab/spazi/':').
_LINE_LABEL_ONLY = re.compile(
    r"^[\s\u00a0]*voce(?:\s+|\t+|:\s*)dettaglio\s*:?\s*$",
    re.IGNORECASE | re.UNICODE,
)

# Stessa etichetta all'inizio riga, seguita da contenuto utile da conservare.
_LINE_STRIP_PREFIX = re.compile(
    r"^[\s\u00a0]*voce(?:\s+|\t+|:\s*)dettaglio(?:\s+|\t+|:\s*)(.+)$",
    re.IGNORECASE | re.UNICODE,
)

class CleanupResult(NamedTuple):
    cleaned: str
    """Testo dopo la pulizia (uguale all'originale se nulla da fare)."""

    changed: bool
    """True se almeno una riga è stata rimossa o riscritta."""

    ambiguous: bool
    """True se è stato trovato un caso non gestito in sicurezza."""

    ambiguous_reason: str | None


def clean_technical_specs_block(text: str) -> CleanupResult:
    """
    Applica le regole di pulizia a un blocco `technical_specs`.

    - Rimuove righe composte *unicamente* da varianti di «Voce Dettaglio».
    - Se la riga inizia con quell'etichetta e continua con testo utile, rimuove solo il prefisso.
    - Se compare «voce» e «dettaglio» in una riga in modo non riconosciuto, marca `ambiguous`
      e restituisce il testo **originale** senza modifiche.
    """
    if not text:
        return CleanupResult(text, False, False, None)

    out_lines: list[str] = []
    changed = False

    for raw in text.splitlines():
        line = raw.rstrip("\r")

        m_val = _LINE_STRIP_PREFIX.match(line)
        if m_val:
            rest = m_val.group(1)
            if rest != line:
                changed = True
            out_lines.append(rest)
            continue

        if _LINE_LABEL_ONLY.match(line):
            changed = True
            continue

        if re.search(r"\bvoce\b", line, re.I) and re.search(r"\bdettaglio\b", line, re.I):
            return CleanupResult(
                text,
                False,
                True,
                f"Riga non gestita in sicurezza: {line[:200]!r}",
            )

        out_lines.append(line)

    cleaned = "\n".join(out_lines)
    # Mantieni assenza/presenza newline finale come nell'originale (solo se cambiato).
    if changed and text.endswith("\n") and not cleaned.endswith("\n"):
        cleaned += "\n"
    elif changed and not text.endswith("\n") and cleaned.endswith("\n"):
        cleaned = cleaned.rstrip("\n")

    if cleaned == text:
        changed = False

    return CleanupResult(cleaned, changed, False, None)
