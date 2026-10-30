import {
  catalogListingCategorySlugFromProduct,
  encodeLocalPublicImagePath,
  excerptForProductCard,
  formatProductTitleForCardDisplay,
  getCategoryLabel,
  getCategoryReturnLinkText,
  getCategoryRoute,
  isDescriptionRedundantWithTitle,
  normalizeImagePath,
  normalizeMultilineText,
  pickCategoryListingSpecLines,
  productFallbackImageDataUrl,
  productToCatalogCard,
  resolveProductImage,
  technicalSpecLineToDetailRow,
  technicalSpecLineToKeyValue
} from './product-ui';

describe('product-ui helpers', () => {
  it('normalizes relative image paths', () => {
    expect(normalizeImagePath('iPhone-17.jpg')).toBe('/iPhone-17.jpg');
  });

  it('reuses images that are really available in public', () => {
    const image = resolveProductImage({
      id: 7,
      name: 'APPLE iPhone 17 256GB Nero',
      category: 'telefoni',
      image_url: 'iPhone-17.jpg'
    });

    expect(image).toBe('/iPhone-17.jpg');
  });

  it('overrides missing phone asset paths with real public images', () => {
    const image = resolveProductImage({
      id: 1,
      name: 'APPLE iPhone 16 128GB Nero',
      category: 'telefoni',
      image_url: '/card-iphone.jpg'
    });

    expect(image).toBe('/iPhone-16-pro.jpg');
  });

  it('overrides appliance and tv asset paths with renamed public images', () => {
    const fridgeImage = resolveProductImage({
      id: 8,
      name: 'LG GBV3100DPY FRIGORIFERO COMBINATO',
      category: 'elettrodomestici',
      image_url: '1frigorifero.jpg'
    });

    const tvImage = resolveProductImage({
      id: 11,
      name: 'SAMSUNG UE43CU7090UXZT TV LED, 43 \", UHD 4K',
      category: 'tv',
      image_url: '1tv.jpg'
    });

    expect(fridgeImage).toBe('/LG-GBV3100DPY.jpg');
    expect(tvImage).toBe('/SAMSUNG-UE43CU7090UXZT.jpg');
  });

  it('returns a safe inline fallback when the path is not allowed (traversal)', () => {
    const image = resolveProductImage({
      id: 999,
      name: 'Prodotto path non valido',
      category: 'elettrodomestici',
      image_url: '../unsafe.jpg'
    });

    expect(image.startsWith('data:image/svg+xml')).toBeTrue();
  });

  it('encodes local public filenames with spaces and special characters', () => {
    const encoded = encodeLocalPublicImagePath('/SAMSUNG Galaxy S26+ 256GB, 256 GB, Sky Blue.jpg');
    expect(encoded).toContain('%20');
    expect(encoded).not.toContain(' ');
  });

  it('maps category routes consistently', () => {
    expect(getCategoryRoute('tv')).toEqual(['/tv']);
    expect(getCategoryRoute('telefoni')).toEqual(['/telefoni']);
    expect(getCategoryRoute('elettrodomestici')).toEqual(['/elettrodomestici']);
    expect(getCategoryRoute('computer')).toEqual(['/computer']);
  });

  it('normalizes carriage returns for backend text fields', () => {
    expect(normalizeMultilineText('a\rb\r\nc')).toBe('a\nb\nc');
  });

  it('creates optional card excerpts from long descriptions', () => {
    expect(excerptForProductCard('Breve')).toBe('Breve');
    const long = excerptForProductCard('parola '.repeat(40).trim(), 40);
    expect(long!.endsWith('…')).toBeTrue();
  });

  it('leaves mixed-case titles untouched for card display', () => {
    expect(formatProductTitleForCardDisplay('Apple iPhone 17 256GB Nero')).toBe('Apple iPhone 17 256GB Nero');
  });

  it('leaves dense technical / TV titles unchanged (sigle, codici modello)', () => {
    const lgOled =
      'LG OLED evo G5 OLED48G56LS TV OLED, SMART TV, 48, OLED, PROCESSORE AI';
    expect(formatProductTitleForCardDisplay(lgOled)).toBe(lgOled);

    const samsung =
      'SAMSUNG UE43CU7090UXZT TV LED, 43, UHD 4K';
    expect(formatProductTitleForCardDisplay(samsung)).toBe(samsung);
  });

  it('leaves SKU-heavy phone titles unchanged when many numeric tokens', () => {
    const phone = 'MOTOROLA EDGE 60 PRO 12+512, 512 GB, GREEN';
    expect(formatProductTitleForCardDisplay(phone)).toBe(phone);
  });

  it('softens simple all-caps titles without heavy technical density', () => {
    expect(formatProductTitleForCardDisplay('FRIGORIFERO COMBINATO VERTICALE')).toBe(
      'Frigorifero Combinato Verticale'
    );
  });

  it('applies light title case when the line is not highly technical', () => {
    expect(formatProductTitleForCardDisplay('MOTOROLA SMARTPHONE LINEA BASIC')).toBe(
      'Motorola Smartphone Linea Basic'
    );
  });

  it('flags excerpts that mostly repeat the card title', () => {
    const title = 'Samsung Galaxy S26 Ultra 256GB';
    const excerpt = 'Samsung Galaxy S26 Ultra 256GB smartphone con display AMOLED e fotocamera';
    expect(isDescriptionRedundantWithTitle(title, excerpt)).toBeTrue();
  });

  it('keeps excerpts that add non-redundant detail', () => {
    const title = 'LG OLED evo C5 OLED42C55LA TV OLED';
    const excerpt =
      'Ideale per soggiorni compatti: basso input lag, perfetto per film e gaming in 4K.';
    expect(isDescriptionRedundantWithTitle(title, excerpt)).toBeFalse();
  });

  it('orders TV listing specs toward display size, resolution and smart features', () => {
    const specs =
      'Design sottile\nTV LED Samsung 43 pollici\nRisoluzione UHD 4K\nPiattaforma Smart TV\nSupporto streaming';
    const lines = pickCategoryListingSpecLines(specs, 'tv', 4);
    expect(lines).toContain('TV LED Samsung 43 pollici');
    expect(lines).toContain('Risoluzione UHD 4K');
    expect(lines).toContain('Piattaforma Smart TV');
    expect(lines.length).toBe(4);
  });

  it('parses technical spec lines with a single colon into key/value pairs', () => {
    expect(technicalSpecLineToKeyValue('Display: 6,1 pollici')).toEqual({
      key: 'Display',
      value: '6,1 pollici'
    });
    expect(technicalSpecLineToKeyValue('Senza due punti')).toBeNull();
    expect(technicalSpecLineToKeyValue(': solo valore')).toBeNull();
  });

  it('detail rows drop useless keys like Voce dettaglio and keep API values', () => {
    expect(technicalSpecLineToDetailRow('Voce Dettaglio: 256 GB')).toEqual({
      kind: 'line',
      text: '256 GB'
    });
    expect(technicalSpecLineToDetailRow('Display: OLED')).toEqual({
      kind: 'kv',
      key: 'Display',
      value: 'OLED'
    });
  });

  it('uses Telefonia as display label for telefoni slug (aligned with primary nav)', () => {
    expect(getCategoryLabel('telefoni')).toBe('Telefonia');
    expect(getCategoryReturnLinkText('telefoni')).toBe('Torna alla telefonia');
    expect(getCategoryReturnLinkText('tv')).toBe('Torna al reparto TV');
  });

  it('exposes the same SVG fallback used for unsafe image paths', () => {
    const url = productFallbackImageDataUrl('Test', 'tv');
    expect(url.startsWith('data:image/svg+xml')).toBeTrue();
  });

  it('category listing cards omit description and surface technical_specs lines', () => {
    const card = productToCatalogCard(
      {
        id: 11,
        name: 'SAMSUNG TV',
        brand: 'Samsung',
        price: '399.00',
        image_url: '/x.jpg',
        category: 'tv',
        description: 'Descrizione lunga da non mostrare in card categoria quando si usano le specifiche.',
        technical_specs: 'TV LED 50 pollici\nUHD 4K\nSmart TV\nHDR10',
        is_featured: false,
        stock_quantity: 10,
        availability_status: 'in_stock'
      },
      { categoryListingFrom: 'tv' }
    );
    expect(card.description).toBeUndefined();
    expect(card.keyHighlights?.length).toBe(4);
    expect(card.keyHighlights?.join(' ')).not.toContain('Descrizione lunga');
  });

  it('catalogListingCategorySlugFromProduct maps known API categories and neutralizes unknown', () => {
    const neutral = catalogListingCategorySlugFromProduct('');
    expect(catalogListingCategorySlugFromProduct('tv')).toBe('tv');
    expect(catalogListingCategorySlugFromProduct('  Telefoni ')).toBe('telefoni');
    expect(catalogListingCategorySlugFromProduct(undefined)).toBe(neutral);
    expect(catalogListingCategorySlugFromProduct('sconosciuta')).toBe(neutral);
    expect(catalogListingCategorySlugFromProduct('tv')).not.toBe(neutral);
  });

  it('offerte-style cards use API category slug and omit marketing excerpt', () => {
    const card = productToCatalogCard(
      {
        id: 2,
        name: 'Prodotto test',
        brand: 'Demo',
        price: '10.00',
        original_price: '20.00',
        image_url: '/x.jpg',
        category: 'computer',
        description: 'Testo marketing che non deve comparire in card offerte.',
        technical_specs: 'Processore: Intel Core i7\nRAM: 16 GB\nSSD: 512 GB',
        is_featured: false,
        stock_quantity: 10,
        availability_status: 'in_stock'
      },
      { categoryListingFrom: catalogListingCategorySlugFromProduct('computer') }
    );
    expect(card.description).toBeUndefined();
    expect(card.keyHighlights?.length).toBeGreaterThan(0);
    expect(card.keyHighlights?.join(' ')).not.toContain('marketing');
  });
});
