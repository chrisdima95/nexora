import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ScontiComponent } from './sconti.component';

describe('ScontiComponent', () => {
  let component: ScontiComponent;
  let fixture: ComponentFixture<ScontiComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ScontiComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ScontiComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
