import { Routes } from '@angular/router';
import { SyncCenterComponent } from './pages/sync-center/sync-center.component';
import { ProjectDashboardComponent } from './pages/project-dashboard/project-dashboard.component';
import { ResourceDashboardComponent } from './pages/resource-dashboard/resource-dashboard.component';

export const routes: Routes = [
    { path: '', component: SyncCenterComponent },
    { path: 'project-dashboard', component: ProjectDashboardComponent },
    { path: 'resource-dashboard', component: ResourceDashboardComponent },
    { path: '**', redirectTo: '' }
];
