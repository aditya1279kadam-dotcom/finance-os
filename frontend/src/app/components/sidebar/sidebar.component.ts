import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  template: `
    <div class="sidebar-overlay" [class.open]="isOpen" (click)="closeSidebar()"></div>
    <aside class="sidebar" [class.open]="isOpen">
      <button class="close-sidebar" (click)="closeSidebar()">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M18 6L6 18M6 6l12 12" />
        </svg>
      </button>
      <div class="logo">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="url(#logo-grad)" stroke-width="3"
             stroke-linecap="round" stroke-linejoin="round">
          <defs>
            <linearGradient id="logo-grad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stop-color="#4f46e5" />
              <stop offset="100%" stop-color="#818cf8" />
            </linearGradient>
          </defs>
          <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
        </svg>
        <span class="logo-text">FinanceOS</span>
      </div>

      <div class="nav-group">
        <div class="nav-label">MAIN MENU</div>
        <a routerLink="/" routerLinkActive="active" [routerLinkActiveOptions]="{exact: true}" class="nav-item">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"></path>
          </svg>
          <span>Sync Center</span>
        </a>
        <a routerLink="/project-dashboard" routerLinkActive="active" class="nav-item">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
            <line x1="3" y1="9" x2="21" y2="9"></line>
            <line x1="9" y1="21" x2="9" y2="9"></line>
          </svg>
          <span>Project-wise Report</span>
        </a>
        <a routerLink="/resource-dashboard" routerLinkActive="active" class="nav-item">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
            <circle cx="9" cy="7" r="4"></circle>
            <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
            <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
          </svg>
          <span>Resource-wise Report</span>
        </a>
        <a routerLink="/defaulters-report" routerLinkActive="active" class="nav-item">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
              <line x1="12" y1="9" x2="12" y2="13"></line>
              <line x1="12" y1="17" x2="12.01" y2="17"></line>
          </svg>
          <span>Jira Defaulter's List</span>
        </a>
      </div>
    </aside>
  `,
  styles: [`
    :host {
      display: block;
      width: 260px;
      flex-shrink: 0;
    }
    .sidebar {
      position: fixed;
      top: 0;
      left: 0;
      width: 260px;
      height: 100vh;
      background: #ffffff;
      border-right: 1px solid #e2e8f0;
      display: flex;
      flex-direction: column;
      padding: 24px 16px;
      box-sizing: border-box;
      z-index: 100;
      overflow-y: auto;
    }
    .sidebar-overlay {
      display: none;
    }
    .close-sidebar {
      display: none;
    }
    .logo {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 0 12px 24px;
      margin-bottom: 8px;
      border-bottom: 1px solid #e2e8f0;
    }
    .logo-text {
      font-family: 'Outfit', sans-serif;
      font-weight: 700;
      font-size: 1.25rem;
      color: #0f172a;
      letter-spacing: -0.02em;
    }
    .nav-group {
      display: flex;
      flex-direction: column;
      gap: 4px;
      margin-top: 16px;
    }
    .nav-label {
      font-size: 0.7rem;
      font-weight: 700;
      color: #94a3b8;
      letter-spacing: 0.08em;
      padding: 0 12px;
      margin-bottom: 8px;
    }
    .nav-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 10px 12px;
      border-radius: 8px;
      color: #64748b;
      text-decoration: none;
      font-size: 0.9rem;
      font-weight: 500;
      transition: all 0.15s ease;
      cursor: pointer;
    }
    .nav-item:hover {
      background: #f1f5f9;
      color: #0f172a;
    }
    .nav-item.active {
      background: #e0e7ff;
      color: #4f46e5;
      font-weight: 600;
    }
    .nav-item.active svg {
      stroke: #4f46e5;
    }

    /* Mobile responsive */
    @media (max-width: 768px) {
      :host {
        width: 0;
      }
      .sidebar {
        transform: translateX(-100%);
        transition: transform 0.3s ease;
        box-shadow: none;
      }
      .sidebar.open {
        transform: translateX(0);
        box-shadow: 4px 0 24px rgba(0,0,0,0.1);
      }
      .sidebar-overlay {
        display: none;
        position: fixed;
        inset: 0;
        background: rgba(0,0,0,0.3);
        z-index: 99;
      }
      .sidebar-overlay.open {
        display: block;
      }
      .close-sidebar {
        display: flex;
        align-items: center;
        justify-content: center;
        position: absolute;
        top: 16px;
        right: 16px;
        background: none;
        border: none;
        color: #64748b;
        cursor: pointer;
        padding: 4px;
        border-radius: 6px;
      }
      .close-sidebar:hover {
        background: #f1f5f9;
      }
    }
  `]
})
export class SidebarComponent {
  isOpen = false;

  closeSidebar() {
    this.isOpen = false;
  }

  openSidebar() {
    this.isOpen = true;
  }
}
