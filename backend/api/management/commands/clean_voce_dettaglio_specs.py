"""
Rimuove in sicurezza righe (o prefissi riga) «Voce Dettaglio» dal campo Product.technical_specs.

Predefinito: solo analisi (dry-run). Con --apply esegue l'aggiornamento sul database.
"""

from __future__ import annotations

from django.core.management.base import BaseCommand
from django.db import transaction

from api.models import Product
from api.technical_specs_cleanup import clean_technical_specs_block


class Command(BaseCommand):
    help = (
        "Pulisce il testo technical_specs rimuovendo etichette spurie «Voce Dettaglio» "
        "(dry-run di default; usa --apply per salvare)."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--apply",
            action="store_true",
            help="Scrive le modifiche sul database (senza questo flag è solo anteprima).",
        )
        parser.add_argument(
            "--id",
            type=int,
            default=None,
            help="Limita l'operazione a un singolo product id.",
        )
        parser.add_argument(
            "--sample",
            type=int,
            default=5,
            help="Numero massimo di esempi prima/dopo mostrati in anteprima.",
        )

    def handle(self, *args, **options):
        apply_changes: bool = options["apply"]
        single_id: int | None = options["id"]
        sample_limit: int = options["sample"]

        qs = Product.objects.exclude(technical_specs="").order_by("id")
        if single_id is not None:
            qs = qs.filter(id=single_id)

        to_update: list[Product] = []
        ambiguous_records: list[tuple[int, str]] = []
        samples: list[tuple[int, str, str]] = []

        for product in qs.iterator(chunk_size=100):
            original = product.technical_specs
            result = clean_technical_specs_block(original)
            if result.ambiguous:
                ambiguous_records.append((product.id, result.ambiguous_reason or ""))
                continue
            if not result.changed:
                continue
            product.technical_specs = result.cleaned
            to_update.append(product)
            if len(samples) < sample_limit:
                samples.append((product.id, original, result.cleaned))

        self.stdout.write(
            self.style.NOTICE(
                f"Modello: api.Product | Campo: technical_specs | "
                f"Modalità: {'APPLY (scrittura DB)' if apply_changes else 'DRY-RUN (sola lettura)'}"
            )
        )
        self.stdout.write(f"Record candidati (technical_specs non vuoto): {qs.count()}")
        self.stdout.write(f"Record che verrebbero modificati: {len(to_update)}")
        if ambiguous_records:
            self.stdout.write(
                self.style.WARNING(
                    f"Record SALTATI (ambigui, nessuna modifica): {len(ambiguous_records)}"
                )
            )
            for pid, reason in ambiguous_records[:20]:
                self.stdout.write(f"  id={pid}: {reason}")
            if len(ambiguous_records) > 20:
                self.stdout.write(f"  ... altri {len(ambiguous_records) - 20}")

        for pid, before, after in samples:
            self.stdout.write("")
            self.stdout.write(self.style.HTTP_INFO(f"--- Esempio id={pid} ---"))
            self.stdout.write(self.style.WARNING("PRIMA (estratti)"))
            self.stdout.write(self._snippet(before))
            self.stdout.write(self.style.SUCCESS("DOPO (estratti)"))
            self.stdout.write(self._snippet(after))

        if not apply_changes:
            self.stdout.write("")
            self.stdout.write(
                self.style.SUCCESS(
                    "Dry-run completato. Per applicare: python manage.py clean_voce_dettaglio_specs --apply"
                )
            )
            if single_id is not None:
                self.stdout.write("(con lo stesso --id se l'hai usato)")
            return

        if not to_update:
            self.stdout.write(self.style.WARNING("Nessun record da aggiornare."))
            return

        with transaction.atomic():
            Product.objects.bulk_update(to_update, ["technical_specs"], batch_size=50)

        self.stdout.write("")
        self.stdout.write(
            self.style.SUCCESS(f"Aggiornati {len(to_update)} record (bulk_update technical_specs).")
        )

    @staticmethod
    def _snippet(text: str, max_len: int = 900) -> str:
        t = text.replace("\t", "<TAB>").encode("ascii", "replace").decode("ascii")
        if len(t) <= max_len:
            return t
        return t[:max_len] + "\n[...troncato...]"
