import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DefaultersReportComponent } from './defaulters-report.component';

describe('DefaultersReportComponent', () => {
  let component: DefaultersReportComponent;
  let fixture: ComponentFixture<DefaultersReportComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DefaultersReportComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DefaultersReportComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
