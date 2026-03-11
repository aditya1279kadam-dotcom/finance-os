import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DataProcessingService } from '../../services/data-processing.service';

@Component({
  selector: 'app-category-card',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="card category-card" (click)="onClick.emit(category)" style="cursor: pointer; transition: transform 0.2s; border: 1px solid var(--border);">
      <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px;">
        <div>
          <h3 style="margin: 0; font-size: 1.25rem;">{{ category }}</h3>
          <p style="color: var(--text-muted); font-size: 0.85rem; margin: 4px 0 0 0;">Project Portfolio Group</p>
        </div>
        <div style="background: rgba(79, 70, 229, 0.1); color: #4f46e5; padding: 8px; border-radius: 8px;">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
            </svg>
        </div>
      </div>
      
      <div style="margin-bottom: 24px;">
        <div style="font-size: 0.85rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px;">Net Profit</div>
        <div style="font-size: 1.75rem; font-weight: 800; color: var(--text-main);">{{ dataProc.formatCurrency(profit) }}</div>
      </div>

      <div style="display: flex; align-items: center; justify-content: space-between; padding-top: 16px; border-top: 1px dashed var(--border);">
        <div style="font-size: 0.85rem; color: var(--text-muted); font-weight: 600;">Operating Margin</div>
        <div class="badge-pill" [ngClass]="dataProc.getMarginClass(margin)" style="font-size: 0.85rem; padding: 4px 10px;">
          {{ (margin * 100).toFixed(1) }}%
        </div>
      </div>
    </div>
  `,
  styles: [`
    .category-card:hover {
      transform: translateY(-4px);
      box-shadow: 0 12px 24px rgba(0,0,0,0.06);
      border-color: #cbd5e1;
    }
  `]
})
export class CategoryCardComponent {
  @Input() category!: string;
  @Input() profit!: number;
  @Input() margin!: number;

  @Output() onClick = new EventEmitter<string>();

  constructor(public dataProc: DataProcessingService) { }
}
