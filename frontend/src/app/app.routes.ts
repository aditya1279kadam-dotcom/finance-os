import { Routes } from '@angular/router';
import { LayoutComponent } from './components/layout/layout.component';
import { SyncCenterComponent } from './pages/sync-center/sync-center.component';
import { ProjectDashboardComponent } from './pages/project-dashboard/project-dashboard.component';
import { ResourceDashboardComponent } from './pages/resource-dashboard/resource-dashboard.component';
import { DefaultersReportComponent } from './pages/defaulters-report/defaulters-report.component';

export const routes: Routes = [
    {
        path: '',
        component: LayoutComponent,
        children: [
            { path: '', component: SyncCenterComponent },
            { path: 'project-dashboard', component: ProjectDashboardComponent },
            { path: 'resource-dashboard', component: ResourceDashboardComponent },
            { path: 'defaulters-report', component: DefaultersReportComponent },
        ]
    },
    { path: '**', redirectTo: '' }
];
