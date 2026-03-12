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
      max-width: 1600px;
      margin: 0 auto;
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

  // This listens for any custom 'toggleSidebar' events emitted globally or on the window
  @HostListener('window:toggleSidebar', ['$event'])
  onToggleSidebar(event: any, sidebarRef: any) {
    // If the children broadcasted it globally via window
    // We will handle it below in onActivate more reactively, but this is a fallback
  }

  onActivate(componentRef: any, sidebarRef: SidebarComponent) {
    if (componentRef.toggleSidebar) {
      // Unsubscribe from previous if existed to avoid memory leaks? Handled by router automatically
      componentRef.toggleSidebar.subscribe(() => {
        sidebarRef.openSidebar();
      });
    }
  }
}
