import { Component, ChangeDetectionStrategy } from '@angular/core';
import { RouterModule, Router } from '@angular/router';


@Component({
  selector: 'app-notfound',
  templateUrl: './notfound.component.html',
  styleUrls: ['./notfound.component.css'],
  standalone: true, 
  imports: [RouterModule],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class NotfoundComponent {
  constructor(private router: Router) {}

  get currentUrl(): string {
    const rawUrl = this.router.url.split('?')[0] ?? '';
    const trimmed = rawUrl.trim();
    return trimmed || '/';
  }
}
