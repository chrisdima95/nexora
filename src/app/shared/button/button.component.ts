import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-button',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './button.component.html',
  styleUrls: ['./button.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})

export class ButtonComponent {
  @Input() buttonText: string = 'Default Button';
  @Input() routerLink: any;
  /** `solid` = CTA principale (blu); `soft` = secondario outline leggero (catalogo / dettagli). */
  @Input() appearance: 'solid' | 'soft' = 'soft';
}
