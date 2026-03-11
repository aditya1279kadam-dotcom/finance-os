import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule],
  template: `
    <header class="page-header">
      <div style="display: flex; gap: 16px; align-items: flex-start;">
        <button class="mobile-nav-toggle" (click)="toggleSidebar.emit()">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M3 12h18M3 6h18M3 18h18" />
          </svg>
        </button>
        <div>
          <h1 style="display: flex; align-items: center; gap: 12px;">
            {{ title }}
            @if(lastRefreshed) {
            <span id="lastRefreshedBadge"
                  style="font-size: 0.75rem; padding: 4px 10px; background: rgba(16, 185, 129, 0.1); color: #10b981; border-radius: 12px; font-weight: 600; border: 1px solid rgba(16, 185, 129, 0.2);">
              Refreshed: {{ lastRefreshed | date:'medium' }}
            </span>
            }
          </h1>
          <p>{{ subtitle }}</p>
        </div>
      </div>
      <div style="display: flex; gap: 12px; align-items: center;">
        <ng-content></ng-content>
      </div>
    </header>
  `,
  styles: ``
})
export class HeaderComponent {
  @Input() title = '';
  @Input() subtitle = '';
  @Input() lastRefreshed?: Date | string | null;

  @Output() toggleSidebar = new EventEmitter<void>();
}
