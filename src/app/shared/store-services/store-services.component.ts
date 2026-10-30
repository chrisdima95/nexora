import { ChangeDetectionStrategy, Component } from '@angular/core';

export type StoreServiceIcon = 'truck' | 'shield' | 'undo' | 'lifebuoy';

export interface StoreServiceItem {
  id: string;
  icon: StoreServiceIcon;
  title: string;
  description: string;
}

@Component({
  selector: 'app-store-services',
  standalone: true,
  templateUrl: './store-services.component.html',
  styleUrl: './store-services.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class StoreServicesComponent {
  readonly services: StoreServiceItem[] = [
    {
      id: 'shipping',
      icon: 'truck',
      title: 'Dal prodotto al carrello',
      description:
        'Categorie, ricerca e scheda prodotto: pochi passaggi per aggiungere al carrello.'
    },
    {
      id: 'payments',
      icon: 'shield',
      title: 'Ordine di prova',
      description:
        'Il checkout è solo dimostrativo: nessun pagamento viene registrato o addebitato.'
    },
    {
      id: 'returns',
      icon: 'undo',
      title: 'Reso e recesso',
      description:
        'Promemoria sul diritto di recesso: da queste pagine non parte alcuna pratica di reso.'
    },
    {
      id: 'support',
      icon: 'lifebuoy',
      title: 'Orientarsi nel sito',
      description:
        'Menu in alto e ricerca per orientarti nel catalogo.'
    }
  ];
}
