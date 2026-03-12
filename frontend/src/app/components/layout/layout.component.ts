import { Component, HostListener } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SidebarComponent } from '../sidebar/sidebar.component';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [RouterOutlet, SidebarComponent],
  template: `
    <app-sidebar #sidebar></app-sidebar>
    <main class="main-content">
       <router-outlet (activate)="onActivate($event, sidebar)"></router-outlet>
    </main>
  `,
  styles: [`
    :host {
      display: flex;
      width: 100%;
      min-height: 100vh;
      background-color: var(--bg-dark);
    }
    .main-content {
      flex-grow: 1;
      padding: 32px 48px;
      min-width: 0; /* prevents flex child overflow */
      transition: all 0.3s ease;
    }
    @media (max-width: 768px) {
      .main-content {
        padding: 24px 20px;
      }
    }
  `]
})
export class LayoutComponent {

  onActivate(componentRef: any, sidebarRef: SidebarComponent) {
    if (componentRef.toggleSidebar) {
      componentRef.toggleSidebar.subscribe(() => {
        sidebarRef.openSidebar();
      });
    }
  }
}
