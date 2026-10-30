from django.db import migrations


TECHNICAL_SPECS_BY_ID = {
    1: "Display Super Retina XDR 6,1 pollici\nChip Apple di ultima generazione\nMemoria interna 128 GB\nConnettivita 5G e Wi-Fi\nFotocamera evoluta per scatti quotidiani",
    2: "Display ampio da 6,7 pollici\nMemoria interna 128 GB\nAutonomia ottimizzata per uso intensivo\nConnettivita 5G\nDesign Apple in finitura nera",
    3: "Memoria interna 256 GB\nDisplay di fascia premium\nFotocamere avanzate per foto e video\nConnettivita 5G\nFinitura bianca",
    4: "Memoria interna 256 GB\nScocca Natural Titanium\nDisplay ad alta luminosita\nPiattaforma Apple di fascia alta\nConnettivita 5G",
    5: "Memoria interna 256 GB\nFinitura Arancione cosmico\nDisplay premium di nuova generazione\nPrestazioni elevate per multitasking e gaming\nConnettivita 5G",
    6: "Memoria interna 256 GB\nFinitura Blu profondo\nDisplay premium ad alta definizione\nSistema fotografico avanzato\nConnettivita 5G",
    7: "Memoria interna 256 GB\nFinitura nera\nDisplay ad alta luminosita\nEsperienza Apple aggiornata\nConnettivita 5G",
    8: "Capacita totale 344 litri\nTecnologia No Frost\nFormato frigorifero combinato\nColore inox/dark silver\nPensato per nuclei familiari medi",
    9: "Lavatrice slim salvaspazio\nCapacita di carico 6 kg\nProgrammi dedicati ai capi quotidiani\nCentrifuga adatta all'uso domestico\nFormato compatto",
    10: "Lavastoviglie a libera installazione\nCapacita 13 coperti\nProgrammi per lavaggi quotidiani\nFinitura inox\nAdatta a famiglie e cucina di casa",
    11: "TV LED Samsung 43 pollici\nRisoluzione UHD 4K\nPiattaforma Smart TV\nSupporto ai principali contenuti streaming\nDesign sottile",
    12: "TV LED Samsung 43 pollici\nRisoluzione UHD 4K\nGamma 2024\nFunzioni Smart TV\nPensata per soggiorno o camera",
    13: "TV Neo QLED Mini LED 55 pollici\nRisoluzione UHD 4K\nTecnologia Mini LED Samsung\nPrestazioni elevate per film e gaming\nDesign premium",
    14: "TV QLED Samsung 50 pollici\nRisoluzione UHD 4K\nPannello piatto\nFunzioni Smart TV\nTaglio adatto al salotto",
}


def seed_technical_specs(apps, schema_editor):
    Product = apps.get_model("api", "Product")

    for product_id, technical_specs in TECHNICAL_SPECS_BY_ID.items():
        Product.objects.filter(id=product_id, technical_specs="").update(
            technical_specs=technical_specs
        )


def clear_seeded_technical_specs(apps, schema_editor):
    Product = apps.get_model("api", "Product")

    for product_id, technical_specs in TECHNICAL_SPECS_BY_ID.items():
        Product.objects.filter(id=product_id, technical_specs=technical_specs).update(
            technical_specs=""
        )


class Migration(migrations.Migration):
    dependencies = [
        ("api", "0003_product_technical_specs"),
    ]

    operations = [
        migrations.RunPython(seed_technical_specs, clear_seeded_technical_specs),
    ]
