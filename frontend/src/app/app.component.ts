import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SidebarComponent } from './components/sidebar/sidebar.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, SidebarComponent],
  template: `
    <app-sidebar #sidebar></app-sidebar>
    <main class="main-content">
      <!-- We can pass down the sidebar reference via a service or router-outlet event,
           but for simplicity, children can just be wrapped or emit to standard container. 
           We'll simply let children layout themselves exactly as in Vanilla via robust CSS -->
      <router-outlet (activate)="onActivate($event, sidebar)"></router-outlet>
    </main>
  `,
  styles: [`
    /* Ensure the host takes full width/height similar to body in vanilla */
    :host {
      display: block;
      width: 100%;
      height: 100%;
    }
  `]
})
export class AppComponent {
  onActivate(componentRef: any, sidebarRef: SidebarComponent) {
    if (componentRef.toggleSidebar) {
      componentRef.toggleSidebar.subscribe(() => {
        sidebarRef.openSidebar();
      });
    }
  }
}
